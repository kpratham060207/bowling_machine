# Phase 1L — Freeze Frontend + Real 4-Actuator Kinematics Architecture

> **Status:** Complete  
> **Depends on:** Phase 1J (machine integration), approved Practice Setup UI checkpoint `51abaff`  
> **Does not include:** inventing physical dimensions, UI redesign, auth changes, motor firmware

## Goal

Prepare the calculation architecture for the **actual** four-vertical-actuator platform while freezing the approved Practice Setup UI.

Frontend practice pitch UX is treated as approved. This phase changes **calculation/kinematics/docs/contracts** only (types/API comments where needed for unit clarity).

## Mechanical model (authoritative)

The real machine consists of:

- one rigid upper bowling-machine platform
- four vertical linear actuators
- actuator lower ends fixed at four corners of a lower base plate
- upper ends connected to the platform with ball-and-socket joints
- actuators approximately vertical in the nominal/home configuration

### Platform degrees of freedom

Controlled by the four actuators as **one rigid-body pose**:

| Axis   | Source                                   |
| ------ | ---------------------------------------- |
| Height | Platform vertical translation            |
| Pitch  | Rigid-body rotation about +X             |
| Roll   | Rigid-body rotation about +Y             |
| Yaw    | **Not** produced by these four actuators |

If a separate yaw mechanism exists later, it remains a separate axis. The fourth actuator is **not** yaw.

The four lengths `L1…L4` are **derived** from the same pose — they are not four independent DOFs (redundant actuation on a rigid platform).

## Inverse kinematics

Canonical equation (meters, right-hand frame):

```
T = (0, 0, height_m)
R = R_yaw · R_pitch · R_roll     with yaw forced to 0 for this mechanism
P'i = R · Pi + T
Li  = ||P'i − Bi||
```

Where:

- `Bi` = fixed lower ball-joint position (base frame)
- `Pi` = upper platform ball-joint position (platform frame)
- `Li` = required actuator length

Poses that require any `Li` outside `[minimum_actuator_length_m, maximum_actuator_length_m]` are **rejected** with a deterministic `ActuatorKinematicsError` / `CALCULATION_FAILURE`. Values are never silently clamped.

Do **not** treat `H ± pitch_term ± roll_term` as the physical solution. That form may appear only as an explanatory approximation or test fixture if clearly marked.

## Coordinate frame

Right-hand base frame (documented in `packages/calculation-engine/src/kinematics/types.ts`):

| Axis / sign | Meaning                                                          |
| ----------- | ---------------------------------------------------------------- |
| +X          | Right when facing the pitch                                      |
| +Y          | Toward the pitch (forward)                                       |
| +Z          | Up                                                               |
| +pitch      | Rotation about +X — raises the front (+Y) side                   |
| +roll       | Rotation about +Y — lowers the right (+X) side (right-hand rule) |

Corner order A1–A4: front-left, front-right, rear-left, rear-right.

**Unit standard:** mechanical dimensions in the engine use **meters** (`*_m`). Millimetres are not invented as a parallel standard; convert measured mm → m when real geometry is supplied.

## Pipeline (unchanged high-level flow)

```
DeliveryRequest (target_x, target_y, speed, ball_type, …)
        ↓
target / trajectory calculation
        ↓
required launcher pose (height, pitch, roll)
        ↓
4-actuator inverse kinematics
        ↓
actuator lengths (meters)
        ↓
calibration (future: length → motor command)
        ↓
machine command representation
        ↓
ESP32
```

## Geometry vs calibration

| Layer         | Answers                                                        |
| ------------- | -------------------------------------------------------------- |
| Geometry / IK | What actuator **lengths** does this pose require?              |
| Calibration   | How does this length map to this actuator’s **motor command**? |

Lead-screw pitch, motor steps, microstepping, and gearbox ratio belong in calibration — **not** in geometric IK.

## SIMULATION vs REAL geometry

| Kind                  | Marker               | Meaning                                                |
| --------------------- | -------------------- | ------------------------------------------------------ |
| Simulation geometry   | `_simulation: true`  | Deterministic fixture for tests/dev — **not** measured |
| Real machine geometry | `_simulation: false` | Measured joint positions and stroke limits             |

Current fixture: `SIMULATION_PLATFORM_GEOMETRY_V1` in `packages/calculation-engine/src/fixtures/simulation-platform-geometry-v1.ts`.

Until measured dimensions are supplied, the system exposes actuator-kinematics capability **without** claiming physical accuracy for simulation constants.

## Physical measurements still required

Do **not** invent these:

- base corner spacing / lower joint coordinates `B1…B4`
- upper platform joint coordinates `P1…P4`
- platform dimensions and ball-joint offsets
- actuator min length, max length, stroke, home lengths
- lead screw pitch
- motor steps/revolution, microstepping, gearbox ratio
- length ↔ motor command mapping per actuator

## Frontend freeze

Practice Setup UI at checkpoint `51abaff` is approved. Phase 1L must not redesign:

- page layout, cards, buttons
- speed / ball type / timing controls
- navigation
- pitch visual design or 3D pitch placement

Only genuine bugs may be fixed.

## Key source files

| Area                        | Path                                                                          |
| --------------------------- | ----------------------------------------------------------------------------- |
| IK solver                   | `packages/calculation-engine/src/kinematics/actuator-inverse-kinematics.ts`   |
| Rotation / frame            | `packages/calculation-engine/src/kinematics/rotation.ts`                      |
| Types / DOF docs            | `packages/calculation-engine/src/kinematics/types.ts`                         |
| Pose request mapping        | `packages/calculation-engine/src/kinematics/pose-from-pitch-reference.ts`     |
| Simulation geometry fixture | `packages/calculation-engine/src/fixtures/simulation-platform-geometry-v1.ts` |
| Engine wiring               | `packages/calculation-engine/src/engine/delivery-calculation-engine.ts`       |
| Broader engine docs         | `docs/calibration/CALCULATION_ENGINE.md`                                      |

## Related

- [Calculation Engine](../calibration/CALCULATION_ENGINE.md)
- [Phase 1J](./PHASE_1J.md)
- [UD-02 Actuator Position Units](../architecture/UNRESOLVED_DECISIONS.md#ud-02-actuator-position-units)
