# ESP32 Communication Protocol

> **Status:** Designed (not implemented)
> **Last updated:** 2026-09-02

## Overview

Defines the communication protocol between the backend (Machine Gateway) and the ESP32 firmware. Transport is WebSocket over local Wi-Fi. All messages are JSON.

## Connection

### ESP32 → Backend

```
WebSocket URL: ws://<backend_host>:<port>/ws/machine
Headers:
  X-Machine-Id: <machine_uuid>
  X-Machine-Secret: <connection_secret>
```

Authentication: Machine secret validated against hashed value in `machine_registrations`.

### Heartbeat

- ESP32 sends `heartbeat` every 5 seconds
- Backend responds with `heartbeat_ack`
- Backend marks machine offline if no heartbeat for 15 seconds

## Message Envelope

All messages follow this structure:

```json
{
  "type": "message_type",
  "id": "uuid",
  "timestamp": "2026-09-02T12:00:00Z",
  "payload": { ... }
}
```

## Backend → ESP32 Messages

### command.execute

Execute a machine command (delivery sequence).

```json
{
  "type": "command.execute",
  "id": "cmd-uuid",
  "timestamp": "2026-09-02T12:00:00Z",
  "payload": {
    "command_id": "uuid",
    "ttl_ms": 30000,
    "sequence": {
      "wheel1_target_rpm": null,
      "wheel2_target_rpm": null,
      "actuator1_target_position": null,
      "actuator2_target_position": null,
      "actuator3_target_position": null,
      "actuator4_target_position": null,
      "feeder_delay_ms": null,
      "ball_count": 6,
      "first_ball_delay_ms": 3000,
      "interval_ms": 8000
    }
  }
}
```

**Note:** Machine parameter values are `null` until calibration data exists. The ESP32 MUST reject commands with null required parameters.

### command.stop

Immediately stop current operation.

```json
{
  "type": "command.stop",
  "id": "cmd-uuid",
  "timestamp": "2026-09-02T12:00:00Z",
  "payload": {
    "reason": "user_requested"
  }
}
```

### command.home

Initiate homing sequence.

```json
{
  "type": "command.home",
  "id": "cmd-uuid",
  "timestamp": "2026-09-02T12:00:00Z",
  "payload": {}
}
```

### config.update

Update calibration/configuration data.

```json
{
  "type": "config.update",
  "id": "cmd-uuid",
  "timestamp": "2026-09-02T12:00:00Z",
  "payload": {
    "calibration_type": "speed_rpm",
    "version": 2,
    "data": { ... }
  }
}
```

## ESP32 → Backend Messages

### telemetry.status

Periodic status report (every 1 second during active operations, every 10 seconds when idle).

```json
{
  "type": "telemetry.status",
  "id": "msg-uuid",
  "timestamp": "2026-09-02T12:00:00Z",
  "payload": {
    "state": "SPINNING_UP",
    "wheel1_rpm": 0,
    "wheel2_rpm": 0,
    "actuator_positions": [0, 0, 0, 0],
    "imu": { "pitch": 0.0, "roll": 0.0, "yaw": 0.0 },
    "safety": {
      "e_stop_active": false,
      "limit_switches": [true, true, true, true],
      "power_on": true
    },
    "firmware_version": "0.0.0"
  }
}
```

### event.state_change

Machine state transition.

```json
{
  "type": "event.state_change",
  "id": "msg-uuid",
  "timestamp": "2026-09-02T12:00:00Z",
  "payload": {
    "previous_state": "POSITIONING",
    "new_state": "SPINNING_UP",
    "reason": "positioning_complete"
  }
}
```

### event.ball_delivered

A ball was successfully delivered.

```json
{
  "type": "event.ball_delivered",
  "id": "msg-uuid",
  "timestamp": "2026-09-02T12:00:00Z",
  "payload": {
    "command_id": "uuid",
    "ball_number": 3,
    "wheel1_rpm_actual": 0,
    "wheel2_rpm_actual": 0
  }
}
```

### event.error

Error or fault condition.

```json
{
  "type": "event.error",
  "id": "msg-uuid",
  "timestamp": "2026-09-02T12:00:00Z",
  "payload": {
    "error_code": "ACTUATOR_LIMIT",
    "message": "Actuator 2 hit limit switch during positioning",
    "state": "ERROR",
    "recoverable": true
  }
}
```

### command.ack

Acknowledgment of received command.

```json
{
  "type": "command.ack",
  "id": "msg-uuid",
  "timestamp": "2026-09-02T12:00:00Z",
  "payload": {
    "command_id": "uuid",
    "accepted": true,
    "reason": null
  }
}
```

When rejected:

```json
{
  "payload": {
    "command_id": "uuid",
    "accepted": false,
    "reason": "Machine not in READY state"
  }
}
```

### heartbeat

```json
{
  "type": "heartbeat",
  "id": "msg-uuid",
  "timestamp": "2026-09-02T12:00:00Z",
  "payload": {}
}
```

## Command Lifecycle

```
Backend sends command.execute
    │
    ▼
ESP32 validates (state, TTL, parameter ranges)
    │
    ├── Rejected → command.ack (accepted: false) + event.error
    │
    └── Accepted → command.ack (accepted: true)
            │
            ▼
        State machine executes sequence
            │
            ├── telemetry.status (periodic updates)
            ├── event.state_change (transitions)
            ├── event.ball_delivered (per ball)
            │
            └── Complete or event.error
```

## Security

- All messages treated as untrusted on ESP32 side
- Machine secret required for WebSocket connection
- Command TTL enforced (default 30 seconds, configurable)
- Parameter range validation against calibration limits
- No firmware update over this protocol in MVP (future ADR required)

## Related Documents

- [ESP32 Architecture](./ESP32_ARCHITECTURE.md)
- [Machine State Machine](./MACHINE_STATE_MACHINE.md)
- [WebSocket Events](./WEBSOCKET_EVENTS.md)
- [Safety Architecture](../security/SAFETY_ARCHITECTURE.md)
