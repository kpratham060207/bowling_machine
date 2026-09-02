# Player Account Architecture

> **Status:** Designed (not implemented)
> **Last updated:** 2026-09-02

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

1. Player submits email + password on `/register`
2. Supabase Auth creates auth user
3. Backend webhook or post-registration hook creates `users` row with role `PLAYER`
4. Backend creates empty `profiles` row
5. Player redirected to profile setup or machine connection

### Login

1. Player submits credentials on `/login`
2. Supabase Auth validates and returns JWT + refresh token
3. Frontend stores session via Supabase client SDK
4. All subsequent API calls include JWT in Authorization header

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

| Field        | Required | Notes                                                  |
| ------------ | -------- | ------------------------------------------------------ |
| display_name | Yes      | Shown in UI                                            |
| batting_hand | No       | `RIGHT`, `LEFT`, `AMBIDEXTROUS`, `UNSPECIFIED`         |
| bowling_hand | No       | `RIGHT`, `LEFT`, `AMBIDEXTROUS`, `UNSPECIFIED`         |
| skill_level  | No       | Self-assessment                                        |
| preferences  | No       | JSONB: default speed, favorite ball types, UI settings |

> **Phase 1C:** Database `profiles` table MUST use `batting_hand` and `bowling_hand` columns aligned with `PlayerSchema`. The earlier single `handedness` field is superseded — no alias.

Profile data is personal and not shared between users.

## Machine Connection Authorization

When a player scans a machine QR code:

1. QR token looked up in `machine_registrations`
2. Machine must be in `ACTIVE` status
3. Player must be authenticated (PLAYER or ADMIN)
4. No exclusive machine locking in MVP (multiple players may view status; only one active session at a time — see [Unresolved Decisions](../architecture/UNRESOLVED_DECISIONS.md))

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
