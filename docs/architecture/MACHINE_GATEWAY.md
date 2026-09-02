# Machine Gateway Architecture

> **Status:** Implemented (Phase 1E)
> **Last updated:** 2026-09-02

## Purpose

The machine gateway is the backend boundary between application business logic and machine transport (WebSocket to simulator/ESP32). Route handlers and domain services **must not** implement low-level WebSocket or wire-format details directly.

```
Player REST / WebSocket
        ↓
MachineService / MachineCommandService
        ↓
MachineGateway (interface)
        ↓
DefaultMachineGateway + wire codec
        ↓
/ws/machine  ←→  Simulator / ESP32 peer
```

## Components

| Component | Location | Responsibility |
| --------- | -------- | -------------- |
| `MachineGateway` | `apps/api/src/gateway/types.ts` | Transport-independent interface |
| `DefaultMachineGateway` | `apps/api/src/gateway/machine-gateway.ts` | Connection state, command dispatch, ack waiting |
| `MachineEventBus` | `apps/api/src/gateway/event-bus.ts` | In-process pub/sub for WebSocket events |
| Wire schemas | `packages/api-contracts/src/protocol/wire.ts` | Provisional JSON envelope for machine peer |
| Machine WS route | `apps/api/src/websocket/machine-ws.ts` | `/ws/machine` auth + peer attach |
| Browser WS route | `apps/api/src/websocket/browser-ws.ts` | `/ws/browser` JWT + machine access filter |

## Connection lifecycle

Per machine peer (aligned with `MachineConnectionStatusSchema`):

1. **DISCONNECTED** — no active peer socket
2. **CONNECTING** — auth handshake in progress
3. **CONNECTED** — peer authenticated; heartbeats active
4. **RECONNECTING** — heartbeat missed; grace period before detach

Heartbeat policy (MVP):

- Peer sends `heartbeat` every 5s (simulator configurable)
- Gateway responds with `heartbeat_ack`
- Missing heartbeat for `MACHINE_HEARTBEAT_TIMEOUT_MS` (default 15s) → `RECONNECTING`
- Missing for 2× timeout → detach peer (`DISCONNECTED`)

## Command acknowledgement

HTTP/API success means the backend **accepted** the request. Machine acknowledgement is separate:

1. `MachineCommandService` persists command (`machine_commands`, status `PENDING`)
2. Gateway dispatches `command.dispatch` wire message
3. Peer responds with `command.ack` (`CommandAcknowledgementSchema`)
4. Service updates status to `ACCEPTED` / `REJECTED` / `FAILED`

If ack does not arrive within `MACHINE_COMMAND_ACK_TIMEOUT_MS`, the API returns conflict.

## Idempotency (MVP)

Two layers:

1. **Database:** `machine_commands.id` = domain `command_id` (PK) — duplicate inserts return stored outcome
2. **Gateway in-memory:** `processedCommandIds` prevents duplicate side effects if peer retries same id

Documented in `MachineCommandService.dispatch()` — not distributed idempotency.

## Authorization boundaries

| Check | Enforced by |
| ----- | ----------- |
| Authenticated player | JWT middleware |
| `machine_access` grant | `assertPlayerMachineAccess()` |
| Active control lock | `MachineService.assertActiveControl()` |
| Live event subscription | Browser WS filters by accessible machine ids |

Admins do not bypass player machine routes unless explicitly implemented on admin routes (Phase 1E: admin machine management stub only).

## Machine control lock

Table: `machine_control_locks` (Phase 1E migration `0001`).

- One row per machine (`machine_id` PK)
- First-come-first-served (UD-06 MVP option 1)
- `expires_at` enables abandoned lock recovery
- Release on normal session completion via `POST /machines/:id/control/release`

## Telemetry persistence policy

- **Live:** streamed via WebSocket (`STATUS_UPDATED`, `HEARTBEAT`) — not every tick stored
- **Persisted:** meaningful samples via `telemetry_samples` / `faults` when gateway selects events (state changes, faults)

Phase 1E gateway updates in-memory status from `telemetry.status` wire messages; selective DB persistence is minimal in MVP.

## QR / machine peer auth (provisional)

- QR token identifies machine via `machine_registrations.qr_code_token` — **no secrets in QR**
- Machine peer auth uses `X-Machine-Id` + `X-Machine-Secret` headers (UD-21 **not finalized**)
- Dev seed secret: `dev-simulator-secret-001` (SHA-256 hash in DB)

## Related documents

- [ESP32 Protocol](./ESP32_PROTOCOL.md)
- [Simulator](./SIMULATOR.md)
- [WebSocket Events](./WEBSOCKET_EVENTS.md)
- [API Specification](../api/API_SPECIFICATION.md)
