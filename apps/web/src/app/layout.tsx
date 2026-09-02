import type { Metadata } from 'next';
import { AppNav } from '@/components/app-nav';
import './globals.css';

export const metadata: Metadata = {
  title: 'Bowling Machine',
  description: 'Smart cricket bowling machine — player authentication',
};

/** Root layout with navigation and session-aware chrome. */
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <AppNav />
        {children}
      </body>
    </html>
  );
}
