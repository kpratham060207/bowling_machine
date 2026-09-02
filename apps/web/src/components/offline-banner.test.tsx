/**
 * @vitest-environment happy-dom
 */
import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { OfflineBanner } from './offline-banner';

describe('OfflineBanner', () => {
  it('shows warning when browser is offline', () => {
    Object.defineProperty(window.navigator, 'onLine', { configurable: true, value: false });
    render(<OfflineBanner />);
    expect(screen.getByText(/machine controls are unavailable/i)).toBeTruthy();
    Object.defineProperty(window.navigator, 'onLine', { configurable: true, value: true });
  });
});
