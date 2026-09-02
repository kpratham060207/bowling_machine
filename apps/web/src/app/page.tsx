import Link from 'next/link';
import { getServerSession } from '@/lib/supabase/server';

/** Home page — routes authenticated players to profile. */
export default async function HomePage() {
  const session = await getServerSession();

  return (
    <main>
      <h1>Bowling Machine</h1>
      <p>
        <strong>Phase 1D:</strong> player authentication and authorization foundation.
      </p>
      {session ? (
        <p>
          You are signed in. <Link href="/profile">View your profile</Link>.
        </p>
      ) : (
        <p>
          <Link href="/login">Sign in</Link> or <Link href="/register">create an account</Link> to
          continue.
        </p>
      )}
    </main>
  );
}
