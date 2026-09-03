/**
 * @vitest-environment happy-dom
 *
 * Profile page tests live outside the App Router tree so Next.js dev/build
 * never treats colocated files under app/ as route artifacts.
 */
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import type { Player } from '@bowling-machine/api-contracts';
import AppProfilePage from '@/app/app/profile/page';
import { ApiClientError } from '@/lib/api/errors';

const sampleProfile: Player = {
  id: '11111111-1111-4111-8111-111111111111',
  display_name: 'Player One',
  batting_hand: 'UNSPECIFIED',
  bowling_hand: 'UNSPECIFIED',
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
};

const mockApi = {
  getProfile: vi.fn(),
  updateProfile: vi.fn(),
  checkUsernameAvailability: vi.fn(),
  markPasswordCredentialSet: vi.fn(),
};

vi.mock('@/hooks/use-authenticated-services', () => ({
  useAuthenticatedServices: () => ({ api: mockApi, wsState: 'idle', reconnectWebSocket: vi.fn() }),
}));

vi.mock('next/navigation', () => ({
  useSearchParams: () => ({
    get: () => null,
  }),
}));

describe('AppProfilePage', () => {
  beforeEach(() => {
    mockApi.getProfile.mockReset();
    mockApi.updateProfile.mockReset();
    mockApi.getProfile.mockResolvedValue(sampleProfile);
  });

  afterEach(() => {
    cleanup();
  });

  it('renders the profile form after loading', async () => {
    render(<AppProfilePage />);

    expect(await screen.findByRole('heading', { name: 'Your profile' })).toBeTruthy();
    expect(await screen.findByDisplayValue('Player One')).toBeTruthy();
  });

  it('shows a load error instead of a blank page when profile fetch fails', async () => {
    mockApi.getProfile.mockRejectedValue(
      new ApiClientError(404, 'NOT_FOUND', 'Player profile not found'),
    );

    render(<AppProfilePage />);

    expect(await screen.findByText('The requested resource was not found.')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Your profile' })).toBeTruthy();
  });

  it('submits the edited profile fields to the API client', async () => {
    mockApi.updateProfile.mockResolvedValue({
      ...sampleProfile,
      display_name: 'Updated Name',
      batting_hand: 'LEFT',
      bowling_hand: 'RIGHT',
    });

    render(<AppProfilePage />);
    await screen.findByDisplayValue('Player One');

    await userEvent.clear(screen.getByLabelText('Display name'));
    await userEvent.type(screen.getByLabelText('Display name'), 'Updated Name');
    await userEvent.selectOptions(screen.getByLabelText('Batting hand'), 'LEFT');
    await userEvent.selectOptions(screen.getByLabelText('Bowling hand'), 'RIGHT');
    await userEvent.click(screen.getByRole('button', { name: 'Save profile' }));

    await waitFor(() => {
      expect(mockApi.updateProfile).toHaveBeenCalledWith({
        display_name: 'Updated Name',
        batting_hand: 'LEFT',
        bowling_hand: 'RIGHT',
      });
    });
    expect(await screen.findByText('Profile updated')).toBeTruthy();
  });

  it('shows a server error when the profile update fails', async () => {
    mockApi.updateProfile.mockRejectedValue(
      new ApiClientError(500, 'INTERNAL_ERROR', 'Update failed'),
    );

    render(<AppProfilePage />);
    await screen.findByDisplayValue('Player One');
    await userEvent.click(screen.getByRole('button', { name: 'Save profile' }));

    expect(await screen.findByText('Something went wrong. Please try again.')).toBeTruthy();
  });

  it('shows a validation error from the API', async () => {
    mockApi.updateProfile.mockRejectedValue(
      new ApiClientError(400, 'VALIDATION_ERROR', 'Display name is required'),
    );

    render(<AppProfilePage />);
    await screen.findByDisplayValue('Player One');
    await userEvent.click(screen.getByRole('button', { name: 'Save profile' }));

    expect(await screen.findByText('Display name is required')).toBeTruthy();
  });
});
