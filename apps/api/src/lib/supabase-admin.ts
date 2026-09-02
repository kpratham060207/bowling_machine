import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { ApiEnv } from '../config/env.js';

/**
 * Supabase admin client — uses the service role key.
 *
 * SECURITY: This client bypasses RLS and can manage auth users.
 * Instantiate only in trusted server-side code; never import from frontend.
 */
export function createSupabaseAdminClient(env: ApiEnv): SupabaseClient {
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }) as SupabaseClient;
}
