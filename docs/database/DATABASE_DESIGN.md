# Database Design

> **Status:** Designed (not implemented)
> **Last updated:** 2026-09-02

## Overview

PostgreSQL is the primary data store, accessed via Drizzle ORM in `packages/database`. This document defines the planned schema. No migrations exist yet.

## Design Principles

- Normalized UI coordinates stored as `DECIMAL(5,4)` when provided (optional, display replay)
- Pitch reference coordinates stored as `DECIMAL(5,4)` (0.0000–1.0000 range) as `target_x`, `target_y`
- Speeds stored in km/h as `DECIMAL(6,2)`
- Ball types stored as PostgreSQL enum (extensible via migration)
- Machine states stored as PostgreSQL enum
- Timestamps in UTC (`TIMESTAMPTZ`)
- Soft deletes where appropriate (profiles, machines)
- Audit trail for admin actions and safety events

## Entity Relationship Overview

```
users ────────── profiles
  │                  │
  │                  │
  ├── practice_sessions ──── deliveries
  │         │
  │         └── machines ──── calibration_data
  │                │
  │                └── machine_registrations
  │
  └── audit_logs
```

## Tables

### users

Managed primarily by Supabase Auth. Local table mirrors essential fields.

| Column     | Type                | Notes                         |
| ---------- | ------------------- | ----------------------------- |
| id         | UUID PK             | Matches Supabase Auth user ID |
| email      | VARCHAR(255) UNIQUE |                               |
| role       | user_role ENUM      | `PLAYER`, `ADMIN`             |
| created_at | TIMESTAMPTZ         |                               |
| updated_at | TIMESTAMPTZ         |                               |

### profiles

Player-specific profile data.

| Column       | Type            | Notes                      |
| ------------ | --------------- | -------------------------- |
| id           | UUID PK         |                            |
| user_id      | UUID FK → users | UNIQUE                     |
| display_name | VARCHAR(100)    |                            |
| handedness   | VARCHAR(10)     | `RIGHT`, `LEFT` (optional) |
| skill_level  | VARCHAR(20)     | Optional self-assessment   |
| preferences  | JSONB           | UI preferences, defaults   |
| created_at   | TIMESTAMPTZ     |                            |
| updated_at   | TIMESTAMPTZ     |                            |

### machines

Registered bowling machines.

| Column           | Type                | Notes                               |
| ---------------- | ------------------- | ----------------------------------- |
| id               | UUID PK             |                                     |
| name             | VARCHAR(100)        | Human-readable name                 |
| serial_number    | VARCHAR(50) UNIQUE  | Physical machine identifier         |
| status           | machine_status ENUM | `ACTIVE`, `INACTIVE`, `MAINTENANCE` |
| firmware_version | VARCHAR(20)         | Last known firmware version         |
| last_seen_at     | TIMESTAMPTZ         | Last telemetry timestamp            |
| config           | JSONB               | Machine-specific configuration      |
| created_at       | TIMESTAMPTZ         |                                     |
| updated_at       | TIMESTAMPTZ         |                                     |
| deleted_at       | TIMESTAMPTZ         | Soft delete                         |

### machine_registrations

Links machines to QR codes and network identity.

| Column            | Type               | Notes                          |
| ----------------- | ------------------ | ------------------------------ |
| id                | UUID PK            |                                |
| machine_id        | UUID FK → machines |                                |
| qr_code_token     | VARCHAR(64) UNIQUE | Token embedded in QR code      |
| connection_secret | VARCHAR(128)       | Hashed secret for ESP32 auth   |
| local_ip          | VARCHAR(45)        | Last known local IP (nullable) |
| created_at        | TIMESTAMPTZ        |                                |

### practice_sessions

A practice session groups multiple deliveries.

| Column                | Type                | Notes                                        |
| --------------------- | ------------------- | -------------------------------------------- |
| id                    | UUID PK             |                                              |
| user_id               | UUID FK → users     |                                              |
| machine_id            | UUID FK → machines  |                                              |
| status                | session_status ENUM | `ACTIVE`, `PAUSED`, `COMPLETED`, `CANCELLED` |
| started_at            | TIMESTAMPTZ         |                                              |
| ended_at              | TIMESTAMPTZ         | Nullable                                     |
| total_balls_planned   | INTEGER             |                                              |
| total_balls_delivered | INTEGER DEFAULT 0   |                                              |
| config                | JSONB               | Session-level settings                       |
| created_at            | TIMESTAMPTZ         |                                              |

### deliveries

Individual delivery records within a session.

| Column            | Type                        | Notes                                                                             |
| ----------------- | --------------------------- | --------------------------------------------------------------------------------- |
| id                | UUID PK                     |                                                                                   |
| session_id        | UUID FK → practice_sessions |                                                                                   |
| sequence_number   | INTEGER                     | Order within session                                                              |
| ui_x              | DECIMAL(5,4)                | Optional; normalized UI coordinate (perspective image space)                      |
| ui_y              | DECIMAL(5,4)                | Optional; normalized UI coordinate (perspective image space)                      |
| target_x          | DECIMAL(5,4)                | Normalized pitch target horizontal (0.0–1.0); interactive pitch coordinate system |
| target_y          | DECIMAL(5,4)                | Normalized pitch target length (0.0–1.0); interactive pitch coordinate system     |
| desired_speed_kmh | DECIMAL(6,2)                |                                                                                   |
| ball_type         | ball_type ENUM              |                                                                                   |
| status            | delivery_status ENUM        | `PENDING`, `EXECUTING`, `COMPLETED`, `FAILED`, `CANCELLED`                        |
| machine_params    | JSONB                       | Calculated machine parameters (audit)                                             |
| executed_at       | TIMESTAMPTZ                 | Nullable                                                                          |
| result            | JSONB                       | Telemetry snapshot at delivery                                                    |
| created_at        | TIMESTAMPTZ                 |                                                                                   |

### calibration_data

Per-machine calibration mappings used by the calculation engine.

| Column           | Type               | Notes                                    |
| ---------------- | ------------------ | ---------------------------------------- |
| id               | UUID PK            |                                          |
| machine_id       | UUID FK → machines |                                          |
| calibration_type | VARCHAR(50)        | e.g., `speed_rpm`, `position_trajectory` |
| data             | JSONB              | Calibration table/mapping data           |
| version          | INTEGER            | Incremented on update                    |
| created_by       | UUID FK → users    |                                          |
| created_at       | TIMESTAMPTZ        |                                          |
| notes            | TEXT               | Optional description                     |

### saved_practice_plans

Reusable delivery sequences saved by players.

| Column      | Type            | Notes                     |
| ----------- | --------------- | ------------------------- |
| id          | UUID PK         |                           |
| user_id     | UUID FK → users |                           |
| name        | VARCHAR(100)    |                           |
| description | TEXT            | Optional                  |
| deliveries  | JSONB           | Array of delivery configs |
| created_at  | TIMESTAMPTZ     |                           |
| updated_at  | TIMESTAMPTZ     |                           |

### audit_logs

Security and admin audit trail.

| Column        | Type            | Notes                                          |
| ------------- | --------------- | ---------------------------------------------- |
| id            | UUID PK         |                                                |
| user_id       | UUID FK → users | Nullable (system events)                       |
| action        | VARCHAR(100)    | e.g., `machine.register`, `calibration.update` |
| resource_type | VARCHAR(50)     |                                                |
| resource_id   | UUID            |                                                |
| details       | JSONB           |                                                |
| ip_address    | VARCHAR(45)     |                                                |
| created_at    | TIMESTAMPTZ     |                                                |

## Enums

### user_role

`PLAYER`, `ADMIN`

### ball_type

`FAST`, `MEDIUM`, `SLOW`, `BOUNCER`, `YORKER`, `FULL`, `INSWING`, `OUTSWING`, `LEG_SPIN`, `OFF_SPIN`

New values added via migration. Application code uses the enum from `packages/api-contracts`.

### machine_status

`ACTIVE`, `INACTIVE`, `MAINTENANCE`

### session_status

`ACTIVE`, `PAUSED`, `COMPLETED`, `CANCELLED`

### delivery_status

`PENDING`, `EXECUTING`, `COMPLETED`, `FAILED`, `CANCELLED`

## Indexes (Planned)

| Table                 | Index                          | Purpose                |
| --------------------- | ------------------------------ | ---------------------- |
| practice_sessions     | (user_id, started_at DESC)     | History queries        |
| deliveries            | (session_id, sequence_number)  | Session delivery order |
| calibration_data      | (machine_id, calibration_type) | Engine lookups         |
| machine_registrations | (qr_code_token)                | QR scan lookup         |
| audit_logs            | (created_at DESC)              | Audit queries          |

## Related Documents

- [Backend Architecture](../backend/BACKEND_ARCHITECTURE.md)
- [Player Account Architecture](../architecture/PLAYER_ACCOUNT_ARCHITECTURE.md)
- [Calibration System](../calibration/CALIBRATION_SYSTEM.md)
