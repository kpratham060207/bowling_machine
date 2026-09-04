'use client';

import type { PitchTarget } from '@bowling-machine/api-contracts';
import { useCallback, useId, useMemo } from 'react';
import { formatPitchDistanceM, getBowlingLengthFromTarget } from '@/lib/pitch/bowling-length';
import { normalizedToViewBox, viewBoxToNormalized } from '@/lib/pitch/coordinate-mapper';
import { DEFAULT_PITCH_LAYOUT, PITCH_VIEWBOX, type PitchLayout } from '@/lib/pitch/pitch-layout';
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
 * Responsive interactive cricket pitch — polished SVG visualization.
 *
 * Remains the AUTHORITATIVE target-selection surface. Produces normalized
 * target_x / target_y only; bowling-length labels are derived display data.
 */
export function InteractivePitch({
  value,
  onChange,
  ariaLabel = 'Interactive cricket pitch — tap where you want the ball to pitch',
}: InteractivePitchProps) {
  const instructionsId = useId();
  const layout: PitchLayout = DEFAULT_PITCH_LAYOUT;
  const zoneBands = useMemo(() => getAllZoneBandPolygons(layout), [layout]);

  const analysis = value ? getBowlingLengthFromTarget(value) : null;
  const activeCategory = analysis?.category ?? null;

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

  // Crease geometry — approximate cricket markings in viewBox space.
  // Explicit Number() keeps eslint type-aware rules happy if the layout type
  // is widened during type-aware lint of the R3F-enabled web project.
  const topY = Number(layout.topY);
  const bottomY = Number(layout.bottomY);
  const topLeftX = Number(layout.topLeftX);
  const topRightX = Number(layout.topRightX);
  const bottomLeftX = Number(layout.bottomLeftX);
  const bottomRightX = Number(layout.bottomRightX);
  const batterCreaseY = topY + 5;
  const bowlerCreaseY = bottomY - 7;
  const midTopX = (topLeftX + topRightX) / 2;
  const midBottomX = (bottomLeftX + bottomRightX) / 2;

  return (
    <div className="w-full touch-none select-none" style={{ touchAction: 'none' }}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Pitch target</h2>
          <p id={instructionsId} className="mt-0.5 text-sm text-slate-600">
            {value
              ? 'Target selected — tap elsewhere to adjust'
              : 'Tap where you want the ball to pitch'}
          </p>
        </div>
        {analysis ? (
          <div className="rounded-md bg-pitch-50 px-2.5 py-1.5 text-right">
            <p className="text-xs font-medium uppercase tracking-wide text-pitch-800">Length</p>
            <p className="text-sm font-semibold text-pitch-900">{analysis.label}</p>
          </div>
        ) : null}
      </div>

      <svg
        viewBox={`0 0 ${PITCH_VIEWBOX.width} ${PITCH_VIEWBOX.height}`}
        className="w-full max-w-lg rounded-2xl border border-slate-300 shadow-md"
        role="img"
        aria-label={ariaLabel}
        aria-describedby={instructionsId}
        onPointerDown={handlePointerDown}
      >
        <defs>
          {/* Soft grass gradient for the outfield. */}
          <linearGradient id="outfieldGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2f6b32" />
            <stop offset="50%" stopColor="#3d8240" />
            <stop offset="100%" stopColor="#2a5c2d" />
          </linearGradient>
          {/* Subtle depth on the pitch strip. */}
          <linearGradient id="pitchSurfaceGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#d8b878" />
            <stop offset="45%" stopColor="#c9a86c" />
            <stop offset="100%" stopColor="#b89555" />
          </linearGradient>
          <radialGradient id="pitchGlow" cx="50%" cy="40%" r="60%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </radialGradient>
          {/* Pulse for the selected target — disabled under reduced motion via CSS. */}
          <style>{`
            @keyframes pitch-target-pulse {
              0%, 100% { opacity: 0.55; r: 5.2; }
              50% { opacity: 0.2; r: 7.2; }
            }
            .pitch-target-pulse {
              animation: pitch-target-pulse 1.4s ease-in-out infinite;
            }
            @media (prefers-reduced-motion: reduce) {
              .pitch-target-pulse { animation: none; opacity: 0.35; }
            }
          `}</style>
        </defs>

        {/* Outfield / surrounding grass */}
        <rect
          x="0"
          y="0"
          width={PITCH_VIEWBOX.width}
          height={PITCH_VIEWBOX.height}
          fill="url(#outfieldGradient)"
          rx="6"
        />
        {/* Soft vignette for depth */}
        <rect
          x="0"
          y="0"
          width={PITCH_VIEWBOX.width}
          height={PITCH_VIEWBOX.height}
          fill="url(#pitchGlow)"
          rx="6"
          pointerEvents="none"
        />

        {/* Pitch strip with perspective trapezoid */}
        <polygon
          points={`${topLeftX},${topY} ${topRightX},${topY} ${bottomRightX},${bottomY} ${bottomLeftX},${bottomY}`}
          fill="url(#pitchSurfaceGradient)"
          stroke="#8f7340"
          strokeWidth="0.7"
        />

        {/* Length zones — derived from the central bowling-length config */}
        {zoneBands.map((band) => {
          const isActive = activeCategory === band.category;
          return (
            <polygon
              key={band.category}
              points={band.points}
              fill={band.fill}
              opacity={isActive ? 1 : 0.55}
              stroke={isActive ? '#0f766e' : 'none'}
              strokeWidth={isActive ? 0.6 : 0}
              pointerEvents="none"
            />
          );
        })}

        {/* Zone separator lines along the pitch */}
        {zoneBands.slice(0, -1).map((band, index) => {
          const nextBand = zoneBands[Number(index) + 1];
          if (!nextBand) return null;
          // Bottom edge of this band = top edge of the next band (shared boundary).
          const pts = band.points.split(' ');
          const bottomRightParts = pts[2]?.split(',') ?? [];
          const bottomLeftParts = pts[3]?.split(',') ?? [];
          const x1 = Number(bottomLeftParts[0]);
          const y1 = Number(bottomLeftParts[1]);
          const x2 = Number(bottomRightParts[0]);
          const y2 = Number(bottomRightParts[1]);
          if (![x1, y1, x2, y2].every((n) => Number.isFinite(n))) return null;
          return (
            <line
              key={`sep-${band.category}`}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="#ffffff"
              strokeWidth="0.35"
              strokeOpacity="0.45"
              strokeDasharray="1.2 1.2"
              pointerEvents="none"
            />
          );
        })}

        {/* Side labels for length zones */}
        {zoneBands.map((band) => (
          <text
            key={`label-${band.category}`}
            x={band.labelAnchor.x}
            y={band.labelAnchor.y}
            textAnchor="end"
            fontSize="2.6"
            fontWeight={activeCategory === band.category ? 700 : 500}
            fill={activeCategory === band.category ? '#ecfdf5' : '#d1fae5'}
            opacity={activeCategory === band.category ? 1 : 0.75}
            pointerEvents="none"
          >
            {band.label}
          </text>
        ))}

        {/* Batter-end popping crease */}
        <line
          x1={topLeftX + 1.5}
          y1={batterCreaseY}
          x2={topRightX - 1.5}
          y2={batterCreaseY}
          stroke="#f8fafc"
          strokeWidth="0.9"
          opacity="0.95"
          pointerEvents="none"
        />
        {/* Batter-end return creases (short side marks) */}
        <line
          x1={topLeftX + 1.5}
          y1={batterCreaseY - 2.5}
          x2={topLeftX + 1.5}
          y2={batterCreaseY + 2.5}
          stroke="#f8fafc"
          strokeWidth="0.55"
          opacity="0.85"
          pointerEvents="none"
        />
        <line
          x1={topRightX - 1.5}
          y1={batterCreaseY - 2.5}
          x2={topRightX - 1.5}
          y2={batterCreaseY + 2.5}
          stroke="#f8fafc"
          strokeWidth="0.55"
          opacity="0.85"
          pointerEvents="none"
        />

        {/* Bowler-end bowling / popping crease */}
        <line
          x1={bottomLeftX + 2}
          y1={bowlerCreaseY}
          x2={bottomRightX - 2}
          y2={bowlerCreaseY}
          stroke="#f8fafc"
          strokeWidth="0.9"
          opacity="0.95"
          pointerEvents="none"
        />
        <line
          x1={bottomLeftX + 2}
          y1={bowlerCreaseY - 2.5}
          x2={bottomLeftX + 2}
          y2={bowlerCreaseY + 2.5}
          stroke="#f8fafc"
          strokeWidth="0.55"
          opacity="0.85"
          pointerEvents="none"
        />
        <line
          x1={bottomRightX - 2}
          y1={bowlerCreaseY - 2.5}
          x2={bottomRightX - 2}
          y2={bowlerCreaseY + 2.5}
          stroke="#f8fafc"
          strokeWidth="0.55"
          opacity="0.85"
          pointerEvents="none"
        />

        {/* Centre line hint (subtle) */}
        <line
          x1={midTopX}
          y1={topY + 1}
          x2={midBottomX}
          y2={bottomY - 1}
          stroke="#ffffff"
          strokeWidth="0.25"
          strokeOpacity="0.25"
          strokeDasharray="1.5 2"
          pointerEvents="none"
        />

        {/* Stumps — batter end */}
        <g transform={`translate(${midTopX - 2.1}, ${topY + 1.2})`} pointerEvents="none">
          <rect x="0" y="0" width="0.7" height="3.4" rx="0.2" fill="#fafaf9" />
          <rect x="1.75" y="0" width="0.7" height="3.4" rx="0.2" fill="#fafaf9" />
          <rect x="3.5" y="0" width="0.7" height="3.4" rx="0.2" fill="#fafaf9" />
          <rect x="-0.15" y="-0.35" width="4.5" height="0.35" rx="0.1" fill="#e7e5e4" />
        </g>

        {/* Stumps — bowler end */}
        <g transform={`translate(${midBottomX - 2.1}, ${bottomY - 5.2})`} pointerEvents="none">
          <rect x="0" y="0" width="0.7" height="3.4" rx="0.2" fill="#fafaf9" />
          <rect x="1.75" y="0" width="0.7" height="3.4" rx="0.2" fill="#fafaf9" />
          <rect x="3.5" y="0" width="0.7" height="3.4" rx="0.2" fill="#fafaf9" />
          <rect x="-0.15" y="-0.35" width="4.5" height="0.35" rx="0.1" fill="#e7e5e4" />
        </g>

        {/* End labels */}
        <text
          x="50"
          y="11"
          textAnchor="middle"
          fontSize="3.4"
          fontWeight="600"
          fill="#ecfdf5"
          opacity="0.95"
          pointerEvents="none"
        >
          Batter end
        </text>
        <text
          x="50"
          y="154"
          textAnchor="middle"
          fontSize="3.4"
          fontWeight="600"
          fill="#ecfdf5"
          opacity="0.95"
          pointerEvents="none"
        >
          Bowler end
        </text>

        {/* Target marker — ring + centre + subtle pulse */}
        {marker ? (
          <g aria-hidden="true" className="transition-transform duration-150">
            <circle
              className="pitch-target-pulse"
              cx={marker.vx}
              cy={marker.vy}
              r="5.2"
              fill="none"
              stroke="#ef4444"
              strokeWidth="1"
            />
            <circle
              cx={marker.vx}
              cy={marker.vy}
              r="4.2"
              fill="none"
              stroke="#dc2626"
              strokeWidth="1.35"
            />
            <circle cx={marker.vx} cy={marker.vy} r="1.35" fill="#dc2626" />
            <circle cx={marker.vx} cy={marker.vy} r="0.45" fill="#fecaca" />
          </g>
        ) : null}
      </svg>

      {/* Screen-reader / accessible description using coaching terms, not raw coords */}
      <p className="sr-only" aria-live="polite">
        {analysis
          ? `Pitch target selected: ${analysis.label}, ${formatPitchDistanceM(analysis.distanceFromBatterM)} from batter's crease, ${analysis.lateralLabel}`
          : 'No pitch target selected'}
      </p>
    </div>
  );
}
