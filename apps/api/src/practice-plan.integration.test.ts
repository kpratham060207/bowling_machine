import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it, skip } from 'vitest';
import {
  auditLogs,
  createDatabase,
  getDatabaseUrl,
  machineAccess,
  machines,
  practicePlans,
  practiceSessions,
  profiles,
  runMigrations,
  users,
} from '@bowling-machine/database';
import { VALID_DELIVERY_REQUEST } from '@bowling-machine/calculation-engine';
import { buildApiServer } from './server.js';
import { createTestApiEnv, signTestAccessToken } from './test/test-helpers.js';
import type { ApiEnv } from './config/env.js';

function parseJson(response: { json: () => unknown }): unknown {
  return response.json();
}

const databaseUrl = getDatabaseUrl();
let dbAvailable = false;
let testEnv: ApiEnv = createTestApiEnv();
let server: Awaited<ReturnType<typeof buildApiServer>> | undefined;

const playerA = randomUUID();
const playerB = randomUUID();
const adminUser = randomUUID();
const machineA = randomUUID();

function requireServer(): NonNullable<typeof server> {
  if (!server) {
    throw new Error('API server unavailable in test');
  }
  return server;
}

beforeAll(async () => {
  try {
    await runMigrations(databaseUrl);
    const connection = createDatabase(databaseUrl);
    await connection.sql`SELECT 1`;
    await connection.sql.end();

    testEnv = createTestApiEnv();
    server = await buildApiServer(testEnv);
    await server.app.listen({ host: '127.0.0.1', port: 0 });
    dbAvailable = true;

    const { db } = server;
    await db.insert(users).values([
      { id: playerA, email: `plan-a-${playerA}@test.local`, role: 'PLAYER' },
      { id: playerB, email: `plan-b-${playerB}@test.local`, role: 'PLAYER' },
      { id: adminUser, email: `admin-${adminUser}@test.local`, role: 'ADMIN' },
    ]);
    await db.insert(profiles).values([
      { userId: playerA, displayName: 'Plan Player A' },
      { userId: playerB, displayName: 'Plan Player B' },
      { userId: adminUser, displayName: 'Plan Admin' },
    ]);

    await db.insert(machines).values({
      id: machineA,
      name: 'Plan Test Machine',
      serialNumber: `SIM-PLAN-${machineA.slice(0, 8)}`,
      kind: 'SIMULATOR',
      protocolVersion: '1.0',
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

describe('practice plan integration', () => {
  it('creates, lists, updates, and deletes own plans', async () => {
    if (!dbAvailable) {
      skip();
      return;
    }
    const api = requireServer();
    const token = await signTestAccessToken(testEnv, { sub: playerA });

    const createResponse = await api.app.inject({
      method: 'POST',
      url: '/api/v1/practice-plans',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        name: 'Fast Outswing Practice',
        description: 'Dev test plan',
        deliveries: [VALID_DELIVERY_REQUEST],
      },
    });

    expect(createResponse.statusCode).toBe(200);
    const created = parseJson(createResponse) as { data: { plan_id: string; name: string } };
    expect(created.data.name).toBe('Fast Outswing Practice');

    const listResponse = await api.app.inject({
      method: 'GET',
      url: '/api/v1/practice-plans',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(listResponse.statusCode).toBe(200);
    const list = parseJson(listResponse) as { data: unknown[] };
    expect(list.data.length).toBeGreaterThan(0);

    const otherToken = await signTestAccessToken(testEnv, { sub: playerB });
    const forbidden = await api.app.inject({
      method: 'GET',
      url: `/api/v1/practice-plans/${created.data.plan_id}`,
      headers: { authorization: `Bearer ${otherToken}` },
    });
    expect(forbidden.statusCode).toBe(403);

    await api.app.inject({
      method: 'DELETE',
      url: `/api/v1/practice-plans/${created.data.plan_id}`,
      headers: { authorization: `Bearer ${token}` },
    });

    const remaining = await api.db
      .select()
      .from(practicePlans)
      .where(eq(practicePlans.id, created.data.plan_id));
    expect(remaining).toHaveLength(0);
  });

  it('starting a plan snapshots deliveries into a new session', async () => {
    if (!dbAvailable) {
      skip();
      return;
    }
    const api = requireServer();
    const token = await signTestAccessToken(testEnv, { sub: playerA });

    const createResponse = await api.app.inject({
      method: 'POST',
      url: '/api/v1/practice-plans',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        name: 'Snapshot Plan',
        deliveries: [{ ...VALID_DELIVERY_REQUEST, desired_speed_kmh: 80 }],
      },
    });
    const plan = parseJson(createResponse) as { data: { plan_id: string } };

    const startResponse = await api.app.inject({
      method: 'POST',
      url: `/api/v1/practice-plans/${plan.data.plan_id}/start`,
      headers: { authorization: `Bearer ${token}` },
      payload: { machine_id: machineA },
    });

    expect(startResponse.statusCode).toBe(200);
    const session = parseJson(startResponse) as {
      data: {
        session_id: string;
        source_plan_id?: string;
        deliveries: Array<{ requested: { desired_speed_kmh: number } }>;
      };
    };
    expect(session.data.source_plan_id).toBe(plan.data.plan_id);
    expect(session.data.deliveries[0]?.requested.desired_speed_kmh).toBe(80);

    await api.app.inject({
      method: 'PUT',
      url: `/api/v1/practice-plans/${plan.data.plan_id}`,
      headers: { authorization: `Bearer ${token}` },
      payload: {
        name: 'Snapshot Plan',
        deliveries: [{ ...VALID_DELIVERY_REQUEST, desired_speed_kmh: 100 }],
      },
    });

    const sessionRow = await api.db
      .select()
      .from(practiceSessions)
      .where(eq(practiceSessions.id, session.data.session_id))
      .limit(1);
    expect(sessionRow[0]).toBeTruthy();

    const persisted = await api.app.inject({
      method: 'GET',
      url: `/api/v1/sessions/${session.data.session_id}`,
      headers: { authorization: `Bearer ${token}` },
    });
    const persistedSession = parseJson(persisted) as {
      data: { deliveries: Array<{ requested: { desired_speed_kmh: number } }> };
    };
    expect(persistedSession.data.deliveries[0]?.requested.desired_speed_kmh).toBe(80);
  });

  it('keeps historical sessions when a plan is deleted', async () => {
    if (!dbAvailable) {
      skip();
      return;
    }
    const api = requireServer();
    const token = await signTestAccessToken(testEnv, { sub: playerA });

    const createResponse = await api.app.inject({
      method: 'POST',
      url: '/api/v1/practice-plans',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        name: 'Delete Survivor Plan',
        deliveries: [VALID_DELIVERY_REQUEST],
      },
    });
    const plan = parseJson(createResponse) as { data: { plan_id: string } };

    const startResponse = await api.app.inject({
      method: 'POST',
      url: `/api/v1/practice-plans/${plan.data.plan_id}/start`,
      headers: { authorization: `Bearer ${token}` },
      payload: { machine_id: machineA },
    });
    const session = parseJson(startResponse) as { data: { session_id: string } };

    await api.app.inject({
      method: 'DELETE',
      url: `/api/v1/practice-plans/${plan.data.plan_id}`,
      headers: { authorization: `Bearer ${token}` },
    });

    const sessionResponse = await api.app.inject({
      method: 'GET',
      url: `/api/v1/sessions/${session.data.session_id}`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(sessionResponse.statusCode).toBe(200);
  });

  it('allows admin calibration management with audit trail', async () => {
    if (!dbAvailable) {
      skip();
      return;
    }
    const api = requireServer();
    const adminToken = await signTestAccessToken(testEnv, { sub: adminUser });

    const createResponse = await api.app.inject({
      method: 'POST',
      url: `/api/v1/admin/machines/${machineA}/calibration`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: {
        calibration_type: 'simulator_test',
        data: { _simulation: true, max_balls_per_sequence: 24 },
        notes: 'Integration test profile',
      },
    });
    expect(createResponse.statusCode).toBe(200);
    const profile = parseJson(createResponse) as { data: { profile_id: string } };

    const activateResponse = await api.app.inject({
      method: 'POST',
      url: `/api/v1/admin/calibration/${profile.data.profile_id}/activate`,
      headers: { authorization: `Bearer ${adminToken}` },
    });
    expect(activateResponse.statusCode).toBe(200);

    const auditRows = await api.db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.resourceId, profile.data.profile_id));
    expect(auditRows.length).toBeGreaterThan(0);
  });

  it('denies calibration admin routes to players', async () => {
    if (!dbAvailable) {
      skip();
      return;
    }
    const api = requireServer();
    const token = await signTestAccessToken(testEnv, { sub: playerA });
    const response = await api.app.inject({
      method: 'GET',
      url: '/api/v1/admin/machines',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(response.statusCode).toBe(403);
  });
});
