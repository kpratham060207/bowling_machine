import { describe, expect, it } from 'vitest';
import { deriveDisplayNameHint } from './provisioning.js';

describe('deriveDisplayNameHint', () => {
  it('prefers Google full_name metadata for new profiles', () => {
    expect(
      deriveDisplayNameHint('player@example.com', { full_name: 'Google Player', name: 'Ignored' }),
    ).toBe('Google Player');
  });

  it('falls back to email local-part when metadata is missing', () => {
    expect(deriveDisplayNameHint('player@example.com', null)).toBe('player');
  });

  it('truncates long metadata names to profile column limit', () => {
    const longName = 'A'.repeat(120);
    const result = deriveDisplayNameHint('player@example.com', { name: longName });
    expect(result.length).toBe(100);
  });
});
