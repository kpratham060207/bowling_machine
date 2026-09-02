# Phase 1J — Real Machine Integration & Hardware Calibration Foundation

> **Status:** Complete  
> **Depends on:** Phase 1I (local commits)  
> **Does not include:** AI, computer vision, OTA firmware, full motor-control firmware

## Architecture

```
PLAYER
  ↓
WEB APP (Next.js)
  ↓ REST + Browser WebSocket
FASTIFY BACKEND
  ↓ Orchestration + Calculation
MACHINE GATEWAY (DefaultMachineGateway)
  ↓ WebSocket /ws/machine
┌─────────────────┬─────────────────┐
│  ESP32-SIMULATOR │  ESP32 FIRMWARE │
│  (development)   │  (future impl)  │
└─────────────────┴─────────────────┘
```

The browser **never** communicates directly with the ESP32.

The ESP32 is the **final local safety authority**. Backend validation does not replace hardware safety.

## Machine Gateway / Transport Boundary

Business logic (`DeliveryOrchestrationService`, `MachineCommandService`, player routes) talks only to the `MachineGateway` interface. Transport details (WebSocket headers, wire JSON codec) live in:

- `apps/api/src/gateway/machine-gateway.ts`
- `apps/api/src/websocket/machine-ws.ts`

There are **no** `if (simulator)` branches in player-facing orchestration. Simulator and ESP32 share identical wire protocol semantics.

## Machine Identity & Authentication

| Layer              | Mechanism                                                                    |
| ------------------ | ---------------------------------------------------------------------------- |
| Machine ID         | Stable UUID in `machines` table                                              |
| Player discovery   | QR token → `machine_registrations.qr_code_token` (no secret)                 |
| Peer auth          | `X-Machine-Id` + `X-Machine-Secret` headers on `/ws/machine`                 |
| Secret storage     | SHA-256 hash in `connection_secret_hash` — plaintext never stored            |
| ADMIN registration | `POST /api/v1/admin/machines/:machineId/registration` — secret returned once |

**Security limitations (UD-21 provisional):**

- No challenge-response or secret rotation API yet
- No TLS/WSS enforcement in MVP
- Secrets must never appear in QR codes, URLs, query strings, or frontend code

## Protocol Version

- Constant: `PROTOCOL_VERSION = '1.0'`
- Peer may send `X-Protocol-Version: 1.0` header at connect
- Mismatch → connection rejected with error + socket close
- Inbound `command.ack` with wrong version → wire error, ack ignored

Authoritative wire schema: `packages/api-contracts/src/protocol/wire.ts`

## Wire Messages

| Type                   | Direction     | Purpose                                         |
| ---------------------- | ------------- | ----------------------------------------------- |
| `connected`            | Server → peer | Handshake after auth                            |
| `command.dispatch`     | Server → peer | Full domain command                             |
| `command.ack`          | Peer → server | Acceptance/rejection (NOT execution completion) |
| `heartbeat`            | Peer → server | Liveness                                        |
| `heartbeat_ack`        | Server → peer | Heartbeat response                              |
| `telemetry.status`     | Peer → server | Full `MachineStatus` snapshot                   |
| `event.state_changed`  | Peer → server | State transition                                |
| `event.fault`          | Peer → server | Structured fault                                |
| `event.emergency_stop` | Peer → server | E-stop state                                    |
| `error`                | Server → peer | Malformed message / protocol error              |

## Heartbeat / Watchdog

| Setting                         | Default | Responsibility               |
| ------------------------------- | ------- | ---------------------------- |
| `MACHINE_HEARTBEAT_INTERVAL_MS` | 5000    | Machine peer sends heartbeat |
| `MACHINE_HEARTBEAT_TIMEOUT_MS`  | 15000   | Gateway marks RECONNECTING   |
| 2× timeout                      | 30000   | Gateway detaches peer        |

On disconnect: pending commands rejected, status → DISCONNECTED.

## Commands

High-level commands only: `HOME`, `STOP`, `THROW_SEQUENCE`, `SET_CONFIGURATION`, `PING`, `STATUS`.

`THROW_SEQUENCE` carries calculated `MachineDeliveryParameters` — backend never sends GPIO/PWM.

**ACK ≠ execution completion.** Orchestration tracks completion via telemetry (`active_command_id` clearing + READY state).

## Requested / Calculated / Observed

```
REQUESTED (player input)
    ↓ calculation using active calibration
CALCULATED (machine parameters + calibration_profile_id on delivery)
    ↓ THROW_SEQUENCE dispatch
OBSERVED (telemetry.status from peer)
```

Deliveries store `calibration_profile_id` at calculation time — historical association preserved when calibration changes.

## Calibration

### Lifecycle

```
DRAFT → ACTIVE → ARCHIVED
```

Within data JSON:

- Simulation: `_simulation: true` — SIMULATOR machines only
- Hardware: `_hardware: true`, `_completeness: draft | validated` — HARDWARE machines only when validated with all required fields

### Activation Rules

- Simulation profiles cannot activate on HARDWARE machines
- Draft hardware profiles cannot activate
- Validated hardware requires all measured fields (no invented defaults)
- On activate: prior ACTIVE profile archived; `SET_CONFIGURATION` pushed if peer connected

> Calibration values are machine-specific. Simulator calibration values are not production physical constants.

## Telemetry Semantics

`MachineStatus` fields:

| Field                 | Unit / Semantics                                      |
| --------------------- | ----------------------------------------------------- |
| `wheel*_current_rpm`  | RPM (encoder) — null when unknown                     |
| `wheel*_target_rpm`   | RPM (command target)                                  |
| `actuator_*_position` | UNRESOLVED machine-local units (UD-02)                |
| `imu.*`               | UNRESOLVED numeric axes                               |
| `delivery_progress`   | Optional balls delivered/remaining in active sequence |

## Fault Model

Stable codes in `MachineFaultCodeSchema` including `WATCHDOG_TIMEOUT`, `COMMUNICATION_FAULT`, `UNCALIBRATED`.

## Development Mode

Run simulator (default):

```bash
pnpm --filter @bowling-machine/esp32-simulator dev
```

Environment:

- `SIMULATOR_BACKEND_URL`
- `SIMULATOR_MACHINE_ID`
- `SIMULATOR_CONNECTION_SECRET`
- `SIMULATOR_MACHINE_KIND=SIMULATOR|HARDWARE`

## Hardware Testing

CI uses simulator only. Physical hardware tests require explicit configuration and are **not** run in normal CI.

```bash
# Conceptual — requires physical ESP32 + env configuration
pnpm test:hardware
```

Do not claim hardware validation unless real hardware was used.

## Firmware

`firmware/esp32/` contains protocol reference documentation. Full motor-control firmware is deferred.

See also:

- `firmware/esp32/PROTOCOL.md`
- `docs/protocol/WIRE_PROTOCOL.md`

## Deferred

- Full ESP32 motor/actuator firmware
- OTA updates
- Physical calibration wizard / field measurements
- Telemetry bulk persistence
- AI / computer vision
- Secret rotation / PKI
