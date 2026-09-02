# Pitch Visualization & Coordinate Architecture

> **Status:** Designed (not implemented)
> **Last updated:** 2026-09-02 (finalized pitch-selection UX)

## Overview

The Throw Ball UI uses an **interactive cricket-pitch visualization** based on a supplied perspective reference image. The player selects a ball landing/pitching location by tapping or clicking directly on the pitch — never by entering physical coordinates.

## End-to-End Interaction Pipeline

The complete path from player intent to machine actuation:

```
Player tap on pitch visualization
    │
    ▼
Normalized UI coordinate (ui_x, ui_y)
    │  — pointer position relative to image bounds; perspective-distorted
    ▼
Pitch Coordinate Mapper (configurable, replaceable)
    │
    ▼
Pitch / physical target representation (target_x, target_y)
    │  — persisted normalized coordinates in interactive pitch coordinate system
    ▼
Trajectory calculation (backend, calibration-driven)
    │
    ▼
Machine parameter calculation (backend, calibration-driven)
    │  — wheel RPM, actuator positions, feeder timing
    ▼
Safety validation (backend business rules + ESP32 firmware)
    │
    ▼
ESP32 command execution
```

Each stage has a single owner. No stage may skip ahead or assume mappings from a later stage.

## Coordinate Model

### Persisted Target: Normalized Pitch Coordinates

The user-selected target is persisted and transmitted using **normalized pitch coordinates**:

```
target_x = 0.62
target_y = 0.73
```

These values represent the selected location in the **interactive pitch coordinate system**. They are:

- Normalized to the range `0.0`–`1.0` on each axis
- **NOT** raw screen pixels
- **NOT** machine actuator values, RPM, or physical distances

Because the pitch visualization uses perspective, screen Y must **NOT** be assumed to map linearly to physical pitch distance. The Pitch Coordinate Mapper handles this correction before `target_x`/`target_y` are produced.

### Coordinate Abstraction

```
Normalized UI Coordinate (ui_x, ui_y)
        │
        ▼
Pitch Coordinate Mapper          ← configurable, replaceable; tied to reference image
        │
        ▼
Pitch / Physical Target (target_x, target_y)   ← persisted; input to backend
        │
        ▼
Machine physical parameters      ← calibration-dependent; backend only
```

| Coordinate             | Space                               | Persisted?                | Used by calculation engine? |
| ---------------------- | ----------------------------------- | ------------------------- | --------------------------- |
| `ui_x`, `ui_y`         | Perspective image space             | Optional (display replay) | No                          |
| `target_x`, `target_y` | Interactive pitch coordinate system | **Yes (authoritative)**   | Yes                         |

### Pitch Coordinate Mapper

Dedicated abstraction in `packages/shared/pitch-coordinates/`:

- **Configurable** — mapping defined in versioned config tied to the reference image asset
- **Replaceable** — interface allows swapping implementations without changing UI or backend contract
- **Independent of machine calibration** — maps image space to logical pitch space only
- **Does NOT contain** — physical pitch geometry for the machine, actuator mappings, RPM mappings, launch angles, or physical constants

The exact mapping from pitch coordinate system to the machine's physical coordinate system is **calibration-dependent** and deferred until experimental calibration with actual machine geometry (see [UD-01](../architecture/UNRESOLVED_DECISIONS.md)).

## Reference Image

The pitch visualization visual design is **inspired by the cricket-pitch reference image supplied by the project owner** (perspective view — exact viewpoint documented when asset is added).

| Property             | Value                                                                   |
| -------------------- | ----------------------------------------------------------------------- |
| Asset path (planned) | `apps/web/public/assets/cricket-pitch-reference.webp`                   |
| Format               | WebP preferred (PNG fallback acceptable)                                |
| Status               | **Asset not yet committed** — must be supplied before UI implementation |
| Usage                | Background/canvas for interactive hit target; not a generic diagram     |

The visualization MUST visually match this reference image. Do not substitute a flat top-down diagram unless an ADR approves a change.

## Layer 1: Visual Interaction (Frontend Only)

### PitchMapSelector Component

Interactive component on the Throw Ball page (`/machine/[id]/throw`).

**Player interaction:**

1. Player sees the cricket-pitch reference image (perspective view)
2. Player taps (mobile) or clicks (desktop) the desired landing/pitching location
3. Component captures the pointer position relative to the **pitch image bounds** (not the full viewport)
4. Component converts pixel position to **normalized UI coordinates**

**Normalized UI coordinates (`ui_x`, `ui_y`):**

- Range: `0.0` to `1.0` on each axis
- Origin: top-left of the pitch image bounding box
- `ui_x`: horizontal position on the image (0.0 = left edge, 1.0 = right edge)
- `ui_y`: vertical position on the image (0.0 = top of image, 1.0 = bottom of image)
- These values live in **perspective-distorted image space** — they do NOT directly represent physical pitch distance

**UI requirements:**

- Minimum touch target for the selected marker: 44×44px (accessibility)
- Selected point shown with a visible marker overlay
- Optional visual zone hints (yorker, good length, etc.) as non-blocking overlays
- Responsive scaling: image scales to container; normalization always relative to image bounds
- No text inputs for coordinates, distances, or angles

**Frontend does NOT:**

- Ask the player to enter physical coordinates
- Compute pitch target coordinates inline in the component (delegates to Pitch Coordinate Mapper)
- Compute machine parameters, trajectory, orientation, or physics-based feeder timing
- Apply linear Y→distance mapping

### UI Behavior on Target Selection

When the player taps or clicks the pitch visualization:

1. **Display a clear target marker** at the selected point on the pitch image
2. **Store normalized coordinates** — capture `ui_x`/`ui_y`, map to `target_x`/`target_y` via Pitch Coordinate Mapper
3. **Display the selected target** — show marker and coordinate summary in the UI
4. **Allow retargeting** — player may tap elsewhere to move the target; marker and stored coordinates update
5. **Provide reset** — clear control to remove the target and reset selection state
6. **Confirm before delivery** — selected target must be visible and confirmed before the player starts the delivery

The target summary is shown again on the pre-delivery confirmation step.

### Human-Readable Target Summary

The frontend displays a human-readable summary of the selected target alongside the marker. Examples of descriptions the system should **eventually** support:

- yorker, full, good length, short
- outside off, middle, leg side

**Rules:**

- Descriptions are **display-only** — they do not replace `target_x`/`target_y` as the persisted target
- Do **NOT** hard-code cricket-region classification unless explicitly defined in configuration
- Region labels (if added later) must come from a configurable mapping, not inline UI logic
- Until region classification is defined, show normalized coordinates or a generic label (e.g., "Target selected")

### Component Structure (Planned)

```
packages/ui/src/pitch-map/
├── PitchMapSelector.tsx       # Interactive visualization + tap handling
├── PitchTargetMarker.tsx      # Selected point marker overlay
└── pitch-map.types.ts         # Shared UI types

apps/web/src/lib/pitch-coordinates/
└── usePitchTargetSelection.ts # Hook: tap → ui coords → pitch reference coords
```

## Layer 2: Pitch Coordinate Transformation

A **dedicated pitch-coordinate transformation layer** converts normalized UI coordinates into **pitch reference coordinates**. This is a separate module — not embedded in the React component and not part of the calculation engine.

### Location

```
packages/shared/src/pitch-coordinates/
├── types.ts                   # NormalizedUiCoordinate, PitchTarget
├── pitch-coordinate-mapper.ts # Pitch Coordinate Mapper interface + default impl
├── inverse-mapper.ts          # Pitch target → UI position (marker rendering)
├── config/
│   └── default-perspective.json  # Configurable mapping for reference image
└── index.ts
```

The **Pitch Coordinate Mapper** is the dedicated abstraction. It is configurable and replaceable. Implementation modules may be named `pitch-coordinate-mapper.ts`; the public API exposes `mapUiToPitchTarget(ui, config) → { target_x, target_y }`.
Shared in `packages/shared` so the Pitch Coordinate Mapper is:

### Perspective Transformation

The reference image uses perspective foreshortening. A tap at the vertical center of the image does **not** correspond to the physical center of the pitch length.

```
Image space (perspective)          Pitch reference space (logical)
┌─────────────────────┐            ┌─────────────────────┐
│ ▲ far (narrow)      │            │ y=0.0  bowler end   │
│ │                   │   ──▶      │                     │
│ │    ● tap here     │  transform │         ● same point│
│ │                   │            │                     │
│ ▼ near (wide)       │            │ y=1.0  batsman end  │
└─────────────────────┘            └─────────────────────┘
     ui_y ≠ linear pitch_y
```

**Transformation approach (designed, not implemented):**

- Configurable mapping defined in `default-perspective.json` (or equivalent)
- Mapping tied to the specific reference image asset (versioned with asset)
- Implementation options (to be chosen during Phase 1 — not decided here):
  - Bilinear/triangle mesh interpolation over control points
  - Inverse homography from calibrated corner/line correspondences
  - Lookup grid with interpolation
- **No physics constants, no machine geometry, no actuator mappings in this layer**

The transformation config defines **image ↔ logical pitch** correspondence only. It is NOT machine calibration.

### Configuration File Shape (Illustrative)

```json
{
  "version": 1,
  "referenceImage": "cricket-pitch-reference.webp",
  "description": "Perspective mapping for supplied reference image. NOT machine calibration.",
  "mapping": {
    "type": "UNRESOLVED",
    "comment": "Exact mapping algorithm and control points TBD when reference image is finalized"
  }
}
```

Do not populate control points or constants until the reference image is finalized and validated.

## Backend: Trajectory and Machine Parameters

The backend receives **normalized pitch coordinates** (`target_x`, `target_y`) — never raw UI coordinates, never screen pixels.

```
API Request (target_x, target_y, speed, ball_type, ...)
    │
    ▼
Trajectory calculation (calibration: position_trajectory)
    │
    ▼
Machine parameter calculation (calibration: speed_rpm, actuator_position, feeder_timing)
    │
    ▼
Backend validation (business rules, bounds)
    │
    ▼
Machine command → ESP32
    │
    ▼
ESP32 safety validation (range checks, state, TTL) → execution
```

The calculation engine does **NOT** perform UI/perspective transformation. It assumes inputs are already in the interactive pitch coordinate system.

**Why physical mapping is deferred:** The relationship between pitch coordinates and machine actuators, wheel RPM, launch angles, and trajectory depends on actual machine geometry, which is not yet known. These mappings will be established through experimental calibration — not invented in documentation or code. See [Calculation Engine](../calibration/CALCULATION_ENGINE.md) and [UD-01](../architecture/UNRESOLVED_DECISIONS.md).

## Data Flow: Throw Ball

```
Player taps pitch image
    │
    ▼
PitchMapSelector: pointer (px) → normalize → { ui_x, ui_y }
    │
    ▼
pitch-coordinates/pitch-coordinate-mapper: { ui_x, ui_y } + config → { target_x, target_y }
    │
    ▼
UI displays marker + human-readable target summary
    │
    ▼
Delivery form state: { target_x, target_y, speed, type, ... }
    │
    ▼
Player confirms target visible → POST /api/v1/deliveries
    │
    ▼
Backend: trajectory → machine params → safety validation → ESP32 command
```

Optional: store `{ ui_x, ui_y }` alongside delivery for accurate marker re-rendering. `target_x`/`target_y` remain the authoritative persisted target.

## Frontend Responsibilities (Summary)

The frontend is responsible **only** for:

| Responsibility                   | Detail                                                                      |
| -------------------------------- | --------------------------------------------------------------------------- |
| Display the pitch                | Render reference-image-inspired visualization                               |
| Allow target selection           | Tap/click on pitch                                                          |
| Display selected target          | Marker + summary                                                            |
| Normalized coordinate conversion | Tap → UI coords → Pitch Coordinate Mapper → `target_x`/`target_y`           |
| Human-readable summary           | Display-only labels (when configured); never replaces persisted coordinates |

The frontend must **NOT** calculate:

- Actuator positions
- Wheel RPM
- Machine orientation
- Physical trajectory
- Feeder timing based on physics

## API Contract

Delivery requests use normalized pitch coordinates:

| Field             | Space                               | Description                                                       |
| ----------------- | ----------------------------------- | ----------------------------------------------------------------- |
| `target_x`        | Interactive pitch coordinate system | Horizontal position (0.0–1.0); **persisted authoritative target** |
| `target_y`        | Interactive pitch coordinate system | Length position (0.0–1.0); **persisted authoritative target**     |
| `ui_x` (optional) | Normalized UI                       | Stored for marker replay only; not used by calculation engine     |
| `ui_y` (optional) | Normalized UI                       | Stored for marker replay only; not used by calculation engine     |

## Responsibility Matrix

| Concern                       | Owner                                       | Must NOT do                                    |
| ----------------------------- | ------------------------------------------- | ---------------------------------------------- |
| Render reference image        | Frontend (`PitchMapSelector`)               | Compute machine params                         |
| Capture tap → UI coords       | Frontend (`PitchMapSelector`)               | Linear Y→distance mapping                      |
| UI → pitch target             | Pitch Coordinate Mapper (`packages/shared`) | Machine/actuator/RPM/trajectory mapping        |
| Perspective config            | JSON config (versioned with image)          | Hard-code physics constants or cricket regions |
| Pitch target → machine params | Backend calculation engine                  | UI/perspective transformation                  |
| Trajectory / machine params   | Backend (calibration-driven)                | Invent physical constants                      |
| Safety validation             | Backend + ESP32 firmware                    | Trust unchecked input                          |

## Testing Strategy

| Test                      | Location                                       | Validates                                        |
| ------------------------- | ---------------------------------------------- | ------------------------------------------------ |
| Tap normalization         | `PitchMapSelector` unit tests                  | Pixel → ui_x/ui_y correct for image bounds       |
| Perspective transform     | `packages/shared/pitch-coordinates` unit tests | Known UI points → expected `target_x`/`target_y` |
| Inverse mapper            | Same                                           | Saved target → correct marker position           |
| Retarget + reset          | `PitchMapSelector` component tests             | Tap move, reset clears state                     |
| Pre-delivery confirmation | E2E                                            | Target visible before throw                      |
| No linear Y assumption    | Mapper unit tests                              | Equal `ui_y` steps ≠ equal `target_y` steps      |
| Frontend isolation        | Architecture review                            | No RPM/actuator/trajectory in frontend code      |

## Unresolved Items

See [Unresolved Decisions](../architecture/UNRESOLVED_DECISIONS.md):

- **UD-01:** Interaction model defined; pitch→machine physical mapping deferred (calibration-dependent)
- UD-18: Pitch Coordinate Mapper algorithm selection
- UD-19: Reference image asset finalization
- UD-20: Cricket region classification configuration (optional, future)

## Related Documents

- [Frontend Architecture](./FRONTEND_ARCHITECTURE.md)
- [Calculation Engine](../calibration/CALCULATION_ENGINE.md)
- [API Specification](../api/API_SPECIFICATION.md)
- [Database Design](../database/DATABASE_DESIGN.md)
