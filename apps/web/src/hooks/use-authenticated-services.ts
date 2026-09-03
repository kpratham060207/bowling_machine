'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { WebSocketEvent } from '@bowling-machine/api-contracts';
import { createClient } from '@/lib/supabase/client';
import { createBrowserApiClient } from '@/lib/api/client';
import { BrowserWsClient, type BrowserWsConnectionState } from '@/lib/ws/browser-ws-client';

/**
 * Hook that manages authenticated API client and browser WebSocket lifecycle.
 * WebSocket connects after auth; REST remains source of truth for durable state.
 */
export function useAuthenticatedServices(options?: { onEvent?: (event: WebSocketEvent) => void }) {
  const [wsState, setWsState] = useState<BrowserWsConnectionState>('idle');
  const clientRef = useRef<BrowserWsClient | null>(null);
  const onEventRef = useRef(options?.onEvent);
  onEventRef.current = options?.onEvent;

  const api = useMemo(() => {
    return createBrowserApiClient(async () => {
      const supabase = createClient();
      const { data } = await supabase.auth.getSession();
      return data.session?.access_token ?? null;
    });
  }, []);

  /** Open a live socket only when the page needs machine/session events. */
  const enableRealtime = Boolean(options?.onEvent);

  const connectWebSocket = useCallback(() => {
    clientRef.current?.disconnect();

    const wsClient = new BrowserWsClient({
      authenticate: async () => {
        // Ticket flow works cross-origin in local dev; cookies used when same-site.
        const ticket = await api.getWsTicket();
        return { mode: 'ticket' as const, ticket };
      },
      onEvent: (event) => {
        onEventRef.current?.(event);
      },
      onConnectionChange: setWsState,
    });

    clientRef.current = wsClient;
    wsClient.connect();
  }, [api]);

  useEffect(() => {
    if (!enableRealtime) {
      return;
    }

    connectWebSocket();
    return () => {
      clientRef.current?.disconnect();
    };
  }, [connectWebSocket, enableRealtime]);

  return { api, wsState, reconnectWebSocket: connectWebSocket };
}
