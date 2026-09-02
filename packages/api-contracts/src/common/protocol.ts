/**
 * Protocol versioning for machine communication contracts.
 *
 * Versioning strategy (Phase 1B):
 * - Major.minor string (e.g. "1.0")
 * - Peers MUST reject messages with an unsupported protocol_version
 * - Backward-compatible additions use optional fields within the same major version
 * - Breaking changes require incrementing major version and coordinated rollout
 */
import { z } from 'zod';

/** Initial machine protocol version implemented by these contracts. */
export const PROTOCOL_VERSION = '1.0' as const;

/** Supported protocol version for producers and consumers in this release. */
export const ProtocolVersionSchema = z.literal(PROTOCOL_VERSION);

/**
 * Parses a protocol version string for compatibility checks.
 * Does not imply the version is supported — use `isSupportedProtocolVersion`.
 */
export const ProtocolVersionStringSchema = z
  .string()
  .regex(/^\d+\.\d+$/, 'Protocol version must be major.minor (e.g. "1.0")');

export type ProtocolVersion = z.infer<typeof ProtocolVersionSchema>;

/** Returns true when the peer speaks a protocol version this package can process. */
export function isSupportedProtocolVersion(version: string): version is ProtocolVersion {
  return ProtocolVersionSchema.safeParse(version).success;
}
