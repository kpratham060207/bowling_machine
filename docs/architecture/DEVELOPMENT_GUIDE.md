# Development Guide

> **Status:** Designed (not implemented)
> **Last updated:** 2026-09-02

## Overview

Guide for setting up and working on the bowling machine project. The project is currently in the architecture/documentation phase.

## Prerequisites

| Tool    | Version | Purpose                            |
| ------- | ------- | ---------------------------------- |
| Node.js | 20 LTS  | Backend and frontend runtime       |
| pnpm    | 9.x     | Package manager                    |
| Docker  | Latest  | Local PostgreSQL                   |
| Git     | Latest  | Version control                    |
| ESP-IDF | 5.x     | Firmware development (when needed) |

## Current Status

**Phase:** Architecture and documentation foundation.
**Implementation:** Not started. Directory structure exists with placeholders.

## Getting Started (Future)

Once implementation begins:

```bash
# Clone repository
git clone <repo-url>
cd bowling_machine

# Install dependencies
pnpm install

# Copy environment template
cp .env.example .env
# Edit .env with your values

# Start local database
docker compose up -d

# Run database migrations
pnpm db:migrate

# Start development servers
pnpm dev
# Web: http://localhost:3000
# API: http://localhost:4000
# Simulator: ws://localhost:5000
```

## Project Structure

See [Repository Structure](./REPOSITORY_STRUCTURE.md) for the full monorepo layout.

## Development Workflow

### Branch Strategy

```
main ─── stable, deployable
  └── feature/<name> ─── feature branches
  └── fix/<name> ─── bug fix branches
  └── docs/<name> ─── documentation branches
```

### Commit Format

```
type(scope): description
```

Types: `feat`, `fix`, `docs`, `chore`, `test`, `refactor`, `ci`

Examples:

- `docs(architecture): establish system architecture`
- `feat(api): add delivery validation endpoint`
- `fix(firmware): clamp actuator position to limit switch range`

### Code Standards

- TypeScript strict mode
- ESLint + Prettier (via `packages/config`)
- Zod validation on all external inputs
- Verbose comments explaining why (see `.cursor/rules/project-architecture.mdc`)
- No hard-coded secrets or machine parameters in frontend

### Working on Specific Layers

| Layer     | Directory              | Start Command (future)                |
| --------- | ---------------------- | ------------------------------------- |
| Frontend  | `apps/web`             | `pnpm --filter web dev`               |
| Backend   | `apps/api`             | `pnpm --filter api dev`               |
| Simulator | `apps/esp32-simulator` | `pnpm --filter esp32-simulator dev`   |
| Firmware  | `firmware/esp32`       | `idf.py build flash monitor`          |
| Database  | `packages/database`    | `pnpm db:generate`, `pnpm db:migrate` |

## Testing (Future)

```bash
pnpm test              # Unit tests
pnpm test:integration  # Integration tests
pnpm test:e2e          # Playwright E2E tests
```

See [Testing Strategy](../testing/TESTING_STRATEGY.md).

## Documentation

When making architectural changes:

1. Update relevant docs in `docs/`
2. Create ADR if decision is significant
3. Update [Unresolved Decisions](./UNRESOLVED_DECISIONS.md) if applicable
4. Keep docs matching implementation status

## Related Documents

- [Repository Structure](./REPOSITORY_STRUCTURE.md)
- [Deployment](../deployment/DEPLOYMENT.md)
- [Testing Strategy](../testing/TESTING_STRATEGY.md)
- [Contributing](../../CONTRIBUTING.md)
