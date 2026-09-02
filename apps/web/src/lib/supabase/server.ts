import { createServerClient } from '@supabase/ssr';
import type { Session, SupabaseClient, User } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

function getSupabasePublicEnv(): { url: string; anonKey: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    return null;
  }
  return { url, anonKey };
}

/**
 * Server-side Supabase client for Server Components and Route Handlers.
 * Reads/writes auth cookies — the secure session store for Next.js App Router.
 */
export async function createClient(): Promise<SupabaseClient> {
  const env = getSupabasePublicEnv();
  if (!env) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }

  const cookieStore = await cookies();

  return createServerClient(env.url, env.anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // setAll from Server Component — middleware handles refresh.
        }
      },
    },
  });
}

/** Returns the current Supabase session on the server, if any. */
export async function getServerSession(): Promise<Session | null> {
  const env = getSupabasePublicEnv();
  if (!env) {
    return null;
  }

  const supabase = await createClient();
  const { data } = await supabase.auth.getSession();
  return data.session;
}

/** Returns the current authenticated user on the server, if any. */
export async function getServerUser(): Promise<User | null> {
  const env = getSupabasePublicEnv();
  if (!env) {
    return null;
  }

  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data.user;
}
