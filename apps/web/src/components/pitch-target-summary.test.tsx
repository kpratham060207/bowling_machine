/**
 * @vitest-environment happy-dom
 */
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { PitchTargetSummary } from '@/components/pitch-target-summary';
import { PracticeSetupControls, PracticeSetupReview } from '@/components/practice-setup-controls';
import { targetYFromDistanceFromBatter } from '@/lib/pitch/bowling-length';
import { DEFAULT_PRACTICE_SETUP } from '@/lib/practice/setup-state';

describe('PitchTargetSummary', () => {
  afterEach(() => {
    cleanup();
  });

  it('prompts the player when no target is selected', () => {
    render(<PitchTargetSummary target={null} />);
    expect(screen.getByText(/tap the pitch to choose a landing spot/i)).toBeTruthy();
  });

  it('shows compact coaching length without raw coordinates', () => {
    render(
      <PitchTargetSummary target={{ target_x: 0.5, target_y: targetYFromDistanceFromBatter(6) }} />,
    );
    expect(screen.getByText(/Good Length · 6\.0 m/i)).toBeTruthy();
    expect(screen.getByText(/Middle stump/i)).toBeTruthy();
    expect(screen.queryByText(/target_x/i)).toBeNull();
  });
});

describe('PracticeSetupControls length derivation', () => {
  afterEach(() => {
    cleanup();
  });

  it('updates the derived length when the target moves', () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <PracticeSetupControls
        state={{
          ...DEFAULT_PRACTICE_SETUP,
          target: { target_x: 0.5, target_y: 0.95 },
        }}
        onChange={onChange}
      />,
    );
    expect(screen.getByRole('heading', { name: 'Target' }).parentElement?.textContent).toMatch(
      /Yorker/,
    );

    rerender(
      <PracticeSetupControls
        state={{
          ...DEFAULT_PRACTICE_SETUP,
          target: { target_x: 0.5, target_y: targetYFromDistanceFromBatter(10) },
        }}
        onChange={onChange}
      />,
    );
    expect(screen.getByRole('heading', { name: 'Target' }).parentElement?.textContent).toMatch(
      /Short/,
    );
  });

  it('does not change length when only speed or ball type changes', () => {
    const onChange = vi.fn();
    const target = { target_x: 0.5, target_y: targetYFromDistanceFromBatter(6) };
    const { rerender } = render(
      <PracticeSetupControls
        state={{ ...DEFAULT_PRACTICE_SETUP, target, desired_speed_kmh: 120 }}
        onChange={onChange}
      />,
    );
    expect(screen.getByRole('heading', { name: 'Target' }).parentElement?.textContent).toMatch(
      /Good Length/,
    );

    rerender(
      <PracticeSetupControls
        state={{
          ...DEFAULT_PRACTICE_SETUP,
          target,
          desired_speed_kmh: 140,
          ball_type: 'INSWING',
        }}
        onChange={onChange}
      />,
    );
    expect(screen.getByRole('heading', { name: 'Target' }).parentElement?.textContent).toMatch(
      /Good Length · 6\.0 m/,
    );
  });
});

describe('PracticeSetupReview', () => {
  afterEach(() => {
    cleanup();
  });

  it('summarizes the derived length for confirmation', () => {
    render(
      <PracticeSetupReview
        state={{
          ...DEFAULT_PRACTICE_SETUP,
          target: { target_x: 0.2, target_y: targetYFromDistanceFromBatter(6) },
        }}
      />,
    );
    expect(screen.getByText(/Good Length/i)).toBeTruthy();
    expect(screen.getByText(/Off side/i)).toBeTruthy();
  });
});
