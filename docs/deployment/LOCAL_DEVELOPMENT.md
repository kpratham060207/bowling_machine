# Local Development

> **Phase:** 1C — database persistence implemented

## Prerequisites

| Tool    | Version | Purpose                  |
| ------- | ------- | ------------------------ |
| Node.js | 20 LTS  | Runtime                  |
| pnpm    | 9.x     | Monorepo package manager |
| Docker  | Latest  | Local PostgreSQL         |
| Git     | Latest  | Version control          |

Optional later: ESP-IDF (firmware, Phase 3).

## First-time setup

```bash
git clone <repo-url>
cd bowling_machine
pnpm install
cp .env.example .env
```

Edit `.env` if you need non-default values. Never commit `.env`.

## PostgreSQL (Docker Compose)

### Start, migrate, and seed

```bash
pnpm db:up          # Start PostgreSQL container
pnpm db:migrate     # Apply Drizzle migrations
pnpm db:seed        # Insert development seed data (simulation only)
```

Full reset (destroys container volume state on down):

```bash
pnpm db:reset       # down + up + migrate + seed
```

### Start only

```bash
pnpm db:up
# or: docker compose up -d postgres
```

### Stop

```bash
pnpm db:down
# or: docker compose down
```

### Logs

```bash
pnpm db:logs
```

### Connection

Default credentials (see `.env.example`):

```
DATABASE_URL=postgresql://bowling:changeme@localhost:5432/bowling_machine
```

| Setting  | Value             |
| -------- | ----------------- |
| Host     | `localhost`       |
| Port     | `5432`            |
| User     | `bowling`         |
| Password | `changeme`        |
| Database | `bowling_machine` |

Data persists in the Docker volume `postgres_data`.

### Verify

```bash
docker compose ps
docker compose exec postgres pg_isready -U bowling -d bowling_machine
```

## Development commands

```bash
pnpm dev          # Run app placeholders (web, api, simulator)
pnpm build        # Build all packages and apps
pnpm typecheck    # TypeScript across workspace
pnpm lint         # ESLint
pnpm format       # Prettier write
pnpm format:check # Prettier check
pnpm test         # Vitest (builds packages first)
pnpm test:e2e     # Playwright smoke
```

## Application URLs (Phase 1A)

| Service    | URL                   | Status                  |
| ---------- | --------------------- | ----------------------- |
| Web        | http://localhost:3000 | Placeholder home page   |
| API        | —                     | No HTTP server yet      |
| Simulator  | —                     | No WebSocket server yet |
| PostgreSQL | localhost:5432        | Docker container        |

## Related docs

- [Backend Development](../backend/DEVELOPMENT.md)
- [Frontend Development](../frontend/DEVELOPMENT.md)
- [Testing Setup](../testing/TESTING_SETUP.md)
- [Development Guide](../architecture/DEVELOPMENT_GUIDE.md)
