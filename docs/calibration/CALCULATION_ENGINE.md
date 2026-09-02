# Calculation Engine

> **Status:** Designed (not implemented)
> **Last updated:** 2026-09-02 (physical mapping deferral documented)

## Overview

The calculation engine performs **trajectory calculation** and **machine parameter calculation** from normalized pitch target coordinates. It is a replaceable, calibration-driven module within the backend.

**The calculation engine does NOT:**

- Perform UI/perspective coordinate transformation (Pitch Coordinate Mapper, frontend)
- Invent physical pitch geometry, actuator mappings, RPM mappings, launch angles, or physical constants

Inputs are assumed to already be in the interactive pitch coordinate system (`target_x`, `target_y`). See [Pitch Visualization](../frontend/PITCH_VISUALIZATION.md) and [UD-01](../architecture/UNRESOLVED_DECISIONS.md).

**No physics constants are defined yet. No physical mappings are known. This document describes the interface and design, not the physics.**

## Input: User Delivery Request

| Parameter           | Type    | Range          | Example |
| ------------------- | ------- | -------------- | ------- |
| target_x            | decimal | 0.0–1.0        | 0.62    |
| target_y            | decimal | 0.0–1.0        | 0.73    |
| desired_speed_kmh   | decimal | > 0            | 120.0   |
| ball_type           | enum    | See ball types | FAST    |
| number_of_balls     | integer | 1–50           | 6       |
| first_ball_delay_ms | integer | >= 0           | 3000    |
| interval_ms         | integer | >= 1000        | 8000    |

### Normalized Pitch Target Coordinates (`target_x`, `target_y`)

These are the **persisted user-selected target** in the interactive pitch coordinate system:

```
target_x = 0.62
target_y = 0.73
```

They are NOT:

- Raw screen pixels or normalized UI coordinates (`ui_x`, `ui_y`)
- Machine actuator values or physical distances
- Cricket region labels (yorker, good length, etc.) — those are display-only

The frontend produces `target_x`/`target_y` via the Pitch Coordinate Mapper before calling the API.

### Why Physical Mapping Is Intentionally Deferred

The calculation engine converts pitch targets to machine parameters using calibration data. This mapping **cannot be defined in architecture documentation** because:

1. **Machine geometry is unknown** — actuator layout, wheel placement, and mounting orientation are not finalized
2. **No experimental calibration exists** — no data correlating pitch targets to actual ball landing positions
3. **Inventing constants is unsafe** — hard-coded RPM, launch angles, or actuator values would create false confidence
4. **Each machine is unique** — mappings vary with mechanical wear, ball condition, and environment

The engine interface and calibration data schema are designed now; numeric mappings are filled in during Phase 4 calibration with actual hardware.

See [Remaining Physical Calibration Questions](../architecture/UNRESOLVED_DECISIONS.md#remaining-physical-calibration-questions).

## Output: Machine Command

| Parameter                 | Type    | Unit      | Notes                                  |
| ------------------------- | ------- | --------- | -------------------------------------- |
| wheel1_target_rpm         | decimal | RPM       | Launch wheel 1                         |
| wheel2_target_rpm         | decimal | RPM       | Launch wheel 2                         |
| actuator1_target_position | decimal | units TBD | Position actuator 1                    |
| actuator2_target_position | decimal | units TBD | Position actuator 2                    |
| actuator3_target_position | decimal | units TBD | Position actuator 3                    |
| actuator4_target_position | decimal | units TBD | Position actuator 4                    |
| feeder_delay_ms           | integer | ms        | Time before feed after wheels at speed |
| ball_count                | integer | —         | Number of balls                        |
| first_ball_delay_ms       | integer | ms        | Passed through from user request       |
| interval_ms               | integer | ms        | Passed through from user request       |

## Engine Interface

Implemented contract types (Phase 1B) in `packages/api-contracts`:

- Input: `DeliveryRequest` (`DeliveryRequestSchema`) — user intent
- Output: `MachineDeliveryParameters` (`MachineDeliveryParametersSchema`) — machine-level values
- Command: `MachineCommand` with `command_type: 'THROW_SEQUENCE'` — wire-ready after gateway encoding

```typescript
// Designed interface — calculation logic not yet implemented

interface CalculationEngine {
  /**
   * Calculate machine parameters from user delivery request.
   * Uses calibration data specific to the target machine.
   */
  calculate(request: DeliveryRequest, calibration: MachineCalibration): MachineDeliveryParameters;

  /**
   * Validate that a user request is within achievable bounds
   * for this machine's calibration data.
   */
  validate(request: DeliveryRequest, calibration: MachineCalibration): ValidationResult;
}
```

## Calculation Steps (Planned)

```
Normalized Pitch Target (target_x, target_y) + speed + ball_type
    │
    ▼
1. Validate request against calibration bounds
    │
    ▼
2. Trajectory calculation
   Input: target_x, target_y, ball_type
   Output: required trajectory parameters (calibration-defined shape)
   Source: calibration table "position_trajectory"
   Status: DEFERRED — requires experimental calibration (PCQ-02)
    │
    ▼
3. Machine parameter calculation — wheel speeds
   Input: desired_speed_kmh, ball_type, trajectory
   Output: wheel1_target_rpm, wheel2_target_rpm
   Source: calibration table "speed_rpm"
   Status: DEFERRED — requires experimental calibration (PCQ-03)
   Note: Different wheel speeds create swing/spin
    │
    ▼
4. Machine parameter calculation — actuator positions
   Input: trajectory parameters
   Output: actuator1-4 target positions
   Source: calibration table "actuator_position"
   Status: DEFERRED — requires experimental calibration (PCQ-04)
    │
    ▼
5. Machine parameter calculation — feeder timing
   Input: wheel speeds, ball_type
   Output: feeder_delay_ms
   Source: calibration table "feeder_timing"
   Status: DEFERRED — requires experimental calibration (PCQ-05)
    │
    ▼
Machine Command
```

## Calibration Dependency

The engine has **zero hard-coded physics constants**. All mappings come from calibration data stored per machine in the `calibration_data` table.

Without calibration data, the engine:

- Returns validation errors for all requests ("Machine not calibrated")
- Cannot produce machine commands

Initial development will use the ESP32 simulator with synthetic calibration data.

## Replaceability

The engine interface allows swapping implementations:

- **PlaceholderEngine** — Returns fixed test values (development)
- **LinearInterpolationEngine** — Simple table lookup with interpolation (initial production)
- **PhysicsEngine** — Model-based calculation (future, requires validated physics model)

Selection per machine via configuration.

## Ball Type Influence

Ball types affect calculation differently:

| Ball Type | Expected Effect | Calculation Impact                                             |
| --------- | --------------- | -------------------------------------------------------------- |
| FAST      | Maximum speed   | High wheel RPM, minimal speed difference                       |
| MEDIUM    | Moderate speed  | Medium wheel RPM                                               |
| SLOW      | Low speed       | Low wheel RPM                                                  |
| BOUNCER   | Short pitch     | Pitch reference y toward bowler end (exact value: calibration) |
| YORKER    | Full length     | Pitch reference y toward bowler end (exact value: calibration) |
| FULL      | Good length     | Pitch reference y mid-range (calibration-defined)              |
| INSWING   | Curves in       | Wheel speed differential                                       |
| OUTSWING  | Curves away     | Wheel speed differential                                       |
| LEG_SPIN  | Spin leg side   | Wheel speed differential + orientation                         |
| OFF_SPIN  | Spin off side   | Wheel speed differential + orientation                         |

Exact mappings TBD during calibration. The engine applies type-specific offsets/modifiers to base calculations.

## Related Documents

- [Calibration System](./CALIBRATION_SYSTEM.md)
- [Pitch Visualization & Coordinate Architecture](../frontend/PITCH_VISUALIZATION.md)
- [Backend Architecture](../backend/BACKEND_ARCHITECTURE.md)
- [ADR-0008 Calibration Architecture](../decisions/ADR-0008-calibration-architecture.md)
- [ADR-0010 Pitch Coordinate Layers](../decisions/ADR-0010-pitch-coordinate-layers.md)
