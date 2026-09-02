# Backend Development

> **Phase:** 1D — Fastify API with Supabase Auth, profile routes, and authorization middleware.

## Package

`apps/api` — Fastify backend.

## Prerequisites

- Node.js 20+
- pnpm 9+
- PostgreSQL via Docker Compose
- Supabase project (for local auth — see [Authentication](../security/AUTHENTICATION.md))

See [Local Development](../deployment/LOCAL_DEVELOPMENT.md).

## Commands

From repository root:

```bash
# Start API server (requires .env with Supabase + DATABASE_URL)
pnpm --filter @bowling-machine/api dev

# Typecheck this app
pnpm --filter @bowling-machine/api typecheck

# Build compiled output to apps/api/dist
pnpm --filter @bowling-machine/api build

# Run API auth integration tests (requires PostgreSQL)
pnpm vitest run apps/api/src/auth.integration.test.ts
```

## Workspace dependencies

| Package                          | Purpose                      |
| -------------------------------- | ---------------------------- |
| `@bowling-machine/api-contracts` | Shared Zod schemas           |
| `@bowling-machine/database`      | Drizzle ORM access           |
| `@bowling-machine/shared`        | Domain-independent utilities |

## Fastify authorization hooks (important)

Phase 1D discovered a Fastify lifecycle requirement for **nested (encapsulated) plugins**.

When registering `onRequest` hooks on child plugins (e.g. player/admin route scopes
inside a protected API plugin), hooks **must signal completion** to Fastify. Otherwise
authenticated requests hang indefinitely in `app.inject()` and integration tests.

| Pattern                                                                   | Safe for nested plugins?                        |
| ------------------------------------------------------------------------- | ----------------------------------------------- |
| Sync hook: `(request) => { ... }`                                         | **No** — causes hang after parent auth succeeds |
| Async hook: `async (request) => { ... }`                                  | Yes                                             |
| Promise-returning hook: `(request) => { ...; return Promise.resolve(); }` | Yes (approved pattern in `authorization.ts`)    |

**Approved pattern** for authorization hook adapters:

```typescript
export function requirePlayerHook(request: FastifyRequest): Promise<void> {
  requirePlayer(request);
  return Promise.resolve();
}
```

Also required in `buildApiServer()`:

- `await app.register(...)` for nested plugins
- `await app.ready()` before handling requests
- `await sql.end()` in the `onClose` hook

Do not add new sync `onRequest` hooks on encapsulated child plugins without returning
a Promise or using `async`.

See `apps/api/src/auth/authorization.ts` and `apps/api/src/server.ts`.

## Implemented (Phase 1D)

- Fastify HTTP server with health, registration, profile, and admin stub routes
- Supabase JWT verification middleware
- Centralized PLAYER / ADMIN authorization helpers
- Player data ownership helpers
- Audit logging for security events

## Not implemented

- WebSocket machine gateway
- Delivery / session routes
- Calculation engine

See [Backend Architecture](./BACKEND_ARCHITECTURE.md) for the approved design.
