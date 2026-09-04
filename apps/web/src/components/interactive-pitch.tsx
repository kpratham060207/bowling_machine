'use client';

import type { PitchTarget } from '@bowling-machine/api-contracts';
import { useCallback, useId, useMemo } from 'react';
import { formatPitchDistanceM, getBowlingLengthFromTarget } from '@/lib/pitch/bowling-length';
import { normalizedToViewBox, viewBoxToNormalized } from '@/lib/pitch/coordinate-mapper';
import { DEFAULT_PITCH_LAYOUT, PITCH_VIEWBOX } from '@/lib/pitch/pitch-layout';
import { getAllZoneBandPolygons } from '@/lib/pitch/zone-geometry';

type InteractivePitchProps = {
  /** Current normalized target — null when the player has not selected yet. */
  value: PitchTarget | null;
  /** Called when the player selects or moves the target on the pitch. */
  onChange: (target: PitchTarget) => void;
  /** Optional accessible label override for the pitch surface. */
  ariaLabel?: string;
};

/**
 * Interactive cricket pitch — authoritative target selection.
 *
 * Visual weight matches the original practice setup card: one instruction line,
 * SVG pitch, subtle length bands. Length classification is derived display data.
 */
export function InteractivePitch({
  value,
  onChange,
  ariaLabel = 'Interactive cricket pitch — tap where you want the ball to pitch',
}: InteractivePitchProps) {
  const instructionsId = useId();
  const layout = DEFAULT_PITCH_LAYOUT;
  const topLeftX: number = Number(layout.topLeftX);
  const topRightX: number = Number(layout.topRightX);
  const topY: number = Number(layout.topY);
  const bottomLeftX: number = Number(layout.bottomLeftX);
  const bottomRightX: number = Number(layout.bottomRightX);
  const bottomY: number = Number(layout.bottomY);
  const zoneBands = useMemo(() => getAllZoneBandPolygons(layout), [layout]);
  const analysis = value ? getBowlingLengthFromTarget(value) : null;
  const activeCategory = analysis?.category ?? null;

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<SVGSVGElement>) => {
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
  const midTopX = (topLeftX + topRightX) / 2;
  const midBottomX = (bottomLeftX + bottomRightX) / 2;

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
        <defs>
          <style>{`
            @keyframes pitch-target-pulse {
              0%, 100% { opacity: 0.45; }
              50% { opacity: 0.15; }
            }
            .pitch-target-pulse { animation: pitch-target-pulse 1.6s ease-in-out infinite; }
            @media (prefers-reduced-motion: reduce) {
              .pitch-target-pulse { animation: none; opacity: 0.3; }
            }
          `}</style>
        </defs>

        {/* Outfield — same green language as the original pitch */}
        <rect x="0" y="0" width="100" height="160" fill="#3d7a37" rx="4" />

        {/* Pitch strip */}
        <polygon
          points={`${topLeftX},${topY} ${topRightX},${topY} ${bottomRightX},${bottomY} ${bottomLeftX},${bottomY}`}
          fill="#c9a86c"
          stroke="#a08050"
          strokeWidth="0.5"
        />

        {/* Subtle length bands — faint so the pitch remains the visual focus */}
        {zoneBands.map((band) => (
          <polygon
            key={band.category}
            points={band.points}
            fill={band.fill}
            opacity={activeCategory === band.category ? 0.95 : 0.45}
            pointerEvents="none"
          />
        ))}

        {/* Tiny side labels — readable but not chart-like */}
        {zoneBands.map((band) => (
          <text
            key={`label-${band.category}`}
            x={band.labelAnchor.x}
            y={band.labelAnchor.y}
            textAnchor="end"
            fontSize="2.2"
            fill="#ecfdf5"
            opacity={activeCategory === band.category ? 0.95 : 0.55}
            pointerEvents="none"
          >
            {band.label}
          </text>
        ))}

        {/* Creases */}
        <line
          x1={topLeftX + 2}
          y1={topY + 4}
          x2={topRightX - 2}
          y2={topY + 4}
          stroke="#ffffff"
          strokeWidth="0.8"
          opacity="0.85"
          pointerEvents="none"
        />
        <line
          x1={bottomLeftX + 2}
          y1={bottomY - 6}
          x2={bottomRightX - 2}
          y2={bottomY - 6}
          stroke="#ffffff"
          strokeWidth="0.8"
          opacity="0.85"
          pointerEvents="none"
        />

        {/* Stumps — batter end */}
        <g transform={`translate(${midTopX - 2}, ${topY + 2})`} pointerEvents="none">
          <rect x="0" y="0" width="0.6" height="3" fill="#f5f5f4" />
          <rect x="1.7" y="0" width="0.6" height="3" fill="#f5f5f4" />
          <rect x="3.4" y="0" width="0.6" height="3" fill="#f5f5f4" />
        </g>

        {/* Stumps — bowler end */}
        <g transform={`translate(${midBottomX - 2}, ${bottomY - 5})`} pointerEvents="none">
          <rect x="0" y="0" width="0.6" height="3" fill="#f5f5f4" />
          <rect x="1.7" y="0" width="0.6" height="3" fill="#f5f5f4" />
          <rect x="3.4" y="0" width="0.6" height="3" fill="#f5f5f4" />
        </g>

        <text x="50" y="12" textAnchor="middle" fontSize="3.5" fill="#ecfdf5" opacity="0.9">
          Batter end
        </text>
        <text x="50" y="152" textAnchor="middle" fontSize="3.5" fill="#ecfdf5" opacity="0.9">
          Bowler end
        </text>

        {marker ? (
          <g aria-hidden="true">
            <circle
              className="pitch-target-pulse"
              cx={marker.vx}
              cy={marker.vy}
              r="5.5"
              fill="none"
              stroke="#ef4444"
              strokeWidth="0.9"
            />
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

      <p className="sr-only" aria-live="polite">
        {analysis
          ? `Pitch target selected: ${analysis.label}, ${formatPitchDistanceM(analysis.distanceFromBatterM)} from batter's crease, ${analysis.lateralLabel}`
          : 'No pitch target selected'}
      </p>
    </div>
  );
}
