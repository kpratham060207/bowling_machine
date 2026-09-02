# ADR-0005: Machine Communication

## Status

Accepted

## Context

The backend must communicate with ESP32 firmware in real time for command delivery and telemetry reception. The communication channel must work over local Wi-Fi, support bidirectional messaging, and handle connection loss gracefully.

## Decision

Use **WebSocket** as the primary communication protocol between backend and ESP32.

- Backend exposes `/ws/machine` endpoint for ESP32 connections
- Backend exposes `/ws/browser` endpoint for browser real-time events
- All messages are JSON with a typed envelope (see [ESP32 Protocol](../protocol/ESP32_PROTOCOL.md))
- Machine authentication via connection secret (header-based)
- Command TTL enforced on ESP32 side

HTTP REST is used for browser-to-backend communication only.

## Alternatives Considered

| Alternative   | Reason Rejected                                             |
| ------------- | ----------------------------------------------------------- |
| MQTT          | Requires broker infrastructure; overkill for point-to-point |
| HTTP polling  | Too slow for real-time telemetry; inefficient               |
| gRPC          | Poor browser support; ESP32 gRPC library immature           |
| Raw TCP       | No framing, no built-in reconnect, harder to debug          |
| BLE           | Short range; not suitable for machine-to-backend            |
| WebRTC        | Overly complex; designed for peer-to-peer media             |
| Redis pub/sub | Requires Redis; adds infrastructure                         |

## Consequences

**Positive:**

- Bidirectional real-time communication
- Same protocol for browser and ESP32 (different endpoints)
- JSON messages are human-readable for debugging
- WebSocket libraries available for Node.js and ESP-IDF
- No additional infrastructure (no broker)

**Negative:**

- WebSocket connection management adds complexity
- ESP32 WebSocket client consumes memory
- No guaranteed delivery (mitigated by command ACK and TTL)
- Connection state must be managed (reconnect, heartbeat)

## Related

- [ESP32 Protocol](../protocol/ESP32_PROTOCOL.md)
- [WebSocket Events](../protocol/WEBSOCKET_EVENTS.md)
- [ADR-0006 Offline Architecture](./ADR-0006-offline-architecture.md)
