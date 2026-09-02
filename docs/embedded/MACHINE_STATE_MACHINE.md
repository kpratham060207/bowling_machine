# Machine State Machine

> **Status:** Designed (not implemented)
> **Last updated:** 2026-09-02

## Overview

The machine state machine is owned and enforced by the ESP32 firmware. The backend and frontend reflect state but cannot override it. This document defines all states, valid transitions, and transition conditions.

## States

| State            | Description                                          |
| ---------------- | ---------------------------------------------------- |
| `OFF`            | Main power off. No firmware running.                 |
| `INITIALIZING`   | Firmware boot, self-test, sensor initialization      |
| `HOMING`         | Actuators moving to home position via limit switches |
| `READY`          | Homed, idle, accepting commands                      |
| `POSITIONING`    | Actuators moving to target positions for delivery    |
| `SPINNING_UP`    | Launch wheels accelerating to target RPM             |
| `READY_TO_THROW` | Positioned and at speed, awaiting feed trigger       |
| `FEEDING`        | Ball feed mechanism active, ball being released      |
| `WAITING`        | Between balls in a multi-ball sequence               |
| `STOPPING`       | Ramping down motors, returning to safe state         |
| `ERROR`          | Fault condition, operations halted                   |
| `EMERGENCY_STOP` | Physical E-stop activated, all motion halted         |

## State Diagram

```
                    ┌──────┐
                    │ OFF  │
                    └──┬───┘
                       │ power on
                       ▼
                ┌──────────────┐
                │ INITIALIZING │
                └──────┬───────┘
                       │ self-test pass
                       ▼
                  ┌─────────┐
             ┌───▶│ HOMING  │◀───┐
             │    └────┬────┘    │ command.home
             │         │ homing  │
             │         │ complete│
             │         ▼         │
             │    ┌─────────┐    │
             │    │  READY  │────┘
             │    └────┬────┘
             │         │ command.execute
             │         ▼
             │  ┌──────────────┐
             │  │ POSITIONING  │
             │  └──────┬───────┘
             │         │ positioned
             │         ▼
             │  ┌──────────────┐
             │  │ SPINNING_UP  │
             │  └──────┬───────┘
             │         │ at target RPM
             │         ▼
             │  ┌─────────────────┐
             │  │ READY_TO_THROW  │
             │  └──────┬──────────┘
             │         │ feed trigger
             │         ▼
             │  ┌──────────────┐
             │  │   FEEDING    │
             │  └──────┬───────┘
             │         │ ball released
             │         ▼
             │  ┌──────────────┐     more balls
             │  │   WAITING    │─────────────┐
             │  └──────┬───────┘             │
             │         │ interval elapsed     │
             │         ▼                      │
             │  ┌─────────────────┐           │
             │  │ READY_TO_THROW  │◀──────────┘
             │  └─────────────────┘
             │         │ all balls done
             │         ▼
             │  ┌──────────────┐
             │  │   STOPPING   │
             │  └──────┬───────┘
             │         │ motors stopped
             │         ▼
             │    ┌─────────┐
             └────│  READY  │
                  └─────────┘

  Any active state ──▶ ERROR (fault detected)
  Any active state ──▶ EMERGENCY_STOP (E-stop pressed)
  Any active state ──▶ STOPPING (command.stop received)

  ERROR ──▶ HOMING (reset after fault cleared)
  EMERGENCY_STOP ──▶ OFF (E-stop released + power cycle)
  EMERGENCY_STOP ──▶ INITIALIZING (E-stop released, auto-recovery — TBD)
```

## Transition Table

| From           | To             | Trigger               | Conditions                       |
| -------------- | -------------- | --------------------- | -------------------------------- |
| OFF            | INITIALIZING   | Power on              | Main power switch on             |
| INITIALIZING   | HOMING         | Self-test pass        | All sensors responsive           |
| INITIALIZING   | ERROR          | Self-test fail        | Sensor/ hardware fault           |
| HOMING         | READY          | Homing complete       | All actuators at home            |
| HOMING         | ERROR          | Homing fail           | Limit switch timeout             |
| READY          | POSITIONING    | command.execute       | Valid command, accepted          |
| READY          | HOMING         | command.home          | Manual homing request            |
| POSITIONING    | SPINNING_UP    | Position reached      | All actuators at target          |
| POSITIONING    | ERROR          | Fault                 | Actuator fault, limit hit        |
| SPINNING_UP    | READY_TO_THROW | RPM reached           | Both wheels at target ±tolerance |
| SPINNING_UP    | ERROR          | Fault                 | RPM not achieved within timeout  |
| READY_TO_THROW | FEEDING        | Timer / trigger       | Feed delay elapsed               |
| FEEDING        | WAITING        | Ball released         | Feed mechanism complete          |
| FEEDING        | ERROR          | Fault                 | Feed mechanism fault             |
| WAITING        | READY_TO_THROW | Interval elapsed      | More balls remaining             |
| WAITING        | STOPPING       | All balls done        | Sequence complete                |
| READY_TO_THROW | STOPPING       | All balls done        | Single ball delivered            |
| STOPPING       | READY          | Motors stopped        | Safe state reached               |
| Any active     | ERROR          | Fault detected        | Any hardware fault               |
| Any active     | EMERGENCY_STOP | E-stop pressed        | Hardware interrupt               |
| Any active     | STOPPING       | command.stop          | User/backend stop                |
| ERROR          | HOMING         | Fault cleared + reset | Manual or auto recovery          |
| EMERGENCY_STOP | INITIALIZING   | E-stop released       | Recovery procedure (TBD)         |

## State Ownership

| Layer    | Role                                                                   |
| -------- | ---------------------------------------------------------------------- |
| ESP32    | **Authoritative** — enforces all transitions                           |
| Backend  | Reflects state from telemetry, does not command state changes directly |
| Frontend | Displays state, sends user intents (stop, start) to backend            |

The backend sends **commands** (execute, stop, home), not **state changes**. The ESP32 state machine decides whether to accept and how to transition.

## Invalid Transitions

The ESP32 MUST reject:

- `command.execute` when not in `READY` state
- Any command during `EMERGENCY_STOP`
- Any command during `ERROR` (except reset/recovery)
- `command.execute` with expired TTL
- Any command with out-of-range parameters

## Telemetry

Every state transition generates an `event.state_change` message to the backend (see [ESP32 Protocol](../protocol/ESP32_PROTOCOL.md)).

## Related Documents

- [ESP32 Architecture](./ESP32_ARCHITECTURE.md)
- [Safety Architecture](../security/SAFETY_ARCHITECTURE.md)
- [ADR-0007 Machine State Ownership](../decisions/ADR-0007-machine-state-ownership.md)
