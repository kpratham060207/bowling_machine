/**
 * @vitest-environment happy-dom
 */
import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useAuthenticatedServices } from '@/hooks/use-authenticated-services';

const connectMock = vi.fn();
const disconnectMock = vi.fn();

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getSession: () => Promise.resolve({ data: { session: { access_token: 'test-token' } } }),
    },
  }),
}));

vi.mock('@/lib/api/client', () => ({
  createBrowserApiClient: () => ({
    getWsTicket: vi.fn(),
  }),
}));

vi.mock('@/lib/ws/browser-ws-client', () => ({
  BrowserWsClient: class {
    connect = connectMock;
    disconnect = disconnectMock;
  },
}));

describe('useAuthenticatedServices', () => {
  it('does not open a browser WebSocket when the page only needs the REST client', () => {
    connectMock.mockReset();
    const { unmount } = renderHook(() => useAuthenticatedServices());
    expect(connectMock).not.toHaveBeenCalled();
    unmount();
  });

  it('opens a browser WebSocket when a realtime event handler is provided', () => {
    connectMock.mockReset();
    const { unmount } = renderHook(() => useAuthenticatedServices({ onEvent: vi.fn() }));
    expect(connectMock).toHaveBeenCalledTimes(1);
    unmount();
  });
});
