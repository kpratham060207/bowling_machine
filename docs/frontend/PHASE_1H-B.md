# Phase 1H-B — Interactive Pitch & Delivery Configuration

> **Status:** Implemented (Phase 1H-B)
> **Last updated:** 2026-09-02

## Overview

Phase 1H-B replaces the Phase 1H-A setup placeholder with the signature player experience: an interactive perspective cricket pitch, delivery configuration controls, review step, and submission to Phase 1G orchestration.

**Architectural rule:** The frontend stores normalized logical pitch coordinates and high-level delivery parameters only. Physical machine positioning remains backend/calibration dependent.

## Architecture

```
InteractivePitch (SVG rendering)
    ↓
PitchCoordinateMapper (viewBox ↔ normalized target)
    ↓
PracticeSetupState (React context)
    ↓
POST /api/v1/sessions/:id/deliveries
    ↓
Phase 1F Calculation Engine + Phase 1G orchestration
```

## Normalized coordinate model

Uses `PitchTarget` from `@bowling-machine/api-contracts`:

- `target_x`: 0..1 horizontal on the logical pitch
- `target_y`: 0..1 length (0 = bowler end, 1 = batter end)

These are **not** screen pixels, DOM percentages, or physical metres.

## Perspective mapping

`apps/web/src/lib/pitch/coordinate-mapper.ts` applies a deterministic perspective transform:

- SVG viewBox is fixed (`100×160`) so resize keeps normalized coordinates stable
- Trapezoid pitch surface (wider at bowler end)
- Y-axis uses the same perspective exponent as the simulation backend mapper (0.85)

## Key modules

| Module            | Path                                                  |
| ----------------- | ----------------------------------------------------- |
| Interactive pitch | `apps/web/src/components/interactive-pitch.tsx`       |
| Coordinate mapper | `apps/web/src/lib/pitch/coordinate-mapper.ts`         |
| Pitch layout      | `apps/web/src/lib/pitch/pitch-layout.ts`              |
| Setup state       | `apps/web/src/lib/practice/setup-state.ts`            |
| Setup controls    | `apps/web/src/components/practice-setup-controls.tsx` |
| Setup page        | `apps/web/src/app/app/practice/setup/page.tsx`        |

## Delivery flow

1. Player configures target + speed + ball type + count + timing on setup page
2. Review summary → **Start Practice**
3. `POST /api/v1/sessions/:sessionId/deliveries` with `CreateDeliveryRequest`
4. Backend auto-executes when machine preconditions are met
5. Navigate to live session page for WebSocket updates

## Deferred to later phases

- Physical distance labels (e.g. metres from batter)
- Region classification (yorker/good length zones) without configurable mapping
- Measured telemetry display (speed, bounce location)
- AI-assisted targeting

## Testing

- `coordinate-mapper.test.ts` — mapping, round-trip, bounds, responsive stability
- `setup-state.test.ts` — validation and payload shape
- `setup-delivery.integration.test.ts` — contract-valid outgoing requests
- `interactive-pitch.test.tsx` — target selection UX (happy-dom)
