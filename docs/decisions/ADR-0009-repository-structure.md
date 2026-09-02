# ADR-0009: Repository Structure

## Status

Accepted

## Context

The project spans multiple technology stacks (Next.js, Fastify, ESP-IDF, shared TypeScript packages) that must share types, schemas, and configuration. The project is greenfield with a small team.

## Decision

Use a **pnpm monorepo** with the following structure:

```
apps/           — Deployable applications (web, api, esp32-simulator)
packages/       — Shared libraries (api-contracts, shared, database, config, ui)
firmware/       — ESP-IDF firmware (separate build system)
docs/           — Architecture and engineering documentation
scripts/        — Utility scripts
tests/          — Cross-cutting tests
```

Package manager: **pnpm** with workspaces.
Build orchestration: TBD (pnpm recursive scripts or Turborepo — see UD-09).

## Alternatives Considered

| Alternative               | Reason Rejected                                             |
| ------------------------- | ----------------------------------------------------------- |
| Multi-repo                | Shared types require publishing packages; slows development |
| npm/yarn workspaces       | pnpm is faster and more disk-efficient                      |
| Flat single-package       | Cannot share code between web and api cleanly               |
| Lerna                     | Largely superseded by pnpm workspaces + Turborepo           |
| Firmware in separate repo | Protocol changes require coordinated PRs across repos       |

## Consequences

**Positive:**

- Shared types via `packages/api-contracts` (single source of truth)
- Shared UI components via `packages/ui`
- Shared database schema via `packages/database`
- Single clone, single PR for cross-cutting changes
- pnpm efficient disk usage with content-addressable store

**Negative:**

- Monorepo tooling setup required
- ESP-IDF firmware uses different build system (CMake, not pnpm)
- CI must handle multiple build targets
- Initial setup complexity higher than single-package

## Related

- [Repository Structure](../architecture/REPOSITORY_STRUCTURE.md)
- [Development Guide](../architecture/DEVELOPMENT_GUIDE.md)
