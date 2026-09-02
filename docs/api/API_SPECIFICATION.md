# API Specification

> **Status:** Contracts implemented (Phase 1B); REST routes not implemented
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

HTTP route handlers are **not** implemented until a later phase.

## Authentication

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

Validation rules:

- `target_x`, `target_y`: 0.0–1.0 (**normalized pitch target** in interactive pitch coordinate system — produced by Pitch Coordinate Mapper, not raw tap position)
- `ui.ui_x`, `ui.ui_y`: 0.0–1.0 (optional; normalized UI coordinates for marker replay on visualization)
- `desired_speed_kmh`: > 0, upper limit TBD by calibration
- `ball_type`: enum value
- `number_of_balls`: 1–50 (configurable max)
- `first_ball_delay_ms`: >= 0
- `interval_ms`: >= 1000 (minimum 1 second between balls)

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

| Endpoint      | Auth            | Purpose                  |
| ------------- | --------------- | ------------------------ |
| `/ws/browser` | JWT query param | Browser real-time events |
| `/ws/machine` | Machine secret  | ESP32 communication      |

## Related Documents

- [Backend Architecture](../backend/BACKEND_ARCHITECTURE.md)
- [WebSocket Events](../protocol/WEBSOCKET_EVENTS.md)
- [Player Account Architecture](../architecture/PLAYER_ACCOUNT_ARCHITECTURE.md)
