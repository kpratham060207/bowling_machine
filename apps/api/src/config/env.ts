import { z } from 'zod';

/**
 * Server environment validation — fails fast at startup if required secrets are missing.
 * PUBLIC_* variables belong in the frontend only; never read them here for privileged ops.
 */
const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_HOST: z.string().default('0.0.0.0'),
  API_PORT: z.coerce.number().int().positive().default(4000),
  API_LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  DATABASE_URL: z.string().min(1),
  /** Supabase project URL — used for JWT issuer validation and admin client base URL. */
  SUPABASE_URL: z.string().url(),
  /**
   * Service role key — SERVER ONLY. Used for registration provisioning and admin auth ops.
   * Never expose to browser, ESP32, or frontend bundles.
   */
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  /**
   * JWT secret from Supabase project settings — used to verify Bearer tokens on API requests.
   * SERVER ONLY — not the anon key.
   */
  SUPABASE_JWT_SECRET: z.string().min(1),
  /** Default TTL for machine commands before they are rejected as stale. */
  MACHINE_COMMAND_TTL_MS: z.coerce.number().int().positive().default(30_000),
  /** Exclusive control lock duration — abandoned locks expire and can be reclaimed. */
  MACHINE_CONTROL_LOCK_TTL_MS: z.coerce.number().int().positive().default(1_800_000),
  /** Expected machine heartbeat interval from peer (simulator/ESP32). */
  MACHINE_HEARTBEAT_INTERVAL_MS: z.coerce.number().int().positive().default(5_000),
  /** Mark connection degraded/offline when heartbeat missing for this duration. */
  MACHINE_HEARTBEAT_TIMEOUT_MS: z.coerce.number().int().positive().default(15_000),
  /** Wait this long for machine command acknowledgement before failing the API request. */
  MACHINE_COMMAND_ACK_TIMEOUT_MS: z.coerce.number().int().positive().default(10_000),
});

export type ApiEnv = z.infer<typeof EnvSchema>;

/** Parsed environment for the API process. Throws if required variables are absent. */
export function loadApiEnv(): ApiEnv {
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const message = parsed.error.issues.map((issue) => issue.path.join('.')).join(', ');
    throw new Error(`Invalid API environment configuration: ${message}`);
  }
  return parsed.data;
}
