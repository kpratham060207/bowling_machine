# Phase 1G — Practice Session & Delivery Orchestration

> **Status:** Implemented (Phase 1G)
> **Last updated:** 2026-09-02

## Overview

Phase 1G connects the player-facing practice session API to the Phase 1F calculation engine and Phase 1E machine gateway/simulator. The backend is the orchestration authority — browsers send user-level delivery requests only.

```
Player (REST)
  → SessionService / DeliveryOrchestrationService
  → DeliveryCalculationEngine (packages/calculation-engine)
  → MachineCommandService → MachineGateway → ESP32 Simulator
  → DeliveryExecutionTracker (STATUS_UPDATED / FAULT events)
  → OrchestrationEventPublisher → Browser WebSocket
```

## Session lifecycle (database)

| Status    | Meaning                                      |
| --------- | -------------------------------------------- |
| ACTIVE    | Session created; deliveries may be queued    |
| PAUSED    | Reserved — not used in Phase 1G orchestration |
| COMPLETED | All deliveries finished successfully         |
| CANCELLED | Stopped by player or failed mid-session      |

Conceptual mapping from product spec:

- Create session → `ACTIVE`
- Start / execute deliveries → machine sequence running while `ACTIVE`
- All deliveries succeed → `COMPLETED`
- Stop or unrecoverable fault → `CANCELLED`

## Delivery lifecycle

| Status    | Meaning                                                |
| --------- | ------------------------------------------------------ |
| PENDING   | Request persisted; awaiting orchestration              |
| EXECUTING | Machine accepted `THROW_SEQUENCE`; awaiting completion |
| COMPLETED | Machine telemetry confirms sequence finished           |
| FAILED    | Calculation, dispatch, or machine fault                |
| CANCELLED | Session stop while delivery was in flight              |

Transient orchestration steps (not persisted): calculating → validated → queued.

**Completion rule:** A delivery is marked `COMPLETED` only when machine status shows the throw command cleared (`active_command_id === null`, state `READY`) after the command was observed active — not on command acknowledgement alone.

## REST endpoints (`/api/v1/sessions`)

| Method | Path                                           | Description                          |
| ------ | ---------------------------------------------- | ------------------------------------ |
| POST   | `/api/v1/sessions`                             | Create session (+ optional deliveries) |
| GET    | `/api/v1/sessions`                             | List player's sessions               |
| GET    | `/api/v1/sessions/:sessionId`                  | Get session with deliveries          |
| GET    | `/api/v1/sessions/:sessionId/deliveries`       | List deliveries                      |
| GET    | `/api/v1/sessions/:sessionId/deliveries/:id`   | Get one delivery                     |
| POST   | `/api/v1/sessions/:sessionId/deliveries`       | Add delivery + orchestrate           |
| POST   | `/api/v1/sessions/:sessionId/start`            | Execute first pending delivery       |
| POST   | `/api/v1/sessions/:sessionId/stop`             | Stop session (no control lock required) |

## Orchestration preconditions (throw sequence)

1. Player owns session
2. Player has `machine_access`
3. Machine peer connected
4. Machine homed (`homing_status === 'HOMED'`)
5. No active fault / emergency stop
6. Player holds active control lock (STOP is the exception)
7. Calculation engine succeeds
8. Machine accepts `THROW_SEQUENCE`

## Idempotency

- **Commands:** `command_id` UUID on `machine_commands` — duplicate dispatch returns stored outcome (Phase 1E).
- **Deliveries:** Optional `command_id` on `POST .../deliveries` links to the throw command; retries return the existing delivery when already persisted.

## WebSocket events (orchestration)

Published via `OrchestrationEventPublisher` with `player_id` and `machine_id` for authorization:

- `SESSION_STARTED`
- `SESSION_COMPLETED` (status `COMPLETED` or `CANCELLED`)
- `DELIVERY_STARTED`
- `DELIVERY_COMPLETED`
- `DELIVERY_FAILED`

Browser WebSocket filters session/delivery events by `player_id` and machine events by `machine_access`.

## Control lock interaction

- Throw sequences require an active, unexpired control lock owned by the player.
- Session/delivery **STOP** does not require the control lock (Phase 1E safety behavior) but still requires machine access.
- Lock expiry during an active sequence is treated as loss of control — do not assume continued exclusive access after expiry.

## Key modules

| Module | Path |
| ------ | ---- |
| SessionService | `apps/api/src/services/session.service.ts` |
| DeliveryOrchestrationService | `apps/api/src/services/delivery-orchestration.service.ts` |
| DeliveryExecutionTracker | `apps/api/src/services/delivery-execution-tracker.ts` |
| DatabaseCalibrationProvider | `apps/api/src/services/calibration-provider.service.ts` |
| Session routes | `apps/api/src/routes/session.routes.ts` |

## Known limitations (Phase 1G)

- Pause/resume session endpoints not implemented (DB enum exists).
- Partial ball counts on mid-sequence faults are not inferred — delivery/session reflect failure honestly without invented measurements.
- Admin session visibility uses existing ADMIN patterns; player routes enforce ownership only.
- Pitch UI (Phase 1H) not implemented — APIs/WebSocket events are ready for frontend integration.
