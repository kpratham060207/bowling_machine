'use client';

import { useEffect, useState } from 'react';
import { Alert } from '@/components/ui/alert';

/**
 * Tracks browser online state.
 * Machine controls must remain unavailable when offline — no command queue.
 */
export function useOnlineStatus(): { online: boolean } {
  const [online, setOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  useEffect(() => {
    function handleOnline() {
      setOnline(true);
    }
    function handleOffline() {
      setOnline(false);
    }

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return { online };
}

/** Banner shown when the browser is offline — machine controls must not be used. */
export function OfflineBanner() {
  const { online } = useOnlineStatus();

  if (online) {
    return null;
  }

  return (
    <Alert variant="warning" title="You are offline">
      Machine controls are unavailable while offline. You may still view loaded history and plans.
    </Alert>
  );
}
