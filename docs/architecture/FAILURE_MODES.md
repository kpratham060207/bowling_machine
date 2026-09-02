# Failure Modes

> **Status:** Designed (not implemented)
> **Last updated:** 2026-09-02

## Overview

Catalog of known failure modes, their effects, detection methods, and planned recovery actions. No failure modes have been validated through testing.

## Failure Mode Catalog

### FM-01: Backend Unavailable

| Attribute         | Detail                                                        |
| ----------------- | ------------------------------------------------------------- |
| **Cause**         | Server crash, network issue, deployment failure               |
| **Effect**        | Player cannot start new sessions; ESP32 loses command channel |
| **Detection**     | WebSocket disconnect, API health check failure                |
| **Recovery**      | Restart backend; ESP32 enters safe state on connection loss   |
| **Safety impact** | Low — ESP32 stops active operations without backend           |

### FM-02: ESP32 Crash / Hang

| Attribute         | Detail                                                |
| ----------------- | ----------------------------------------------------- |
| **Cause**         | Firmware bug, memory corruption, hardware fault       |
| **Effect**        | Machine unresponsive, motors may remain in last state |
| **Detection**     | Watchdog timer triggers hardware reset                |
| **Recovery**      | Automatic reboot → INITIALIZING → HOMING → READY      |
| **Safety impact** | Medium — watchdog reset returns to safe boot sequence |

### FM-03: Network Loss During Delivery

| Attribute         | Detail                                                                   |
| ----------------- | ------------------------------------------------------------------------ |
| **Cause**         | Wi-Fi dropout, router restart                                            |
| **Effect**        | Backend loses ESP32 telemetry; player UI shows stale status              |
| **Detection**     | WebSocket disconnect, heartbeat timeout (15s)                            |
| **Recovery**      | ESP32 completes current ball then stops; reconnects when network returns |
| **Safety impact** | Low — ESP32 handles autonomously                                         |

### FM-04: Physical Emergency Stop

| Attribute         | Detail                                       |
| ----------------- | -------------------------------------------- |
| **Cause**         | Player or bystander presses E-stop           |
| **Effect**        | All motor power cut immediately              |
| **Detection**     | GPIO interrupt on ESP32                      |
| **Recovery**      | Release E-stop, power cycle, homing required |
| **Safety impact** | None — this is a safety feature              |

### FM-05: Actuator Limit Switch Failure

| Attribute         | Detail                                                              |
| ----------------- | ------------------------------------------------------------------- |
| **Cause**         | Switch malfunction, wiring fault, mechanical obstruction            |
| **Effect**        | Actuator may over-travel                                            |
| **Detection**     | Expected limit switch signal not received during homing/positioning |
| **Recovery**      | Machine enters ERROR; manual inspection required                    |
| **Safety impact** | High — potential mechanical damage                                  |

### FM-06: Encoder Failure

| Attribute         | Detail                                                    |
| ----------------- | --------------------------------------------------------- |
| **Cause**         | Sensor failure, wiring fault, debris                      |
| **Effect**        | Wheel speed unknown; closed-loop control disabled         |
| **Detection**     | No encoder pulses despite motor drive                     |
| **Recovery**      | Stop affected wheel, enter ERROR state                    |
| **Safety impact** | Medium — speed control lost, RPM limit cannot be verified |

### FM-07: Power Interruption

| Attribute         | Detail                                            |
| ----------------- | ------------------------------------------------- |
| **Cause**         | Power outage, main switch off                     |
| **Effect**        | All systems stop immediately                      |
| **Detection**     | ESP32 boot on power restore                       |
| **Recovery**      | Boot → INITIALIZING → HOMING → READY              |
| **Safety impact** | Low — power loss is inherently safe (motors stop) |

### FM-08: Stale Command Execution

| Attribute         | Detail                                       |
| ----------------- | -------------------------------------------- |
| **Cause**         | Network delay, clock skew, queued commands   |
| **Effect**        | Outdated command executed with wrong context |
| **Detection**     | TTL check on ESP32                           |
| **Recovery**      | Command rejected, logged                     |
| **Safety impact** | Low — prevented by TTL enforcement           |

### FM-09: Uncalibrated Machine Operation

| Attribute         | Detail                                             |
| ----------------- | -------------------------------------------------- |
| **Cause**         | Machine deployed without calibration data          |
| **Effect**        | Calculation engine cannot produce valid parameters |
| **Detection**     | Engine validation fails, null parameters           |
| **Recovery**      | Block all deliveries until calibration complete    |
| **Safety impact** | Medium — prevents unpredictable behavior           |

### FM-10: Feed Mechanism Jam

| Attribute         | Detail                                         |
| ----------------- | ---------------------------------------------- |
| **Cause**         | Ball stuck, mechanical wear, foreign object    |
| **Effect**        | Ball not delivered, feed motor stalled         |
| **Detection**     | Feed timeout, motor stall detection (TBD)      |
| **Recovery**      | ERROR state, manual clearing required          |
| **Safety impact** | Low — no ball delivered, wheels can be stopped |

### FM-11: Supabase Auth Unavailable

| Attribute         | Detail                                                          |
| ----------------- | --------------------------------------------------------------- |
| **Cause**         | Supabase outage, internet loss                                  |
| **Effect**        | New logins fail; existing sessions may continue with cached JWT |
| **Detection**     | Auth API errors                                                 |
| **Recovery**      | Wait for Supabase recovery; cached JWTs work until expiry       |
| **Safety impact** | None — does not affect machine operation                        |

### FM-12: Database Corruption / Loss

| Attribute         | Detail                                             |
| ----------------- | -------------------------------------------------- |
| **Cause**         | Disk failure, migration error                      |
| **Effect**        | Session history lost; active operations unaffected |
| **Detection**     | Database connection errors, query failures         |
| **Recovery**      | Restore from backup (future backup strategy TBD)   |
| **Safety impact** | None — machine operation independent of database   |

## Risk Matrix

| Failure Mode            | Likelihood       | Impact | Priority |
| ----------------------- | ---------------- | ------ | -------- |
| FM-04 E-Stop            | Medium           | Safe   | Monitor  |
| FM-01 Backend down      | Medium           | Low    | Handle   |
| FM-03 Network loss      | High             | Low    | Handle   |
| FM-07 Power loss        | Low              | Low    | Handle   |
| FM-02 ESP32 crash       | Low              | Medium | Critical |
| FM-05 Limit switch fail | Low              | High   | Critical |
| FM-06 Encoder failure   | Medium           | Medium | Critical |
| FM-09 Uncalibrated      | High (initially) | Medium | Block    |
| FM-10 Feed jam          | Medium           | Low    | Handle   |

## Related Documents

- [Safety Architecture](../security/SAFETY_ARCHITECTURE.md)
- [Troubleshooting](./TROUBLESHOOTING.md)
- [Machine State Machine](../embedded/MACHINE_STATE_MACHINE.md)
