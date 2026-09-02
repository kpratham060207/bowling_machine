# Repository Structure

> **Status:** Phase 1A foundation implemented
> **Last updated:** 2026-09-02

## Monorepo Layout

```
bowling_machine/
├── apps/
│   ├── web/                    # Next.js mobile-first web application
│   ├── api/                    # Fastify backend (REST + WebSocket)
│   └── esp32-simulator/        # Machine simulator for development
│
├── packages/
│   ├── api-contracts/          # Shared API types, Zod schemas, enums
│   ├── shared/                 # Shared utilities, pitch-coordinate transform, helpers
│   ├── database/               # Drizzle ORM schema, migrations, seeds
│   ├── config/                 # Shared ESLint, TypeScript, Tailwind configs
│   └── ui/                     # Shared shadcn/ui component library
│
├── firmware/
│   └── esp32/                  # ESP-IDF firmware (C/C++)
│
├── docs/
│   ├── architecture/           # System and component architecture
│   ├── api/                    # API specification
│   ├── database/               # Database design
│   ├── protocol/               # ESP32 and WebSocket protocols
│   ├── embedded/               # Firmware architecture
│   ├── frontend/               # Frontend architecture
│   ├── backend/                # Backend architecture
│   ├── deployment/             # Deployment guides
│   ├── security/               # Security and safety
│   ├── testing/                # Testing strategy
│   ├── calibration/            # Calculation engine and calibration
│   └── decisions/              # Architecture Decision Records (ADRs)
│
├── scripts/                    # Build, deploy, and utility scripts
├── tests/                      # Cross-cutting integration and E2E tests
│
├── .cursor/
│   └── rules/                  # Cursor AI engineering rules
│
├── .env.example                # Environment variable template
├── .gitignore
├── README.md
├── CONTRIBUTING.md
└── SECURITY.md
```

## Package Manager

**pnpm** with workspaces. Root `pnpm-workspace.yaml` will define:

```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

## Naming Conventions

| Item             | Convention              | Example                          |
| ---------------- | ----------------------- | -------------------------------- |
| Apps             | kebab-case directory    | `apps/esp32-simulator`           |
| Packages         | kebab-case directory    | `packages/api-contracts`         |
| TypeScript files | kebab-case or camelCase | `delivery-service.ts`            |
| React components | PascalCase              | `PitchMapSelector.tsx`           |
| Database tables  | snake_case              | `practice_sessions`              |
| API routes       | kebab-case              | `/api/v1/practice-sessions`      |
| Environment vars | SCREAMING_SNAKE         | `DATABASE_URL`                   |
| Firmware files   | snake_case              | `motor_control.c`                |
| ADRs             | `ADR-NNNN-title.md`     | `ADR-0001-frontend-framework.md` |

## Module Boundaries

### apps/web

```
apps/web/
├── src/
│   ├── app/              # Next.js App Router pages
│   ├── components/       # App-specific components
│   ├── hooks/            # Custom React hooks
│   ├── lib/              # API client, WebSocket, utilities
│   └── styles/           # Global styles
├── public/               # Static assets
└── package.json
```

### apps/api

```
apps/api/
├── src/
│   ├── routes/           # REST route handlers
│   ├── ws/               # WebSocket handlers
│   ├── modules/          # Business logic modules
│   │   ├── auth/
│   │   ├── delivery/
│   │   ├── calculation/
│   │   ├── session/
│   │   ├── machine/
│   │   ├── telemetry/
│   │   └── admin/
│   ├── plugins/          # Fastify plugins
│   └── index.ts          # Server entry point
└── package.json
```

### packages/api-contracts

```
packages/api-contracts/
├── src/
│   ├── delivery/         # Delivery request/command schemas
│   ├── machine/          # Machine state, telemetry schemas
│   ├── session/          # Session schemas
│   ├── auth/             # Auth-related schemas
│   ├── websocket/        # WebSocket event schemas
│   └── index.ts          # Public exports
└── package.json
```

### firmware/esp32

```
firmware/esp32/
├── main/
│   ├── main.c
│   ├── state_machine.c
│   ├── motor_control.c
│   ├── actuator_control.c
│   ├── sensor_reader.c
│   ├── safety_monitor.c
│   ├── comm_client.c
│   └── config_store.c
├── components/           # ESP-IDF components
├── CMakeLists.txt
└── sdkconfig.defaults
```

## Build and Tooling (Future)

When implemented, the monorepo will use:

- **pnpm** — package management and workspaces
- **Turborepo or pnpm recursive scripts** — build orchestration (decision deferred; see [Unresolved Decisions](./UNRESOLVED_DECISIONS.md))
- **Docker Compose** — local PostgreSQL and optional services
- **Vitest** — unit/integration tests
- **Playwright** — E2E browser tests
- **ESLint + Prettier** — code quality (via `packages/config`)

## Related Documents

- [System Architecture](./SYSTEM_ARCHITECTURE.md)
- [Development Guide](./DEVELOPMENT_GUIDE.md)
- [ADR-0009 Repository Structure](../decisions/ADR-0009-repository-structure.md)
