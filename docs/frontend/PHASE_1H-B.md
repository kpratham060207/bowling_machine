# Phase 1H-B — Interactive Pitch & Delivery Configuration

> **Status:** Implemented (Phase 1H-B + subtle pitch length/3D visualization)
> **Last updated:** 2026-09-05

## Overview

Phase 1H-B provides the signature player experience: an interactive perspective cricket pitch, delivery configuration controls, review step, software calculation, and optional machine execution.

**Architectural rule:** The frontend stores normalized logical pitch coordinates and high-level delivery parameters only. Physical machine positioning remains backend/calibration dependent.

**UX rule:** New pitch-length and 3D features must fit the existing practice-setup visual hierarchy. The 2D pitch + delivery controls remain primary; 3D is optional and collapsed by default.

## Architecture

```
InteractivePitch (2D SVG — AUTHORITATIVE selection)
    ↓
PitchCoordinateMapper (viewBox ↔ normalized target)
    ↓
getBowlingLengthFromTarget (derived length label + distance)
    ↓
PracticeSetupState (React context) ──► Pitch3DViewer (visualization only)
    ↓
POST calculation / deliveries with target_x + target_y
    ↓
Phase 1F Calculation Engine + Phase 1G orchestration
```

## Normalized coordinate model

Uses `PitchTarget` from `@bowling-machine/api-contracts`:

- `target_x`: 0..1 horizontal on the logical pitch
- `target_y`: 0..1 length (0 = bowler end, 1 = batter end)

These are **not** screen pixels, DOM percentages, or machine actuator values.

## Automatic bowling length

Length is **derived** from `target_y` — the player never picks Yorker/Full/Good Length/Short/Bouncer as a separate form field.

1. Tap → normalized `target_y`
2. Distance from batter's crease = `(1 - target_y) × CRICKET_PITCH_LENGTH_M`
3. Classify via `BOWLING_LENGTH_ZONES` (single source of truth)
4. Update 2D zone highlight + target summary + 3D marker

`CRICKET_PITCH_LENGTH_M = 20.12` is the Law 7 cricket pitch length between bowling creases. It is a **documented UI/domain reference**, not calibrated machine geometry.

The length category is display-only. Delivery requests still send `target_x` / `target_y`.

### Length zones (metres from batter's crease)

| Category    | Label       | Range (m)    |
| ----------- | ----------- | ------------ |
| YORKER      | Yorker      | 0 – 2.0      |
| FULL        | Full        | 2.0 – 4.5    |
| GOOD_LENGTH | Good Length | 4.5 – 8.0    |
| SHORT       | Short       | 8.0 – 12.5   |
| BOUNCER     | Bouncer     | 12.5 – 20.12 |

## 2D ↔ 3D synchronization

| Surface            | Role                                           | Writes target? |
| ------------------ | ---------------------------------------------- | -------------- |
| InteractivePitch   | Authoritative target selection                 | Yes            |
| PitchTargetSummary | Compact coaching labels / distance             | No             |
| Pitch3DViewerGate  | Optional collapsed section; loads 3D on demand | No             |
| Pitch3DViewer      | Rotate/zoom visualization of the same target   | No             |

Resetting the 3D camera never clears or moves the selected target. The 3D section starts collapsed so it does not dominate the practice page.

## Perspective mapping

`apps/web/src/lib/pitch/coordinate-mapper.ts` applies a deterministic perspective transform:

- SVG viewBox is fixed (`100×160`) so resize keeps normalized coordinates stable
- Trapezoid pitch surface (wider at bowler end)
- Y-axis uses the same perspective exponent as the simulation backend mapper (0.85)

## Key modules

| Module            | Path                                                  |
| ----------------- | ----------------------------------------------------- |
| Interactive pitch | `apps/web/src/components/interactive-pitch.tsx`       |
| Target summary    | `apps/web/src/components/pitch-target-summary.tsx`    |
| 3D viewer         | `apps/web/src/components/pitch-3d-viewer.tsx`         |
| 3D lazy gate      | `apps/web/src/components/pitch-3d-viewer-gate.tsx`    |
| Bowling length    | `apps/web/src/lib/pitch/bowling-length.ts`            |
| Zone geometry     | `apps/web/src/lib/pitch/zone-geometry.ts`             |
| Coordinate mapper | `apps/web/src/lib/pitch/coordinate-mapper.ts`         |
| Pitch layout      | `apps/web/src/lib/pitch/pitch-layout.ts`              |
| Setup state       | `apps/web/src/lib/practice/setup-state.ts`            |
| Setup controls    | `apps/web/src/components/practice-setup-controls.tsx` |
| Setup page        | `apps/web/src/app/app/practice/setup/page.tsx`        |

## 3D library

Lightweight **Three.js** via **React Three Fiber** + **Drei** (`OrbitControls`). Loaded with `next/dynamic` (`ssr: false`) so the 2D pitch stays interactive immediately. Canvas uses `frameloop="demand"` to avoid idle GPU work.

## Delivery flow

1. Player taps 2D pitch (length auto-derived) + configures speed / ball type / count / timing
2. Optional: inspect selection in the 3D viewer
3. Calculate delivery / review → start practice when a machine is available
4. Backend receives `target_x` / `target_y` (not the length label)

## Testing

- `bowling-length.test.ts` — distances, zone boundaries, classification
- `coordinate-mapper.test.ts` — mapping, round-trip, bounds
- `interactive-pitch.test.tsx` — selection + derived length UX
- `pitch-target-summary.test.tsx` — summary panel + speed independence
- `pitch-3d-viewer.test.tsx` — shared target + reset does not mutate selection
