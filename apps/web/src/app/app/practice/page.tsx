import Link from 'next/link';

/** Practice hub — entry point for machine connection and session workflow. */
export default function PracticeHubPage() {
  return (
    <div className="space-y-6">
      <section className="card space-y-3">
        <h1 className="text-2xl font-bold">Practice</h1>
        <p className="text-sm text-slate-600">
          Connect to an authorized machine, acquire control, and prepare your session.
        </p>
        <Link href="/app/practice/connect" className="btn-primary">
          Connect to machine
        </Link>
      </section>
    </div>
  );
}
