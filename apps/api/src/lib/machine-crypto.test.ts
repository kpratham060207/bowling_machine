import { describe, expect, it } from 'vitest';
import { isExpired, addMilliseconds, hashMachineConnectionSecret } from '../lib/machine-crypto.js';

describe('machine-crypto', () => {
  it('detects expired timestamps', () => {
    const past = new Date(Date.now() - 1000).toISOString();
    expect(isExpired(past)).toBe(true);
    const future = new Date(Date.now() + 60_000).toISOString();
    expect(isExpired(future)).toBe(false);
  });

  it('adds milliseconds to ISO timestamps', () => {
    const base = '2026-09-02T12:00:00.000Z';
    const result = addMilliseconds(base, 5000);
    expect(new Date(result).getTime()).toBe(new Date(base).getTime() + 5000);
  });

  it('hashes connection secrets deterministically', () => {
    expect(hashMachineConnectionSecret('dev-simulator-secret-001')).toBe(
      'c5d430e76d88c9ee0bf72f0d6a04543fd01024790eb165c976f2c4f377dd44cf',
    );
  });
});
