# API Specification

> **Status:** Auth, profile, and machine routes implemented (Phase 1E)
> **Last updated:** 2026-09-02
> **Base URL:** `/api/v1`
> **Contract package:** `packages/api-contracts` (Zod schemas + inferred TypeScript types)

## Overview

REST API served by the Fastify backend. All request/response bodies are JSON. All inputs validated with Zod schemas from `packages/api-contracts`.

### Implemented contract schemas (Phase 1B)

| Domain           | Zod schema               | Export path                      |
| ---------------- | ------------------------ | -------------------------------- |
| Player profile   | `PlayerSchema`           | `@bowling-machine/api-contracts` |
| Delivery request | `DeliveryRequestSchema`  | `@bowling-machine/api-contracts` |
| Pitch target     | `PitchTargetSchema`      | `@bowling-machine/api-contracts` |
| Machine status   | `MachineStatusSchema`    | `@bowling-machine/api-contracts` |
| Practice session | `PracticeSessionSchema`  | `@bowling-machine/api-contracts` |
| API error        | `ApiErrorResponseSchema` | `@bowling-machine/api-contracts` |
| WebSocket events | `WebSocketEventSchema`   | `@bowling-machine/api-contracts` |

HTTP route handlers for auth, profile, and **machine control** are **implemented (Phase 1D–1E)**. Session and delivery routes remain future phases.

### Implemented routes (Phase 1D–1E)

| Method | Path                            | Auth | Role   | Status             |
| ------ | ------------------------------- | ---- | ------ | ------------------ |
| GET    | `/health`                       | No   | —      | Implemented        |
| POST   | `/api/v1/auth/register`         | No   | —      | Implemented        |
| GET    | `/api/v1/profile`               | Yes  | PLAYER | Implemented        |
| PUT    | `/api/v1/profile`               | Yes  | PLAYER | Implemented        |
| GET    | `/machines`                     | Yes  | PLAYER | Implemented (1E)   |
| GET    | `/machines/:id`                 | Yes  | PLAYER | Implemented (1E)   |
| GET    | `/machines/:id/status`          | Yes  | PLAYER | Implemented (1E)   |
| POST   | `/machines/connect`             | Yes  | PLAYER | Implemented (1E)   |
| POST   | `/machines/:id/control/acquire` | Yes  | PLAYER | Implemented (1E)   |
| POST   | `/machines/:id/control/release` | Yes  | PLAYER | Implemented (1E)   |
| POST   | `/machines/:id/stop`            | Yes  | PLAYER | Implemented (1E)   |
| POST   | `/machines/:id/home`            | Yes  | PLAYER | Implemented (1E)   |
| POST   | `/machines/:id/disconnect`      | Yes  | PLAYER | Implemented (1E)   |
| GET    | `/api/v1/admin/status`          | Yes  | ADMIN  | Implemented (stub) |

## Validation layers

Shared contracts (`packages/api-contracts`) enforce **structural validation** only. Downstream layers handle capability and safety — none of which are implemented yet.

```
User request
    │
    ▼
Structural validation          ← packages/api-contracts (Zod schemas)
    │
    ▼
Machine capability validation  ← calculation engine (simulation bounds)
    │
    ▼
Calculation                    ← packages/calculation-engine (Phase 1F)
    │
    ▼
Machine safety validation      ← calculation engine software layer (Phase 1F)
    │
    ▼
ESP32 final safety validation  ← firmware authority (NOT implemented)
```

| Layer                          | Responsibility                                                                                                       | Implemented                 |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| **Structural validation**      | Types, required fields, enum values, normalized coordinate domain (0–1), positive numeric speed, non-negative timing | Phase 1B contracts          |
| **Machine/system validation**  | Max balls per sequence, min inter-ball interval, achievable speed/RPM ranges (simulation bounds in Phase 1F)         | Phase 1F calculation engine |
| **Physical safety validation** | Hard limits, E-stop, stale command rejection, firmware range checks                                                  | ESP32 firmware (future)     |

**Important:** A structurally valid `desired_speed_kmh > 0` does **not** mean the speed is physically safe or achievable. Product limits (e.g. max balls, min interval) are **not** encoded in shared contracts unless explicitly established by architecture.

All endpoints except health check and auth endpoints require:

```
Authorization: Bearer <supabase_jwt>
```

## Common Response Envelope

### Success

```json
{
  "data": { ... },
  "meta": { "timestamp": "2026-09-02T12:00:00Z" }
}
```

### Error

Matches `ApiErrorResponseSchema`:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable message",
    "details": {},
    "request_id": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

Stable `code` values: `VALIDATION_ERROR`, `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `MACHINE_UNAVAILABLE`, `MACHINE_NOT_CALIBRATED`, `PROTOCOL_VERSION_UNSUPPORTED`, `INTERNAL_ERROR`.

## Endpoints

### Health

| Method | Path      | Auth | Description          |
| ------ | --------- | ---- | -------------------- |
| GET    | `/health` | No   | Service health check |

### Auth

| Method | Path             | Auth | Description                    |
| ------ | ---------------- | ---- | ------------------------------ |
| POST   | `/auth/register` | No   | Register new player account    |
| POST   | `/auth/callback` | No   | Supabase auth callback/webhook |

### Profile

| Method | Path       | Auth | Role   | Description                |
| ------ | ---------- | ---- | ------ | -------------------------- |
| GET    | `/profile` | Yes  | PLAYER | Get current player profile |
| PUT    | `/profile` | Yes  | PLAYER | Update player profile      |

### Machines

| Method | Path                   | Auth | Role   | Description                     |
| ------ | ---------------------- | ---- | ------ | ------------------------------- |
| GET    | `/machines/:id`        | Yes  | PLAYER | Get machine details             |
| GET    | `/machines/:id/status` | Yes  | PLAYER | Get current machine status      |
| POST   | `/machines/connect`    | Yes  | PLAYER | Connect to machine via QR token |

**POST `/machines/connect`**

Request:

```json
{
  "qr_token": "abc123..."
}
```

Response:

```json
{
  "data": {
    "machine_id": "uuid",
    "name": "Machine 1",
    "status": "READY",
    "connection_id": "uuid"
  }
}
```

### Deliveries

| Method | Path              | Auth | Role   | Description             |
| ------ | ----------------- | ---- | ------ | ----------------------- |
| POST   | `/deliveries`     | Yes  | PLAYER | Submit delivery request |
| GET    | `/deliveries/:id` | Yes  | PLAYER | Get delivery status     |

**POST `/deliveries`**

Request (user-level parameters — pitch reference coordinates, not UI coordinates):

```json
{
  "machine_id": "uuid",
  "session_id": "uuid",
  "target_x": 0.62,
  "target_y": 0.73,
  "desired_speed_kmh": 120.0,
  "ball_type": "FAST",
  "number_of_balls": 6,
  "first_ball_delay_ms": 3000,
  "interval_ms": 8000
}
```

Optional fields for display replay (not used by calculation engine):

```json
{
  "ui": {
    "ui_x": 0.55,
    "ui_y": 0.48
  }
}
```

Validation rules (structural — shared contract only):

- `target_x`, `target_y`: 0.0–1.0 (**normalized pitch target** in interactive pitch coordinate system — produced by Pitch Coordinate Mapper, not raw tap position)
- `ui.ui_x`, `ui.ui_y`: 0.0–1.0 (optional; normalized UI coordinates for marker replay on visualization)
- `desired_speed_kmh`: > 0 (structural only — safe/achievable range validated by machine config, calibration, and safety layers)
- `ball_type`: enum value
- `number_of_balls`: integer >= 1 (structural minimum; max count is machine/system validation)
- `first_ball_delay_ms`: >= 0
- `interval_ms`: >= 0 (min safe interval is machine/system validation, not shared contract)

**Calculation semantics (Phase 1F — not yet wired to REST):**

When delivery endpoints are implemented, the backend will invoke `@bowling-machine/calculation-engine` before dispatching `THROW_SEQUENCE`. The engine returns a `CalculationResult` that:

- Preserves the original `DeliveryRequest`
- Records `calibration.profile_id`, `calibration.version`, and `calibration.simulation`
- Produces `MachineDeliveryParameters` on success
- Returns stable error codes (`MISSING_CALIBRATION`, `UNSUPPORTED_CAPABILITY`, etc.) on failure

MVP uses `SIMULATION_CALIBRATION` — calculated RPM and actuator values are **not physically validated**. See [Calculation Engine](../calibration/CALCULATION_ENGINE.md).

Response:

```json
{
  "data": {
    "delivery_id": "uuid",
    "status": "PENDING",
    "machine_command_id": "uuid"
  }
}
```

### Practice Sessions

| Method | Path                   | Auth | Role   | Description                |
| ------ | ---------------------- | ---- | ------ | -------------------------- |
| POST   | `/sessions`            | Yes  | PLAYER | Start new practice session |
| GET    | `/sessions/:id`        | Yes  | PLAYER | Get session details        |
| PUT    | `/sessions/:id/pause`  | Yes  | PLAYER | Pause active session       |
| PUT    | `/sessions/:id/resume` | Yes  | PLAYER | Resume paused session      |
| PUT    | `/sessions/:id/stop`   | Yes  | PLAYER | Stop session               |
| GET    | `/sessions`            | Yes  | PLAYER | List player's sessions     |

**POST `/sessions`**

Request:

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
    }
  ]
}
```

### Practice Plans

| Method | Path         | Auth | Role   | Description                |
| ------ | ------------ | ---- | ------ | -------------------------- |
| GET    | `/plans`     | Yes  | PLAYER | List saved practice plans  |
| POST   | `/plans`     | Yes  | PLAYER | Create saved practice plan |
| GET    | `/plans/:id` | Yes  | PLAYER | Get practice plan          |
| PUT    | `/plans/:id` | Yes  | PLAYER | Update practice plan       |
| DELETE | `/plans/:id` | Yes  | PLAYER | Delete practice plan       |

### History & Analytics

| Method | Path                  | Auth | Role   | Description                |
| ------ | --------------------- | ---- | ------ | -------------------------- |
| GET    | `/history/sessions`   | Yes  | PLAYER | Paginated session history  |
| GET    | `/history/deliveries` | Yes  | PLAYER | Paginated delivery history |
| GET    | `/analytics/summary`  | Yes  | PLAYER | Personal analytics summary |

### Calibration

| Method | Path                       | Auth | Role   | Description                      |
| ------ | -------------------------- | ---- | ------ | -------------------------------- |
| GET    | `/calibration/:machine_id` | Yes  | PLAYER | Get calibration data for machine |
| POST   | `/calibration/:machine_id` | Yes  | ADMIN  | Upload calibration data          |

### Admin

| Method | Path                    | Auth | Role  | Description          |
| ------ | ----------------------- | ---- | ----- | -------------------- |
| GET    | `/admin/users`          | Yes  | ADMIN | List users           |
| PUT    | `/admin/users/:id/role` | Yes  | ADMIN | Change user role     |
| POST   | `/admin/machines`       | Yes  | ADMIN | Register new machine |
| PUT    | `/admin/machines/:id`   | Yes  | ADMIN | Update machine       |
| GET    | `/admin/audit-logs`     | Yes  | ADMIN | View audit logs      |

## WebSocket

Real-time events are delivered via WebSocket. See [WebSocket Events](../protocol/WEBSOCKET_EVENTS.md).

| Endpoint      | Auth                     | Purpose                  |
| ------------- | ------------------------ | ------------------------ |
| `/ws/browser` | Session cookie or ticket | Browser real-time events |
| `/ws/machine` | Machine secret           | ESP32 communication      |

## Related Documents

- [Backend Architecture](../backend/BACKEND_ARCHITECTURE.md)
- [WebSocket Events](../protocol/WEBSOCKET_EVENTS.md)
- [Player Account Architecture](../architecture/PLAYER_ACCOUNT_ARCHITECTURE.md)
