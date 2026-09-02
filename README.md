# Bowling Machine

Smart AI-enabled cricket bowling machine for solo batting practice.

## Project Status

**Phase 1D: Authentication & Authorization** — Complete

Player authentication (Supabase Auth), backend JWT verification, role-based authorization, profile routes, and minimal auth UI are implemented.

| Phase                             | Status       |
| --------------------------------- | ------------ |
| 0 — Architecture & documentation  | Complete     |
| 1A — Repo & dev foundation        | Complete     |
| 1B — Shared application contracts | Complete     |
| 1C — Database persistence         | Complete     |
| **1D — Auth & authorization**     | **Complete** |
| 1 — MVP (simulator-based)         | Not started  |

## What This Project Is

Software for a physical cricket bowling machine:

- **Web app** (`apps/web`) — mobile-first player interface
- **API** (`apps/api`) — Fastify backend
- **Simulator** (`apps/esp32-simulator`) — development without hardware
- **Firmware** (`firmware/esp32`) — ESP32 controller (structural placeholder)
- **PostgreSQL** — sessions, profiles, calibration (schema implemented)

```
Player Phone → Backend API → ESP32 Firmware → Physical Machine
                     ↕
                PostgreSQL
```

The browser never controls hardware directly. The ESP32 is the final authority on machine safety.

## Technology Stack

| Layer    | Technology                                 |
| -------- | ------------------------------------------ |
| Monorepo | pnpm workspaces                            |
| Frontend | Next.js 15, React 19, TypeScript           |
| Backend  | Node.js, TypeScript (Fastify in Phase 1B+) |
| Database | PostgreSQL 16, Drizzle ORM (Phase 1B+)     |
| Testing  | Vitest, Playwright                         |
| CI       | GitHub Actions                             |
| Local DB | Docker Compose                             |

## Repository Structure

```
apps/
  web/                  # Next.js auth UI
  api/                  # Fastify backend with auth
  esp32-simulator/      # Simulator placeholder
packages/
  api-contracts/        # Shared Zod schemas (placeholder)
  shared/               # Shared utilities (placeholder)
  database/             # Drizzle (placeholder)
  config/               # Shared TS/ESLint/Prettier configs
  ui/                   # Shared UI components (placeholder)
firmware/esp32/         # ESP-IDF placeholder
docs/                   # Architecture documentation
tests/                  # Smoke tests
```

## Local Setup

```bash
git clone <repo-url>
cd bowling_machine
pnpm install
cp .env.example .env
pnpm db:up          # Start PostgreSQL (Docker)
pnpm db:migrate     # Apply database migrations
pnpm db:seed        # Development seed data
pnpm dev            # Web :3000 + app placeholders
```

Full guide: [Local Development](docs/deployment/LOCAL_DEVELOPMENT.md)

## Development Commands

| Command             | Description                         |
| ------------------- | ----------------------------------- |
| `pnpm install`      | Install all workspace dependencies  |
| `pnpm dev`          | Run web, api, simulator dev scripts |
| `pnpm build`        | Build all packages and apps         |
| `pnpm typecheck`    | TypeScript check across workspace   |
| `pnpm lint`         | ESLint                              |
| `pnpm format`       | Prettier write                      |
| `pnpm format:check` | Prettier check                      |
| `pnpm test`         | Vitest unit/smoke tests             |
| `pnpm test:e2e`     | Playwright smoke tests              |
| `pnpm db:up`        | Start PostgreSQL container          |
| `pnpm db:migrate`   | Apply Drizzle migrations            |
| `pnpm db:seed`      | Seed development data               |
| `pnpm db:reset`     | Reset DB + migrate + seed           |
| `pnpm db:down`      | Stop PostgreSQL container           |

## What Is NOT Implemented

- Machine communication / WebSocket protocol
- ESP32 simulator logic
- Throw Ball pitch UI
- Calculation engine
- Practice sessions API
- ESP32 firmware

## Documentation

| Document                                                        | Description          |
| --------------------------------------------------------------- | -------------------- |
| [System Architecture](docs/architecture/SYSTEM_ARCHITECTURE.md) | Overall design       |
| [Local Development](docs/deployment/LOCAL_DEVELOPMENT.md)       | Setup guide          |
| [Testing Setup](docs/testing/TESTING_SETUP.md)                  | Vitest / Playwright  |
| [Pitch Visualization](docs/frontend/PITCH_VISUALIZATION.md)     | Throw Ball UX design |
| [Authentication](docs/security/AUTHENTICATION.md)               | Supabase Auth setup  |
| [MVP Definition](docs/architecture/MVP.md)                      | MVP scope            |

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## Security

See [SECURITY.md](SECURITY.md). Never commit secrets or credentials.

## License

TBD
