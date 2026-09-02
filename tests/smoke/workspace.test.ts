import { describe, expect, it } from 'vitest';
import { PROTOCOL_VERSION, PlayerSchema } from '@bowling-machine/api-contracts';
import { schema } from '@bowling-machine/database';
import { SHARED_PLACEHOLDER } from '@bowling-machine/shared';
import { UI_PLACEHOLDER } from '@bowling-machine/ui';

/**
 * Smoke test — verifies workspace packages resolve and export expected symbols.
 */
describe('monorepo workspace wiring', () => {
  it('exports contract and database package symbols', () => {
    expect(PROTOCOL_VERSION).toBe('1.0');
    expect(PlayerSchema).toBeDefined();
    expect(schema.users).toBeDefined();
    expect(schema.profiles).toBeDefined();
    expect(SHARED_PLACEHOLDER).toBe('phase-1a-foundation');
    expect(UI_PLACEHOLDER).toBe('phase-1a-foundation');
  });
});
