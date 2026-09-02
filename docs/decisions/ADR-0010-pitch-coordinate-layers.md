# ADR-0010: Pitch Coordinate Layers

## Status

Accepted

## Context

The Throw Ball UI uses a perspective cricket-pitch reference image. Players select delivery location by tapping the image. Screen coordinates in a perspective view do not map linearly to physical pitch distance. The system must separate visual interaction, pitch reference coordinates, and machine parameter calculation into distinct layers with clear ownership.

Previously, documentation treated `target_x`/`target_y` as a single normalized coordinate system without distinguishing UI image space from logical pitch space.

## Decision

Adopt a **multi-stage coordinate architecture** with clear ownership:

1. **Normalized UI coordinates** (`ui_x`, `ui_y`) — tap on perspective pitch image (frontend)
2. **Pitch Coordinate Mapper** — configurable, replaceable; converts UI → pitch target (packages/shared)
3. **Normalized pitch target** (`target_x`, `target_y`) — persisted interactive pitch coordinate system
4. **Trajectory + machine parameters** — calibration-driven (backend calculation engine)
5. **Safety validation + ESP32 execution** — firmware authority

Rules:

- Players NEVER enter physical coordinates manually
- Screen Y MUST NOT be assumed to map linearly to pitch distance
- Frontend MUST NOT compute actuator positions, wheel RPM, machine orientation, physical trajectory, or physics-based feeder timing
- Backend/calculation engine MUST NOT perform UI/perspective transformation
- Physical pitch→machine mapping is calibration-dependent and intentionally deferred
- No machine geometry, actuator mappings, RPM mappings, launch angles, or physical constants in layers 1–3

## Alternatives Considered

| Alternative                             | Reason Rejected                                                                |
| --------------------------------------- | ------------------------------------------------------------------------------ |
| Single normalized coordinate (linear Y) | Incorrect for perspective image; misplaces targets                             |
| Player enters physical coordinates      | Poor UX; violates product requirement                                          |
| Backend performs perspective transform  | Frontend owns visualization geometry; backend shouldn't know about image asset |
| Flat top-down pitch diagram             | Does not match supplied reference image visual                                 |
| Store only UI coordinates in API        | Calculation engine needs pitch reference space independent of display          |

## Consequences

**Positive:**

- Clear separation of concerns across frontend, shared lib, and backend
- Perspective correction isolated and testable
- Calculation engine inputs stable regardless of UI asset changes
- Saved UI coordinates enable accurate marker replay on visualization

**Negative:**

- Two coordinate systems to maintain and document
- Perspective mapping config must be versioned with reference image
- Transformation algorithm still to be selected (UD-18)

## Related

- [Pitch Visualization & Coordinate Architecture](../frontend/PITCH_VISUALIZATION.md)
- [Calculation Engine](../calibration/CALCULATION_ENGINE.md)
- [ADR-0008 Calibration Architecture](./ADR-0008-calibration-architecture.md)
