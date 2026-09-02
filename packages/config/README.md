# @bowling-machine/config

Shared **tooling configuration** for the monorepo (TypeScript, ESLint, Prettier).

Per [ADR-0009](../../docs/decisions/ADR-0009-repository-structure.md), this package holds build/lint/format configs — not runtime environment variables.

Runtime environment parsing will be added in a later phase (likely within `apps/api` or a dedicated utility module).
