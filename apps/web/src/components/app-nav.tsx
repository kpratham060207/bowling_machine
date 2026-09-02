import Link from 'next/link';
import { getServerSession } from '@/lib/supabase/server';
import { LogoutButton } from '@/components/auth-forms';

/**
 * Top navigation — reflects server-side session state.
 * Admin links are not shown unless backend confirms ADMIN role via profile API (future).
 */
export async function AppNav() {
  const session = await getServerSession();

  return (
    <nav
      style={{
        display: 'flex',
        gap: '1rem',
        padding: '1rem 2rem',
        borderBottom: '1px solid #ddd',
        alignItems: 'center',
      }}
    >
      <Link href="/">Home</Link>
      {session ? (
        <>
          <Link href="/profile">Profile</Link>
          <span style={{ marginLeft: 'auto', fontSize: '0.875rem', color: '#555' }}>Signed in</span>
          <LogoutButton />
        </>
      ) : (
        <>
          <Link href="/login" style={{ marginLeft: 'auto' }}>
            Sign in
          </Link>
          <Link href="/register">Create account</Link>
        </>
      )}
    </nav>
  );
}
