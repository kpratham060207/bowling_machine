import type { FastifyInstance } from 'fastify';
import websocket from '@fastify/websocket';
import { eq } from 'drizzle-orm';
import type { Database } from '@bowling-machine/database';
import { machineRegistrations, machines } from '@bowling-machine/database';
import { verifyMachineConnectionSecret } from '../lib/machine-crypto.js';
import type { DefaultMachineGateway } from '../gateway/machine-gateway.js';

type MachineWsDeps = {
  db: Database['db'];
  gateway: DefaultMachineGateway;
};

/**
 * Machine peer WebSocket endpoint — simulator/ESP32 connects here (not browser).
 * Auth: X-Machine-Id + X-Machine-Secret headers (UD-21 provisional).
 */
export async function registerMachineWebSocketRoutes(
  app: FastifyInstance,
  deps: MachineWsDeps,
): Promise<void> {
  await app.register(websocket);

  app.get('/ws/machine', { websocket: true }, (socket, request) => {
    void handleMachineConnection(socket, request, deps);
  });
}

import type { WebSocket } from 'ws';

async function handleMachineConnection(
  socket: WebSocket,
  request: { headers: Record<string, string | string[] | undefined> },
  deps: MachineWsDeps,
): Promise<void> {
  const machineId = getHeader(request.headers, 'x-machine-id');
  const secret = getHeader(request.headers, 'x-machine-secret');

  if (!machineId || !secret) {
    socket.send(JSON.stringify({ type: 'error', message: 'Missing machine auth headers' }));
    socket.on('close', () => undefined);
    return;
  }

  const registration = await deps.db
    .select({
      hash: machineRegistrations.connectionSecretHash,
      machineId: machineRegistrations.machineId,
    })
    .from(machineRegistrations)
    .where(eq(machineRegistrations.machineId, machineId))
    .limit(1);

  if (registration.length === 0) {
    socket.send(JSON.stringify({ type: 'error', message: 'Invalid machine credentials' }));
    return;
  }

  const registrationRow = registration[0];
  if (!registrationRow || !verifyMachineConnectionSecret(secret, registrationRow.hash)) {
    socket.send(JSON.stringify({ type: 'error', message: 'Invalid machine credentials' }));
    return;
  }

  const machineRows = await deps.db
    .select({ kind: machines.kind })
    .from(machines)
    .where(eq(machines.id, machineId))
    .limit(1);

  const kind = machineRows[0]?.kind ?? 'SIMULATOR';
  deps.gateway.attachPeer(machineId, kind, (message) => {
    socket.send(message);
  });

  socket.on('message', (raw: Buffer | string) => {
    const text = typeof raw === 'string' ? raw : raw.toString('utf8');
    deps.gateway.handleInboundMessage(machineId, text);
  });

  socket.on('close', () => {
    deps.gateway.detachPeer(machineId, 'peer_closed');
  });
}

function getHeader(
  headers: Record<string, string | string[] | undefined>,
  name: string,
): string | undefined {
  const value = headers[name];
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}
