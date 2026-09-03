# Authentication & Authorization

> **Status:** Implemented (Phase 1D + Phase 1K — usernames & password login)
> **Last updated:** 2026-09-03

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

| Mechanism | Detail                                                                     |
| --------- | -------------------------------------------------------------------------- |
| Storage   | HTTP-only cookies via `@supabase/ssr`                                      |
| Not used  | localStorage for access tokens                                             |
| Refresh   | Next.js middleware refreshes session on each request                       |
| API calls | Browser sends `Authorization: Bearer <access_token>` to backend            |
| WebSocket | Session cookies (same-origin) or short-lived ticket — **never JWT in URL** |

Login and logout use the Supabase browser client. Session restoration happens automatically via cookie refresh in middleware.

## Sign-in methods

| Method              | Flow                                                                                                        |
| ------------------- | ----------------------------------------------------------------------------------------------------------- |
| Email + password    | `signInWithPassword` on `/login` → cookie session                                                           |
| Username + password | Frontend resolves username → email via `POST /api/v1/auth/lookup-identifier`, then `signInWithPassword`     |
| Google OAuth        | `signInWithOAuth({ provider: 'google' })` → Google → `/auth/callback` → PKCE code exchange → cookie session |

All methods produce the same Supabase session with the same application user UUID. The backend verifies JWTs identically — it does not distinguish login provider.

### Username login

1. Player enters username (no `@`) on `/login`
2. Browser calls `POST /api/v1/auth/lookup-identifier` with the username
3. Backend normalizes the username and looks up the associated email in `profiles`
4. Browser calls `signInWithPassword({ email, password })` using the resolved email
5. Normal cookie session established

The username is an **application-level alias** for the email. Supabase Auth remains the password authority. No new auth provider is added.

**Username rules (canonical):**

- 3–32 characters, trimmed before validation
- Allowed characters: `a–z`, `0–9`, `_`, `-`
- No whitespace
- Case-insensitive: stored and compared as lowercase
- Globally unique (enforced by `UNIQUE INDEX` on `profiles.normalized_username WHERE normalized_username IS NOT NULL`)

Existing accounts without a username still work; they are soft-prompted to claim one in Profile → Security.

### Application password for Google-first users

A player who originally signed in via Google has no password in Supabase Auth. To enable password login:

1. Player signs in with Google as usual
2. In **Profile → Security → Application password**, player sets a new password
3. Frontend calls `supabase.auth.updateUser({ password })` — Supabase stores the credential
4. Frontend calls `PUT /api/v1/profile` with `{ has_password_credential: true }` to flag the account
5. Player can now sign in with **email or username + application password** in addition to Google

**Important:** the application never asks for or stores the player's Google password. The application password is a separate credential managed by Supabase Auth only.

### Forgot password

Unauthenticated players can request a password reset email at `/forgot-password`:

1. Player enters their **email** address (username not accepted here to avoid enumeration risk)
2. Frontend calls `POST /api/v1/auth/forgot-password`
3. Backend calls `supabaseAdmin.auth.resetPasswordForEmail` — Supabase sends a reset link
4. The endpoint always returns a generic success message regardless of whether the email exists

`PASSWORD_RESET_REDIRECT_TO` in the API environment controls where Supabase redirects the player after they click the reset link.

### Google OAuth (PKCE)

1. Player clicks **Continue with Google** on `/login`
2. Browser redirects to Google consent (via Supabase)
3. Google redirects to Supabase, then to `{live origin}/auth/callback?code=…&next=…`
4. Route handler calls `exchangeCodeForSession(code)` — session stored in HTTP-only cookies
5. User redirected to the **same origin** that handled the callback, then to a safe internal `next` path (default `/app`)

`redirectTo` is built from **`window.location.origin` only** (never `NEXT_PUBLIC_APP_URL`). The `/auth/callback` route then redirects using **`request.url` origin only**. This keeps the PKCE verifier cookie on the same host:port as the callback. If Next.js is on `http://localhost:3004` because 3000 is busy, OAuth must return to `http://localhost:3004/auth/callback`, not `:3000`.

**Required dashboard setting:** every origin you use must be listed under Supabase → Authentication → URL Configuration → Redirect URLs (e.g. `http://localhost:3004/auth/callback`). If only `:3000` is allow-listed, Supabase may send users to the Site URL (`localhost:3000`) after Google Allow even when the app tab was on `:3004`.

**Redirect safety:** `next` must be a relative path starting with `/`. Absolute URLs and protocol-relative paths are rejected.

**Return path:** Visiting a protected route (e.g. `/app/practice`) while logged out redirects to `/login?next=/app/practice`. After Google or email login, the user returns to that path.

### Google provider setup (Supabase dashboard — not committed)

1. Supabase → **Authentication** → **Providers** → **Google** → Enable
2. Google Cloud Console → **APIs & Services** → **Credentials** → Create **OAuth 2.0 Client ID** (Web application)
3. Copy **Client ID** and **Client Secret** into Supabase Google provider settings
4. **Authorized JavaScript origins** (add each dev port you use):
   - `http://localhost:3000`
   - `http://localhost:3004` (or whichever port Next.js selects)
   - Set `NEXT_PUBLIC_APP_URL` in `.env` to match
5. **Authorized redirect URIs** — use your project's Supabase callback URL from the Supabase Google provider page, typically:
   - `https://<project-ref>.supabase.co/auth/v1/callback`
6. Supabase → **Authentication** → **URL Configuration**:
   - **Site URL**: match the origin you actually use in the browser (often `http://localhost:3004` when 3000 is taken)
   - **Redirect URLs** (add every origin you use):
     - `http://localhost:3000/auth/callback`
     - `http://localhost:3004/auth/callback`
     - `http://127.0.0.1:3004/auth/callback` if you open the app that way

If Google consent succeeds but the app never logs you in, the usual cause is `redirectTo` pointing at a different port than the tab you started from. Confirm the address bar origin matches a Redirect URL above.

Never commit Google Client Secret or Supabase service-role key.

## Browser WebSocket authentication (Phase 1E)

Browser real-time events use `/ws/browser`. **JWT query parameters are rejected** — they leak via server logs, proxies, and browser history.

### Primary: Supabase SSR session cookies

When the WebSocket upgrade request includes Supabase SSR auth cookies (same-origin deployment or credentialed cross-origin), the API reads the session via `@supabase/ssr` and verifies the access token with `SUPABASE_JWT_SECRET`.

This aligns with the existing HTTP-only cookie session model.

### Fallback: short-lived WebSocket ticket (cross-origin dev)

When cookies are not sent to the API host (e.g. web `localhost:3000`, API `localhost:4000`):

1. Browser obtains ticket via authenticated `POST /ws/browser/ticket` (Bearer from server-side session or REST client)
2. Browser connects to `/ws/browser` with **no auth in URL**
3. First message: `{ "type": "authenticate", "ticket": "<uuid>" }`
4. Ticket is single-use, 30s TTL, bound to user id

### Security rules

- Query-string tokens (`access_token`, `token`, `jwt`) are **rejected**
- Tokens are never logged
- Service role key is never used for browser WebSocket auth
- Events filtered by `machine_access` after authentication

## Registration lifecycle

1. Player fills in **Username**, **Email**, **Password**, and **Confirm Password** on `/register`
2. Client validates username format and password match before submitting
3. Frontend calls `POST /api/v1/auth/register` on the backend
4. Backend checks that the requested username is not already claimed (pre-check before auth creation)
5. Backend uses **service role** (server only) to create Supabase Auth user with `has_password_credential: true`
6. Backend creates `users` (role `PLAYER`) + `profiles` rows in PostgreSQL, including `username` and `normalized_username`
7. If profile provisioning fails, auth user is deleted (no orphaned identity)
8. Frontend signs in via Supabase to establish cookie session

Google registration via `/register` uses only the Google button and does not require a username upfront. After the first successful Google OAuth sign-in, the `/auth/callback` route checks whether the player has a username. If not, the player is redirected to `/app/profile?prompt=username` to claim one.

### Safety net

On any authenticated API request, if Supabase auth exists but application rows are missing, the backend provisions a minimal user + profile automatically.

### Missing profile on login

If a user can authenticate with Supabase but has no profile, the safety net creates one with a default display name derived from email or OAuth metadata (`full_name` / `name` on first provision only — existing display names are never overwritten on login).

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

| Variable                        | Scope       | Purpose                                           |
| ------------------------------- | ----------- | ------------------------------------------------- |
| `NEXT_PUBLIC_APP_URL`           | Browser     | Web app base URL (OAuth redirectTo)               |
| `NEXT_PUBLIC_SUPABASE_URL`      | Browser     | Supabase project URL                              |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser     | Public anon key                                   |
| `NEXT_PUBLIC_API_URL`           | Browser     | Backend API URL                                   |
| `SUPABASE_SERVICE_ROLE_KEY`     | Server only | Auth user provisioning                            |
| `SUPABASE_JWT_SECRET`           | Server only | Verify API Bearer tokens                          |
| `SUPABASE_ANON_KEY`             | Server only | Read SSR cookies for browser WS auth              |
| `SUPABASE_URL`                  | Server only | JWT issuer validation                             |
| `DATABASE_URL`                  | Server only | PostgreSQL connection                             |
| `PASSWORD_RESET_REDIRECT_TO`    | Server only | Optional URL Supabase sends player to after reset |

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

## Automated test authentication

Production verifies Supabase-issued JWTs via `SUPABASE_JWT_SECRET` (HS256), with JWKS
fallback only outside test mode.

Integration tests use `signTestAccessToken()` in `apps/api/src/test/test-helpers.ts`:

- Signs HS256 tokens with a fixed test secret (never committed as a real Supabase key)
- Uses the same issuer/audience shape as production
- Does not contact Supabase Auth or remote JWKS (`NODE_ENV=test` disables JWKS fallback)

This keeps authorization and IDOR behavior testable locally without a Supabase project.

## Related documents

- [Player Account Architecture](../architecture/PLAYER_ACCOUNT_ARCHITECTURE.md)
- [Database Design](../database/DATABASE_DESIGN.md)
- [API Specification](../api/API_SPECIFICATION.md)
- [Threat Model](./THREAT_MODEL.md)
- [ADR-0004 Authentication](../decisions/ADR-0004-authentication.md)
