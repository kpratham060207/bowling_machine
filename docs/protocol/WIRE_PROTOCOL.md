# Wire Protocol (Backend ↔ Machine Peer)

> **Authoritative source:** `packages/api-contracts/src/protocol/wire.ts`  
> **Phase 1J reference:** `firmware/esp32/PROTOCOL.md`

## Transport

- Endpoint: `GET /ws/machine` (WebSocket upgrade)
- Authentication: HTTP headers only (never query string)
- Browser clients use `/ws/browser` — separate protocol

## MachineGateway Boundary

```
MachineCommandService
        ↓
MachineGateway.sendCommand()
        ↓
WireCommandDispatch (JSON)
        ↓
WebSocket → peer
```

Inbound messages parsed by `WireInboundMessageSchema`. Malformed messages receive wire `error` responses.

## Simulator / ESP32 Parity

Both peers must implement identical message types and semantics. The Node.js simulator in `apps/esp32-simulator/` is the reference implementation for CI and development.

## Protocol Version

`PROTOCOL_VERSION = '1.0'` — mismatches rejected at connection and on inbound acks.
