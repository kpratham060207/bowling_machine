# Authentication & Authorization

> **Status:** Implemented (Phase 1D)
> **Last updated:** 2026-09-02

## Overview

Player authentication uses **Supabase Auth** for credentials and JWT issuance. The **Fastify backend** verifies tokens and enforces authorization. Application player data lives in PostgreSQL (`users`, `profiles`).

**PostgreSQL RLS is NOT implemented** — the MVP security boundary is:

```
Browser → Supabase Auth (login) → Backend JWT verification + role/ownership checks → PostgreSQL
```

## Identity model

```
Supabase Auth User (UUID)
        ↓ same UUID
application users row (role: PLAYER | ADMIN)
        ↓ 1:1
profiles row (display_name, batting_hand, …)
```

The Supabase Auth UUID **is** the application user ID. No second player UUID is created.

## Session handling (frontend)

| Mechanism | Detail                                                          |
| --------- | --------------------------------------------------------------- |
| Storage   | HTTP-only cookies via `@supabase/ssr`                           |
| Not used  | localStorage for access tokens                                  |
| Refresh   | Next.js middleware refreshes session on each request            |
| API calls | Browser sends `Authorization: Bearer <access_token>` to backend |

Login and logout use the Supabase browser client. Session restoration happens automatically via cookie refresh in middleware.

## Registration lifecycle

1. Player submits registration on `/register`
2. Frontend calls `POST /api/v1/auth/register` on the backend
3. Backend uses **service role** (server only) to create Supabase Auth user
4. Backend creates `users` (role `PLAYER`) + `profiles` rows in PostgreSQL
5. If profile provisioning fails, auth user is deleted (no orphaned identity)
6. Frontend signs in via Supabase to establish cookie session

### Safety net

On any authenticated API request, if Supabase auth exists but application rows are missing, the backend provisions a minimal user + profile automatically.

### Missing profile on login

If a user can authenticate with Supabase but has no profile, the safety net creates one with a default display name derived from email.

## Authorization (backend)

Centralized helpers — route handlers must not ad-hoc check roles:

| Helper                    | Purpose                             |
| ------------------------- | ----------------------------------- |
| `requireAuthentication()` | Valid JWT + application user loaded |
| `requirePlayer()`         | PLAYER or ADMIN                     |
| `requireAdmin()`          | ADMIN only                          |

Role is loaded from PostgreSQL `users.role` — **never** from JWT claims or request body.

### Player data isolation

All player-owned queries filter by `authenticatedUserId` from the JWT. Client-supplied `user_id`, `player_id`, or `role` fields are rejected.

Ownership helpers (for future session/delivery/plan routes):

- `assertSessionOwnership`
- `assertDeliveryOwnership`
- `assertPlanOwnership`

## Environment variables

See [.env.example](../../.env.example).

| Variable                        | Scope       | Purpose                  |
| ------------------------------- | ----------- | ------------------------ |
| `NEXT_PUBLIC_SUPABASE_URL`      | Browser     | Supabase project URL     |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser     | Public anon key          |
| `NEXT_PUBLIC_API_URL`           | Browser     | Backend API URL          |
| `SUPABASE_SERVICE_ROLE_KEY`     | Server only | Auth user provisioning   |
| `SUPABASE_JWT_SECRET`           | Server only | Verify API Bearer tokens |
| `SUPABASE_URL`                  | Server only | JWT issuer validation    |
| `DATABASE_URL`                  | Server only | PostgreSQL connection    |

## Supabase development setup

1. Create a project at [supabase.com](https://supabase.com)
2. Copy **Project URL** → `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_URL`
3. Copy **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Copy **service_role** key → `SUPABASE_SERVICE_ROLE_KEY` (server only)
5. Copy **JWT Secret** → `SUPABASE_JWT_SECRET` (Project Settings → API)
6. Enable Email provider under Authentication → Providers
7. For local dev, disable email confirmation or use `email_confirm: true` via backend registration

Never commit real keys. Never expose service role or JWT secret to the frontend.

## Audit logging

Security events written to `audit_logs`:

- `player.registered`
- `profile.updated`
- Authorization failures (future routes)

Tokens, passwords, and secrets are never logged.

## Related documents

- [Player Account Architecture](../architecture/PLAYER_ACCOUNT_ARCHITECTURE.md)
- [Database Design](../database/DATABASE_DESIGN.md)
- [API Specification](../api/API_SPECIFICATION.md)
- [Threat Model](./THREAT_MODEL.md)
- [ADR-0004 Authentication](../decisions/ADR-0004-authentication.md)
