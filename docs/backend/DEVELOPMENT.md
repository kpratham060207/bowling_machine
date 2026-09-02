# Backend Development

> **Phase:** 1A foundation — no API server, auth, or database features yet.

## Package

`apps/api` — Fastify backend (placeholder only).

## Prerequisites

- Node.js 20+
- pnpm 9+
- PostgreSQL via Docker Compose (for future phases)

See [Local Development](../deployment/LOCAL_DEVELOPMENT.md).

## Commands

From repository root:

```bash
# Placeholder dev entry (logs phase marker only — no HTTP server)
pnpm --filter @bowling-machine/api dev

# Typecheck this app
pnpm --filter @bowling-machine/api typecheck

# Build compiled output to apps/api/dist
pnpm --filter @bowling-machine/api build
```

## Workspace dependencies

| Package                          | Purpose                      |
| -------------------------------- | ---------------------------- |
| `@bowling-machine/api-contracts` | Shared schemas (Phase 1B+)   |
| `@bowling-machine/database`      | Drizzle access (Phase 1B+)   |
| `@bowling-machine/shared`        | Domain-independent utilities |

## Not implemented (Phase 1A)

- Fastify HTTP server
- WebSocket machine gateway
- Supabase authentication
- Delivery / session routes
- Calculation engine
- Database connections

See [Backend Architecture](./BACKEND_ARCHITECTURE.md) for the approved design.
