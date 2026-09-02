/**
 * Shared primitive schemas used across application and machine contracts.
 * Keep transport-agnostic — no HTTP or ORM specifics here.
 */
import { z } from 'zod';

/** UUID v4 string used for entity identifiers (players, machines, sessions, deliveries). */
export const EntityIdSchema = z.string().uuid({ message: 'Expected a UUID entity identifier' });

/** Identifier for a machine command — supports idempotency and acknowledgement correlation. */
export const CommandIdSchema = z.string().uuid({ message: 'Expected a UUID command identifier' });

/** ISO-8601 UTC timestamp string (e.g. from `Date.toISOString()`). */
export const TimestampSchema = z
  .string()
  .datetime({ message: 'Expected an ISO-8601 UTC timestamp' });

/**
 * Normalized coordinate in the interactive pitch or UI domain.
 * Range 0.0–1.0 inclusive. NOT screen pixels.
 */
export const NormalizedCoordinateSchema = z
  .number()
  .min(0, 'Normalized coordinate must be >= 0')
  .max(1, 'Normalized coordinate must be <= 1');

export type EntityId = z.infer<typeof EntityIdSchema>;
export type CommandId = z.infer<typeof CommandIdSchema>;
export type Timestamp = z.infer<typeof TimestampSchema>;
export type NormalizedCoordinate = z.infer<typeof NormalizedCoordinateSchema>;
