# Calculation Engine

> **Status:** Implemented (Phase 1F — SIMULATION_CALIBRATION only)
> **Last updated:** 2026-09-02
> **Package:** `packages/calculation-engine` (`@bowling-machine/calculation-engine`)

## Overview

The calculation engine converts a player's high-level `DeliveryRequest` into validated `MachineDeliveryParameters` suitable for `THROW_SEQUENCE` command encoding. It is a **replaceable, calibration-driven module** with no database, Fastify, React, or simulator dependencies in core logic.

**The calculation engine does NOT:**

- Perform UI/perspective coordinate transformation (frontend Pitch Coordinate Mapper)
- Invent physically validated pitch geometry, actuator mappings, or RPM limits
- Claim physical accuracy for MVP simulation values
- Duplicate ESP32 firmware safety authority

Inputs are normalized pitch targets (`target_x`, `target_y`) from shared contracts. See [Pitch Visualization](../frontend/PITCH_VISUALIZATION.md) and [ADR-0010](../decisions/ADR-0010-pitch-coordinate-layers.md).

## Pipeline (Phase 1F)

```
DeliveryRequest (shared contract)
        │
        ▼
Structural validation (DeliveryRequestSchema / Zod)
        │
        ▼
Pitch Coordinate Mapper (engine-internal, simulation)
        │
        ▼
PitchReferenceCoordinate (simulation reference frame)
        │
        ▼
TrajectoryRepresentation (intermediate, decouples user intent from motors)
        │
        ▼
CalibrationProvider → SIMULATION_CALIBRATION profile
        │
        ▼
BallTypeStrategy (per-type simulation modifiers)
        │
        ▼
MachineDeliveryParameters (shared contract)
        │
        ▼
Machine capability validation (simulation bounds)
        │
        ▼
Safety validation (software layer — ESP32 remains authority)
        │
        ▼
CalculationResult (preserves original request + validation layers)
```

Backend services (Phase 1G+) will load calibration from PostgreSQL and invoke the engine; the core package accepts injected configuration only.

## Input: DeliveryRequest

Uses `DeliveryRequest` / `DeliveryRequestSchema` from `@bowling-machine/api-contracts` — no competing interface.

| Parameter           | Type    | Unit / domain | Notes                                     |
| ------------------- | ------- | ------------- | ----------------------------------------- |
| target_x            | decimal | 0.0–1.0       | Normalized pitch horizontal               |
| target_y            | decimal | 0.0–1.0       | Normalized pitch length                   |
| desired_speed_kmh   | decimal | km/h          | Structurally positive; capability-checked |
| ball_type           | enum    | —             | 10 supported types via strategy registry  |
| number_of_balls     | integer | —             | >= 1 structural; max via capability layer |
| first_ball_delay_ms | integer | ms            | Passed through to machine parameters      |
| interval_ms         | integer | ms            | Min safe interval via safety layer        |

Optional `ui` coordinates are ignored by the engine.

## Output: CalculationResult

| Field                   | Description                                               |
| ----------------------- | --------------------------------------------------------- |
| `success`               | Whether calculation and all validation layers passed      |
| `request`               | Original `DeliveryRequest` (never overwritten)            |
| `pitch_target`          | `{ target_x, target_y }` from request                     |
| `pitch_reference`       | Mapped reference coordinates (simulation)                 |
| `trajectory`            | Intermediate trajectory representation                    |
| `calibration`           | `profile_id`, `calibration_type`, `version`, `simulation` |
| `parameters`            | `MachineDeliveryParameters` when successful               |
| `structural_validation` | Structural layer outcome                                  |
| `capability_validation` | Machine capability layer outcome                          |
| `safety_validation`     | Software safety layer outcome                             |
| `errors`                | Stable `CalculationError` codes                           |
| `warnings`              | Non-fatal notices (e.g. simulation limit disclaimers)     |

### MachineDeliveryParameters (shared contract)

| Parameter                   | Unit (known)           | Notes                                   |
| --------------------------- | ---------------------- | --------------------------------------- |
| wheel1_target_rpm           | RPM (simulation)       | From calibration + ball type strategy   |
| wheel2_target_rpm           | RPM (simulation)       | Differential for swing/spin types       |
| actuator1–4_target_position | **UNRESOLVED** (UD-02) | Simulation scale units — NOT mm/degrees |
| feeder_delay_ms             | ms                     | From calibration fixture                |
| ball_count                  | —                      | From request                            |
| first_ball_delay_ms         | ms                     | Passed through                          |
| interval_ms                 | ms                     | Passed through                          |

## Engine API

```typescript
import {
  createSimulationCalculationEngine,
  DeliveryCalculationEngine,
} from '@bowling-machine/calculation-engine';

const engine = createSimulationCalculationEngine();
const result = engine.calculate({ request: deliveryRequest });

if (result.success) {
  // result.parameters → encode THROW_SEQUENCE payload
}
```

Custom wiring (tests, future physical calibration):

```typescript
new DeliveryCalculationEngine({
  pitchMapper: new SimulationPitchCoordinateMapper(),
  calibrationProvider: new StaticCalibrationProvider(profileFromDatabase),
  ballTypeRegistry: createDefaultBallTypeRegistry(),
});
```

## Pitch Coordinate Mapper (engine-internal)

`SimulationPitchCoordinateMapper` provides deterministic **SIMULATION ONLY** mapping:

- Input: normalized `target_x`, `target_y` (0–1)
- Output: `PitchReferenceCoordinate` with `reference_x`, `reference_y`, `simulation: true`
- Applies perspective exponent on length axis (`target_y^0.85`) — NOT measured geometry
- Clamps out-of-range inputs; no DOM/CSS/viewport dependency

Replace with a calibrated mapper when physical pitch geometry is known.

## Trajectory Representation

Minimal intermediate model decoupling user intent from motors:

- `pitch_reference`, `desired_speed_kmh`, `ball_type`
- `trajectory_class`, `launch_bias_simulated`, `length_bias_simulated`
- `simulation: true` — explicitly not aerodynamically modeled

## Calibration Provider

```typescript
interface CalibrationProvider {
  resolve(machineId?: string): CalibrationProfile | null;
}
```

MVP uses `SIMULATION_CALIBRATION` via `StaticCalibrationProvider` and fixture `SIMULATION_CALIBRATION_V1` in `src/fixtures/simulation-calibration-v1.ts`.

All simulation numeric values live in that fixture — not scattered through frontend or route handlers.

## Ball Type Strategies

Each ball type registers a `BallTypeStrategy` profile affecting simulation:

| Ball Type | Simulation behavior (MVP)                                    |
| --------- | ------------------------------------------------------------ |
| FAST      | Full speed multiplier, no wheel differential                 |
| MEDIUM    | Reduced speed multiplier                                     |
| SLOW      | Lower speed multiplier                                       |
| BOUNCER   | Length bias toward short pitch (simulated reference_y shift) |
| YORKER    | Length bias toward full length                               |
| FULL      | Moderate length bias                                         |
| INSWING   | Positive wheel differential + launch bias                    |
| OUTSWING  | Negative wheel differential + launch bias                    |
| LEG_SPIN  | Strong differential + spin trajectory class                  |
| OFF_SPIN  | Opposite differential + spin trajectory class                |

These are **not physically accurate** — documented for testability and pipeline demonstration.

## Validation Layers

| Layer      | Location                    | Responsibility                                    |
| ---------- | --------------------------- | ------------------------------------------------- |
| Structural | `validateStructural`        | Zod schema — types, coordinate domain, positivity |
| Capability | `validateMachineCapability` | Simulated RPM/ball-count vs calibration limits    |
| Safety     | `validateSafety`            | Min interval, consistency checks (software only)  |
| Physical   | ESP32 firmware              | Final authority — NOT duplicated here             |

Stable error codes: `INVALID_TARGET`, `INVALID_BALL_TYPE`, `MISSING_CALIBRATION`, `INVALID_CALIBRATION`, `CALCULATION_FAILURE`, `UNSUPPORTED_CAPABILITY`, `STRUCTURAL_VALIDATION_FAILED`.

## Complete Simulation Example

**Input (DeliveryRequest):**

```json
{
  "target_x": 0.62,
  "target_y": 0.73,
  "desired_speed_kmh": 120,
  "ball_type": "FAST",
  "number_of_balls": 6,
  "first_ball_delay_ms": 3000,
  "interval_ms": 8000
}
```

**SIMULATION ONLY intermediate values (SIMULATION_CALIBRATION_V1):**

- `pitch_reference.reference_y` ≈ `0.73^0.85` ≈ 0.78 (perspective simulation)
- `wheel1_target_rpm` = `120 × 10 × 1.0` = **1200** (simulated RPM)
- `wheel2_target_rpm` = **1200** (no differential for FAST)
- `actuator1_target_position` = `0.62 × 1000` = **620** (UNRESOLVED simulation units)
- `feeder_delay_ms` = **250** (from calibration fixture)

**Calibration identity recorded:**

```json
{
  "profile_id": "simulation-calibration-v1-fixture",
  "calibration_type": "SIMULATION_CALIBRATION",
  "version": 1,
  "simulation": true
}
```

## Determinism

Given the same `DeliveryRequest`, calibration profile, and machine configuration, the engine produces identical results. No randomness in MVP.

## Replaceability

Future implementations swap injected components without changing API contracts:

- `SimulationPitchCoordinateMapper` → calibrated physical mapper
- `StaticCalibrationProvider(SIMULATION_CALIBRATION_V1)` → DB-loaded experimental profiles
- `BallTypeStrategy` profiles → calibration-table-driven modifiers

## Related Documents

- [Calibration System](./CALIBRATION_SYSTEM.md)
- [Pitch Visualization](../frontend/PITCH_VISUALIZATION.md)
- [API Specification](../api/API_SPECIFICATION.md)
- [ADR-0008 Calibration Architecture](../decisions/ADR-0008-calibration-architecture.md)
- [ADR-0010 Pitch Coordinate Layers](../decisions/ADR-0010-pitch-coordinate-layers.md)
- [Unresolved Decisions — UD-02](../architecture/UNRESOLVED_DECISIONS.md)
