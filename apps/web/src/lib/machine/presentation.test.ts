import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
  controlLockLabel,
  formatConnectionStatus,
  resolveControlLockUiState,
} from '@/lib/machine/presentation';

describe('machine presentation helpers', () => {
  it('formats canonical connection states', () => {
    expect(formatConnectionStatus('CONNECTED')).toBe('Connected');
    expect(formatConnectionStatus('RECONNECTING')).toBe('Reconnecting…');
  });

  it('resolves control lock UI states from backend hints', () => {
    expect(
      resolveControlLockUiState({
        hasControl: true,
        controlExpiresAt: new Date(Date.now() + 60_000).toISOString(),
      }),
    ).toBe('CONTROLLED_BY_ME');

    expect(
      resolveControlLockUiState({
        hasControl: false,
        controlExpiresAt: new Date(Date.now() + 60_000).toISOString(),
      }),
    ).toBe('CONTROLLED_BY_OTHER');
  });

  it('labels control states for accessibility text', () => {
    expect(controlLockLabel('CONTROLLED_BY_OTHER')).toBe('Controlled by another player');
  });
});

describe('BrowserWsClient reconnect scheduling', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('exports buildable ws url logic indirectly via client module load', async () => {
    // Smoke import — full WebSocket tests require browser env; covered in integration layer.
    const mod = await import('@/lib/ws/browser-ws-client');
    expect(mod.BrowserWsClient).toBeDefined();
  });
});
