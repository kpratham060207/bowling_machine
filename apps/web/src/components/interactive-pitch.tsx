'use client';

import type { PitchTarget } from '@bowling-machine/api-contracts';
import { useCallback, useId } from 'react';
import { normalizedToViewBox, viewBoxToNormalized } from '@/lib/pitch/coordinate-mapper';
import { DEFAULT_PITCH_LAYOUT, PITCH_VIEWBOX } from '@/lib/pitch/pitch-layout';

type InteractivePitchProps = {
  /** Current normalized target — null when the player has not selected yet. */
  value: PitchTarget | null;
  /** Called when the player selects or moves the target on the pitch. */
  onChange: (target: PitchTarget) => void;
  /** Optional accessible label override for the pitch surface. */
  ariaLabel?: string;
};

/**
 * Responsive interactive cricket pitch — SVG-based, not a static image surface.
 * Produces normalized logical coordinates via PitchCoordinateMapper (separate module).
 */
export function InteractivePitch({
  value,
  onChange,
  ariaLabel = 'Interactive cricket pitch — tap where you want the ball to pitch',
}: InteractivePitchProps) {
  const instructionsId = useId();
  const layout = DEFAULT_PITCH_LAYOUT;
  const topLeftX: number = layout.topLeftX;
  const topRightX: number = layout.topRightX;
  const topY: number = layout.topY;
  const bottomLeftX: number = layout.bottomLeftX;
  const bottomRightX: number = layout.bottomRightX;
  const bottomY: number = layout.bottomY;

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<SVGSVGElement>) => {
      // Prevent page scroll and text selection while interacting with the pitch.
      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);

      const ctm = event.currentTarget.getScreenCTM();
      if (!ctm) return;

      const point = event.currentTarget.createSVGPoint();
      point.x = event.clientX;
      point.y = event.clientY;
      const transformed = point.matrixTransform(ctm.inverse());

      const target = viewBoxToNormalized(transformed.x, transformed.y, layout);
      if (target) {
        onChange(target);
      }
    },
    [layout, onChange],
  );

  const marker = value ? normalizedToViewBox(value, layout) : null;

  return (
    <div className="w-full touch-none select-none" style={{ touchAction: 'none' }}>
      <p id={instructionsId} className="mb-2 text-sm text-slate-600">
        {value
          ? 'Target selected — tap elsewhere to adjust'
          : 'Tap where you want the ball to pitch'}
      </p>

      <svg
        viewBox={`0 0 ${PITCH_VIEWBOX.width} ${PITCH_VIEWBOX.height}`}
        className="w-full max-w-lg rounded-xl border border-slate-300 shadow-sm"
        role="img"
        aria-label={ariaLabel}
        aria-describedby={instructionsId}
        onPointerDown={handlePointerDown}
      >
        {/* Outfield / ground */}
        <rect x="0" y="0" width="100" height="160" fill="#3d7a37" rx="4" />

        {/* Pitch trapezoid — perspective: wider at bowler end (bottom) */}
        <polygon
          points={`${layout.topLeftX},${layout.topY} ${layout.topRightX},${layout.topY} ${layout.bottomRightX},${layout.bottomY} ${layout.bottomLeftX},${layout.bottomY}`}
          fill="#c9a86c"
          stroke="#a08050"
          strokeWidth="0.5"
        />

        {/* Popping crease lines (simplified) */}
        <line
          x1={topLeftX + 2}
          y1={topY + 4}
          x2={topRightX - 2}
          y2={topY + 4}
          stroke="#ffffff"
          strokeWidth="0.8"
          opacity="0.85"
        />
        <line
          x1={bottomLeftX + 2}
          y1={bottomY - 6}
          x2={bottomRightX - 2}
          y2={bottomY - 6}
          stroke="#ffffff"
          strokeWidth="0.8"
          opacity="0.85"
        />

        {/* Stumps — batter end (top) */}
        <g
          transform={`translate(${(topLeftX + topRightX) / 2 - 2}, ${topY + 2})`}
        >
          <rect x="0" y="0" width="0.6" height="3" fill="#f5f5f4" />
          <rect x="1.7" y="0" width="0.6" height="3" fill="#f5f5f4" />
          <rect x="3.4" y="0" width="0.6" height="3" fill="#f5f5f4" />
        </g>

        {/* Stumps — bowler end (bottom) */}
        <g
          transform={`translate(${(bottomLeftX + bottomRightX) / 2 - 2}, ${bottomY - 5})`}
        >
          <rect x="0" y="0" width="0.6" height="3" fill="#f5f5f4" />
          <rect x="1.7" y="0" width="0.6" height="3" fill="#f5f5f4" />
          <rect x="3.4" y="0" width="0.6" height="3" fill="#f5f5f4" />
        </g>

        {/* End labels */}
        <text x="50" y="12" textAnchor="middle" fontSize="3.5" fill="#ecfdf5" opacity="0.9">
          Batter end
        </text>
        <text x="50" y="152" textAnchor="middle" fontSize="3.5" fill="#ecfdf5" opacity="0.9">
          Bowler end
        </text>

        {/* Target marker */}
        {marker ? (
          <g aria-hidden="true">
            <circle
              cx={marker.vx}
              cy={marker.vy}
              r="4.5"
              fill="none"
              stroke="#dc2626"
              strokeWidth="1.2"
              className="transition-all duration-150"
            />
            <circle cx={marker.vx} cy={marker.vy} r="1.2" fill="#dc2626" />
          </g>
        ) : null}
      </svg>

      {/* Screen-reader feedback for target state */}
      <p className="sr-only" aria-live="polite">
        {value
          ? `Pitch target selected at horizontal ${Math.round(value.target_x * 100)} percent, length ${Math.round(value.target_y * 100)} percent`
          : 'No pitch target selected'}
      </p>
    </div>
  );
}
