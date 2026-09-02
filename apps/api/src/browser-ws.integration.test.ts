import WebSocket from 'ws';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  machineAccess,
  machineRegistrations,
  machines,
  profiles,
  runMigrations,
  users,
  DEV_SIMULATOR_CONNECTION_SECRET_HASH,
  getDatabaseUrl,
} from '@bowling-machine/database';
import { randomUUID } from 'node:crypto';
import { SignJWT } from 'jose';
import { buildApiServer } from './server.js';
import { createTestApiEnv, signTestAccessToken } from './test/test-helpers.js';
import type { WebSocketEvent } from '@bowling-machine/api-contracts';
import { webSocketDataToString } from './lib/ws-data.js';

const databaseUrl = getDatabaseUrl();
let dbAvailable = false;
let port = 0;
let server: Awaited<ReturnType<typeof buildApiServer>> | undefined;

const playerA = randomUUID();
const playerB = randomUUID();
const machineA = randomUUID();

function parseJson(response: { json: () => unknown }): unknown {
  return response.json();
}

/** Builds a Supabase-shaped SSR auth cookie for WebSocket cookie-auth tests. */
function buildSupabaseAuthCookie(
  accessToken: string,
  projectRef: string,
  userId: string,
): string {
  const payload = JSON.stringify({
    access_token: accessToken,
    refresh_token: 'test-refresh-token',
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    expires_in: 3600,
    token_type: 'bearer',
    user: {
      id: userId,
      aud: 'authenticated',
      role: 'authenticated',
      email: `${userId}@test.local`,
    },
  });
  const encoded = `base64-${Buffer.from(payload, 'utf8').toString('base64url')}`;
  return `sb-${projectRef}-auth-token=${encoded}`;
}

beforeAll(async () => {
  try {
    await runMigrations(databaseUrl);
    const env = createTestApiEnv();
    server = await buildApiServer(env);
    await server.app.listen({ host: '127.0.0.1', port: 0 });
    const address = server.app.server.address();
    if (typeof address === 'object' && address) {
      port = address.port;
    }

    await server.db.insert(users).values([
      { id: playerA, email: `a-${playerA}@test.local`, role: 'PLAYER' },
      { id: playerB, email: `b-${playerB}@test.local`, role: 'PLAYER' },
    ]);
    await server.db.insert(profiles).values([
      { userId: playerA, displayName: 'WS Test A' },
      { userId: playerB, displayName: 'WS Test B' },
    ]);
    await server.db.insert(machines).values({
      id: machineA,
      name: 'WS Test Machine',
      serialNumber: `WS-${machineA.slice(0, 8)}`,
      kind: 'SIMULATOR',
      protocolVersion: '1.0',
    });
    await server.db.insert(machineRegistrations).values({
      machineId: machineA,
      qrCodeToken: `qr-ws-${machineA.slice(0, 8)}`,
      connectionSecretHash: DEV_SIMULATOR_CONNECTION_SECRET_HASH,
    });
    await server.db.insert(machineAccess).values({ userId: playerA, machineId: machineA });

    dbAvailable = true;
  } catch {
    dbAvailable = false;
  }
}, 60_000);

afterAll(async () => {
  if (server) {
    await server.app.close();
  }
});

describe('browser WebSocket authentication', () => {
  it('rejects unauthenticated connections that send no ticket', async ({ skip }) => {
    if (!dbAvailable || !server) {
      skip();
      return;
    }

    await new Promise<void>((resolve, reject) => {
      const ws = new WebSocket(`ws://127.0.0.1:${String(port)}/ws/browser`);
      ws.on('open', () => {
        /* wait for timeout close */
      });
      ws.on('message', (data) => {
        const message = JSON.parse(webSocketDataToString(data)) as { type?: string };
        if (message.type === 'error') {
          ws.close();
          resolve();
        }
      });
      ws.on('error', reject);
      setTimeout(() => {
        reject(new Error('Expected auth timeout'));
      }, 7000);
    });
  }, 10_000);

  it('rejects query-string access tokens', async ({ skip }) => {
    if (!dbAvailable || !server) {
      skip();
      return;
    }

    const token = await signTestAccessToken(createTestApiEnv(), { sub: playerA });

    await new Promise<void>((resolve, reject) => {
      const ws = new WebSocket(`ws://127.0.0.1:${String(port)}/ws/browser?access_token=${token}`);
      ws.on('message', (data) => {
        const message = JSON.parse(webSocketDataToString(data)) as {
          type?: string;
          message?: string;
        };
        expect(message.type).toBe('error');
        expect(message.message).toContain('Query-string tokens are not accepted');
        ws.close();
        resolve();
      });
      ws.on('error', reject);
    });
  });

  it('accepts authenticated ticket in first message', async ({ skip }) => {
    if (!dbAvailable || !server) {
      skip();
      return;
    }

    const bearer = await signTestAccessToken(createTestApiEnv(), { sub: playerA });
    const ticketResponse = await server.app.inject({
      method: 'POST',
      url: '/ws/browser/ticket',
      headers: { authorization: `Bearer ${bearer}` },
    });
    expect(ticketResponse.statusCode).toBe(200);
    const ticket = (parseJson(ticketResponse) as { data: { ticket: string } }).data.ticket;

    await new Promise<void>((resolve, reject) => {
      const ws = new WebSocket(`ws://127.0.0.1:${String(port)}/ws/browser`);
      ws.on('open', () => {
        ws.send(JSON.stringify({ type: 'authenticate', ticket }));
      });
      ws.on('message', (data) => {
        const message = JSON.parse(webSocketDataToString(data)) as {
          type?: string;
          payload?: { user_id?: string };
        };
        if (message.type === 'connected') {
          expect(message.payload?.user_id).toBe(playerA);
          ws.close();
          resolve();
        }
      });
      ws.on('error', reject);
    });
  });

  it('rejects invalid ticket', async ({ skip }) => {
    if (!dbAvailable || !server) {
      skip();
      return;
    }

    await new Promise<void>((resolve, reject) => {
      const ws = new WebSocket(`ws://127.0.0.1:${String(port)}/ws/browser`);
      ws.on('open', () => {
        ws.send(JSON.stringify({ type: 'authenticate', ticket: randomUUID() }));
      });
      ws.on('message', (data) => {
        const message = JSON.parse(webSocketDataToString(data)) as { type?: string };
        if (message.type === 'error') {
          ws.close();
          resolve();
        }
      });
      ws.on('error', reject);
    });
  });

  it('accepts Supabase SSR session cookie on upgrade when present', async ({ skip }) => {
    if (!dbAvailable || !server) {
      skip();
      return;
    }

    const env = createTestApiEnv();
    const token = await signTestAccessToken(env, { sub: playerA });
    const projectRef = new URL(env.SUPABASE_URL).hostname.split('.')[0] ?? 'test-project';
    const cookie = buildSupabaseAuthCookie(token, projectRef, playerA);

    await new Promise<void>((resolve, reject) => {
      const ws = new WebSocket(`ws://127.0.0.1:${String(port)}/ws/browser`, {
        headers: { Cookie: cookie },
      });
      ws.on('message', (data) => {
        const message = JSON.parse(webSocketDataToString(data)) as {
          type?: string;
          payload?: { user_id?: string };
        };
        if (message.type === 'connected') {
          expect(message.payload?.user_id).toBe(playerA);
          ws.close();
          resolve();
        }
      });
      ws.on('error', reject);
      setTimeout(() => {
        reject(new Error('Cookie auth did not connect'));
      }, 8000);
    });
  }, 10_000);

  it('filters events to machines the player may access', async ({ skip }) => {
    if (!dbAvailable || !server) {
      skip();
      return;
    }

    const bearer = await signTestAccessToken(createTestApiEnv(), { sub: playerB });
    const ticketResponse = await server.app.inject({
      method: 'POST',
      url: '/ws/browser/ticket',
      headers: { authorization: `Bearer ${bearer}` },
    });
    const ticket = (parseJson(ticketResponse) as { data: { ticket: string } }).data.ticket;

    const received: WebSocketEvent[] = [];

    await new Promise<void>((resolve, reject) => {
      const ws = new WebSocket(`ws://127.0.0.1:${String(port)}/ws/browser`);
      ws.on('open', () => {
        ws.send(JSON.stringify({ type: 'authenticate', ticket }));
      });
      ws.on('message', (data) => {
        const message = JSON.parse(webSocketDataToString(data)) as {
          event_type?: string;
          type?: string;
          payload?: { subscribed_machines?: string[] };
        };
        if (message.type === 'connected') {
          expect(message.payload?.subscribed_machines ?? []).not.toContain(machineA);
          if (!server) {
            reject(new Error('Server unavailable'));
            return;
          }
          server.eventBus.publish({
            event_id: randomUUID(),
            event_type: 'MACHINE_STATE_CHANGED',
            timestamp: new Date().toISOString(),
            payload: {
              machine_id: machineA,
              previous_state: 'READY',
              new_state: 'HOMING',
            },
          });
          setTimeout(() => {
            ws.close();
            resolve();
          }, 300);
          return;
        }
        if (message.event_type) {
          received.push(message as WebSocketEvent);
        }
      });
      ws.on('error', reject);
    });

    expect(received.some((event) => event.event_type === 'MACHINE_STATE_CHANGED')).toBe(false);
  }, 10_000);
});

describe('browser WebSocket expired JWT via cookie', () => {
  it('rejects expired session cookie and falls back to ticket requirement', async ({ skip }) => {
    if (!dbAvailable || !server) {
      skip();
      return;
    }

    const env = createTestApiEnv();
    const secret = new TextEncoder().encode(env.SUPABASE_JWT_SECRET);
    const expiredToken = await new SignJWT({ email: 'expired@test.local', role: 'authenticated' })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(playerA)
      .setIssuer(`${env.SUPABASE_URL}/auth/v1`)
      .setAudience('authenticated')
      .setExpirationTime('1s')
      .sign(secret);

    await new Promise((resolve) => setTimeout(resolve, 1100));

    const projectRef = new URL(env.SUPABASE_URL).hostname.split('.')[0] ?? 'test-project';
    const cookie = buildSupabaseAuthCookie(expiredToken, projectRef, playerA);

    await new Promise<void>((resolve, reject) => {
      const ws = new WebSocket(`ws://127.0.0.1:${String(port)}/ws/browser`, {
        headers: { Cookie: cookie },
      });
      let sawTimeout = false;
      ws.on('message', (data) => {
        const message = JSON.parse(webSocketDataToString(data)) as { type?: string };
        if (message.type === 'error') {
          sawTimeout = true;
          ws.close();
          resolve();
        }
      });
      ws.on('error', reject);
      setTimeout(() => {
        if (!sawTimeout) {
          reject(new Error('Expected auth failure'));
        }
      }, 7000);
    });
  }, 10_000);
});
