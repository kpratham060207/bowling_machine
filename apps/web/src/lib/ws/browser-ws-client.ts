import type { WebSocketEvent } from '@bowling-machine/api-contracts';
import { getApiBaseUrl } from '@/lib/supabase/client';

export type BrowserWsConnectionState =
  'idle' | 'connecting' | 'connected' | 'reconnecting' | 'disconnected';

export type BrowserWsClientOptions = {
  /** Returns a fresh access token or WebSocket ticket for authentication. */
  authenticate: () => Promise<{ mode: 'ticket'; ticket: string } | { mode: 'cookies' }>;
  onEvent: (event: WebSocketEvent) => void;
  onConnectionChange?: (state: BrowserWsConnectionState) => void;
  /** Maximum reconnect attempts before staying disconnected. */
  maxReconnectAttempts?: number;
};

function buildWsUrl(): string {
  const apiBase = getApiBaseUrl();
  const url = new URL(apiBase);
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  url.pathname = '/ws/browser';
  url.search = '';
  return url.toString();
}

/**
 * Browser WebSocket client for live machine/session events.
 * Uses ticket-first auth message (Phase 1E) — never puts JWTs in query strings.
 */
export class BrowserWsClient {
  private socket: WebSocket | null = null;
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private intentionalClose = false;
  private readonly maxReconnectAttempts: number;

  constructor(private readonly options: BrowserWsClientOptions) {
    this.maxReconnectAttempts = options.maxReconnectAttempts ?? 8;
  }

  connect(): void {
    this.intentionalClose = false;
    this.openSocket(false);
  }

  disconnect(): void {
    this.intentionalClose = true;
    this.clearReconnectTimer();
    this.socket?.close();
    this.socket = null;
    this.options.onConnectionChange?.('disconnected');
  }

  private openSocket(isReconnect: boolean): void {
    this.clearReconnectTimer();
    this.options.onConnectionChange?.(isReconnect ? 'reconnecting' : 'connecting');

    const ws = new WebSocket(buildWsUrl());
    this.socket = ws;

    ws.onopen = () => {
      void this.authenticateSocket(ws);
    };

    ws.onmessage = (message) => {
      this.handleMessage(String(message.data));
    };

    ws.onclose = () => {
      if (this.intentionalClose) {
        return;
      }
      this.scheduleReconnect();
    };

    ws.onerror = () => {
      // onclose handles reconnect path
    };
  }

  private async authenticateSocket(ws: WebSocket): Promise<void> {
    try {
      const auth = await this.options.authenticate();
      if (auth.mode === 'ticket') {
        ws.send(JSON.stringify({ type: 'authenticate', ticket: auth.ticket }));
      }
      // Cookie mode: server accepts session cookies on upgrade — no first message needed.
      this.reconnectAttempts = 0;
      this.options.onConnectionChange?.('connected');
    } catch {
      ws.close();
      this.scheduleReconnect();
    }
  }

  private handleMessage(raw: string): void {
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return;
    }

    if (typeof parsed !== 'object' || parsed === null) {
      return;
    }

    const record = parsed as Record<string, unknown>;

    // Handshake messages from server — not domain events.
    if (record.type === 'connected' || record.type === 'error') {
      return;
    }

    if (typeof record.event_type === 'string') {
      this.options.onEvent(parsed as WebSocketEvent);
    }
  }

  private scheduleReconnect(): void {
    if (this.intentionalClose) {
      return;
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.options.onConnectionChange?.('disconnected');
      return;
    }

    this.reconnectAttempts += 1;
    const delayMs = Math.min(30_000, 500 * 2 ** (this.reconnectAttempts - 1));
    this.options.onConnectionChange?.('reconnecting');

    this.reconnectTimer = setTimeout(() => {
      this.openSocket(true);
    }, delayMs);
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
}
