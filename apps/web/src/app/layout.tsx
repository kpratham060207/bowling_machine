import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Bowling Machine',
  description: 'Smart cricket bowling machine — development foundation',
};

/**
 * Root layout — Phase 1A placeholder only.
 * Feature routes (login, throw ball, sessions) will be added in Phase 1B+.
 */
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
