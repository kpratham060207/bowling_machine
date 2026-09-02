import { describe, expect, it } from 'vitest';
import { extractPlayerIdFromEvent } from '../gateway/event-bus.js';

describe('browser websocket session event authorization', () => {
  it('extracts player_id from delivery lifecycle events', () => {
    const playerId = '11111111-1111-4111-8111-111111111111';
    const event = {
      event_id: '22222222-2222-4222-8222-222222222222',
      event_type: 'DELIVERY_COMPLETED' as const,
      timestamp: new Date().toISOString(),
      payload: {
        session_id: '33333333-3333-4333-8333-333333333333',
        delivery_id: '44444444-4444-4444-8444-444444444444',
        sequence_number: 1,
        player_id: playerId,
        machine_id: '55555555-5555-4555-8555-555555555555',
      },
    };

    expect(extractPlayerIdFromEvent(event)).toBe(playerId);
  });

  it('returns undefined for machine-only events', () => {
    const event = {
      event_id: '22222222-2222-4222-8222-222222222222',
      event_type: 'MACHINE_CONNECTED' as const,
      timestamp: new Date().toISOString(),
      payload: {
        machine_id: '55555555-5555-4555-8555-555555555555',
        kind: 'SIMULATOR' as const,
      },
    };

    expect(extractPlayerIdFromEvent(event)).toBeUndefined();
  });
});
