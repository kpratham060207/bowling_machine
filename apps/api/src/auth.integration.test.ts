import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  createDatabase,
  deliveries,
  getDatabaseUrl,
  machines,
  practicePlans,
  practiceSessions,
  profiles,
  runMigrations,
  users,
} from '@bowling-machine/database';
import { buildApiServer } from './server.js';
import { createTestApiEnv, signTestAccessToken } from './test/test-helpers.js';
import {
  assertDeliveryOwnership,
  assertPlanOwnership,
  assertSessionOwnership,
} from './services/ownership.service.js';

const databaseUrl = getDatabaseUrl();
let dbAvailable = false;
let db: ReturnType<typeof createDatabase>['db'] | undefined;
let sql: ReturnType<typeof createDatabase>['sql'] | undefined;

function getTestDb(): ReturnType<typeof createDatabase>['db'] {
  if (!db) {
    throw new Error('Database unavailable in test');
  }
  return db;
}

const playerA = randomUUID();
const playerB = randomUUID();
const machineId = randomUUID();
const sessionA = randomUUID();
const sessionB = randomUUID();
const deliveryA = randomUUID();
const deliveryB = randomUUID();
const planA = randomUUID();
const planB = randomUUID();

beforeAll(async () => {
  try {
    await runMigrations(databaseUrl);
    const connection = createDatabase(databaseUrl);
    db = connection.db;
    sql = connection.sql;
    await sql`SELECT 1`;
    dbAvailable = true;

    await db.insert(users).values([
      { id: playerA, email: `a-${playerA}@test.local`, role: 'PLAYER' },
      { id: playerB, email: `b-${playerB}@test.local`, role: 'PLAYER' },
    ]);

    await db.insert(profiles).values([
      { userId: playerA, displayName: 'Player A' },
      { userId: playerB, displayName: 'Player B' },
    ]);

    await db.insert(machines).values({
      id: machineId,
      name: 'Ownership Test Machine',
      serialNumber: `OWN-${machineId.slice(0, 8)}`,
      kind: 'SIMULATOR',
      protocolVersion: '1.0',
    });

    await db.insert(practiceSessions).values([
      { id: sessionA, userId: playerA, machineId, status: 'ACTIVE' },
      { id: sessionB, userId: playerB, machineId, status: 'ACTIVE' },
    ]);

    await db.insert(deliveries).values([
      {
        id: deliveryA,
        sessionId: sessionA,
        sequenceNumber: 1,
        targetX: '0.5',
        targetY: '0.5',
        desiredSpeedKmh: '100.00',
        ballType: 'FAST',
        numberOfBalls: 1,
        firstBallDelayMs: 0,
        intervalMs: 1000,
      },
      {
        id: deliveryB,
        sessionId: sessionB,
        sequenceNumber: 1,
        targetX: '0.5',
        targetY: '0.5',
        desiredSpeedKmh: '100.00',
        ballType: 'FAST',
        numberOfBalls: 1,
        firstBallDelayMs: 0,
        intervalMs: 1000,
      },
    ]);

    await db.insert(practicePlans).values([
      { id: planA, userId: playerA, name: 'Plan A' },
      { id: planB, userId: playerB, name: 'Plan B' },
    ]);
  } catch {
    dbAvailable = false;
  }
});

afterAll(async () => {
  if (sql) {
    await sql.end();
  }
});

describe('ownership enforcement (integration)', () => {
  it('allows player to access own session', async ({ skip }) => {
    if (!dbAvailable || !db) skip();
    const result = await assertSessionOwnership(getTestDb(), sessionA, playerA);
    expect(result.id).toBe(sessionA);
  });

  it('rejects player accessing another session (IDOR)', async ({ skip }) => {
    if (!dbAvailable || !db) skip();
    await expect(assertSessionOwnership(getTestDb(), sessionB, playerA)).rejects.toMatchObject({
      statusCode: 403,
    });
  });

  it('rejects player accessing another delivery (IDOR)', async ({ skip }) => {
    if (!dbAvailable || !db) skip();
    await expect(assertDeliveryOwnership(getTestDb(), deliveryB, playerA)).rejects.toMatchObject({
      statusCode: 403,
    });
  });

  it('rejects player accessing another practice plan (IDOR)', async ({ skip }) => {
    if (!dbAvailable || !db) skip();
    await expect(assertPlanOwnership(getTestDb(), planB, playerA)).rejects.toMatchObject({
      statusCode: 403,
    });
  });
});

describe('API authentication and profile routes (integration)', () => {
  const adminUser = randomUUID();
  const adminEmail = `admin-${adminUser}@test.local`;

  beforeAll(async () => {
    if (!dbAvailable || !db) return;
    await db.insert(users).values({ id: adminUser, email: adminEmail, role: 'ADMIN' });
    await db.insert(profiles).values({ userId: adminUser, displayName: 'Admin User' });
  });

  it('rejects unauthenticated profile request', async ({ skip }) => {
    if (!dbAvailable || !db) skip();
    const env = createTestApiEnv({ DATABASE_URL: databaseUrl });
    const { app } = await buildApiServer(env);

    const response = await app.inject({ method: 'GET', url: '/api/v1/profile' });
    expect(response.statusCode).toBe(401);
    expect(response.json()).toMatchObject({ error: { code: 'UNAUTHORIZED' } });
    await app.close();
  });

  it('returns profile for authenticated player', async ({ skip }) => {
    if (!dbAvailable || !db) skip();
    const env = createTestApiEnv({ DATABASE_URL: databaseUrl });
    const { app } = await buildApiServer(env);
    const token = await signTestAccessToken(env, {
      sub: playerA,
      email: `a-${playerA}@test.local`,
    });

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/profile',
      headers: { authorization: `Bearer ${token}` },
    });

    expect(response.statusCode).toBe(200);
    const body: { data: { id: string; display_name: string } } = response.json();
    expect(body.data.id).toBe(playerA);
    expect(body.data.display_name).toBe('Player A');
    await app.close();
  });

  it('updates own profile and ignores client user_id (IDOR)', async ({ skip }) => {
    if (!dbAvailable || !db) skip();
    const env = createTestApiEnv({ DATABASE_URL: databaseUrl });
    const { app } = await buildApiServer(env);
    const token = await signTestAccessToken(env, {
      sub: playerA,
      email: `a-${playerA}@test.local`,
    });

    const response = await app.inject({
      method: 'PUT',
      url: '/api/v1/profile',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        display_name: 'Updated Player A',
        user_id: playerB,
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({ error: { code: 'VALIDATION_ERROR' } });

    const unchanged = await getTestDb()
      .select()
      .from(profiles)
      .where(eq(profiles.userId, playerB))
      .limit(1);
    expect(unchanged[0]?.displayName).toBe('Player B');
    await app.close();
  });

  it('rejects PLAYER on admin route', async ({ skip }) => {
    if (!dbAvailable || !db) skip();
    const env = createTestApiEnv({ DATABASE_URL: databaseUrl });
    const { app } = await buildApiServer(env);
    const token = await signTestAccessToken(env, {
      sub: playerA,
      email: `a-${playerA}@test.local`,
    });

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/status',
      headers: { authorization: `Bearer ${token}` },
    });

    expect(response.statusCode).toBe(403);
    await app.close();
  });

  it('allows ADMIN on admin route', async ({ skip }) => {
    if (!dbAvailable || !db) skip();
    const env = createTestApiEnv({ DATABASE_URL: databaseUrl });
    const { app } = await buildApiServer(env);
    const token = await signTestAccessToken(env, { sub: adminUser, email: adminEmail });

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/status',
      headers: { authorization: `Bearer ${token}` },
    });

    expect(response.statusCode).toBe(200);
    const body: { data: { role: string } } = response.json();
    expect(body.data.role).toBe('ADMIN');
    await app.close();
  });

  it('updates own profile with valid fields', async ({ skip }) => {
    if (!dbAvailable || !db) skip();
    const env = createTestApiEnv({ DATABASE_URL: databaseUrl });
    const { app } = await buildApiServer(env);
    const token = await signTestAccessToken(env, {
      sub: playerA,
      email: `a-${playerA}@test.local`,
    });

    const response = await app.inject({
      method: 'PUT',
      url: '/api/v1/profile',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        display_name: 'Updated Player A',
        batting_hand: 'LEFT',
        bowling_hand: 'RIGHT',
      },
    });

    expect(response.statusCode).toBe(200);
    const body: {
      data: { display_name: string; batting_hand: string; bowling_hand: string };
    } = response.json();
    expect(body.data.display_name).toBe('Updated Player A');
    expect(body.data.batting_hand).toBe('LEFT');
    expect(body.data.bowling_hand).toBe('RIGHT');

    const row = await getTestDb()
      .select()
      .from(profiles)
      .where(eq(profiles.userId, playerA))
      .limit(1);
    expect(row[0]?.displayName).toBe('Updated Player A');
    expect(row[0]?.battingHand).toBe('LEFT');
    expect(row[0]?.bowlingHand).toBe('RIGHT');
    await app.close();
  });

  it('rejects invalid batting_hand enum in profile update', async ({ skip }) => {
    if (!dbAvailable || !db) skip();
    const env = createTestApiEnv({ DATABASE_URL: databaseUrl });
    const { app } = await buildApiServer(env);
    const token = await signTestAccessToken(env, {
      sub: playerA,
      email: `a-${playerA}@test.local`,
    });

    const response = await app.inject({
      method: 'PUT',
      url: '/api/v1/profile',
      headers: { authorization: `Bearer ${token}` },
      payload: { batting_hand: 'INVALID_HAND' },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({ error: { code: 'VALIDATION_ERROR' } });
    await app.close();
  });

  it('allows CORS preflight for PUT profile updates from browser clients', async ({ skip }) => {
    if (!dbAvailable || !db) skip();
    const env = createTestApiEnv({ DATABASE_URL: databaseUrl });
    const { app } = await buildApiServer(env);

    const response = await app.inject({
      method: 'OPTIONS',
      url: '/api/v1/profile',
      headers: {
        origin: 'http://localhost:3004',
        'access-control-request-method': 'PUT',
        'access-control-request-headers': 'authorization,content-type',
      },
    });

    expect(response.statusCode).toBe(204);
    expect(response.headers['access-control-allow-methods']).toContain('PUT');
    expect(response.headers['access-control-allow-origin']).toBe('http://localhost:3004');
    await app.close();
  });

  it('rejects role=ADMIN in profile update body', async ({ skip }) => {
    if (!dbAvailable || !db) skip();
    const env = createTestApiEnv({ DATABASE_URL: databaseUrl });
    const { app } = await buildApiServer(env);
    const token = await signTestAccessToken(env, {
      sub: playerA,
      email: `a-${playerA}@test.local`,
    });

    const response = await app.inject({
      method: 'PUT',
      url: '/api/v1/profile',
      headers: { authorization: `Bearer ${token}` },
      payload: { role: 'ADMIN' },
    });

    expect(response.statusCode).toBe(400);
    await app.close();
  });
});
