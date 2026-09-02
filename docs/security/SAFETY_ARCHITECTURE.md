# Safety Architecture

> **Status:** Designed (not implemented)
> **Last updated:** 2026-09-02

## Overview

Safety is the highest-priority concern in this system. Safety enforcement MUST occur at the ESP32 firmware level and MUST NOT depend on the browser, backend, internet, or cloud services.

**This document describes the designed safety architecture. No physical safety validation has been performed. No hardware has been tested.**

## Safety Principles

1. **Defense in depth** — Multiple independent safety layers
2. **Fail-safe defaults** — Loss of any signal → safe state (motors off)
3. **Local authority** — ESP32 is the final safety decision maker
4. **Physical independence** — Emergency stop is a hardware circuit, not software
5. **Minimal trust** — All network commands treated as untrusted

## Safety Layers

```
Layer 1: Physical Emergency Stop (hardware circuit, independent of all software)
Layer 2: ESP32 Watchdog Timer (firmware hang detection)
Layer 3: ESP32 Safety Monitor Task (highest priority FreeRTOS task)
Layer 4: Parameter Validation (range checks, TTL, state checks)
Layer 5: Limit Switches (actuator mechanical limits)
Layer 6: Encoder Feedback (speed verification)
Layer 7: Backend Validation (business logic, not safety-critical)
Layer 8: Frontend Input Validation (UX, not safety-critical)
```

Only Layers 1–6 are safety-critical. Layers 7–8 provide defense in depth but MUST NOT be relied upon for safety.

## Safety Mechanisms

### Physical Emergency Stop

- Hardwired circuit that cuts power to motors
- Independent of ESP32, backend, and network
- ESP32 reads E-stop state via GPIO interrupt
- When active: immediate transition to `EMERGENCY_STOP`, all software motor control disabled
- Recovery requires physical E-stop release (and potentially power cycle — TBD)

### Maximum Wheel RPM

- Calibrated maximum RPM stored in ESP32 NVS
- Safety monitor task continuously verifies encoder feedback against limit
- PWM duty cycle clamped to never exceed calibrated maximum
- Backend calculation engine also clamped (non-safety-critical duplicate check)

### Actuator Limits

- Limit/home switches at mechanical extremes
- Firmware MUST NOT drive actuators past limit switches
- Homing required after power interruption or E-stop

### Stale Command Rejection

- Every command includes a TTL (default 30 seconds)
- ESP32 rejects commands where `now > timestamp + ttl_ms`
- Prevents execution of queued commands after connectivity issues

### Invalid Command Rejection

- All parameters validated against calibration-defined ranges
- Commands rejected if machine is not in `READY` state
- Null/unset machine parameters rejected until calibration exists

### Watchdog Timer

- ESP32 hardware watchdog enabled
- Safety monitor task feeds watchdog every cycle
- If firmware hangs: hardware reset → boot → `INITIALIZING` → `HOMING` (not `READY`)

### Network Loss

- On WebSocket disconnection: if machine is in active delivery state, complete current ball then stop
- If idle: remain in current safe state
- Motors MUST NOT continue indefinitely without backend connection (configurable timeout — see [Unresolved Decisions](../architecture/UNRESOLVED_DECISIONS.md))

### Power Interruption

- On power restore: boot → `INITIALIZING` → `HOMING` → `READY`
- Never resume mid-delivery after power loss
- Homing required before any delivery

### ESP32 Restart

- Same as power interruption
- All volatile state lost
- Calibration data persists in NVS
- Must re-establish backend connection

### Hardware Faults

- Motor driver fault signals (if available) → `ERROR` state
- Encoder failure (no feedback) → stop affected motor → `ERROR`
- IMU failure → warning logged, delivery may proceed without orientation feedback (TBD)
- Feed mechanism jam → `ERROR` state

### Unsafe State Transitions

- State machine enforces valid transitions only (see [Machine State Machine](../embedded/MACHINE_STATE_MACHINE.md))
- Invalid transition attempts logged and rejected

## Safe States

| State          | Motors         | Actuators     | Safe?            |
| -------------- | -------------- | ------------- | ---------------- |
| OFF            | Off            | Unknown       | Yes (no power)   |
| INITIALIZING   | Off            | Unknown       | Yes              |
| HOMING         | Off            | Moving (slow) | Yes (controlled) |
| READY          | Off            | Held          | Yes              |
| EMERGENCY_STOP | Off (hardware) | Held          | Yes              |
| ERROR          | Off            | Held          | Yes              |
| STOPPING       | Ramping down   | Held          | Transitional     |

## What This Architecture Does NOT Guarantee

- Physical safety of bystanders (machine design responsibility)
- Structural integrity at maximum RPM (mechanical engineering responsibility)
- Ball trajectory accuracy (calibration responsibility)
- Protection against firmware bugs (requires testing and review)

## Related Documents

- [Machine State Machine](../embedded/MACHINE_STATE_MACHINE.md)
- [ESP32 Architecture](../embedded/ESP32_ARCHITECTURE.md)
- [Threat Model](./THREAT_MODEL.md)
- [Failure Modes](../architecture/FAILURE_MODES.md)
- [ADR-0007 Machine State Ownership](../decisions/ADR-0007-machine-state-ownership.md)
