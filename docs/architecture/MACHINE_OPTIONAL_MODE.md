# Machine-Optional Application Mode

> **Status:** Implemented  
> **Applies to:** Web application player workflows

## Product Model

Practice is **configuration + calculation + optional machine execution** — not machine-required operation.

```
Player
  ↓
Practice
  ↓
Interactive Pitch
  ↓
Delivery Configuration
  ↓
Backend Calculation (Phase 1F)
  ↓
Calculated Parameters
  ↓
Machine Available?
      ├── NO  → display result / software-only mode
      └── YES → optional execution (Phase 1G)
```

## Operating Contexts

| Context               | Calculation | Execution                                                   |
| --------------------- | ----------- | ----------------------------------------------------------- |
| **SOFTWARE_ONLY**     | Available   | Unavailable                                                 |
| **MACHINE_AVAILABLE** | Available   | Available when session + control + safety preconditions met |

These are distinct from browser offline state. A player may be online with no machine connected.

## What Works Without a Machine

- Navigating the application
- Interactive pitch and delivery configuration
- `POST /api/v1/calculation/preview` (with or without `machine_id`)
- Viewing calculated parameters
- Creating and editing practice plans
- Viewing session history

## What Requires a Machine

- Acquiring control lock
- Homing
- `THROW_SEQUENCE` execution
- Live machine telemetry
- Physical stop commands

Control lock is required **only for execution**, never for calculation.

## Calculation API

`POST /api/v1/calculation/preview`

| `machine_id` | Behavior                                                         |
| ------------ | ---------------------------------------------------------------- |
| Omitted      | Pure simulation calibration — no machine access check            |
| Provided     | Uses that machine's active calibration (player must have access) |

Never creates machine commands, sessions, or deliveries.

## Frontend Routes

| Route                   | Machine required?                             |
| ----------------------- | --------------------------------------------- |
| `/app/practice`         | No — hub with Configure + Connect options     |
| `/app/practice/setup`   | No — calculation always available             |
| `/app/practice/connect` | Only for machine connection/execution setup   |
| `/app/plans/*`          | No for create/edit/calculate; yes for execute |

## Execution Gating

After calculation, the UI shows:

- **Machine:** connection state (informational)
- **Execution:** `Not executed — no machine connected` when appropriate
- **Connect machine to execute** when no session/control

When machine is connected, control acquired, and session exists:

- **Start practice** uses existing Phase 1G flow unchanged

## Calibration Context

Calculation depends on machine/calibration identity. When the user changes machine context after calculating, stale results are invalidated and must be recalculated.

Software-only mode without `machine_id` uses simulation calibration fallback — not production physical constants.

## No Fake Execution

When no machine is connected, the system:

- **May** calculate backend-derived parameters
- **Must not** pretend a throw happened, generate fake telemetry, or mark deliveries completed

## Related Documentation

- [Practice Session Architecture](./PRACTICE_SESSION_ARCHITECTURE.md)
- [Calculation Engine](../calibration/CALCULATION_ENGINE.md)
- [Phase 1G Orchestration](../backend/PHASE_1G_ORCHESTRATION.md)
