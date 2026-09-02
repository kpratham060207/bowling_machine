# Testing Setup

> **Phase:** 1D — auth integration tests require PostgreSQL (Docker).

## Tools

| Tool       | Purpose                  | Config                        |
| ---------- | ------------------------ | ----------------------------- |
| Vitest     | Unit / integration tests | `vitest.config.ts` (root)     |
| Playwright | End-to-end browser tests | `playwright.config.ts` (root) |

## Commands

From repository root:

```bash
# Build shared packages (required before unit tests that import workspace dist)
pnpm --filter './packages/*' build

# Run Vitest unit/smoke tests
pnpm test

# Watch mode
pnpm test:watch

# Run Playwright smoke tests
pnpm test:e2e
```

CI runs format check, typecheck, lint, build, unit tests, and Playwright smoke tests.

## Current tests

| File                                           | Purpose                                                       |
| ---------------------------------------------- | ------------------------------------------------------------- |
| `tests/smoke/workspace.test.ts`                | Workspace package exports                                     |
| `packages/api-contracts/src/contracts.test.ts` | Shared Zod contracts                                          |
| `packages/database/src/database.test.ts`       | PostgreSQL persistence (requires Docker)                      |
| `apps/api/src/auth.integration.test.ts`        | Auth middleware, IDOR, profile/admin routes (requires Docker) |
| `apps/api/src/auth/authorization.test.ts`      | Authorization helper unit tests                               |
| `apps/api/src/lib/jwt.test.ts`                 | JWT verification unit tests                                   |
| `tests/e2e/smoke.spec.ts`                      | Playwright runner smoke                                       |

### Backend auth integration tests

Authentication integration tests use **deterministic local JWTs** signed with a test-only
`SUPABASE_JWT_SECRET` (see `apps/api/src/test/test-helpers.ts`). They do **not** call
Supabase Auth or remote JWKS endpoints.

Requirements:

```bash
pnpm db:up
pnpm db:migrate
pnpm test
```

Each test builds a Fastify app via `buildApiServer()`, which awaits nested plugin
registration and `app.ready()` before handling requests. Tests must `await app.close()`
to release the per-server database pool.

## Adding tests (future)

- Co-locate unit tests: `src/**/*.test.ts` within packages/apps
- Cross-cutting integration tests: `tests/integration/` (Phase 1B+)
- E2E flows: `tests/e2e/` with Playwright `webServer` wired to `@bowling-machine/web`

See [Testing Strategy](./TESTING_STRATEGY.md).
