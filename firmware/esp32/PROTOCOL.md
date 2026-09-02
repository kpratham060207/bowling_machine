# ESP32 Wire Protocol Reference (Phase 1J)

This document describes the **implemented** backend ↔ machine peer protocol.

Authoritative schemas: `packages/api-contracts/src/protocol/wire.ts`

Legacy doc `docs/protocol/ESP32_PROTOCOL.md` may be stale — follow source code.

## Connection

```
WebSocket URL: ws://<backend-host>:<port>/ws/machine

Headers:
  X-Machine-Id: <uuid>
  X-Machine-Secret: <plaintext secret — provision during registration>
  X-Protocol-Version: 1.0
```

On success, server sends:

```json
{
  "type": "connected",
  "payload": {
    "machine_id": "...",
    "protocol_version": "1.0",
    "kind": "SIMULATOR|HARDWARE",
    "server_time": "..."
  }
}
```

## Heartbeat

Peer sends every `MACHINE_HEARTBEAT_INTERVAL_MS` (default 5s):

```json
{ "type": "heartbeat", "payload": { "machine_id": "...", "timestamp": "...", "sequence": 1 } }
```

Server responds with `heartbeat_ack`.

If server receives no heartbeat within `MACHINE_HEARTBEAT_TIMEOUT_MS`, connection → RECONNECTING → DISCONNECTED.

## Commands

Server dispatches:

```json
{
  "type": "command.dispatch",
  "payload": {/* MachineCommand — see api-contracts */}
}
```

Peer responds:

```json
{
  "type": "command.ack",
  "payload": {
    "command_id": "...",
    "accepted": true,
    "protocol_version": "1.0",
    "error_code": null,
    "message": "..."
  }
}
```

### THROW_SEQUENCE

Peer must:

1. Validate `parameters` — reject null required fields with `UNCALIBRATED`
2. ACK acceptance (not completion)
3. Execute sequence while emitting `telemetry.status` and `event.state_changed`
4. Include optional `delivery_progress` during multi-ball sequences

### SET_CONFIGURATION

Stores calibration blob in device NVS (firmware responsibility). Simulator stores in memory.

## Telemetry

Peer sends `telemetry.status` with full `MachineStatus` shape during operation.

Report `kind: HARDWARE` for real devices, `SIMULATOR` for simulator.

## Safety (Firmware Responsibility)

- Physical E-stop → immediate local stop + `event.emergency_stop`
- Limit switches → local movement restriction
- Watchdog on lost backend connection → safe stop
- Reject commands when `emergency_stop_active` or uncorrected fault

Backend STOP is a controlled software stop — not equivalent to physical E-stop.

## Reference Implementation

Node.js simulator mirrors this protocol:

- `apps/esp32-simulator/src/simulator/command-handler.ts`
- `apps/esp32-simulator/src/client.ts`
