# Calibration System

> **Status:** Schema designed; SIMULATION_CALIBRATION implemented (Phase 1F)
> **Last updated:** 2026-09-02

## Overview

Calibration is the process of determining the physical mappings between user-level delivery parameters and machine-level control parameters. Without calibration data, the calculation engine cannot produce valid machine commands.

**No calibration has been performed. No physical mappings are known.**

## Why Calibration Is Required

The relationship between:

- Wheel RPM and ball speed
- Wheel speed differential and swing/spin
- Actuator positions and ball trajectory
- Feeder timing and delivery consistency

...is unique to each physical machine and depends on:

- Motor characteristics
- Wheel wear and material
- Ball weight and condition
- Actuator mechanics
- Machine geometry
- Environmental factors

These relationships cannot be computed from first principles without extensive physical testing. They must be measured empirically.

## Calibration Data Types

| Type Key              | Description                                                | Used By                |
| --------------------- | ---------------------------------------------------------- | ---------------------- |
| `speed_rpm`           | Maps desired speed (km/h) + ball type → wheel RPM pair     | Calculation step 3     |
| `position_trajectory` | Maps target coordinates → actuator positions + orientation | Calculation steps 2, 4 |
| `actuator_position`   | Maps trajectory parameters → individual actuator positions | Calculation step 4     |
| `feeder_timing`       | Maps wheel speeds + ball type → feeder delay               | Calculation step 5     |
| `rpm_limits`          | Maximum/minimum safe wheel RPM                             | Safety enforcement     |
| `actuator_limits`     | Maximum/minimum actuator positions                         | Safety enforcement     |

## Calibration Data Storage

### Backend (PostgreSQL)

`calibration_profiles` table stores versioned calibration records per machine (see [Database Design](../database/DATABASE_DESIGN.md)).

### ESP32 (NVS)

Safety-critical limits (`rpm_limits`, `actuator_limits`) are also stored in ESP32 non-volatile storage for local enforcement without network dependency.

### Sync

When calibration is updated via admin:

1. Stored in PostgreSQL
2. Pushed to ESP32 via `config.update` protocol message
3. ESP32 validates and stores in NVS
4. ESP32 confirms via telemetry

## Calibration Workflow (Planned)

```
1. ADMIN initiates calibration session for a machine
2. System enters calibration mode (special session type)
3. For each calibration type:
   a. System prompts operator to set known input parameters
   b. Machine executes with test parameters
   c. Operator records actual outcome (speed, location, trajectory)
   d. System stores data point
   e. Repeat for range of values
4. System generates calibration table from data points
5. ADMIN reviews and approves calibration data
6. Calibration data published to machine
```

## Calibration UI (Planned)

The web app provides a calibration interface:

- Step-by-step guided workflow
- Input: set machine parameters manually (admin-level)
- Output: record measured results
- Visualization: calibration curves and tables
- Version management: compare and rollback calibration versions

## Initial Development Strategy

Until physical hardware calibration is available:

1. Use ESP32 simulator with **SIMULATION_CALIBRATION** data (`SIMULATION_CALIBRATION_V1` fixture)
2. Calculation engine (`packages/calculation-engine`) consumes injected calibration via `CalibrationProvider`
3. Backend loads calibration from `calibration_profiles` table when delivery endpoints are implemented (Phase 1G+)
4. Replace simulation profiles with experimentally measured data during Phase 4 calibration

### SIMULATION_CALIBRATION (Phase 1F)

| Property          | Value                                      |
| ----------------- | ------------------------------------------ |
| Type key          | `SIMULATION_CALIBRATION`                   |
| Fixture           | `SIMULATION_CALIBRATION_V1`                |
| Profile ID        | `simulation-calibration-v1-fixture`        |
| Version           | 1                                          |
| Physical validity | **None** — software pipeline demonstration |

All numeric values in the fixture are labelled `_simulation: true` and documented in [Calculation Engine](./CALCULATION_ENGINE.md). They must not be treated as RPM limits, actuator ranges, or speed mappings for real hardware.

Platform actuator targets use `position.platform_geometry` (base/platform joint positions in meters + stroke limits). Simulation geometry is a placeholder for kinematics only — replace with measured mounts before HARDWARE activation.

## Calibration Versioning

Each calibration update increments the version number. The calculation engine uses the latest approved version. Historical versions are retained for audit and rollback.

## Related Documents

- [Calculation Engine](./CALCULATION_ENGINE.md)
- [Database Design](../database/DATABASE_DESIGN.md)
- [ESP32 Architecture](../embedded/ESP32_ARCHITECTURE.md)
- [ADR-0008 Calibration Architecture](../decisions/ADR-0008-calibration-architecture.md)
