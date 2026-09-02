import { describe, expect, it } from 'vitest';
import { JwtVerifier } from '../lib/jwt.js';
import { createTestApiEnv, signTestAccessToken } from '../test/test-helpers.js';

describe('JwtVerifier', () => {
  it('verifies test access tokens signed with JWT secret', async () => {
    const env = createTestApiEnv();
    const verifier = new JwtVerifier(env);
    const token = await signTestAccessToken(env, { sub: 'user-123', email: 'user@test.local' });

    const payload = await verifier.verifyAccessToken(token);
    expect(payload.sub).toBe('user-123');
    expect(payload.email).toBe('user@test.local');
  });

  it('rejects tampered tokens', async () => {
    const env = createTestApiEnv();
    const verifier = new JwtVerifier(env);
    const token = await signTestAccessToken(env, { sub: 'user-123' });

    await expect(verifier.verifyAccessToken(`${token}x`)).rejects.toThrow();
  });
});
