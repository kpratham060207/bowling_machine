# WebSocket Events

> **Status:** Designed (not implemented)
> **Last updated:** 2026-09-02

## Overview

Real-time communication between the backend and clients (browser and ESP32) uses WebSocket connections. This document defines the event types for the browser WebSocket channel.

## Browser WebSocket Connection

```
URL: ws://<backend_host>:<port>/ws/browser?token=<jwt>
```

Authentication: Supabase JWT passed as query parameter. Validated on connection.

### Subscription

After connecting, the client subscribes to a machine:

```json
{
  "type": "subscribe",
  "payload": {
    "machine_id": "uuid"
  }
}
```

Backend confirms:

```json
{
  "type": "subscribed",
  "payload": {
    "machine_id": "uuid",
    "current_state": "READY"
  }
}
```

## Server → Browser Events

### machine.state_changed

Machine state transition.

```json
{
  "type": "machine.state_changed",
  "payload": {
    "machine_id": "uuid",
    "previous_state": "SPINNING_UP",
    "new_state": "READY_TO_THROW",
    "timestamp": "2026-09-02T12:00:00Z"
  }
}
```

### machine.status_update

Periodic status snapshot.

```json
{
  "type": "machine.status_update",
  "payload": {
    "machine_id": "uuid",
    "state": "READY_TO_THROW",
    "wheel1_rpm": 0,
    "wheel2_rpm": 0,
    "balls_delivered": 2,
    "balls_remaining": 4,
    "timestamp": "2026-09-02T12:00:00Z"
  }
}
```

### session.progress

Session progress update.

```json
{
  "type": "session.progress",
  "payload": {
    "session_id": "uuid",
    "delivery_id": "uuid",
    "ball_number": 3,
    "total_balls": 6,
    "delivery_status": "EXECUTING"
  }
}
```

### session.ball_delivered

Individual ball delivery confirmation.

```json
{
  "type": "session.ball_delivered",
  "payload": {
    "session_id": "uuid",
    "delivery_id": "uuid",
    "ball_number": 3,
    "timestamp": "2026-09-02T12:00:00Z"
  }
}
```

### session.completed

Session finished.

```json
{
  "type": "session.completed",
  "payload": {
    "session_id": "uuid",
    "total_balls_delivered": 6,
    "duration_ms": 48000
  }
}
```

### session.error

Session or delivery error.

```json
{
  "type": "session.error",
  "payload": {
    "session_id": "uuid",
    "delivery_id": "uuid",
    "error_code": "MACHINE_ERROR",
    "message": "Machine entered ERROR state during delivery"
  }
}
```

### machine.connected

Machine came online.

```json
{
  "type": "machine.connected",
  "payload": {
    "machine_id": "uuid",
    "firmware_version": "0.0.0"
  }
}
```

### machine.disconnected

Machine went offline.

```json
{
  "type": "machine.disconnected",
  "payload": {
    "machine_id": "uuid",
    "last_seen": "2026-09-02T12:00:00Z"
  }
}
```

## Browser → Server Events

### subscribe

Subscribe to machine events (see above).

### unsubscribe

```json
{
  "type": "unsubscribe",
  "payload": {
    "machine_id": "uuid"
  }
}
```

### ping

Keep-alive (client sends every 30 seconds).

```json
{
  "type": "ping",
  "payload": {}
}
```

Server responds:

```json
{
  "type": "pong",
  "payload": {
    "timestamp": "2026-09-02T12:00:00Z"
  }
}
```

## Connection Management

| Parameter              | Value                                         |
| ---------------------- | --------------------------------------------- |
| Client ping interval   | 30 seconds                                    |
| Server ping timeout    | 60 seconds                                    |
| Reconnect strategy     | Exponential backoff (1s, 2s, 4s, 8s, max 30s) |
| Max reconnect attempts | Unlimited (until user navigates away)         |

On reconnect, client re-subscribes and receives current state snapshot.

## ESP32 WebSocket Events

See [ESP32 Protocol](./ESP32_PROTOCOL.md) for the machine-side WebSocket event definitions.

## Related Documents

- [ESP32 Protocol](./ESP32_PROTOCOL.md)
- [Frontend Architecture](../frontend/FRONTEND_ARCHITECTURE.md)
- [Backend Architecture](../backend/BACKEND_ARCHITECTURE.md)
