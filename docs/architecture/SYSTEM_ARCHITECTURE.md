# System Architecture

> **Status:** Designed (not implemented)
> **Last updated:** 2026-09-02 (finalized pitch-selection pipeline)

## Purpose

This document describes the overall system architecture for the smart AI-enabled cricket bowling machine. It defines how software components interact, where authority resides, and how data flows from player intent to physical ball delivery.

## System Context

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           PLAYER (Mobile Browser)                       │
│                     Next.js Web App (apps/web)                          │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │ HTTPS / WSS
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                     Backend API (apps/api)                              │
│   ┌──────────────┐  ┌──────────────────┐  ┌─────────────────────────┐  │
│   │ Auth (via    │  │ Calculation      │  │ Machine Communication   │  │
│   │ Supabase)    │  │ Engine           │  │ Layer                   │  │
│   └──────────────┘  └──────────────────┘  └───────────┬─────────────┘  │
│                                                        │                │
│   ┌──────────────┐  ┌──────────────────┐              │                │
│   │ PostgreSQL   │  │ Practice Session │              │                │
│   │ (Drizzle)    │  │ Manager          │              │                │
│   └──────────────┘  └──────────────────┘              │                │
└────────────────────────────────────────────────────────┼────────────────┘
                                                         │ WebSocket / local protocol
                                                         ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                     ESP32 Firmware (firmware/esp32)                     │
│   ┌──────────────┐  ┌──────────────────┐  ┌─────────────────────────┐  │
│   │ State        │  │ Motor / Actuator │  │ Safety / Watchdog       │  │
│   │ Machine      │  │ Control          │  │                         │  │
│   └──────────────┘  └──────────────────┘  └─────────────────────────┘  │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │ GPIO / PWM / I2C / SPI
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          PHYSICAL MACHINE                               │
│  Launch motors │ Feed motor │ Actuators │ IMU │ Encoders │ E-Stop       │
└─────────────────────────────────────────────────────────────────────────┘
```

## Architectural Principles

### 1. Layered Authority

| Layer    | Responsibility                                           | Authority                             |
| -------- | -------------------------------------------------------- | ------------------------------------- |
| Browser  | User interface, user-level parameters                    | None over hardware                    |
| Backend  | Validation, calculation, session management, persistence | Business logic only                   |
| ESP32    | Real-time control, safety, state machine                 | **Final authority on machine safety** |
| Hardware | Physical actuation                                       | Subject to ESP32 control              |

### 2. Safety Independence

Machine safety MUST NOT depend on:

- Browser connectivity or correctness
- Backend availability
- Internet or cloud services
- Database state

The ESP32 enforces safety locally via watchdog, limit switches, RPM limits, stale-command rejection, and physical emergency stop.

### 3. Offline-First Operation

The machine MUST operate on local Wi-Fi without internet. Cloud services (auth sync, analytics upload) are optional enhancements, not prerequisites for throwing a ball.

### 4. Calibration-Driven Physics

Exact physical mappings (wheel RPM → ball speed, actuator position → trajectory) are **not yet known**. The calculation engine is designed as a replaceable, calibration-driven module. No physics constants are hard-coded in the frontend.

### 5. Modular Monolith

The backend starts as a single deployable service with clear internal module boundaries. Microservices are deferred until scale demands them.

## Core User Flow

```
QR Scan → Machine Identified → Connection Established → Machine Status Displayed
    → Player Opens Throw Ball UI (perspective pitch visualization)
    → Player Taps Landing Location on Pitch
    → Normalized UI Coordinate → Pitch Coordinate Mapper → target_x, target_y
    → Player Configures Speed, Type, Count, Timing; Confirms Target
    → Backend Validates Request
    → Trajectory Calculation (calibration-driven)
    → Machine Parameter Calculation (calibration-driven)
    → Safety Validation (backend + ESP32)
    → Command Sent to ESP32 → Execution → Telemetry → UI Progress
```

See [Pitch Visualization](../frontend/PITCH_VISUALIZATION.md), [QR Connection](./QR_CONNECTION.md), and [Practice Session Architecture](./PRACTICE_SESSION_ARCHITECTURE.md).

## Pitch Target Selection Pipeline

| Stage                            | Owner                      | Output                                          |
| -------------------------------- | -------------------------- | ----------------------------------------------- |
| 1. Player tap                    | Frontend                   | Pointer event on pitch visualization            |
| 2. Normalized UI coordinate      | Frontend                   | `ui_x`, `ui_y` (0.0–1.0, image-relative)        |
| 3. Pitch Coordinate Mapper       | `packages/shared`          | `target_x`, `target_y` (persisted pitch target) |
| 4. Trajectory calculation        | Backend calculation engine | Required trajectory (calibration)               |
| 5. Machine parameter calculation | Backend calculation engine | RPM, actuators, feeder timing (calibration)     |
| 6. Safety validation             | Backend + ESP32            | Validated command or rejection                  |
| 7. ESP32 command                 | ESP32 firmware             | Physical execution                              |

The frontend stops at stage 3. Stages 4–5 require experimental calibration and must not invent physical constants.

## Component Inventory

| Component       | Location                 | Purpose                                   |
| --------------- | ------------------------ | ----------------------------------------- |
| Web App         | `apps/web`               | Mobile-first player interface             |
| API Server      | `apps/api`               | REST + WebSocket backend                  |
| ESP32 Simulator | `apps/esp32-simulator`   | Development without hardware              |
| API Contracts   | `packages/api-contracts` | Shared types and validation schemas       |
| Shared          | `packages/shared`        | Pitch Coordinate Mapper, shared utilities |
| Database        | `packages/database`      | Drizzle schema and migrations             |
| UI              | `packages/ui`            | Shared React components                   |
| Config          | `packages/config`        | Shared tooling configuration              |
| Firmware        | `firmware/esp32`         | Machine controller firmware               |

## Data Flow: Delivery Request

```
User tap → target_x, target_y (normalized pitch coordinates) + speed + ball_type + timing
    │
    ▼
Backend Validation (Zod schema, role check, machine availability)
    │
    ▼
Trajectory Calculation (calibration: position_trajectory)
    │
    ▼
Machine Parameter Calculation (calibration: speed_rpm, actuator_position, feeder_timing)
    │
    ▼
Machine Command (wheel RPM, actuator positions, feeder timing)
    │
    ▼
ESP32 Command Validation (range checks, state check, TTL check)
    │
    ▼
ESP32 Execution (state machine transitions, hardware control)
    │
    ▼
Telemetry (state, progress, faults) → Backend → WebSocket → Browser
```

## Communication Protocols

| Path              | Protocol                           | Notes                                                              |
| ----------------- | ---------------------------------- | ------------------------------------------------------------------ |
| Browser ↔ Backend | HTTPS REST, WSS                    | Standard web protocols                                             |
| Backend ↔ ESP32   | WebSocket (primary), HTTP fallback | Local network; see [ESP32 Protocol](../protocol/ESP32_PROTOCOL.md) |
| ESP32 ↔ Hardware  | GPIO, PWM, I2C, SPI                | Real-time; firmware-only                                           |

## Roles

| Role       | Capabilities                                                                                                         |
| ---------- | -------------------------------------------------------------------------------------------------------------------- |
| **PLAYER** | Account, profile, machine connection, deliveries, sessions, history, analytics, manual controls, calibration, status |
| **ADMIN**  | System administration, user management, machine registration, global configuration                                   |

No other roles exist. See [Player Account Architecture](../architecture/PLAYER_ACCOUNT_ARCHITECTURE.md).

## Future AI Services

AI capabilities (ball tracking, form analysis, adaptive delivery) are planned as a separate Python service layer. They will consume telemetry and video data but will NOT control hardware directly. See [Future Expansion](../architecture/FUTURE_EXPANSION.md).

## Related Documents

- [Component Architecture](./COMPONENT_ARCHITECTURE.md)
- [Safety Architecture](../security/SAFETY_ARCHITECTURE.md)
- [Offline Architecture](./OFFLINE_ARCHITECTURE.md)
- [Repository Structure](./REPOSITORY_STRUCTURE.md)
- [MVP Definition](./MVP.md)
- [Unresolved Decisions](./UNRESOLVED_DECISIONS.md)
- [Pitch Visualization](../frontend/PITCH_VISUALIZATION.md)
