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
import { VALID_DELIVERY_REQUEST } from '@bowling-machine/calculation-engine';
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
      { id: playerA, email: `session-a-${playerA}@test.local`, role: 'PLAYER' },
      { id: playerB, email: `session-b-${playerB}@test.local`, role: 'PLAYER' },
    ]);
    await db.insert(profiles).values([
      { userId: playerA, displayName: 'Session Test A' },
      { userId: playerB, displayName: 'Session Test B' },
    ]);

    await db.insert(machines).values({
      id: machineA,
      name: 'Session Simulator',
      serialNumber: `SIM-SESSION-${machineA.slice(0, 8)}`,
      kind: 'SIMULATOR',
      protocolVersion: '1.0',
    });

    await db.insert(machineRegistrations).values({
      machineId: machineA,
      qrCodeToken: `qr-session-${machineA.slice(0, 8)}`,
      connectionSecretHash: DEV_SIMULATOR_CONNECTION_SECRET_HASH,
    });

    await db.insert(machineAccess).values({ userId: playerA, machineId: machineA });
  } catch {
    dbAvailable = false;
  }
}, 60_000);

afterAll(async () => {
  if (server) {
    await server.app.close();
  }
});

async function prepareMachine(token: string): Promise<void> {
  if (!server) {
    return;
  }

  await server.app.inject({
    method: 'POST',
    url: `/machines/${machineA}/control/acquire`,
    headers: { authorization: `Bearer ${token}` },
  });

  await sleep(300);

  const home = await server.app.inject({
    method: 'POST',
    url: `/machines/${machineA}/home`,
    headers: { authorization: `Bearer ${token}` },
  });
  expect(home.statusCode).toBe(200);
  await sleep(500);
}

describe('session orchestration integration', () => {
  it('runs happy path: create session, start, delivery completes', async ({ skip }) => {
    if (!dbAvailable || !server) {
      skip();
      return;
    }

    const simulator = new TestSimulatorPeer(port, machineA, DEV_SIMULATOR_CONNECTION_SECRET);
    await simulator.connect();
    await sleep(200);

    const token = await signTestAccessToken(createTestApiEnv(), { sub: playerA });
    await prepareMachine(token);

    const createResponse = await server.app.inject({
      method: 'POST',
      url: '/api/v1/sessions',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        machine_id: machineA,
        deliveries: [
          {
            target_x: VALID_DELIVERY_REQUEST.target_x,
            target_y: VALID_DELIVERY_REQUEST.target_y,
            desired_speed_kmh: VALID_DELIVERY_REQUEST.desired_speed_kmh,
            ball_type: VALID_DELIVERY_REQUEST.ball_type,
            number_of_balls: 2,
            first_ball_delay_ms: VALID_DELIVERY_REQUEST.first_ball_delay_ms,
            interval_ms: VALID_DELIVERY_REQUEST.interval_ms,
          },
        ],
      },
    });
    expect(createResponse.statusCode).toBe(200);
    const sessionId = (parseJson(createResponse) as { data: { session_id: string } }).data
      .session_id;

    const startResponse = await server.app.inject({
      method: 'POST',
      url: `/api/v1/sessions/${sessionId}/start`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(startResponse.statusCode, startResponse.body).toBe(200);

    await sleep(800);

    const sessionResponse = await server.app.inject({
      method: 'GET',
      url: `/api/v1/sessions/${sessionId}`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(sessionResponse.statusCode).toBe(200);
    const sessionBody = parseJson(sessionResponse) as {
      data: { status: string; deliveries: Array<{ status: string }> };
    };
    expect(sessionBody.data.deliveries[0]?.status).toBe('COMPLETED');
    expect(sessionBody.data.status).toBe('COMPLETED');

    simulator.disconnect();
  }, 30_000);

  it('supports multiple sequential deliveries', async ({ skip }) => {
    if (!dbAvailable || !server) {
      skip();
      return;
    }

    const simulator = new TestSimulatorPeer(port, machineA, DEV_SIMULATOR_CONNECTION_SECRET);
    await simulator.connect();
    await sleep(200);

    const token = await signTestAccessToken(createTestApiEnv(), { sub: playerA });
    await prepareMachine(token);

    const createResponse = await server.app.inject({
      method: 'POST',
      url: '/api/v1/sessions',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        machine_id: machineA,
        deliveries: [
          {
            ...VALID_DELIVERY_REQUEST,
            number_of_balls: 1,
          },
          {
            ...VALID_DELIVERY_REQUEST,
            number_of_balls: 1,
          },
        ],
      },
    });
    const sessionId = (parseJson(createResponse) as { data: { session_id: string } }).data
      .session_id;

    await server.app.inject({
      method: 'POST',
      url: `/api/v1/sessions/${sessionId}/start`,
      headers: { authorization: `Bearer ${token}` },
    });

    await sleep(2500);

    const sessionResponse = await server.app.inject({
      method: 'GET',
      url: `/api/v1/sessions/${sessionId}`,
      headers: { authorization: `Bearer ${token}` },
    });
    const sessionBody = parseJson(sessionResponse) as {
      data: { status: string; deliveries: Array<{ status: string }> };
    };
    expect(sessionBody.data.deliveries.every((delivery) => delivery.status === 'COMPLETED')).toBe(
      true,
    );
    expect(sessionBody.data.status).toBe('COMPLETED');

    simulator.disconnect();
  }, 30_000);

  it('rejects access to another player session', async ({ skip }) => {
    if (!dbAvailable || !server) {
      skip();
      return;
    }

    const tokenA = await signTestAccessToken(createTestApiEnv(), { sub: playerA });
    const createResponse = await server.app.inject({
      method: 'POST',
      url: '/api/v1/sessions',
      headers: { authorization: `Bearer ${tokenA}` },
      payload: { machine_id: machineA },
    });
    const sessionId = (parseJson(createResponse) as { data: { session_id: string } }).data
      .session_id;

    const tokenB = await signTestAccessToken(createTestApiEnv(), { sub: playerB });
    const forbidden = await server.app.inject({
      method: 'GET',
      url: `/api/v1/sessions/${sessionId}`,
      headers: { authorization: `Bearer ${tokenB}` },
    });
    expect(forbidden.statusCode).toBe(403);
  });

  it('stop session is idempotent and does not require control lock', async ({ skip }) => {
    if (!dbAvailable || !server) {
      skip();
      return;
    }

    const simulator = new TestSimulatorPeer(port, machineA, DEV_SIMULATOR_CONNECTION_SECRET);
    await simulator.connect();
    await sleep(200);

    const token = await signTestAccessToken(createTestApiEnv(), { sub: playerA });
    const createResponse = await server.app.inject({
      method: 'POST',
      url: '/api/v1/sessions',
      headers: { authorization: `Bearer ${token}` },
      payload: { machine_id: machineA },
    });
    const sessionId = (parseJson(createResponse) as { data: { session_id: string } }).data
      .session_id;

    const firstStop = await server.app.inject({
      method: 'POST',
      url: `/api/v1/sessions/${sessionId}/stop`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(firstStop.statusCode).toBe(200);

    const secondStop = await server.app.inject({
      method: 'POST',
      url: `/api/v1/sessions/${sessionId}/stop`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(secondStop.statusCode).toBe(200);

    simulator.disconnect();
  }, 20_000);

  it('rejects start when machine is not homed', async ({ skip }) => {
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

    const createResponse = await server.app.inject({
      method: 'POST',
      url: '/api/v1/sessions',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        machine_id: machineA,
        deliveries: [{ ...VALID_DELIVERY_REQUEST, number_of_balls: 1 }],
      },
    });
    const sessionId = (parseJson(createResponse) as { data: { session_id: string } }).data
      .session_id;

    const startResponse = await server.app.inject({
      method: 'POST',
      url: `/api/v1/sessions/${sessionId}/start`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(startResponse.statusCode).toBe(409);

    simulator.disconnect();
  }, 20_000);
});
