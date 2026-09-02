# Backend Architecture

> **Status:** Designed (not implemented)
> **Last updated:** 2026-09-02

## Overview

The backend is a modular monolith built with Fastify and TypeScript. It serves as the intermediary between the web frontend and the ESP32 machine controller, handling validation, calculation, session management, and machine communication.

## Technology Stack

| Technology     | Purpose                                                     |
| -------------- | ----------------------------------------------------------- |
| Node.js        | Runtime                                                     |
| Fastify        | HTTP server framework                                       |
| TypeScript     | Type safety                                                 |
| Zod            | Request/response validation                                 |
| WebSocket (ws) | Real-time communication (browser + ESP32)                   |
| Drizzle ORM    | Database access (via `packages/database`)                   |
| Supabase Auth  | JWT verification (not hosting database auth tables locally) |

## Module Architecture

```
apps/api/src/
├── index.ts                 # Server bootstrap
├── plugins/
│   ├── auth.ts              # JWT verification middleware
│   ├── cors.ts              # CORS configuration
│   └── websocket.ts         # WebSocket plugin setup
├── routes/
│   ├── health.ts            # Health check
│   ├── auth.ts              # Auth-related endpoints
│   ├── machines.ts          # Machine CRUD and status
│   ├── deliveries.ts        # Delivery request endpoints
│   ├── sessions.ts          # Practice session endpoints
│   ├── profiles.ts          # Player profile endpoints
│   ├── history.ts           # Practice history queries
│   ├── calibration.ts       # Calibration data endpoints
│   └── admin.ts             # Admin endpoints
├── ws/
│   ├── browser-handler.ts   # WebSocket for browser clients
│   └── machine-handler.ts   # WebSocket for ESP32 connections
└── modules/
    ├── auth/                # JWT verification, role resolution
    ├── delivery/            # Delivery request processing
    ├── calculation/         # User params → machine params
    ├── session/             # Session lifecycle management
    ├── machine/             # Machine registry, connection tracking
    ├── telemetry/           # Status ingestion and relay
    └── admin/               # Admin operations
```

## Request Processing Pipeline

```
Incoming Request
    │
    ▼
Authentication (JWT verification via Supabase)
    │
    ▼
Authorization (role check: PLAYER or ADMIN)
    │
    ▼
Validation (Zod schema from packages/api-contracts)
    │
    ▼
Business Logic (module handler)
    │
    ▼
Response (validated output schema)
```

## Calculation Engine Module

The calculation engine is a **replaceable module** within the backend.

```
User Delivery Request (pitch reference coordinates — target_x, target_y already transformed)
    │
    ▼
CalculationEngine.calculate(userRequest, calibrationData)
    │
    ├── Lookup calibration tables for this machine
    ├── Map pitch reference coordinates → required trajectory
    ├── Map speed + ball type → wheel RPM targets
    ├── Map trajectory → actuator positions
    ├── Compute feeder timing
    │
    ▼
Machine Command (validated machine-level parameters)
```

**Important constraints:**

- Inputs are pitch reference coordinates — NOT normalized UI coordinates from the perspective image
- The backend does NOT perform UI/perspective coordinate transformation (see [Pitch Visualization](../frontend/PITCH_VISUALIZATION.md))
- No physics constants are hard-coded; all mappings come from calibration data
- The engine interface is defined so implementations can be swapped
- Initial implementation may use placeholder/linear mappings until calibration data exists
- See [Calculation Engine](../calibration/CALCULATION_ENGINE.md)
- See [ADR-0010 Pitch Coordinate Layers](../decisions/ADR-0010-pitch-coordinate-layers.md)

## Machine Communication Layer

The machine gateway maintains persistent WebSocket connections to ESP32 instances.

```
┌─────────────────────────────────────────────┐
│              Machine Gateway                 │
│                                              │
│  ┌─────────────┐    ┌─────────────────────┐ │
│  │ Connection   │    │ Command Queue       │ │
│  │ Manager      │    │ (TTL-enforced)      │ │
│  │ (per machine)│    │                     │ │
│  └──────┬──────┘    └──────────┬──────────┘ │
│         │                      │             │
│  ┌──────▼──────────────────────▼──────────┐ │
│  │         Protocol Codec                  │ │
│  │  (packages/api-contracts schemas)       │ │
│  └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
         │                        ▲
         ▼                        │
    ESP32 (WebSocket)       Telemetry Events
```

Responsibilities:

- Track connected machines (online/offline)
- Queue and send validated commands with TTL
- Receive and relay telemetry to connected browser clients
- Handle reconnection and stale connection cleanup

## WebSocket Architecture

Two WebSocket namespaces:

| Namespace     | Clients           | Purpose                                  |
| ------------- | ----------------- | ---------------------------------------- |
| `/ws/browser` | Web app instances | Machine status, session progress, events |
| `/ws/machine` | ESP32 instances   | Commands, telemetry, heartbeat           |

Browser clients subscribe to events for a specific machine. ESP32 clients authenticate with a machine-specific secret.

See [WebSocket Events](../protocol/WEBSOCKET_EVENTS.md) and [ESP32 Protocol](../protocol/ESP32_PROTOCOL.md).

## Error Handling

| Error Type          | HTTP Status | Response                         |
| ------------------- | ----------- | -------------------------------- |
| Validation failure  | 400         | Zod error details                |
| Unauthorized        | 401         | Auth required                    |
| Forbidden           | 403         | Insufficient role                |
| Machine unavailable | 409         | Machine busy or offline          |
| Not found           | 404         | Resource not found               |
| Internal error      | 500         | Generic message (details logged) |

## Database Access

All database operations go through Drizzle ORM via `packages/database`. The backend does NOT use raw SQL in route handlers.

Key tables (see [Database Design](../database/DATABASE_DESIGN.md)):

- `users`, `profiles`
- `machines`, `machine_registrations`
- `practice_sessions`, `deliveries`
- `calibration_data`
- `audit_logs`

## Deployment Model

Initially: single Node.js process on developer Mac or a small VPS.

```
┌──────────────────────────────┐
│  Mac / Small VPS             │
│  ┌──────────┐ ┌───────────┐ │
│  │ Fastify  │ │ PostgreSQL│ │
│  │ (api)    │ │           │ │
│  └──────────┘ └───────────┘ │
└──────────────────────────────┘
         ▲
         │ Local Wi-Fi
         ▼
   ESP32 + Player Phone
```

No Kubernetes, no microservices, no Redis (unless later justified by ADR).

## Related Documents

- [System Architecture](../architecture/SYSTEM_ARCHITECTURE.md)
- [API Specification](../api/API_SPECIFICATION.md)
- [Calculation Engine](../calibration/CALCULATION_ENGINE.md)
- [Database Design](../database/DATABASE_DESIGN.md)
- [Deployment](../deployment/DEPLOYMENT.md)
