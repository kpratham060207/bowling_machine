# Database Design

> **Status:** Implemented (Phase 1C)
> **Last updated:** 2026-09-02
> **Package:** `packages/database` (Drizzle ORM)

## Overview

PostgreSQL is the primary data store, accessed via Drizzle ORM in `packages/database`. Schema, migrations, seed, and connection factory are implemented.

## Auth boundary

```
Supabase Auth (external)
    │  user UUID
    ▼
users (application identity + role)
    │  1:1
    ▼
profiles (display_name, batting_hand, bowling_hand, preferences, …)
```

- Passwords are **never** stored in PostgreSQL.
- `users.id` matches the Supabase Auth user UUID.
- `profiles.user_id` FK → `users.id`.

## ID strategy

- Primary keys: **UUID** (`gen_random_uuid()` default where applicable).
- Command IDs: UUID supplied by backend (matches `CommandId` in api-contracts).
- Seed data uses fixed UUIDs for reproducibility (`SEED_IDS` in seed script).

## Timestamp strategy

- All timestamps: **`TIMESTAMPTZ`** (UTC).
- Application writes ISO-8601 strings; PostgreSQL stores UTC.

## Tables (15)

| Table                      | Purpose                                                           |
| -------------------------- | ----------------------------------------------------------------- |
| `users`                    | Application identity + role (PLAYER/ADMIN)                        |
| `profiles`                 | Player profile (`batting_hand`, `bowling_hand` — no `handedness`) |
| `firmware_versions`        | Firmware release registry (no OTA in MVP)                         |
| `machines`                 | Machine registry (simulator/hardware, protocol version)           |
| `machine_access`           | Player ↔ machine access grants                                    |
| `machine_registrations`    | QR tokens + hashed connection secrets                             |
| `practice_sessions`        | Session lifecycle (not machine runtime state)                     |
| `deliveries`               | Requested + calculated + measured delivery data                   |
| `practice_plans`           | Saved reusable plans                                              |
| `practice_plan_deliveries` | Ordered plan delivery definitions                                 |
| `machine_commands`         | Full command history + JSONB payload snapshots                    |
| `telemetry_samples`        | Persisted telemetry (not every live packet)                       |
| `faults`                   | Structured fault history                                          |
| `calibration_profiles`     | Versioned calibration per machine                                 |
| `audit_logs`               | Admin/security audit trail                                        |

## Entity relationships

```
users ── profiles
  │
  ├── machine_access ── machines ── machine_registrations
  │                         │
  │                         ├── calibration_profiles
  │                         ├── firmware_versions (optional FK)
  │                         ├── telemetry_samples
  │                         ├── faults
  │                         └── machine_commands
  │
  ├── practice_sessions ── deliveries ── machine_commands (optional FK)
  │
  └── practice_plans ── practice_plan_deliveries
```

## Deliveries: requested vs calculated vs measured

| Layer          | Storage                                                                          |
| -------------- | -------------------------------------------------------------------------------- |
| **Requested**  | Columns: `target_x`, `target_y`, `desired_speed_kmh`, `ball_type`, timing fields |
| **Calculated** | JSONB: `calculated_parameters` (MachineDeliveryParameters shape)                 |
| **Measured**   | JSONB: `measured` (nullable until hardware sensing)                              |
| **Error**      | JSONB: `error` (fault snapshot on failure)                                       |

Original player request is **never overwritten** by calculated values.

## JSONB decisions

| Column                                       | Table                           | Reason                                  |
| -------------------------------------------- | ------------------------------- | --------------------------------------- |
| `preferences`, `practice_goals`              | `profiles`                      | Extensible player prefs                 |
| `config`                                     | `machines`, `practice_sessions` | Flexible non-relational settings        |
| `calculated_parameters`, `measured`, `error` | `deliveries`                    | Contract-shaped snapshots               |
| `payload`                                    | `machine_commands`              | Full domain command snapshot for audit  |
| `data`                                       | `calibration_profiles`          | Flexible calibration maps (physics TBD) |
| `actuator_*_positions`, `imu`                | `telemetry_samples`             | Variable-length / unresolved units      |
| `details`                                    | `audit_logs`                    | Event context                           |

## Command payload storage (Phase 1C decision)

- Queryable fields in columns (`command_type`, `status`, timestamps, FKs).
- Full protocol snapshot in `payload` JSONB.
- Nested protocol fields are **not** normalized into separate tables for MVP.

## Telemetry persistence scope

- **Persisted:** meaningful samples/events selected by gateway (state changes, delivery milestones, faults).
- **Transient:** high-frequency live WebSocket streaming (not every packet stored).

## Enums (PostgreSQL)

Aligned with `packages/api-contracts`: `user_role`, `hand_preference`, `ball_type`, `machine_registry_status`, `machine_kind`, `session_status`, `delivery_status`, `machine_command_type`, `machine_command_status`, `fault_severity`, `machine_fault_code`, `calibration_profile_status`, `firmware_release_status`.

## Indexes

| Table                   | Index                                            | Purpose             |
| ----------------------- | ------------------------------------------------ | ------------------- |
| `practice_sessions`     | `(user_id, started_at)`                          | Player history      |
| `deliveries`            | `(session_id, sequence_number)` UNIQUE           | Ordered deliveries  |
| `machine_commands`      | `(machine_id)`, `(issued_at)`                    | Command lookup      |
| `telemetry_samples`     | `(machine_id, recorded_at)`                      | Time-series queries |
| `faults`                | `(machine_id, occurred_at)`                      | Fault history       |
| `calibration_profiles`  | `(machine_id, calibration_type, version)` UNIQUE | Version lookup      |
| `machine_registrations` | `(qr_code_token)` UNIQUE                         | QR scan             |

## Constraints

- FK referential integrity on all relationships.
- Unique: `profiles.user_id`, `machines.serial_number`, delivery sequence per session.
- No database constraints for physical RPM/speed limits (machine/safety validation layers).

## Migrations

```
packages/database/drizzle/0000_*.sql
```

Commands:

```bash
pnpm db:up          # Start PostgreSQL (Docker)
pnpm db:migrate     # Apply migrations
pnpm db:seed        # Development seed data
pnpm db:reset       # Down + up + migrate + seed
pnpm db:generate    # Generate new migration after schema change
```

## Seed data (development only)

- Simulator machine `SIM-DEV-001`
- Placeholder calibration profile (no real physics)
- Dev user `dev-player@example.local` (no Supabase auth — local only)
- All seed records labeled `simulation: true` where applicable

## Access control and security boundary (Phase 1C review)

**PostgreSQL row-level security (RLS) is NOT implemented.** The database does not enforce player isolation at the SQL layer in MVP.

### What enforces access in MVP

| Layer                       | Responsibility                                                         |
| --------------------------- | ---------------------------------------------------------------------- |
| **Supabase Auth**           | Player login; JWT issuance; password handling (external to app DB)     |
| **Backend API (Phase 1D+)** | JWT verification; role checks; player-owned resource authorization     |
| **Database credentials**    | Backend-only connection; browser never connects directly to PostgreSQL |

### Player-owned data (private per user)

| Table                      | Ownership rule                                           |
| -------------------------- | -------------------------------------------------------- |
| `profiles`                 | Owned by `user_id` — players read/write own profile only |
| `practice_sessions`        | Owned by `user_id`                                       |
| `deliveries`               | Indirectly owned via `practice_sessions.user_id`         |
| `practice_plans`           | Owned by `user_id`                                       |
| `practice_plan_deliveries` | Indirectly owned via `practice_plans.user_id`            |
| `machine_access`           | Relationship rows scoped to `user_id`                    |

Backend MUST filter all queries by authenticated `user_id` for these tables.

### Machine / system data (not player-private)

| Table                   | Access pattern                                                        |
| ----------------------- | --------------------------------------------------------------------- |
| `machines`              | Registry metadata; players see connected machines; ADMIN manages      |
| `machine_registrations` | Infrastructure; ADMIN manages; backend lookup only                    |
| `machine_commands`      | System audit; scoped by session/machine context in backend            |
| `telemetry_samples`     | Machine-scoped; session context links to player during active session |
| `faults`                | Machine-scoped                                                        |
| `calibration_profiles`  | Per-machine; players read for connected machine; ADMIN writes         |
| `firmware_versions`     | System registry; ADMIN manages                                        |
| `audit_logs`            | ADMIN read; system write                                              |

### Admin-only operations (backend-enforced)

- Register/update machines
- Rotate QR registration tokens
- Upload/approve calibration profiles
- Change user roles
- View audit logs
- Mark machines MAINTENANCE/INACTIVE

### Why backend authorization is sufficient for MVP

1. **Single consumer** — only the backend connects to PostgreSQL; there is no direct browser or ESP32 DB access.
2. **MVP scope** — one backend service with centralized authorization middleware is simpler than dual enforcement (backend + RLS).
3. **Role model is simple** — PLAYER vs ADMIN only.
4. **Phase 1D implements auth** — authorization logic belongs in the backend layer being built next.

### Future RLS (when to add)

Consider PostgreSQL or Supabase RLS when:

- Multiple services connect to the database directly
- Supabase client reads PostgreSQL tables directly (bypassing backend)
- Defense-in-depth is required for compliance
- A data breach via misconfigured backend route must be contained at DB layer

**Candidate RLS policies (future, not implemented):**

- `profiles`, `practice_sessions`, `practice_plans` — `user_id = auth.uid()`
- `deliveries` — via join to session owner
- Admin bypass role for service-role operations

Do **not** claim RLS exists until policies are implemented and tested.

## machine_registrations (provisional model)

Decision: **keep table as provisional registration infrastructure** (Phase 1C review).

| Field                    | Purpose                                           | Provisional?                |
| ------------------------ | ------------------------------------------------- | --------------------------- |
| `qr_code_token`          | Public machine identifier encoded in QR URL       | Stable concept              |
| `connection_secret_hash` | Hashed peer credential for machine WebSocket auth | **Provisional** — see UD-21 |

**Critical separation:**

- QR code encodes **only** `qr_code_token` in the URL — never the connection secret.
- `connection_secret_hash` is stored hashed; plaintext secrets are never persisted.
- Machine peer authentication mechanism (header name, rotation, TTL) is **not finalized** — see [UD-21](../architecture/UNRESOLVED_DECISIONS.md#ud-21-machine-peer-authentication-semantics).

This table supports admin registration and backend lookup; it does not finalize production machine authentication.

## Known limitations

- Actuator position units unresolved in DB (UD-02) — numeric JSONB only.
- IMU orientation unit unresolved (UD-12a).
- Dev seed user is not linked to Supabase Auth (Phase 1D).
- **No RLS policies** — backend authorization only (see Access control section above).
- Machine peer authentication semantics provisional (UD-21).

## Related Documents

- [Player Account Architecture](../architecture/PLAYER_ACCOUNT_ARCHITECTURE.md)
- [Calibration System](../calibration/CALIBRATION_SYSTEM.md)
- [API Specification](../api/API_SPECIFICATION.md)
