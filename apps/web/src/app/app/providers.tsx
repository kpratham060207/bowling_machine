'use client';

import { PracticeProvider } from '@/lib/practice/practice-context';

/** Client providers for authenticated player app routes. */
export function AppProviders({ children }: { children: React.ReactNode }) {
  return <PracticeProvider>{children}</PracticeProvider>;
}
