# Local Development

> **Phase:** 1D — authentication and authorization implemented

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

### Supabase Auth (required for Phase 1D)

1. Create a Supabase project
2. Copy values from Project Settings → API into `.env`:
   - `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_URL` — project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` — anon public key (browser-safe)
   - `SUPABASE_SERVICE_ROLE_KEY` — service role key (**server only**)
   - `SUPABASE_JWT_SECRET` — JWT secret (**server only**)
3. Enable Email auth under Authentication → Providers

See [Authentication](../security/AUTHENTICATION.md) for full setup detail.

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

## Application URLs (Phase 1D)

| Service    | URL                   | Status                             |
| ---------- | --------------------- | ---------------------------------- |
| Web        | http://localhost:3000 | Auth UI (login, register, profile) |
| API        | http://localhost:4000 | Fastify + auth/profile routes      |
| Simulator  | —                     | No WebSocket server yet            |
| PostgreSQL | localhost:5432        | Docker container                   |

## Related docs

- [Backend Development](../backend/DEVELOPMENT.md)
- [Frontend Development](../frontend/DEVELOPMENT.md)
- [Testing Setup](../testing/TESTING_SETUP.md)
- [Development Guide](../architecture/DEVELOPMENT_GUIDE.md)
