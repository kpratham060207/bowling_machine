# ESP32 Simulator

> **Status:** Implemented (Phase 1E)
> **Last updated:** 2026-09-02

## Overview

`apps/esp32-simulator` implements a **simulated machine peer** that connects to the backend `/ws/machine` WebSocket and speaks protocol version `1.0`.

**This is simulated behavior only.** It does not control physical hardware and does not validate physical safety.

## Running locally

```bash
# Terminal 1 — API
pnpm --filter @bowling-machine/api dev

# Terminal 2 — Simulator (after db:seed)
pnpm --filter @bowling-machine/esp32-simulator dev
```

Environment (see `.env.example`):

| Variable                      | Default                    | Purpose                         |
| ----------------------------- | -------------------------- | ------------------------------- |
| `SIMULATOR_BACKEND_URL`       | `http://127.0.0.1:4000`    | Backend base URL (auto `ws://`) |
| `SIMULATOR_MACHINE_ID`        | Dev seed machine UUID      | Machine identity                |
| `SIMULATOR_CONNECTION_SECRET` | `dev-simulator-secret-001` | Peer auth secret                |
| `SIMULATOR_HEARTBEAT_MS`      | `5000`                     | Heartbeat interval              |
| `SIMULATOR_FAILURE_MODE`      | `none`                     | Failure injection (dev/test)    |

## State machine (simulated)

Implements all contract states with deterministic timing (no motor physics):

`OFF` → `INITIALIZING` → `READY` / `HOMING` → … → `ERROR` / `EMERGENCY_STOP`

Supported commands:

- `PING`, `STATUS`, `HOME`, `STOP`, `PAUSE`, `RESUME`, `SET_CONFIGURATION`, `THROW_SEQUENCE`

### THROW_SEQUENCE simulation

1. Validate command (homed, ready, not E-stop)
2. Acknowledge receipt
3. Transition: `POSITIONING` → `SPINNING_UP` → `READY_TO_THROW` → `FEEDING` → `WAITING` (repeat)
4. Emit `telemetry.status` and `event.state_changed`
5. Return to `READY` when complete

Parameters are synthetic placeholders — no trajectory calculation.

## Safety semantics (simulated)

Rejects commands when:

- Machine in invalid state
- Emergency stop active
- Command expired
- Not homed (for throw sequence)
- Injected failure mode active

`STOP` and emergency stop override normal execution.

## Failure injection

Set `SIMULATOR_FAILURE_MODE` for controlled test scenarios:

| Mode                   | Behavior                             |
| ---------------------- | ------------------------------------ |
| `connection_loss`      | Do not reconnect after disconnect    |
| `heartbeat_timeout`    | Stop sending heartbeats              |
| `command_timeout`      | Ignore incoming commands             |
| `machine_fault`        | Reject with fault                    |
| `actuator_failure`     | Fail during homing                   |
| `wheel_spinup_failure` | Fail during throw spin-up            |
| `feeder_failure`       | Reject throw sequence                |
| `emergency_stop`       | Trigger E-stop shortly after connect |

Not exposed to player UI — development and automated tests only.

## Related documents

- [Machine Gateway](../architecture/MACHINE_GATEWAY.md)
- [ESP32 Protocol](./ESP32_PROTOCOL.md)
