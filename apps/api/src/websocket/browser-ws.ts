import type { FastifyInstance } from 'fastify';
import type { WebSocketEvent } from '@bowling-machine/api-contracts';
import type { ApiEnv } from '../config/env.js';
import type { JwtVerifier } from '../lib/jwt.js';
import type { Database } from '@bowling-machine/database';
import { getAccessTokenFromSupabaseCookies } from '../auth/supabase-session-from-cookies.js';
import { loadAuthContextForUser } from '../auth/provisioning.js';
import { listAccessibleMachineIds } from '../services/machine-access.service.js';
import type { MachineEventBus } from '../gateway/event-bus.js';
import { extractPlayerIdFromEvent } from '../gateway/event-bus.js';
import type { BrowserWsTicketService } from './ws-ticket.service.js';
import { webSocketDataToString } from '../lib/ws-data.js';
import type { WebSocket } from 'ws';

type BrowserWsDeps = {
  env: ApiEnv;
  db: Database['db'];
  jwtVerifier: JwtVerifier;
  eventBus: MachineEventBus;
  wsTicketService: BrowserWsTicketService;
};

const AUTHENTICATE_MESSAGE_TYPE = 'authenticate';

/**
 * Browser WebSocket — authenticated players receive live events for authorized machines only.
 *
 * Authentication (in priority order — tokens NEVER accepted in URL query parameters):
 * 1. Supabase SSR session cookies on the upgrade request (same-origin / credentialed deployment)
 * 2. First-message ticket from POST /ws/browser/ticket (cross-origin local dev)
 *
 * Query-string JWTs are rejected — they leak via logs, proxies, and browser history.
 */
export function registerBrowserWebSocketRoutes(app: FastifyInstance, deps: BrowserWsDeps): void {
  app.get('/ws/browser', { websocket: true }, (socket, request) => {
    void handleBrowserConnection(socket, request, deps);
  });
}

async function handleBrowserConnection(
  socket: WebSocket,
  request: { headers: Record<string, string | string[] | undefined>; query: unknown },
  deps: BrowserWsDeps,
): Promise<void> {
  if (hasForbiddenQueryToken(request.query)) {
    socket.send(
      JSON.stringify({
        type: 'error',
        message: 'Query-string tokens are not accepted. Use session cookies or a WebSocket ticket.',
      }),
    );
    socket.close();
    return;
  }

  const cookieHeader =
    typeof request.headers.cookie === 'string' ? request.headers.cookie : undefined;

  const cookieUserId = await authenticateFromCookies(deps, cookieHeader);

  if (cookieUserId) {
    finalizeAuthenticatedConnection(socket, deps, cookieUserId);
    return;
  }

  // Cross-origin fallback — wait for ticket in first message (not URL).
  const authTimeout = setTimeout(() => {
    socket.send(JSON.stringify({ type: 'error', message: 'Authentication timeout' }));
    socket.close();
  }, deps.env.WS_BROWSER_AUTH_TIMEOUT_MS);

  socket.once('message', (raw) => {
    clearTimeout(authTimeout);
    void handleAuthenticateMessage(socket, deps, webSocketDataToString(raw));
  });
}

async function handleAuthenticateMessage(
  socket: WebSocket,
  deps: BrowserWsDeps,
  raw: string,
): Promise<void> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    socket.send(JSON.stringify({ type: 'error', message: 'Invalid authentication message' }));
    socket.close();
    return;
  }

  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    (parsed as { type?: string }).type !== AUTHENTICATE_MESSAGE_TYPE
  ) {
    socket.send(JSON.stringify({ type: 'error', message: 'Expected authenticate message' }));
    socket.close();
    return;
  }

  const ticket = (parsed as { ticket?: unknown }).ticket;
  if (typeof ticket !== 'string' || ticket.length === 0) {
    socket.send(JSON.stringify({ type: 'error', message: 'Missing ticket' }));
    socket.close();
    return;
  }

  const userId = deps.wsTicketService.consume(ticket);
  if (!userId) {
    socket.send(JSON.stringify({ type: 'error', message: 'Invalid or expired ticket' }));
    socket.close();
    return;
  }

  try {
    await loadAuthContextForUser(deps.db, userId, `${userId}@ws-ticket.local`);
  } catch {
    socket.send(JSON.stringify({ type: 'error', message: 'User not provisioned' }));
    socket.close();
    return;
  }

  finalizeAuthenticatedConnection(socket, deps, userId);
}

async function authenticateFromCookies(
  deps: BrowserWsDeps,
  cookieHeader: string | undefined,
): Promise<string | null> {
  const accessToken = await getAccessTokenFromSupabaseCookies(deps.env, cookieHeader);
  if (!accessToken) {
    return null;
  }

  try {
    const claims = await deps.jwtVerifier.verifyAccessToken(accessToken);
    await loadAuthContextForUser(
      deps.db,
      claims.sub,
      typeof claims.email === 'string' ? claims.email : `${claims.sub}@unknown.local`,
    );
    return claims.sub;
  } catch {
    return null;
  }
}

function finalizeAuthenticatedConnection(
  socket: WebSocket,
  deps: BrowserWsDeps,
  userId: string,
): void {
  void (async () => {
    const accessible = new Set(await listAccessibleMachineIds(deps.db, userId));

    const unsubscribe = deps.eventBus.subscribe((event) => {
      const playerId = extractPlayerIdFromEvent(event);
      if (playerId && playerId !== userId) {
        return;
      }

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
  })();
}

function hasForbiddenQueryToken(query: unknown): boolean {
  if (typeof query !== 'object' || query === null) {
    return false;
  }
  const record = query as Record<string, unknown>;
  return (
    typeof record['access_token'] === 'string' ||
    typeof record['token'] === 'string' ||
    typeof record['jwt'] === 'string'
  );
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
    case 'DELIVERY_STARTED':
    case 'DELIVERY_COMPLETED':
    case 'DELIVERY_FAILED':
      return event.payload.machine_id;
    case 'SESSION_STARTED':
    case 'SESSION_COMPLETED':
      return event.payload.machine_id;
    default:
      return undefined;
  }
}
