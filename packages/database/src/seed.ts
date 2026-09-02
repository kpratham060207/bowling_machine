/**
 * Development seed data — SIMULATION ONLY, not production credentials.
 *
 * Provides:
 * - One simulator machine with QR registration
 * - Placeholder calibration profile (no real physics values)
 * - One development user + profile (no Supabase auth — local dev only)
 */
import { eq } from 'drizzle-orm';
import { createDatabase, getDatabaseUrl } from './client';
import {
  calibrationProfiles,
  firmwareVersions,
  machineAccess,
  machineRegistrations,
  machines,
  practicePlanDeliveries,
  practicePlans,
  profiles,
  users,
} from './schema/index';

/** Known dev simulator connection secret — NOT for production (UD-21 provisional). */
export const DEV_SIMULATOR_CONNECTION_SECRET = 'dev-simulator-secret-001';

/** SHA-256 hex hash of DEV_SIMULATOR_CONNECTION_SECRET for machine_registrations. */
export const DEV_SIMULATOR_CONNECTION_SECRET_HASH =
  'c5d430e76d88c9ee0bf72f0d6a04543fd01024790eb165c976f2c4f377dd44cf';

/** Fixed UUIDs for reproducible local development. */
export const SEED_IDS = {
  devUser: '11111111-1111-4111-8111-111111111111',
  devMachine: '22222222-2222-4222-8222-222222222222',
  devFirmware: '33333333-3333-4333-8333-333333333333',
  devCalibration: '44444444-4444-4444-8444-444444444444',
  devRegistration: '55555555-5555-4555-8555-555555555555',
  devPracticePlan: '66666666-6666-4666-8666-666666666666',
} as const;

export async function seedDevelopmentData(databaseUrl = getDatabaseUrl()): Promise<void> {
  const { db, sql } = createDatabase(databaseUrl);

  try {
    await db
      .insert(firmwareVersions)
      .values({
        id: SEED_IDS.devFirmware,
        version: '0.1.0-simulator',
        releaseStatus: 'RELEASED',
        metadata: { label: 'ESP32 simulator placeholder', simulation: true },
      })
      .onConflictDoNothing();

    await db
      .insert(machines)
      .values({
        id: SEED_IDS.devMachine,
        name: 'Dev Simulator Lane 1',
        serialNumber: 'SIM-DEV-001',
        registryStatus: 'ACTIVE',
        kind: 'SIMULATOR',
        protocolVersion: '1.0',
        firmwareVersionId: SEED_IDS.devFirmware,
        lastKnownFirmwareVersion: '0.1.0-simulator',
        config: { simulation: true, note: 'Development simulator machine only' },
      })
      .onConflictDoNothing();

    await db
      .insert(machineRegistrations)
      .values({
        id: SEED_IDS.devRegistration,
        machineId: SEED_IDS.devMachine,
        qrCodeToken: 'dev-qr-token-simulator-001',
        /** SHA-256 hash of DEV_SIMULATOR_CONNECTION_SECRET — provisional UD-21 peer auth. */
        connectionSecretHash: DEV_SIMULATOR_CONNECTION_SECRET_HASH,
      })
      .onConflictDoNothing();

    await db
      .insert(calibrationProfiles)
      .values({
        id: SEED_IDS.devCalibration,
        machineId: SEED_IDS.devMachine,
        calibrationType: 'simulator_placeholder',
        version: 1,
        status: 'ACTIVE',
        data: {
          _simulation: true,
          _note: 'No real physics mappings — populated during hardware calibration',
          speed_rpm: null,
          position_trajectory: null,
        },
        notes: 'Development-only placeholder calibration profile',
      })
      .onConflictDoNothing();

    await db
      .insert(users)
      .values({
        id: SEED_IDS.devUser,
        email: 'dev-player@example.local',
        role: 'PLAYER',
      })
      .onConflictDoNothing();

    await db
      .insert(profiles)
      .values({
        userId: SEED_IDS.devUser,
        displayName: 'Dev Player',
        battingHand: 'RIGHT',
        bowlingHand: 'RIGHT',
        skillLevel: 'development',
        practiceGoals: ['local testing'],
        preferences: { locale: 'en-IN', simulation: true },
      })
      .onConflictDoUpdate({
        target: profiles.userId,
        set: { displayName: 'Dev Player', updatedAt: new Date().toISOString() },
      });

    const existingAccess = await db
      .select()
      .from(machineAccess)
      .where(eq(machineAccess.userId, SEED_IDS.devUser))
      .limit(1);

    if (existingAccess.length === 0) {
      await db.insert(machineAccess).values({
        userId: SEED_IDS.devUser,
        machineId: SEED_IDS.devMachine,
      });
    }

    /** Development practice plan — high-level requested parameters only (simulation values). */
    await db
      .insert(practicePlans)
      .values({
        id: SEED_IDS.devPracticePlan,
        userId: SEED_IDS.devUser,
        name: 'Dev Fast Practice',
        description: 'Development-only saved plan — not production calibration data',
      })
      .onConflictDoNothing();

    const existingPlanDeliveries = await db
      .select()
      .from(practicePlanDeliveries)
      .where(eq(practicePlanDeliveries.planId, SEED_IDS.devPracticePlan))
      .limit(1);

    if (existingPlanDeliveries.length === 0) {
      await db.insert(practicePlanDeliveries).values({
        planId: SEED_IDS.devPracticePlan,
        sequenceNumber: 1,
        targetX: '0.62',
        targetY: '0.73',
        desiredSpeedKmh: '120.00',
        ballType: 'FAST',
        numberOfBalls: 6,
        firstBallDelayMs: 3000,
        intervalMs: 8000,
      });
    }

    console.log('[database] seed complete (simulation data only)');
    console.log('[database]   machine:', SEED_IDS.devMachine);
    console.log('[database]   dev user:', SEED_IDS.devUser);
    console.log('[database]   practice plan:', SEED_IDS.devPracticePlan);
  } finally {
    await sql.end();
  }
}

if (process.argv[1]?.endsWith('seed.ts') || process.argv[1]?.endsWith('seed.js')) {
  seedDevelopmentData().catch((error: unknown) => {
    console.error('[database] seed failed:', error);
    process.exit(1);
  });
}
