import { randomUUID } from 'node:crypto';

/** Single-use browser WebSocket ticket bound to a user id. */
export type BrowserWsTicket = {
  ticketId: string;
  userId: string;
  expiresAtMs: number;
  used: boolean;
};

/**
 * In-memory store for short-lived browser WebSocket tickets.
 *
 * Used when cross-origin deployment prevents Supabase cookies from reaching the API
 * directly (e.g. web :3000, API :4000). Tickets are obtained via authenticated REST
 * and presented in the first WebSocket message — never in the URL.
 */
export class BrowserWsTicketService {
  private readonly tickets = new Map<string, BrowserWsTicket>();

  constructor(private readonly ttlMs: number) {}

  /** Issues a ticket for an already-authenticated user (REST Bearer/cookie session). */
  issue(userId: string): { ticket: string; expires_at: string } {
    this.pruneExpired();

    const ticketId = randomUUID();
    const expiresAtMs = Date.now() + this.ttlMs;
    this.tickets.set(ticketId, {
      ticketId,
      userId,
      expiresAtMs,
      used: false,
    });

    return {
      ticket: ticketId,
      expires_at: new Date(expiresAtMs).toISOString(),
    };
  }

  /**
   * Validates and consumes a ticket — single use only.
   * Returns user id or null when invalid/expired/already used.
   */
  consume(ticketId: string): string | null {
    this.pruneExpired();

    const record = this.tickets.get(ticketId);
    if (!record || record.used || record.expiresAtMs <= Date.now()) {
      return null;
    }

    record.used = true;
    this.tickets.delete(ticketId);
    return record.userId;
  }

  private pruneExpired(): void {
    const now = Date.now();
    for (const [id, record] of this.tickets.entries()) {
      if (record.expiresAtMs <= now || record.used) {
        this.tickets.delete(id);
      }
    }
  }
}
