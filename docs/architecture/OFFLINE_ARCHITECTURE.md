# Offline Architecture

> **Status:** Designed (not implemented)
> **Last updated:** 2026-09-02

## Overview

The bowling machine is designed to operate primarily on local Wi-Fi without requiring internet connectivity. This minimizes cost, complexity, and dependency on external services.

## Connectivity Model

```
┌─────────────────────────────────────────────────────┐
│                  Local Network                       │
│                  (Wi-Fi Router)                      │
│                                                      │
│  ┌──────────┐   ┌──────────┐   ┌──────────────┐    │
│  │ Player   │   │ Backend  │   │ ESP32        │    │
│  │ Phone    │──▶│ (Mac/VPS)│◀─▶│ (Machine)    │    │
│  └──────────┘   └────┬─────┘   └──────────────┘    │
│                      │                               │
└──────────────────────┼───────────────────────────────┘
                       │ (optional)
                       ▼
              ┌────────────────┐
              │ Internet        │
              │ (Supabase Auth) │
              └────────────────┘
```

## Operating Modes

### Mode 1: Full Local (No Internet)

- Backend running on Mac or local server
- PostgreSQL running locally (Docker Compose)
- ESP32 connected to local Wi-Fi
- Player phone connected to same Wi-Fi
- Auth: cached JWT or local auth fallback (TBD — see [Unresolved Decisions](../architecture/UNRESOLVED_DECISIONS.md))
- All machine operations functional

### Mode 2: Local with Intermittent Internet

- Same as Mode 1, but internet available periodically
- Supabase Auth works normally when online
- Cached credentials used when offline
- Analytics/history sync when connectivity returns

### Mode 3: Cloud-Connected (Future)

- Backend deployed to cloud VPS
- Supabase Auth always available
- Machine still connects via local network to backend (backend may be cloud-hosted with local discovery — TBD)

## What Works Offline

| Feature                   | Offline Support | Notes                      |
| ------------------------- | --------------- | -------------------------- |
| Machine status display    | Yes             | Via local WebSocket        |
| Configure and throw balls | Yes             | Backend calculates locally |
| Practice sessions         | Yes             | Stored in local PostgreSQL |
| Practice history          | Yes             | Local database             |
| Player profile            | Partial         | Cached locally             |
| User registration         | No              | Requires Supabase Auth     |
| Analytics sync            | Deferred        | Syncs when online          |

## Local Network Discovery

When a player scans a machine QR code:

1. QR code contains a URL: `https://app.bowlingmachine.local/connect?token=<qr_token>`
2. If internet available: resolves to cloud/local backend
3. If offline: URL points to local backend IP (configured during machine registration)

Alternative: QR code contains local IP directly (simpler but less flexible).

See [QR Connection](../architecture/QR_CONNECTION.md) and [Unresolved Decisions](../architecture/UNRESOLVED_DECISIONS.md).

## Backend Local Deployment

Development and local operation use Docker Compose:

```yaml
# Planned docker-compose.yml (not yet created)
services:
  postgres:
    image: postgres:16
    ports: ['5432:5432']
  api:
    build: ./apps/api
    ports: ['4000:4000']
    depends_on: [postgres]
```

The developer's Mac runs both backend and database. No cloud infrastructure required for development or local use.

## ESP32 Network Configuration

- ESP32 connects to local Wi-Fi network (SSID/password configured during initial setup)
- Backend address configured in ESP32 NVS (IP or hostname)
- mDNS discovery optional (TBD)
- ESP32 does not require internet access

## Data Sync Strategy

When connectivity is restored after offline operation:

- Practice sessions and deliveries already stored locally (no sync needed)
- Auth token refresh attempted
- Any deferred analytics uploaded (future)

## Cost Minimization

| Component       | Cost Strategy                                 |
| --------------- | --------------------------------------------- |
| Backend hosting | Developer Mac (free) or small VPS (~$5/month) |
| Database        | Local PostgreSQL (free)                       |
| Auth            | Supabase free tier                            |
| Machine compute | ESP32 (~$5-10)                                |
| Cloud services  | None required for MVP                         |
| AI services     | Deferred to future phase                      |

## Related Documents

- [System Architecture](../architecture/SYSTEM_ARCHITECTURE.md)
- [QR Connection](../architecture/QR_CONNECTION.md)
- [Deployment](../deployment/DEPLOYMENT.md)
- [ADR-0006 Offline Architecture](../decisions/ADR-0006-offline-architecture.md)
