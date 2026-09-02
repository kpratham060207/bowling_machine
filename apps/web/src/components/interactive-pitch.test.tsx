/**
 * @vitest-environment happy-dom
 */
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { InteractivePitch } from './interactive-pitch';

describe('InteractivePitch', () => {
  it('shows instruction when no target is selected', () => {
    render(<InteractivePitch value={null} onChange={() => undefined} />);
    expect(screen.getByText(/tap where you want the ball to pitch/i)).toBeTruthy();
  });

  it('calls onChange when the pitch surface is clicked', () => {
    const onChange = vi.fn();
    render(<InteractivePitch value={null} onChange={onChange} />);

    const svg = document.querySelector('svg');
    expect(svg).not.toBeNull();
    if (!svg) {
      return;
    }

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

    fireEvent.pointerDown(svg, { clientX: 100, clientY: 100, pointerId: 1 });

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
    expect(screen.getByText(/target selected/i)).toBeTruthy();
  });
});
