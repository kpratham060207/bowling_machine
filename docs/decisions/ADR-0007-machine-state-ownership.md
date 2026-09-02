# ADR-0007: Machine State Ownership

## Status

Accepted

## Context

The machine has 12 explicit states (OFF, INITIALIZING, HOMING, READY, etc.) with defined transitions. Multiple system layers (browser, backend, ESP32) interact with machine state. Clear ownership is critical for safety.

## Decision

The **ESP32 firmware owns and enforces the machine state machine**. It is the single source of truth for machine state.

- Backend and frontend **reflect** state received via telemetry
- Backend sends **commands** (execute, stop, home), not state changes
- ESP32 decides whether to accept commands and how to transition
- Invalid state transitions are rejected by ESP32

## Alternatives Considered

| Alternative                     | Reason Rejected                                                          |
| ------------------------------- | ------------------------------------------------------------------------ |
| Backend owns state              | Safety depends on network; backend crash leaves machine in unknown state |
| Shared state (consensus)        | Complex; safety requires single authority                                |
| Frontend owns state             | Browser cannot be safety authority; no hardware access                   |
| Backend commands state directly | Backend crash mid-transition leaves machine unsafe                       |

## Consequences

**Positive:**

- Safety independent of backend/browser/network
- Clear single authority eliminates state conflicts
- ESP32 can enforce safety constraints at state transition boundaries
- Backend crash does not affect machine state
- State machine testable in isolation on ESP32

**Negative:**

- Backend must accept ESP32 state as truth (may differ from expected)
- State synchronization delay (telemetry interval)
- ESP32 state machine complexity concentrated in firmware

## Related

- [Machine State Machine](../embedded/MACHINE_STATE_MACHINE.md)
- [Safety Architecture](../security/SAFETY_ARCHITECTURE.md)
- [ESP32 Architecture](../embedded/ESP32_ARCHITECTURE.md)
