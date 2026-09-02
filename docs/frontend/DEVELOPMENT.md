# Frontend Development

> **Phase:** 1A foundation — no Throw Ball UI, auth, or API client yet.

## Package

`apps/web` — Next.js App Router (placeholder home page only).

## Prerequisites

- Node.js 20+
- pnpm 9+

See [Local Development](../deployment/LOCAL_DEVELOPMENT.md).

## Commands

From repository root:

```bash
# Next.js dev server on http://localhost:3000
pnpm --filter @bowling-machine/web dev

# Production build
pnpm --filter @bowling-machine/web build

# Typecheck
pnpm --filter @bowling-machine/web typecheck
```

## Workspace dependencies

| Package                          | Purpose                                                 |
| -------------------------------- | ------------------------------------------------------- |
| `@bowling-machine/ui`            | Shared React components (Phase 1B+)                     |
| `@bowling-machine/api-contracts` | Shared types/schemas                                    |
| `@bowling-machine/shared`        | Utilities including Pitch Coordinate Mapper (Phase 1B+) |

## Not implemented (Phase 1A)

- Supabase authentication pages
- QR machine connection
- Pitch visualization / PitchMapSelector
- Delivery configurator
- WebSocket client
- TanStack Query / React Hook Form integration

The home page explicitly states Phase 1A placeholder status.

See [Frontend Architecture](./FRONTEND_ARCHITECTURE.md) and [Pitch Visualization](./PITCH_VISUALIZATION.md).
