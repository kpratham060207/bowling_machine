import { SignJWT } from 'jose';
import type { ApiEnv } from '../config/env.js';

/** Test-only environment — never use real Supabase credentials in unit tests. */
export function createTestApiEnv(overrides: Partial<ApiEnv> = {}): ApiEnv {
  return {
    NODE_ENV: 'test',
    API_HOST: '127.0.0.1',
    API_PORT: 0,
    API_LOG_LEVEL: 'error',
    DATABASE_URL:
      process.env['DATABASE_URL'] ?? 'postgresql://bowling:changeme@localhost:5432/bowling_machine',
    SUPABASE_URL: 'https://test-project.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key-not-real',
    SUPABASE_JWT_SECRET: 'test-jwt-secret-for-vitest-only-32chars',
    ...overrides,
  };
}

/** Signs a Supabase-shaped access token for integration tests. */
export async function signTestAccessToken(
  env: ApiEnv,
  claims: { sub: string; email?: string },
): Promise<string> {
  const secret = new TextEncoder().encode(env.SUPABASE_JWT_SECRET);
  return new SignJWT({
    email: claims.email ?? `${claims.sub}@test.local`,
    role: 'authenticated',
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(claims.sub)
    .setIssuer(`${env.SUPABASE_URL}/auth/v1`)
    .setAudience('authenticated')
    .setExpirationTime('1h')
    .sign(secret);
}
