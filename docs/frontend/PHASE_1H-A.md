# Phase 1H-A — Player Web Application Foundation

> **Status:** Implemented (Phase 1H-A)
> **Last updated:** 2026-09-02

## Overview

Phase 1H-A delivers the navigable player-facing web application that consumes Phase 1G backend APIs and WebSocket events. The interactive cricket pitch (Phase 1H-B) is intentionally deferred — a visible placeholder exists on the practice setup page.

## Route structure

| Route                               | Purpose                                                        |
| ----------------------------------- | -------------------------------------------------------------- |
| `/login`                            | Email/password sign-in (Supabase Auth)                         |
| `/register`                         | Account creation + auto sign-in                                |
| `/app`                              | Player dashboard                                               |
| `/app/practice`                     | Practice hub                                                   |
| `/app/practice/connect`             | Machine selection, QR connect, control, homing, session create |
| `/app/practice/setup?sessionId=`    | Practice setup shell (pitch placeholder)                       |
| `/app/practice/session/[sessionId]` | Live session execution view                                    |
| `/app/history`                      | Session list                                                   |
| `/app/history/[sessionId]`          | Session detail                                                 |
| `/app/profile`                      | Profile view/update                                            |

Legacy `/profile` redirects to `/app/profile`. Unauthenticated `/app/*` requests redirect to `/login?next=/app`.

## Architecture

```
UI pages (client/server components)
  ↓
useAuthenticatedServices / server fetch
  ↓
ApiClient (typed REST, Bearer token from Supabase session)
  ↓
Fastify API /api/v1 + /machines

Live updates:
BrowserWsClient → ticket auth → /ws/browser → WebSocketEvent handlers
REST remains source of truth for durable session/machine state.
```

## Key modules

| Module               | Path                                             |
| -------------------- | ------------------------------------------------ |
| API client           | `apps/web/src/lib/api/client.ts`                 |
| API errors           | `apps/web/src/lib/api/errors.ts`                 |
| WebSocket client     | `apps/web/src/lib/ws/browser-ws-client.ts`       |
| Practice context     | `apps/web/src/lib/practice/practice-context.tsx` |
| Machine presentation | `apps/web/src/lib/machine/presentation.ts`       |
| App shell            | `apps/web/src/components/app-shell.tsx`          |

## Authentication

- Supabase `@supabase/ssr` cookie sessions (Phase 1D model preserved)
- No tokens in localStorage or URL query strings
- WebSocket uses `POST /ws/browser/ticket` + first-message `{ type: 'authenticate', ticket }`

## Machine UX separation

The UI distinguishes three concepts:

1. **Machine state** — runtime enum (`READY`, `HOMING`, etc.)
2. **Connection state** — `DISCONNECTED` / `CONNECTING` / `CONNECTED` / `RECONNECTING`
3. **Control lock** — `AVAILABLE`, `ACQUIRING`, `CONTROLLED_BY_ME`, `CONTROLLED_BY_OTHER`, `EXPIRED`

## WebSocket reconnect

- Exponential backoff (max 8 attempts)
- UI banners for `reconnecting` and `disconnected`
- Manual retry button
- Session/machine state refreshed from REST after reconnect or live events

## Phase 1H-B deferrals

- Interactive pitch map / tap-to-target
- Speed slider and ball-type cards
- Delivery creation from setup UI (`POST .../deliveries`)
- Session start with configured deliveries

## Environment variables

See root `.env.example`:

- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Never expose service-role keys or JWT secrets to the browser.

## Testing

- Vitest unit tests under `apps/web/src/**/*.test.ts`
- Playwright: `tests/e2e/player-flow.spec.ts` (unauthenticated route coverage; full Supabase login requires credentials)
