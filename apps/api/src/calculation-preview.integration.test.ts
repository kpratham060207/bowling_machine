import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { count } from 'drizzle-orm';
import {
  createDatabase,
  getDatabaseUrl,
  machineAccess,
  machineCommands,
  machineRegistrations,
  machines,
  profiles,
  runMigrations,
  users,
} from '@bowling-machine/database';
import { buildApiServer } from './server.js';
import type { ApiEnv } from './config/env.js';
import { createTestApiEnv, signTestAccessToken } from './test/test-helpers.js';

type PreviewResponseBody = {
  data: {
    preview: boolean;
    result_mode: string;
    machine_id: string | null;
    validation: { valid: boolean; errors: Array<{ code: string; message: string }> };
    calculated: {
      wheel1_target_rpm: number;
      wheel2_target_rpm: number;
      ball_count: number;
    } | null;
    calibration: {
      simulation: boolean;
      is_simulation_fallback: boolean;
    } | null;
  };
};

function parsePreviewResponse(response: { json: () => unknown }): PreviewResponseBody {
  return response.json() as PreviewResponseBody;
}

const databaseUrl = getDatabaseUrl();
let dbAvailable = false;
let testEnv: ApiEnv = createTestApiEnv();
let server: Awaited<ReturnType<typeof buildApiServer>> | undefined;

const playerA = randomUUID();
const playerB = randomUUID();
const machineA = randomUUID();

const validPreviewBody = {
  machine_id: machineA,
  target_x: 0.5,
  target_y: 0.5,
  desired_speed_kmh: 120,
  ball_type: 'FAST' as const,
  number_of_balls: 6,
  first_ball_delay_ms: 3000,
  interval_ms: 8000,
};

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
      { id: playerA, email: `preview-a-${playerA}@test.local`, role: 'PLAYER' },
      { id: playerB, email: `preview-b-${playerB}@test.local`, role: 'PLAYER' },
    ]);
    await db.insert(profiles).values([
      { userId: playerA, displayName: 'Preview Test A' },
      { userId: playerB, displayName: 'Preview Test B' },
    ]);

    await db.insert(machines).values({
      id: machineA,
      name: 'Preview Simulator',
      serialNumber: `SIM-PREV-${machineA.slice(0, 8)}`,
      kind: 'SIMULATOR',
      protocolVersion: '1.0',
    });

    await db.insert(machineRegistrations).values({
      machineId: machineA,
      qrCodeToken: `qr-preview-${machineA.slice(0, 8)}`,
      connectionSecretHash: 'unused-for-preview',
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

describe('calculation preview', () => {
  function requireServer(ctx: { skip: () => void }): NonNullable<typeof server> {
    if (!dbAvailable || !server) {
      ctx.skip();
      throw new Error('skipped');
    }
    return server;
  }

  it('returns calculated parameters for valid input without machine connection', async (ctx) => {
    const activeServer = requireServer(ctx);
    const token = await signTestAccessToken(testEnv, { sub: playerA });
    const response = await activeServer.app.inject({
      method: 'POST',
      url: '/api/v1/calculation/preview',
      headers: { authorization: `Bearer ${token}` },
      payload: validPreviewBody,
    });

    expect(response.statusCode).toBe(200);
    const body = parsePreviewResponse(response);
    expect(body.data.preview).toBe(true);
    expect(body.data.result_mode).toBe('SIMULATION');
    expect(body.data.validation.valid).toBe(true);
    expect(body.data.validation.errors).toEqual([]);
    expect(body.data.calculated).not.toBeNull();
    expect(typeof body.data.calculated?.wheel1_target_rpm).toBe('number');
    expect(typeof body.data.calculated?.wheel2_target_rpm).toBe('number');
    expect(body.data.calculated?.ball_count).toBe(6);
    expect(body.data.calibration).toEqual(
      expect.objectContaining({ simulation: true, is_simulation_fallback: true }),
    );
    expect(body.data.machine_id).toBe(machineA);
  });

  it('calculates without machine_id for software-only mode', async (ctx) => {
    const activeServer = requireServer(ctx);
    const token = await signTestAccessToken(testEnv, { sub: playerA });
    const withoutMachine = {
      target_x: validPreviewBody.target_x,
      target_y: validPreviewBody.target_y,
      desired_speed_kmh: validPreviewBody.desired_speed_kmh,
      ball_type: validPreviewBody.ball_type,
      number_of_balls: validPreviewBody.number_of_balls,
      first_ball_delay_ms: validPreviewBody.first_ball_delay_ms,
      interval_ms: validPreviewBody.interval_ms,
    };
    const response = await activeServer.app.inject({
      method: 'POST',
      url: '/api/v1/calculation/preview',
      headers: { authorization: `Bearer ${token}` },
      payload: withoutMachine,
    });

    expect(response.statusCode).toBe(200);
    const body = parsePreviewResponse(response);
    expect(body.data.validation.valid).toBe(true);
    expect(body.data.result_mode).toBe('SIMULATION');
    expect(body.data.machine_id).toBeNull();
    expect(body.data.calculated).not.toBeNull();
  });

  it('does not create machine commands', async (ctx) => {
    const activeServer = requireServer(ctx);

    const beforeRows = await activeServer.db.select({ value: count() }).from(machineCommands);
    const beforeCount = beforeRows[0]?.value ?? 0;

    const token = await signTestAccessToken(testEnv, { sub: playerA });
    await activeServer.app.inject({
      method: 'POST',
      url: '/api/v1/calculation/preview',
      headers: { authorization: `Bearer ${token}` },
      payload: validPreviewBody,
    });

    const afterRows = await activeServer.db.select({ value: count() }).from(machineCommands);
    const afterCount = afterRows[0]?.value ?? 0;

    expect(afterCount).toBe(beforeCount);
  });

  it('returns validation failure for invalid ball type', async (ctx) => {
    const activeServer = requireServer(ctx);

    const token = await signTestAccessToken(testEnv, { sub: playerA });
    const response = await activeServer.app.inject({
      method: 'POST',
      url: '/api/v1/calculation/preview',
      headers: { authorization: `Bearer ${token}` },
      payload: { ...validPreviewBody, ball_type: 'GOOGLY' },
    });

    expect(response.statusCode).toBe(400);
  });

  it('returns calculation failure for unsafe interval without machine command', async (ctx) => {
    const activeServer = requireServer(ctx);

    const token = await signTestAccessToken(testEnv, { sub: playerA });
    const response = await activeServer.app.inject({
      method: 'POST',
      url: '/api/v1/calculation/preview',
      headers: { authorization: `Bearer ${token}` },
      payload: { ...validPreviewBody, interval_ms: 100 },
    });

    expect(response.statusCode).toBe(200);
    const body = parsePreviewResponse(response);
    expect(body.data.validation.valid).toBe(false);
    expect(body.data.validation.errors.length).toBeGreaterThan(0);
    expect(body.data.calculated).toBeNull();
  });

  it('produces different wheel RPM for different speeds', async (ctx) => {
    const activeServer = requireServer(ctx);

    const token = await signTestAccessToken(testEnv, { sub: playerA });

    const slow = await activeServer.app.inject({
      method: 'POST',
      url: '/api/v1/calculation/preview',
      headers: { authorization: `Bearer ${token}` },
      payload: { ...validPreviewBody, desired_speed_kmh: 80 },
    });
    const fast = await activeServer.app.inject({
      method: 'POST',
      url: '/api/v1/calculation/preview',
      headers: { authorization: `Bearer ${token}` },
      payload: { ...validPreviewBody, desired_speed_kmh: 140 },
    });

    const slowBody = parsePreviewResponse(slow);
    const fastBody = parsePreviewResponse(fast);

    expect(slowBody.data.calculated?.wheel1_target_rpm).toBeLessThan(
      fastBody.data.calculated?.wheel1_target_rpm ?? 0,
    );
  });

  it('produces distinguishable outputs for different ball types', async (ctx) => {
    const activeServer = requireServer(ctx);

    const token = await signTestAccessToken(testEnv, { sub: playerA });

    const fast = await activeServer.app.inject({
      method: 'POST',
      url: '/api/v1/calculation/preview',
      headers: { authorization: `Bearer ${token}` },
      payload: { ...validPreviewBody, ball_type: 'FAST' },
    });
    const inswing = await activeServer.app.inject({
      method: 'POST',
      url: '/api/v1/calculation/preview',
      headers: { authorization: `Bearer ${token}` },
      payload: { ...validPreviewBody, ball_type: 'INSWING' },
    });

    const fastBody = parsePreviewResponse(fast);
    const inswingBody = parsePreviewResponse(inswing);

    expect(fastBody.data.calculated?.wheel2_target_rpm).not.toBe(
      inswingBody.data.calculated?.wheel2_target_rpm,
    );
  });

  it('rejects access to machines the player does not own', async (ctx) => {
    const activeServer = requireServer(ctx);

    const token = await signTestAccessToken(testEnv, { sub: playerB });
    const response = await activeServer.app.inject({
      method: 'POST',
      url: '/api/v1/calculation/preview',
      headers: { authorization: `Bearer ${token}` },
      payload: validPreviewBody,
    });

    expect(response.statusCode).toBe(403);
  });

  it('requires authentication', async (ctx) => {
    const activeServer = requireServer(ctx);

    const response = await activeServer.app.inject({
      method: 'POST',
      url: '/api/v1/calculation/preview',
      payload: validPreviewBody,
    });

    expect(response.statusCode).toBe(401);
  });
});
