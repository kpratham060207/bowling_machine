# ADR-0008: Calibration Architecture

## Status

Accepted

## Context

The calculation engine must convert user-level delivery parameters (coordinates, speed, ball type) into machine-level parameters (wheel RPM, actuator positions, feeder timing). The exact physical mappings are unknown and will vary per machine.

## Decision

Design a **calibration-driven, replaceable calculation engine**:

1. No physics constants hard-coded in application code
2. All mappings stored as calibration data per machine in PostgreSQL
3. Safety-critical limits also stored in ESP32 NVS
4. Calculation engine interface allows swapping implementations
5. Initial implementation uses placeholder/synthetic calibration data
6. Real calibration performed empirically when hardware is available

Calibration data types:

- `speed_rpm` — speed + ball type → wheel RPM pair
- `position_trajectory` — coordinates → trajectory parameters
- `actuator_position` — trajectory → actuator positions
- `feeder_timing` — wheel speed → feed delay
- `rpm_limits` — safety maximum/minimum RPM
- `actuator_limits` — safety position limits

## Alternatives Considered

| Alternative                        | Reason Rejected                                                  |
| ---------------------------------- | ---------------------------------------------------------------- |
| Hard-coded physics formulas        | Physical constants unknown; varies per machine                   |
| ML-based from start                | Requires training data that doesn't exist yet                    |
| Manual parameter entry (no engine) | Player sends machine params directly — violates layer separation |
| Single global calibration          | Each machine has unique physical characteristics                 |
| Frontend-side calculation          | Violates architectural boundary; no machine params in frontend   |

## Consequences

**Positive:**

- System works before physical calibration (with simulator)
- Each machine can be calibrated independently
- Engine implementations swappable (placeholder → table lookup → physics model)
- Calibration versioned and auditable
- Clear separation between user and machine parameters

**Negative:**

- Cannot deliver real balls until calibration performed
- Calibration workflow must be built and tested
- Calibration data management adds complexity
- Multiple calibration types must be maintained

## Related

- [Calculation Engine](../calibration/CALCULATION_ENGINE.md)
- [Calibration System](../calibration/CALIBRATION_SYSTEM.md)
- [Database Design](../database/DATABASE_DESIGN.md)
