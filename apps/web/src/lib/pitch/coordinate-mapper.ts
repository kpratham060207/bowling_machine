import type { PitchTarget } from '@bowling-machine/api-contracts';
import {
  clamp01,
  DEFAULT_PITCH_LAYOUT,
  lerp,
  type PitchLayout,
  PITCH_VIEWBOX,
} from './pitch-layout';

export type ViewBoxPoint = { vx: number; vy: number };

/**
 * Maps normalized logical pitch coordinates to SVG viewBox coordinates.
 * Used to render the target marker at the correct perspective position.
 */
export function normalizedToViewBox(
  target: PitchTarget,
  layout: PitchLayout = DEFAULT_PITCH_LAYOUT,
): ViewBoxPoint {
  const x = clamp01(target.target_x);
  const y = clamp01(target.target_y);

  // target_y: 0 = bowler end (near/bottom), 1 = batter end (far/top).
  const visualDepth = Math.pow(y, 1 / layout.perspectiveExponent);
  const vy = layout.bottomY - visualDepth * (layout.bottomY - layout.topY);

  const leftX = lerp(layout.bottomLeftX, layout.topLeftX, visualDepth);
  const rightX = lerp(layout.bottomRightX, layout.topRightX, visualDepth);
  const vx = leftX + x * (rightX - leftX);

  return { vx, vy };
}

/**
 * Maps SVG viewBox coordinates to normalized logical pitch coordinates.
 * Returns null when the point lies outside the playable pitch surface.
 */
export function viewBoxToNormalized(
  vx: number,
  vy: number,
  layout: PitchLayout = DEFAULT_PITCH_LAYOUT,
): PitchTarget | null {
  if (vy < layout.topY || vy > layout.bottomY) {
    return null;
  }

  const visualDepth = clamp01((layout.bottomY - vy) / (layout.bottomY - layout.topY));
  const target_y = clamp01(Math.pow(visualDepth, layout.perspectiveExponent));

  const leftX = lerp(layout.bottomLeftX, layout.topLeftX, visualDepth);
  const rightX = lerp(layout.bottomRightX, layout.topRightX, visualDepth);

  if (vx < leftX || vx > rightX) {
    return null;
  }

  const target_x = clamp01((vx - leftX) / (rightX - leftX));
  return { target_x, target_y };
}

/**
 * Converts a pointer position within an SVG element to viewBox coordinates.
 * Keeps mapping deterministic regardless of rendered pixel size.
 */
export function clientPointToViewBox(
  svg: SVGSVGElement,
  clientX: number,
  clientY: number,
): ViewBoxPoint | null {
  const ctm = svg.getScreenCTM();
  if (!ctm) {
    return null;
  }

  const point = svg.createSVGPoint();
  point.x = clientX;
  point.y = clientY;
  const transformed = point.matrixTransform(ctm.inverse());

  return {
    vx: (transformed.x / PITCH_VIEWBOX.width) * PITCH_VIEWBOX.width,
    vy: (transformed.y / PITCH_VIEWBOX.height) * PITCH_VIEWBOX.height,
  };
}

/**
 * Maps a browser pointer event on the pitch SVG to a normalized pitch target.
 */
export function pointerEventToTarget(
  event: React.PointerEvent<SVGSVGElement>,
  layout: PitchLayout = DEFAULT_PITCH_LAYOUT,
): PitchTarget | null {
  const viewPoint = clientPointToViewBox(event.currentTarget, event.clientX, event.clientY);
  if (!viewPoint) {
    return null;
  }
  return viewBoxToNormalized(viewPoint.vx, viewPoint.vy, layout);
}
