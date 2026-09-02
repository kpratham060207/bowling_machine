import type { FastifyInstance } from 'fastify';
import type { WebSocketEvent } from '@bowling-machine/api-contracts';
import type { JwtVerifier } from '../lib/jwt.js';
import type { Database } from '@bowling-machine/database';
import { listAccessibleMachineIds } from '../services/machine-access.service.js';
import type { MachineEventBus } from '../gateway/event-bus.js';

type BrowserWsDeps = {
  db: Database['db'];
  jwtVerifier: JwtVerifier;
  eventBus: MachineEventBus;
};

/**
 * Browser WebSocket — authenticated players receive live events for authorized machines only.
 * Auth via ?access_token= JWT query param (browser cannot set custom WS headers easily).
 */
export function registerBrowserWebSocketRoutes(app: FastifyInstance, deps: BrowserWsDeps): void {
  app.get('/ws/browser', { websocket: true }, (socket, request) => {
    void handleBrowserConnection(socket, request as { query: Record<string, unknown> }, deps);
  });
}

async function handleBrowserConnection(
  socket: {
    send: (data: string) => void;
    on: (event: string, cb: (...args: unknown[]) => void) => void;
    close: () => void;
  },
  request: { query: Record<string, unknown> },
  deps: BrowserWsDeps,
): Promise<void> {
  const token =
    typeof request.query['access_token'] === 'string' ? request.query['access_token'] : undefined;
  if (!token) {
    socket.send(JSON.stringify({ type: 'error', message: 'Missing access_token' }));
    socket.close();
    return;
  }

  let userId: string;
  try {
    const claims = await deps.jwtVerifier.verifyAccessToken(token);
    userId = claims.sub;
  } catch {
    socket.send(JSON.stringify({ type: 'error', message: 'Invalid access token' }));
    socket.close();
    return;
  }

  const accessible = new Set(await listAccessibleMachineIds(deps.db, userId));

  const unsubscribe = deps.eventBus.subscribe((event) => {
    const machineId = extractMachineIdFromEvent(event);
    if (machineId && !accessible.has(machineId)) {
      return;
    }
    socket.send(JSON.stringify(event));
  });

  socket.send(
    JSON.stringify({
      type: 'connected',
      payload: { user_id: userId, subscribed_machines: [...accessible] },
    }),
  );

  socket.on('close', () => {
    unsubscribe();
  });
}

function extractMachineIdFromEvent(event: WebSocketEvent): string | undefined {
  switch (event.event_type) {
    case 'MACHINE_CONNECTED':
    case 'MACHINE_DISCONNECTED':
    case 'MACHINE_STATE_CHANGED':
    case 'EMERGENCY_STOP':
      return event.payload.machine_id;
    case 'COMMAND_ACKNOWLEDGED':
      return event.payload.machine_id;
    case 'FAULT':
      return event.payload.fault.machine_id;
    case 'HEARTBEAT':
      return event.payload.machine_id;
    case 'STATUS_UPDATED':
      return event.payload.status.machine_id;
    default:
      return undefined;
  }
}
