import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';
import type { ApiEnv } from '../config/env.js';

export type VerifiedSupabaseJwt = JWTPayload & {
  sub: string;
  email?: string;
  role?: string;
};

/**
 * Verifies Supabase-issued access tokens.
 *
 * Trust boundary: only tokens signed by Supabase and passing issuer/audience checks
 * are accepted. Client-supplied user IDs in request bodies are never trusted instead.
 */
export class JwtVerifier {
  private readonly jwtSecret: Uint8Array;
  private readonly issuer: string;
  private readonly audience = 'authenticated';
  private jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

  constructor(private readonly env: ApiEnv) {
    this.jwtSecret = new TextEncoder().encode(env.SUPABASE_JWT_SECRET);
    this.issuer = `${env.SUPABASE_URL.replace(/\/$/, '')}/auth/v1`;
  }

  /**
   * Validates Bearer token signature and standard Supabase claims.
   * Tries HS256 (JWT secret) first, then JWKS for asymmetric project configs.
   *
   * In test mode, JWKS fallback is disabled — integration tests must not depend on
   * external Supabase network calls; failures surface as explicit auth errors instead.
   */
  async verifyAccessToken(token: string): Promise<VerifiedSupabaseJwt> {
    try {
      const { payload } = await jwtVerify(token, this.jwtSecret, {
        issuer: this.issuer,
        audience: this.audience,
      });
      if (!payload.sub) {
        throw new Error('JWT missing subject');
      }
      return payload as VerifiedSupabaseJwt;
    } catch (secretError) {
      if (this.env.NODE_ENV === 'test') {
        throw secretError;
      }

      const message = secretError instanceof Error ? secretError.message : String(secretError);
      const isSignatureIssue =
        message.includes('signature') || message.includes('alg') || message.includes('Unsupported');

      if (!isSignatureIssue) {
        throw secretError;
      }

      if (!this.jwks) {
        this.jwks = createRemoteJWKSet(new URL(`${this.issuer}/.well-known/jwks.json`));
      }
      const { payload } = await jwtVerify(token, this.jwks, {
        issuer: this.issuer,
        audience: this.audience,
      });
      if (!payload.sub) {
        throw new Error('JWT missing subject');
      }
      return payload as VerifiedSupabaseJwt;
    }
  }
}
