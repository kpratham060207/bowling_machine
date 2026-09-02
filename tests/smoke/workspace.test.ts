import { describe, expect, it } from 'vitest';
import { PROTOCOL_VERSION, PlayerSchema } from '@bowling-machine/api-contracts';
import { DATABASE_PLACEHOLDER } from '@bowling-machine/database';
import { SHARED_PLACEHOLDER } from '@bowling-machine/shared';
import { UI_PLACEHOLDER } from '@bowling-machine/ui';

/**
 * Smoke test — verifies workspace packages resolve and export expected symbols.
 * Not a feature test.
 */
describe('monorepo workspace wiring', () => {
  it('exports contract package symbols and phase markers from other packages', () => {
    expect(PROTOCOL_VERSION).toBe('1.0');
    expect(PlayerSchema).toBeDefined();
    expect(SHARED_PLACEHOLDER).toBe('phase-1a-foundation');
    expect(DATABASE_PLACEHOLDER).toBe('phase-1a-foundation');
    expect(UI_PLACEHOLDER).toBe('phase-1a-foundation');
  });
});
