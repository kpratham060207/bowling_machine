/**
 * @vitest-environment happy-dom
 */
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { InteractivePitch } from './interactive-pitch';

describe('InteractivePitch', () => {
  afterEach(() => {
    cleanup();
  });

  it('shows instruction when no target is selected', () => {
    render(<InteractivePitch value={null} onChange={() => undefined} />);
    expect(screen.getByText(/tap where you want the ball to pitch/i)).toBeTruthy();
  });

  it('calls onChange when the pitch surface is clicked', async () => {
    const onChange = vi.fn();
    render(<InteractivePitch value={null} onChange={onChange} />);

    const svg = document.querySelector('svg');
    expect(svg).not.toBeNull();
    if (!svg) {
      return;
    }

    svg.setPointerCapture = vi.fn();
    svg.getScreenCTM = () =>
      ({
        inverse: () => ({
          a: 1,
          b: 0,
          c: 0,
          d: 1,
          e: 0,
          f: 0,
          multiply: () => ({ x: 50, y: 80 }),
        }),
      }) as unknown as DOMMatrix;

    svg.createSVGPoint = () =>
      ({
        x: 0,
        y: 0,
        matrixTransform: () => ({ x: 50, y: 80 }),
      }) as DOMPoint;

    const user = (await import('@testing-library/user-event')).default.setup();
    await user.pointer({
      keys: '[MouseLeft>]',
      target: svg,
      coords: { clientX: 100, clientY: 100 },
    });

    expect(onChange).toHaveBeenCalled();
    const target = onChange.mock.calls[0]?.[0] as { target_x: number; target_y: number };
    expect(target.target_x).toBeGreaterThanOrEqual(0);
    expect(target.target_x).toBeLessThanOrEqual(1);
    expect(target.target_y).toBeGreaterThanOrEqual(0);
    expect(target.target_y).toBeLessThanOrEqual(1);
  });

  it('renders target marker when value is set', () => {
    render(
      <InteractivePitch value={{ target_x: 0.5, target_y: 0.5 }} onChange={() => undefined} />,
    );
    expect(document.querySelector('circle[fill="#dc2626"]')).toBeTruthy();
    expect(screen.getByText(/Target selected — tap elsewhere to adjust/i)).toBeTruthy();
  });

  it('keeps the original compact pitch chrome without a length badge header', () => {
    render(
      <InteractivePitch value={{ target_x: 0.5, target_y: 0.97 }} onChange={() => undefined} />,
    );
    expect(screen.queryByText('Pitch target')).toBeNull();
    expect(screen.queryByText('Length')).toBeNull();
    // Zone labels remain as subtle SVG text for coaching context.
    expect(document.querySelector('svg')?.textContent).toMatch(/Yorker/);
  });
});
