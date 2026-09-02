/**
 * Database integration tests — require PostgreSQL (docker compose).
 * Skips individual tests when DATABASE_URL host is unreachable.
 */
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createDatabase, getDatabaseUrl, runMigrations } from './index';
import {
  calibrationProfiles,
  deliveries,
  faults,
  machineAccess,
  machineCommands,
  machines,
  practiceSessions,
  profiles,
  telemetrySamples,
  users,
} from './schema/index';

const databaseUrl = getDatabaseUrl();
let dbAvailable = false;
let db: ReturnType<typeof createDatabase>['db'] | undefined;
let sql: ReturnType<typeof createDatabase>['sql'] | undefined;

beforeAll(async () => {
  try {
    await runMigrations(databaseUrl);
    const connection = createDatabase(databaseUrl);
    db = connection.db;
    sql = connection.sql;
    await sql`SELECT 1`;
    dbAvailable = true;
  } catch {
    dbAvailable = false;
    console.warn('[database.test] PostgreSQL unavailable — skipping integration tests');
  }
});

afterAll(async () => {
  if (sql) {
    await sql.end();
  }
});

describe('database persistence layer', () => {
  const testUserId = randomUUID();
  const testMachineId = randomUUID();
  const testSessionId = randomUUID();
  const testCommandId = randomUUID();
  const testDeliveryId = randomUUID();
  const otherUserId = randomUUID();

  it('persists player profile with batting_hand and bowling_hand', async ({ skip }) => {
    if (!dbAvailable || !db) skip();

    await db.insert(users).values({
      id: testUserId,
      email: `test-${testUserId}@example.local`,
      role: 'PLAYER',
    });

    const [profile] = await db
      .insert(profiles)
      .values({
        userId: testUserId,
        displayName: 'Test Player',
        battingHand: 'LEFT',
        bowlingHand: 'RIGHT',
        practiceGoals: ['cover drive'],
      })
      .returning();

    expect(profile?.battingHand).toBe('LEFT');
    expect(profile?.bowlingHand).toBe('RIGHT');
  });

  it('persists machine and access relationship', async ({ skip }) => {
    if (!dbAvailable || !db) skip();

    await db.insert(machines).values({
      id: testMachineId,
      name: 'Test Machine',
      serialNumber: `TEST-${testMachineId.slice(0, 8)}`,
      kind: 'SIMULATOR',
      protocolVersion: '1.0',
    });

    await db.insert(machineAccess).values({
      userId: testUserId,
      machineId: testMachineId,
    });

    const access = await db
      .select()
      .from(machineAccess)
      .where(eq(machineAccess.userId, testUserId));

    expect(access).toHaveLength(1);
    expect(access[0]?.machineId).toBe(testMachineId);
  });

  it('retains requested and calculated delivery values separately', async ({ skip }) => {
    if (!dbAvailable || !db) skip();

    await db.insert(practiceSessions).values({
      id: testSessionId,
      userId: testUserId,
      machineId: testMachineId,
      status: 'ACTIVE',
      totalBallsPlanned: 2,
    });

    await db.insert(deliveries).values({
      id: testDeliveryId,
      sessionId: testSessionId,
      sequenceNumber: 1,
      targetX: '0.5',
      targetY: '0.5',
      desiredSpeedKmh: '120.00',
      ballType: 'FAST',
      numberOfBalls: 6,
      firstBallDelayMs: 0,
      intervalMs: 3000,
      calculatedParameters: {
        wheel1_target_rpm: 1500,
        wheel2_target_rpm: 1400,
        actuator1_target_position: null,
        actuator2_target_position: null,
        actuator3_target_position: null,
        actuator4_target_position: null,
        feeder_delay_ms: null,
        ball_count: 6,
        first_ball_delay_ms: 0,
        interval_ms: 3000,
      },
    });

    const [row] = await db.select().from(deliveries).where(eq(deliveries.id, testDeliveryId));

    expect(row?.targetX).toBe('0.5000');
    expect(row?.desiredSpeedKmh).toBe('120.00');
    expect(row?.calculatedParameters?.wheel1_target_rpm).toBe(1500);
  });

  it('enforces unique delivery sequence per session', async ({ skip }) => {
    if (!dbAvailable || !db) skip();

    await expect(
      db.insert(deliveries).values({
        sessionId: testSessionId,
        sequenceNumber: 1,
        targetX: '0.6',
        targetY: '0.6',
        desiredSpeedKmh: '100.00',
        ballType: 'SLOW',
        numberOfBalls: 1,
        firstBallDelayMs: 0,
        intervalMs: 1000,
      }),
    ).rejects.toThrow();
  });

  it('persists machine command with JSONB payload', async ({ skip }) => {
    if (!dbAvailable || !db) skip();

    await db.insert(machineCommands).values({
      id: testCommandId,
      machineId: testMachineId,
      commandType: 'THROW_SEQUENCE',
      protocolVersion: '1.0',
      issuedAt: new Date().toISOString(),
      payload: {
        command_type: 'THROW_SEQUENCE',
        delivery_count: 6,
      },
      status: 'DISPATCHED',
      sessionId: testSessionId,
    });

    const [cmd] = await db
      .select()
      .from(machineCommands)
      .where(eq(machineCommands.id, testCommandId));

    expect(cmd?.commandType).toBe('THROW_SEQUENCE');
    expect(cmd?.payload).toMatchObject({ delivery_count: 6 });
  });

  it('persists telemetry and fault records', async ({ skip }) => {
    if (!dbAvailable || !db) skip();

    const [telemetry] = await db
      .insert(telemetrySamples)
      .values({
        machineId: testMachineId,
        state: 'READY',
        wheel1CurrentRpm: '0',
        wheel2CurrentRpm: '0',
        emergencyStopActive: false,
        sessionId: testSessionId,
        deliveryId: testDeliveryId,
      })
      .returning();

    expect(telemetry?.state).toBe('READY');

    const [fault] = await db
      .insert(faults)
      .values({
        machineId: testMachineId,
        faultCode: 'UNCALIBRATED',
        severity: 'WARNING',
        message: 'Machine not calibrated',
        recoverable: true,
        deliveryId: testDeliveryId,
        sessionId: testSessionId,
      })
      .returning();

    expect(fault?.faultCode).toBe('UNCALIBRATED');
  });

  it('persists calibration profile', async ({ skip }) => {
    if (!dbAvailable || !db) skip();

    const [profile] = await db
      .insert(calibrationProfiles)
      .values({
        machineId: testMachineId,
        calibrationType: 'speed_rpm',
        version: 1,
        status: 'DRAFT',
        data: { _simulation: true, mappings: [] },
      })
      .returning();

    expect(profile?.calibrationType).toBe('speed_rpm');
  });

  it('isolates player data via foreign keys', async ({ skip }) => {
    if (!dbAvailable || !db) skip();

    await db.insert(users).values({
      id: otherUserId,
      email: `other-${otherUserId}@example.local`,
      role: 'PLAYER',
    });

    await expect(
      db.insert(practiceSessions).values({
        userId: otherUserId,
        machineId: randomUUID(),
        status: 'ACTIVE',
      }),
    ).rejects.toThrow();
  });
});

describe('database package exports', () => {
  it('exports schema and connection utilities', async () => {
    const mod = await import('./index');
    expect(mod.schema).toBeDefined();
    expect(mod.createDatabase).toBeTypeOf('function');
    expect(mod.runMigrations).toBeTypeOf('function');
    expect(mod.seedDevelopmentData).toBeTypeOf('function');
  });
});
