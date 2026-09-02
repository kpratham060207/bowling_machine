# Component Architecture

> **Status:** Designed (not implemented)
> **Last updated:** 2026-09-02

## Overview

This document maps each software component to its responsibilities, interfaces, and dependencies. Components are organized by layer.

## Component Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        PRESENTATION LAYER                       │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ apps/web (Next.js)                                        │  │
│  │  ├── pages/routes                                         │  │
│  │  ├── components/ (packages/ui)                            │  │
│  │  ├── hooks/ (TanStack Query)                              │  │
│  │  ├── forms/ (React Hook Form + Zod)                       │  │
│  │  └── lib/ (API client, WebSocket client)                  │  │
│  └───────────────────────────────────────────────────────────┘  │
└───────────────────────────────┬─────────────────────────────────┘
                                │
┌───────────────────────────────▼─────────────────────────────────┐
│                        APPLICATION LAYER                        │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ apps/api (Fastify)                                        │  │
│  │  ├── routes/          REST endpoints                      │  │
│  │  ├── ws/              WebSocket handlers                  │  │
│  │  ├── modules/                                             │  │
│  │  │   ├── auth/        Supabase JWT verification           │  │
│  │  │   ├── delivery/    User request → machine command      │  │
│  │  │   ├── calculation/ Calibration-driven engine           │  │
│  │  │   ├── session/     Practice session lifecycle          │  │
│  │  │   ├── machine/     Machine registry & connection       │  │
│  │  │   ├── telemetry/   Status ingestion & relay             │  │
│  │  │   └── admin/       Admin operations                    │  │
│  │  └── plugins/         Fastify plugins (CORS, auth, etc.)  │  │
│  └───────────────────────────────────────────────────────────┘  │
└───────────────────────────────┬─────────────────────────────────┘
                                │
┌───────────────────────────────▼─────────────────────────────────┐
│                        SHARED PACKAGES                          │
│  ┌─────────────┐ ┌──────────┐ ┌──────────┐ ┌───────────────┐  │
│  │ api-contracts│ │ shared  │ │ database │ │ ui            │  │
│  │ (Zod schemas)│ │ (utils) │ │ (Drizzle)│ │ (shadcn/ui)   │  │
│  └─────────────┘ └──────────┘ └──────────┘ └───────────────┘  │
└───────────────────────────────┬─────────────────────────────────┘
                                │
┌───────────────────────────────▼─────────────────────────────────┐
│                     MACHINE COMMUNICATION                       │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ Machine Gateway (within apps/api)                         │  │
│  │  ├── Connection manager (per-machine WebSocket)           │  │
│  │  ├── Command queue (validated, TTL-enforced)              │  │
│  │  ├── Telemetry relay (ESP32 → backend → browser)          │  │
│  │  └── Protocol codec (packages/api-contracts)              │  │
│  └───────────────────────────────────────────────────────────┘  │
└───────────────────────────────┬─────────────────────────────────┘
                                │
┌───────────────────────────────▼─────────────────────────────────┐
│                        EMBEDDED LAYER                           │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ firmware/esp32 (ESP-IDF)                                  │  │
│  │  ├── main/           Entry point, task creation           │  │
│  │  ├── state/          Machine state machine                │  │
│  │  ├── motor/          Launch wheel & feed motor control    │  │
│  │  ├── actuator/       Lead-screw positioning               │  │
│  │  ├── sensor/         IMU, encoders, limit switches        │  │
│  │  ├── safety/         Watchdog, E-stop, RPM limits         │  │
│  │  ├── comm/           WebSocket client to backend          │  │
│  │  └── config/         Calibration data (NVS/flash)         │  │
│  └───────────────────────────────────────────────────────────┘  │
└───────────────────────────────┬─────────────────────────────────┘
                                │
┌───────────────────────────────▼─────────────────────────────────┐
│                     DEVELOPMENT TOOLS                           │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ apps/esp32-simulator                                      │  │
│  │  Simulates ESP32 protocol responses for backend/frontend  │  │
│  │  development without physical hardware.                   │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Component Responsibilities

### apps/web

| Module                | Responsibility                                                                      |
| --------------------- | ----------------------------------------------------------------------------------- |
| QR Scanner Page       | Scan machine QR, initiate connection                                                |
| Machine Status        | Display real-time machine state via WebSocket                                       |
| Delivery Configurator | Perspective pitch image UI, tap-to-select target, speed/type/count/timing selectors |
| Practice Session      | Session lifecycle UI (start, pause, stop, progress)                                 |
| Profile               | Player profile management                                                           |
| History & Analytics   | Personal practice data visualization                                                |
| Calibration UI        | Calibration workflow interface (admin/player)                                       |
| Manual Controls       | User-level manual delivery controls (not GPIO)                                      |

**Does NOT:** Send motor commands, store machine parameters, enforce safety.

### apps/api

| Module             | Responsibility                                                  |
| ------------------ | --------------------------------------------------------------- |
| Auth               | Verify Supabase JWT, resolve PLAYER/ADMIN role                  |
| Delivery           | Accept user-level requests, invoke calculation engine           |
| Calculation Engine | Map user parameters → machine parameters using calibration data |
| Session            | Manage practice session state in PostgreSQL                     |
| Machine Gateway    | Maintain WebSocket connections to ESP32 instances               |
| Telemetry          | Ingest and relay machine status/events                          |
| Admin              | Machine registration, user management, system config            |

**Does NOT:** Control GPIO, enforce hardware safety (delegates to ESP32).

### packages/api-contracts

Shared Zod schemas and TypeScript types for:

- User delivery requests
- Machine commands
- WebSocket event payloads
- API request/response shapes
- Ball type enum
- Machine state enum

Consumed by both `apps/web` and `apps/api` to ensure contract consistency.

### packages/database

Drizzle ORM schema for:

- Users and profiles
- Machines and registrations
- Practice sessions and deliveries
- Calibration data
- Audit logs

### firmware/esp32

See [ESP32 Architecture](../embedded/ESP32_ARCHITECTURE.md).

### apps/esp32-simulator

Simulates an ESP32 machine controller:

- Responds to WebSocket commands per [ESP32 Protocol](../protocol/ESP32_PROTOCOL.md)
- Generates synthetic telemetry
- Supports state machine transitions
- Enables full-stack development without hardware

## Inter-Component Interfaces

| From      | To       | Interface    | Format                                                                        |
| --------- | -------- | ------------ | ----------------------------------------------------------------------------- |
| web       | api      | REST API     | JSON over HTTPS                                                               |
| web       | api      | WebSocket    | JSON events (see [WebSocket Events](../protocol/WEBSOCKET_EVENTS.md))         |
| api       | esp32    | WebSocket    | JSON commands/telemetry (see [ESP32 Protocol](../protocol/ESP32_PROTOCOL.md)) |
| api       | database | Drizzle ORM  | SQL via PostgreSQL                                                            |
| api       | supabase | HTTP         | JWT verification                                                              |
| esp32     | hardware | GPIO/PWM/I2C | Binary signals                                                                |
| simulator | api      | WebSocket    | Same as ESP32 protocol                                                        |

## Dependency Rules

1. `packages/*` MUST NOT depend on `apps/*`.
2. `apps/web` MUST NOT depend on `firmware/*`.
3. `apps/web` MUST NOT import database or Drizzle directly.
4. `firmware/*` MUST NOT depend on any Node.js package.
5. Shared types flow through `packages/api-contracts`.
6. All external input validated at the receiving boundary (Zod in Node, custom validation in firmware).

## Related Documents

- [System Architecture](./SYSTEM_ARCHITECTURE.md)
- [Frontend Architecture](../frontend/FRONTEND_ARCHITECTURE.md)
- [Backend Architecture](../backend/BACKEND_ARCHITECTURE.md)
- [ESP32 Architecture](../embedded/ESP32_ARCHITECTURE.md)
