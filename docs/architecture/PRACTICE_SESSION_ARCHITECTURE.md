# Practice Session Architecture

> **Status:** Implemented (Phase 1G)
> **Last updated:** 2026-09-02

## Overview

A practice session represents a period of batting practice where a player configures and executes one or more delivery sequences on a connected machine.

## Session Lifecycle

```
CREATE → ACTIVE → [PAUSED ↔ ACTIVE] → COMPLETED
                  └──────────────────→ CANCELLED
```

| Status    | Description                                     |
| --------- | ----------------------------------------------- |
| ACTIVE    | Session in progress, deliveries being executed  |
| PAUSED    | Session paused by player, machine in safe state |
| COMPLETED | All deliveries finished successfully            |
| CANCELLED | Session stopped by player before completion     |

## Session Creation Flow

```
Player on machine dashboard
    │
    ▼
Player configures delivery(ies):
  - Pitch location (target_x, target_y)
  - Speed (desired_speed_kmh)
  - Ball type
  - Number of balls
  - First ball delay
  - Interval between balls
    │
    ▼
Player clicks "Start Session"
    │
    ▼
Frontend sends POST /api/v1/sessions
    │
    ▼
Backend:
  1. Validates player is authenticated
  2. Validates machine is connected and READY
  3. Validates no other active session on this machine
  4. Creates practice_sessions row (status: ACTIVE)
  5. Creates delivery rows (status: PENDING)
  6. For first delivery: invokes calculation engine
  7. Sends machine command to ESP32
    │
    ▼
ESP32 executes delivery sequence
    │
    ▼
Telemetry events update session progress
    │
    ▼
On all deliveries complete → session status: COMPLETED
```

## Multi-Delivery Sessions

A session may contain multiple delivery configurations:

```json
{
  "machine_id": "uuid",
  "deliveries": [
    {
      "target_x": 0.62,
      "target_y": 0.73,
      "desired_speed_kmh": 120.0,
      "ball_type": "FAST",
      "number_of_balls": 6,
      "first_ball_delay_ms": 3000,
      "interval_ms": 8000
    },
    {
      "target_x": 0.4,
      "target_y": 0.3,
      "desired_speed_kmh": 100.0,
      "ball_type": "YORKER",
      "number_of_balls": 4,
      "first_ball_delay_ms": 5000,
      "interval_ms": 10000
    }
  ]
}
```

Deliveries execute sequentially. The next delivery's calculation begins when the previous delivery completes.

## Session Controls

| Action | API                      | Effect                                                                        |
| ------ | ------------------------ | ----------------------------------------------------------------------------- |
| Pause  | PUT /sessions/:id/pause  | Machine completes current ball, then stops. Session status → PAUSED           |
| Resume | PUT /sessions/:id/resume | Next pending delivery calculated and sent. Status → ACTIVE                    |
| Stop   | PUT /sessions/:id/stop   | Machine stops immediately. Remaining deliveries cancelled. Status → CANCELLED |

## Progress Tracking

During an active session, the frontend receives real-time updates via WebSocket:

| Event             | Data                                    |
| ----------------- | --------------------------------------- |
| State change      | Machine state transitions               |
| Ball delivered    | Ball number, actual parameters          |
| Delivery complete | Delivery status → COMPLETED             |
| Delivery failed   | Delivery status → FAILED, error details |
| Session complete  | All deliveries done, summary            |

## Saved Practice Plans

Players can save delivery configurations as reusable practice plans:

- Saved in `saved_practice_plans` table
- Contains array of delivery configs (user-level parameters only)
- Loaded into a new session via "Use Plan" action
- Plans are personal (owned by player)

## Session Data Model

See [Database Design](../database/DATABASE_DESIGN.md) for `practice_sessions` and `deliveries` tables.

## History and Analytics

Completed sessions are queryable:

- By date range
- By machine
- By ball type
- Aggregated stats: total balls, average speed, session count

Analytics computed from delivery records, not stored separately (computed on query).

## Related Documents

- [API Specification](../api/API_SPECIFICATION.md)
- [WebSocket Events](../protocol/WEBSOCKET_EVENTS.md)
- [Calculation Engine](../calibration/CALCULATION_ENGINE.md)
- [Database Design](../database/DATABASE_DESIGN.md)
