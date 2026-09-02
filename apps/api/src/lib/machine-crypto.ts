import { createHash, timingSafeEqual } from 'node:crypto';

/**
 * Hash a machine WebSocket connection secret for storage in machine_registrations.
 * Phase 1E uses SHA-256 hex (not bcrypt) for simplicity in dev/test tooling.
 * UD-21 final peer auth model remains provisional.
 */
export function hashMachineConnectionSecret(secret: string): string {
  return createHash('sha256').update(secret, 'utf8').digest('hex');
}

/** Constant-time comparison of a plaintext secret against a stored hash. */
export function verifyMachineConnectionSecret(secret: string, storedHash: string): boolean {
  const computed = hashMachineConnectionSecret(secret);
  if (computed.length !== storedHash.length) {
    return false;
  }
  return timingSafeEqual(Buffer.from(computed), Buffer.from(storedHash));
}

/** ISO timestamp helpers used across machine services. */
export function nowIso(): string {
  return new Date().toISOString();
}

export function addMilliseconds(iso: string, ms: number): string {
  return new Date(new Date(iso).getTime() + ms).toISOString();
}

export function isExpired(iso: string | undefined | null): boolean {
  if (!iso) {
    return false;
  }
  return new Date(iso).getTime() <= Date.now();
}
