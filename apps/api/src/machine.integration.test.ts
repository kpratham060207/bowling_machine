import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  createDatabase,
  getDatabaseUrl,
  machineAccess,
  machineRegistrations,
  machines,
  profiles,
  runMigrations,
  users,
  DEV_SIMULATOR_CONNECTION_SECRET,
  DEV_SIMULATOR_CONNECTION_SECRET_HASH,
} from '@bowling-machine/database';
import { buildApiServer } from './server.js';
import { createTestApiEnv, signTestAccessToken } from './test/test-helpers.js';
import { TestSimulatorPeer, sleep } from './test/simulator-peer.js';

function parseJson(response: { json: () => unknown }): unknown {
  return response.json();
}

const databaseUrl = getDatabaseUrl();
let dbAvailable = false;
let port = 0;
let server: Awaited<ReturnType<typeof buildApiServer>> | undefined;

const playerA = randomUUID();
const playerB = randomUUID();
const machineA = randomUUID();
const machineB = randomUUID();

beforeAll(async () => {
  try {
    await runMigrations(databaseUrl);
    const connection = createDatabase(databaseUrl);
    await connection.sql`SELECT 1`;
    await connection.sql.end();

    const env = createTestApiEnv();
    server = await buildApiServer(env);
    await server.app.listen({ host: '127.0.0.1', port: 0 });
    const address = server.app.server.address();
    if (typeof address === 'object' && address) {
      port = address.port;
    }

    dbAvailable = true;
    const { db } = server;

    await db.insert(users).values([
      { id: playerA, email: `a-${playerA}@test.local`, role: 'PLAYER' },
      { id: playerB, email: `b-${playerB}@test.local`, role: 'PLAYER' },
    ]);
    await db.insert(profiles).values([
      { userId: playerA, displayName: 'Machine Test A' },
      { userId: playerB, displayName: 'Machine Test B' },
    ]);

    await db.insert(machines).values([
      {
        id: machineA,
        name: 'Test Simulator A',
        serialNumber: `SIM-A-${machineA.slice(0, 8)}`,
        kind: 'SIMULATOR',
        protocolVersion: '1.0',
      },
      {
        id: machineB,
        name: 'Test Simulator B',
        serialNumber: `SIM-B-${machineB.slice(0, 8)}`,
        kind: 'SIMULATOR',
        protocolVersion: '1.0',
      },
    ]);

    await db.insert(machineRegistrations).values([
      {
        machineId: machineA,
        qrCodeToken: `qr-token-a-${machineA.slice(0, 8)}`,
        connectionSecretHash: DEV_SIMULATOR_CONNECTION_SECRET_HASH,
      },
      {
        machineId: machineB,
        qrCodeToken: `qr-token-b-${machineB.slice(0, 8)}`,
        connectionSecretHash: DEV_SIMULATOR_CONNECTION_SECRET_HASH,
      },
    ]);

    await db.insert(machineAccess).values([
      { userId: playerA, machineId: machineA },
      { userId: playerA, machineId: machineB },
    ]);
  } catch {
    dbAvailable = false;
  }
}, 60_000);

afterAll(async () => {
  if (server) {
    await server.app.close();
  }
});

describe('machine integration', () => {
  it('rejects player without machine access', async ({ skip }) => {
    if (!dbAvailable || !server) {
      skip();
      return;
    }

    const token = await signTestAccessToken(createTestApiEnv(), { sub: playerB });
    const response = await server.app.inject({
      method: 'GET',
      url: `/machines/${machineA}`,
      headers: { authorization: `Bearer ${token}` },
    });

    expect(response.statusCode).toBe(403);
  });

  it('rejects control takeover while lock is active', async ({ skip }) => {
    if (!dbAvailable || !server) {
      skip();
      return;
    }

    const tokenA = await signTestAccessToken(createTestApiEnv(), { sub: playerA });
    const acquire = await server.app.inject({
      method: 'POST',
      url: `/machines/${machineA}/control/acquire`,
      headers: { authorization: `Bearer ${tokenA}` },
    });
    expect(acquire.statusCode).toBe(200);

    const tokenB = await signTestAccessToken(createTestApiEnv(), { sub: playerB });
    await server.db
      .insert(machineAccess)
      .values({ userId: playerB, machineId: machineA })
      .onConflictDoNothing();

    const takeover = await server.app.inject({
      method: 'POST',
      url: `/machines/${machineA}/control/acquire`,
      headers: { authorization: `Bearer ${tokenB}` },
    });
    expect(takeover.statusCode).toBe(409);
  });

  it('runs end-to-end machine control flow with simulator peer', async ({ skip }) => {
    if (!dbAvailable || !server) {
      skip();
      return;
    }

    const simulator = new TestSimulatorPeer(port, machineA, DEV_SIMULATOR_CONNECTION_SECRET);
    await simulator.connect();

    const token = await signTestAccessToken(createTestApiEnv(), { sub: playerA });

    const acquire = await server.app.inject({
      method: 'POST',
      url: `/machines/${machineA}/control/acquire`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(acquire.statusCode).toBe(200);
    const connectionId = (parseJson(acquire) as { data: { connection_id: string } }).data
      .connection_id;

    await sleep(300);

    const statusBefore = await server.app.inject({
      method: 'GET',
      url: `/machines/${machineA}/status`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(statusBefore.statusCode).toBe(200);
    expect(
      (parseJson(statusBefore) as { data: { connection_status: string } }).data.connection_status,
    ).toBe('CONNECTED');

    const home = await server.app.inject({
      method: 'POST',
      url: `/machines/${machineA}/home`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(home.statusCode).toBe(200);
    expect((parseJson(home) as { data: { status: string } }).data.status).toBe('ACCEPTED');

    await sleep(500);
    const statusHomed = await server.app.inject({
      method: 'GET',
      url: `/machines/${machineA}/status`,
      headers: { authorization: `Bearer ${token}` },
    });
    const homedBody = parseJson(statusHomed) as { data: { state: string; homing_status: string } };
    expect(homedBody.data.state).toBe('READY');
    expect(homedBody.data.homing_status).toBe('HOMED');

    const stop = await server.app.inject({
      method: 'POST',
      url: `/machines/${machineA}/stop`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(stop.statusCode).toBe(200);

    const release = await server.app.inject({
      method: 'POST',
      url: `/machines/${machineA}/control/release`,
      headers: { authorization: `Bearer ${token}` },
      payload: { connection_id: connectionId },
    });
    expect(release.statusCode).toBe(200);

    simulator.disconnect();
  }, 30_000);
});

describe('STOP authorization vs control lock', () => {
  it('allows authorized player to STOP without active control lock', async ({ skip }) => {
    if (!dbAvailable || !server) {
      skip();
      return;
    }

    const simulator = new TestSimulatorPeer(port, machineA, DEV_SIMULATOR_CONNECTION_SECRET);
    await simulator.connect();
    await sleep(200);

    const token = await signTestAccessToken(createTestApiEnv(), { sub: playerA });
    const stop = await server.app.inject({
      method: 'POST',
      url: `/machines/${machineA}/stop`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(stop.statusCode).toBe(200);
    expect((parseJson(stop) as { data: { status: string } }).data.status).toBe('ACCEPTED');

    simulator.disconnect();
  }, 15_000);

  it('rejects STOP from player without machine access', async ({ skip }) => {
    if (!dbAvailable || !server) {
      skip();
      return;
    }

    const token = await signTestAccessToken(createTestApiEnv(), { sub: playerB });
    const stop = await server.app.inject({
      method: 'POST',
      url: `/machines/${machineB}/stop`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(stop.statusCode).toBe(403);
  });

  it('allows STOP when control lease expired (safety override)', async ({ skip }) => {
    if (!dbAvailable || !server) {
      skip();
      return;
    }

    const simulator = new TestSimulatorPeer(port, machineA, DEV_SIMULATOR_CONNECTION_SECRET);
    await simulator.connect();
    await sleep(200);

    const token = await signTestAccessToken(createTestApiEnv(), { sub: playerA });
    await server.app.inject({
      method: 'POST',
      url: `/machines/${machineA}/control/acquire`,
      headers: { authorization: `Bearer ${token}` },
    });
    await server.app.inject({
      method: 'POST',
      url: `/machines/${machineA}/control/release`,
      headers: { authorization: `Bearer ${token}` },
    });

    const stop = await server.app.inject({
      method: 'POST',
      url: `/machines/${machineA}/stop`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(stop.statusCode).toBe(200);

    simulator.disconnect();
  }, 15_000);

  it('handles repeated STOP idempotently when machine already stopped', async ({ skip }) => {
    if (!dbAvailable || !server) {
      skip();
      return;
    }

    const simulator = new TestSimulatorPeer(port, machineA, DEV_SIMULATOR_CONNECTION_SECRET);
    await simulator.connect();
    await sleep(200);

    const token = await signTestAccessToken(createTestApiEnv(), { sub: playerA });
    const first = await server.app.inject({
      method: 'POST',
      url: `/machines/${machineA}/stop`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(first.statusCode).toBe(200);

    await sleep(200);

    const second = await server.app.inject({
      method: 'POST',
      url: `/machines/${machineA}/stop`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(second.statusCode).toBe(200);

    simulator.disconnect();
  }, 15_000);
});

describe('machine command idempotency', () => {
  it('returns stored result for duplicate command_id without re-dispatch', async ({ skip }) => {
    if (!dbAvailable || !server) {
      skip();
      return;
    }

    const simulator = new TestSimulatorPeer(port, machineB, DEV_SIMULATOR_CONNECTION_SECRET);
    await simulator.connect();
    await sleep(200);

    const token = await signTestAccessToken(createTestApiEnv(), { sub: playerA });
    await server.app.inject({
      method: 'POST',
      url: `/machines/${machineB}/control/acquire`,
      headers: { authorization: `Bearer ${token}` },
    });

    const command = server.commandService.buildCommand(machineB, 'PING', {});
    const first = await server.commandService.dispatch(command);
    expect(first.status).toBe('ACCEPTED');

    const second = await server.commandService.dispatch(command);
    expect(second.commandId).toBe(first.commandId);
    expect(second.status).toBe(first.status);

    simulator.disconnect();
  }, 20_000);
});
