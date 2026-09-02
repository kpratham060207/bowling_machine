# Testing Setup

> **Phase:** 1A foundation — tooling configured; feature tests deferred.

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

| File                            | Purpose                                    |
| ------------------------------- | ------------------------------------------ |
| `tests/smoke/workspace.test.ts` | Verifies workspace package exports resolve |
| `tests/e2e/smoke.spec.ts`       | Verifies Playwright runner works           |

No feature tests exist yet — by design for Phase 1A.

## Adding tests (future)

- Co-locate unit tests: `src/**/*.test.ts` within packages/apps
- Cross-cutting integration tests: `tests/integration/` (Phase 1B+)
- E2E flows: `tests/e2e/` with Playwright `webServer` wired to `@bowling-machine/web`

See [Testing Strategy](./TESTING_STRATEGY.md).
