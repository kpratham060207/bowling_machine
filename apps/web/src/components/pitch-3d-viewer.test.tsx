/**
 * @vitest-environment happy-dom
 *
 * Lightweight contract tests for the 3D viewer chrome.
 * WebGL/R3F rendering is not exercised here — only that the shared target
 * drives labels and that Reset view does not require mutating target state.
 */
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { targetYFromDistanceFromBatter } from '@/lib/pitch/bowling-length';

vi.mock('@react-three/fiber', () => ({
  // Do not render Canvas children — avoids mounting WebGL scene tags under happy-dom.
  Canvas: () => <div data-testid="mock-canvas" />,
  useThree: () => ({ invalidate: vi.fn() }),
}));

vi.mock('@react-three/drei', () => ({
  OrbitControls: React.forwardRef(function MockOrbitControls(_props, ref) {
    React.useImperativeHandle(ref, () => ({ reset: vi.fn() }));
    return null;
  }),
}));

describe('Pitch3DViewer', () => {
  afterEach(() => {
    cleanup();
  });

  it('receives the same target coordinates as display source of truth', async () => {
    const { Pitch3DViewer } = await import('@/components/pitch-3d-viewer');
    const target = { target_x: 0.5, target_y: targetYFromDistanceFromBatter(6) };
    render(<Pitch3DViewer target={target} />);
    expect(screen.getByText(/Showing Good Length marker/i)).toBeTruthy();
    expect(screen.getByTestId('mock-canvas')).toBeTruthy();
  });

  it('reset view does not alter the provided target selection', async () => {
    const { Pitch3DViewer } = await import('@/components/pitch-3d-viewer');
    const target = { target_x: 0.4, target_y: 0.7 };
    const { rerender } = render(<Pitch3DViewer target={target} />);

    await userEvent.click(screen.getByRole('button', { name: 'Reset view' }));

    rerender(<Pitch3DViewer target={target} />);
    expect(screen.getByText(/marker from the 2D selection/i)).toBeTruthy();
  });
});

describe('Pitch3DViewerGate', () => {
  afterEach(() => {
    cleanup();
  });

  it('keeps the 3D viewer collapsed by default', async () => {
    const { Pitch3DViewerGate } = await import('@/components/pitch-3d-viewer-gate');
    render(<Pitch3DViewerGate target={null} />);
    expect(screen.getByRole('button', { name: /3D pitch view/i })).toBeTruthy();
    expect(screen.getByText('Show')).toBeTruthy();
    expect(screen.queryByTestId('mock-canvas')).toBeNull();
  });
});
