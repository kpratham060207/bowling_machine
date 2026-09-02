import { describe, expect, it } from 'vitest';
import { BrowserWsTicketService } from '../websocket/ws-ticket.service.js';

describe('BrowserWsTicketService', () => {
  it('issues single-use tickets', () => {
    const service = new BrowserWsTicketService(30_000);
    const { ticket } = service.issue('user-1');
    expect(service.consume(ticket)).toBe('user-1');
    expect(service.consume(ticket)).toBeNull();
  });
});
