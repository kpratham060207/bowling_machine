# Player Account Architecture

> **Status:** Implemented (Phase 1D + Phase 1K — usernames, username login, application password)
> **Last updated:** 2026-09-03

## Overview

The system supports two roles: **PLAYER** and **ADMIN**. Authentication is handled by Supabase Auth. This document defines account lifecycle, authorization, and profile management.

## Roles

### PLAYER

The primary user role. Every registered user defaults to PLAYER.

| Capability                   | Description                                        |
| ---------------------------- | -------------------------------------------------- |
| Create account               | Self-registration via Supabase Auth                |
| Log in                       | Email/password (initial); OAuth may be added later |
| Manage profile               | Display name, preferences, optional batting info   |
| Connect to machine           | Scan QR code, establish session with a machine     |
| Configure deliveries         | Select pitch location, speed, type, count, timing  |
| Start/stop practice sessions | Control session lifecycle                          |
| Create saved practice plans  | Save and reuse delivery sequences                  |
| View practice history        | Personal delivery and session records              |
| View personal analytics      | Aggregated stats from own sessions                 |
| Manual controls              | User-level manual delivery (not hardware)          |
| Calibration tools            | Participate in calibration workflows               |
| View machine status          | Real-time status of connected machine              |

### ADMIN

System-level administrative role. Assigned manually (not self-service).

| Capability               | Description                                |
| ------------------------ | ------------------------------------------ |
| All PLAYER capabilities  | Admins can also use the machine as players |
| Register machines        | Add new machines to the system             |
| Manage users             | View users, assign/revoke ADMIN role       |
| Manage calibration data  | Upload, review, approve calibration        |
| View system audit logs   | Security and admin action history          |
| Machine maintenance mode | Mark machines as MAINTENANCE               |
| System configuration     | Global settings                            |

**Explicitly excluded roles:** Coach, Trainer, Operator, Organization, Team Manager. These require an ADR to introduce.

## Authentication Flow

```
┌──────────┐     ┌──────────────┐     ┌──────────┐
│  Browser  │────▶│ Supabase Auth│────▶│  JWT     │
│  (web)    │◀────│              │◀────│  issued  │
└──────────┘     └──────────────┘     └──────────┘
      │                                       │
      │  Authorization: Bearer <JWT>          │
      ▼                                       ▼
┌──────────┐                          ┌──────────┐
│  Backend  │◀── verify JWT ──────────│ Supabase │
│  (api)    │    extract user_id      │  (JWKS)  │
└──────────┘    lookup role in DB     └──────────┘
```

### Registration

1. Player fills in **Username**, **Email**, **Password**, and **Confirm Password** on `/register`
2. Frontend validates username format and password match client-side
3. Frontend calls backend `POST /api/v1/auth/register`
4. Backend pre-checks username availability, then creates Supabase Auth user (service role — server only)
5. Backend creates `users` row (`role=PLAYER`) and `profiles` row including `username`, `normalized_username`, and `has_password_credential=true`
6. If provisioning fails, auth user is rolled back
7. Frontend signs in via Supabase client; session stored in HTTP-only cookies

Google registration uses the Google button and does not require a username at sign-up. After the first Google OAuth sign-in, the player is redirected to `/app/profile?prompt=username` to claim a username.

### Login

1. Player enters **Email or Username** + password on `/login`
2. If the identifier contains `@`, it is treated as an email directly
3. Otherwise, frontend calls `POST /api/v1/auth/lookup-identifier` to resolve username → email
4. Frontend calls `supabase.auth.signInWithPassword({ email, password })`
5. Session stored in cookies via `@supabase/ssr` (not localStorage)
6. API calls include `Authorization: Bearer <access_token>`

### Session restoration

Next.js middleware refreshes Supabase session cookies on each request. Server Components read session via `@/lib/supabase/server`.

### Authorization

Every protected API endpoint:

1. Extracts JWT from Authorization header
2. Verifies signature against Supabase JWKS
3. Looks up user in local `users` table for role
4. Checks role against endpoint requirements

| Endpoint Pattern              | Required Role |
| ----------------------------- | ------------- |
| `/api/v1/profile/*`           | PLAYER        |
| `/api/v1/sessions/*`          | PLAYER        |
| `/api/v1/deliveries/*`        | PLAYER        |
| `/api/v1/machines/:id/status` | PLAYER        |
| `/api/v1/admin/*`             | ADMIN         |

## Profile Data

Stored in `profiles` table (see [Database Design](../database/DATABASE_DESIGN.md)).

| Field                    | Required   | Notes                                                                |
| ------------------------ | ---------- | -------------------------------------------------------------------- |
| display_name             | Yes        | Shown in UI                                                          |
| username                 | No (soft)  | Nullable; required for new registrations; existing users soft-prompted |
| normalized_username      | No (soft)  | Lowercase form; unique index (`WHERE NOT NULL`)                      |
| has_password_credential  | No         | Boolean; true once app password is set via Supabase Auth             |
| batting_hand             | No         | `RIGHT`, `LEFT`, `AMBIDEXTROUS`, `UNSPECIFIED`                       |
| bowling_hand             | No         | `RIGHT`, `LEFT`, `AMBIDEXTROUS`, `UNSPECIFIED`                       |
| skill_level              | No         | Self-assessment                                                      |
| preferences              | No         | JSONB: default speed, favorite ball types, UI settings               |

> **Phase 1C:** Database `profiles` table MUST use `batting_hand` and `bowling_hand` columns aligned with `PlayerSchema`. The earlier single `handedness` field is superseded — no alias.

### Username normalization

Usernames are stored and compared as lowercase. The `normalized_username` column holds the canonical form; `username` holds the user-visible form (also lowercase as of Phase 1K). Both are the same value after normalization. See `packages/api-contracts/src/player/username.ts` for the shared validation schema.

### Existing account migration (soft-prompt)

Existing accounts (`username IS NULL`) continue to work normally. They can only log in with their email address until they claim a username via **Profile → Security → Username**. No existing account is blocked or deleted.

Profile data is personal and not shared between users.

## Data ownership and access control

### Player-owned (private)

| Data        | Table(s)                                     | Backend rule                     |
| ----------- | -------------------------------------------- | -------------------------------- |
| Profile     | `profiles`                                   | Player reads/writes own row only |
| Sessions    | `practice_sessions`                          | Player sees own sessions only    |
| Deliveries  | `deliveries`                                 | Via session ownership            |
| Saved plans | `practice_plans`, `practice_plan_deliveries` | Player owns own plans            |

### Shared relationship data

| Data                 | Table               | Notes                                       |
| -------------------- | ------------------- | ------------------------------------------- |
| Machine access grant | `machine_access`    | Links player to machine; created on connect |
| Session on machine   | `practice_sessions` | Player-owned; references shared machine     |

### System / machine data (not player-private)

| Data             | Table(s)                            | Access                                              |
| ---------------- | ----------------------------------- | --------------------------------------------------- |
| Machine registry | `machines`, `machine_registrations` | Players view connected; ADMIN manages               |
| Telemetry        | `telemetry_samples`                 | Machine-scoped; associated with session when active |
| Faults           | `faults`                            | Machine-scoped                                      |
| Commands         | `machine_commands`                  | Audit trail; backend-scoped queries                 |
| Calibration      | `calibration_profiles`              | Per-machine; ADMIN writes                           |
| Firmware         | `firmware_versions`                 | System registry                                     |
| Audit            | `audit_logs`                        | ADMIN read                                          |

### Authorization boundary (MVP)

- **Supabase Auth** handles login credentials (external).
- **Backend** enforces JWT validation, role checks, and player data isolation (**Implemented Phase 1D**).
- **PostgreSQL RLS is NOT implemented** — defense is at the backend API layer only.

See [Database Design](../database/DATABASE_DESIGN.md#access-control-and-security-boundary-phase-1c-review) for full detail and future RLS guidance.

## Machine Connection Authorization

When a player scans a machine QR code:

1. QR token looked up in `machine_registrations` (token only — secret not in QR)
2. Machine must be in `ACTIVE` registry status
3. Player must be authenticated (PLAYER or ADMIN)
4. Backend creates/verifies `machine_access` grant
5. No exclusive machine locking in MVP for status view; session locking separate (UD-05)

## Data Privacy

- Players see only their own sessions, deliveries, and analytics
- Admins can view aggregate system data but player personal data access should be logged in audit_logs
- No player data is shared with other players
- Machine telemetry during a session is associated with the session owner

## Security Considerations

- Passwords managed entirely by Supabase Auth (never stored locally)
- JWT expiry enforced; refresh token rotation via Supabase client
- Role stored in local database (not JWT claims) for immediate revocation
- Admin role assignment requires existing ADMIN action (logged in audit_logs)
- Rate limiting on auth endpoints (future implementation)

## Related Documents

- [Database Design](../database/DATABASE_DESIGN.md)
- [API Specification](../api/API_SPECIFICATION.md)
- [Threat Model](../security/THREAT_MODEL.md)
- [ADR-0004 Authentication](../decisions/ADR-0004-authentication.md)
