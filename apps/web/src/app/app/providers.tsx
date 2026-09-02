'use client';

import { PracticeProvider } from '@/lib/practice/practice-context';
import { OfflineBanner } from '@/components/offline-banner';

/** Client providers for authenticated player app routes. */
export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <PracticeProvider>
      <OfflineBanner />
      {children}
    </PracticeProvider>
  );
}
