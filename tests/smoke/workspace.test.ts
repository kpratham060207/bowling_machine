import { describe, expect, it } from 'vitest';
import { API_CONTRACTS_PLACEHOLDER } from '@bowling-machine/api-contracts';
import { DATABASE_PLACEHOLDER } from '@bowling-machine/database';
import { SHARED_PLACEHOLDER } from '@bowling-machine/shared';
import { UI_PLACEHOLDER } from '@bowling-machine/ui';

/**
 * Smoke test — verifies workspace packages resolve and export Phase 1A placeholders.
 * Not a feature test.
 */
describe('monorepo workspace wiring', () => {
  it('exports consistent phase markers from shared packages', () => {
    expect(API_CONTRACTS_PLACEHOLDER).toBe('phase-1a-foundation');
    expect(SHARED_PLACEHOLDER).toBe('phase-1a-foundation');
    expect(DATABASE_PLACEHOLDER).toBe('phase-1a-foundation');
    expect(UI_PLACEHOLDER).toBe('phase-1a-foundation');
  });
});
