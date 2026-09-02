# MVP Definition

> **Status:** Designed (not implemented)
> **Last updated:** 2026-09-02

## MVP Goal

Deliver a working end-to-end flow where a player can scan a QR code, configure a basic delivery, and have the machine execute it — using the ESP32 simulator until hardware is available.

## MVP Scope

### In Scope

| Feature                            | Description                                                            |
| ---------------------------------- | ---------------------------------------------------------------------- |
| Player registration and login      | Email/password via Supabase Auth                                       |
| Player profile                     | Basic profile (display name)                                           |
| QR machine connection              | Scan QR → connect to machine                                           |
| Machine status display             | Real-time state via WebSocket                                          |
| Single delivery configuration      | Tap-to-select on perspective pitch image, speed, ball type, ball count |
| Practice session (single delivery) | Start → execute → complete                                             |
| Calculation engine (placeholder)   | Synthetic calibration → machine command                                |
| ESP32 simulator                    | Full protocol simulation                                               |
| Backend API                        | Core endpoints (auth, machines, deliveries, sessions)                  |
| Database schema                    | Core tables with migrations                                            |
| Machine state machine (simulator)  | All states and transitions                                             |
| Command validation                 | Backend + simulator validation                                         |
| Basic safety (simulator)           | State checks, TTL, parameter ranges                                    |

### Out of Scope (MVP)

| Feature                    | Reason                             | Target Phase |
| -------------------------- | ---------------------------------- | ------------ |
| Real ESP32 firmware        | Hardware not available             | Phase 3      |
| Real calibration           | Requires physical machine          | Phase 4      |
| Saved practice plans       | Nice-to-have                       | Phase 2      |
| Practice history/analytics | Requires session data accumulation | Phase 2      |
| Admin panel UI             | Manual DB/API for MVP              | Phase 2      |
| Multi-delivery sessions    | Single delivery sufficient for MVP | Phase 2      |
| Pause/resume sessions      | Simple start/stop for MVP          | Phase 2      |
| Offline auth fallback      | Online auth sufficient for MVP     | Phase 2      |
| AI services                | Future capability                  | Phase 5      |
| Production deployment      | Local dev sufficient for MVP       | Phase 2      |
| E2E tests                  | Unit + integration first           | Phase 2      |

## MVP User Flow

```
1. Player registers and logs in
2. Player scans machine QR code
3. Player sees machine status (READY)
4. Player opens delivery configurator (interactive perspective pitch visualization)
5. Player taps landing location directly on the pitch image
6. Player sets speed (slider), ball type (dropdown), count (input)
7. Player clicks "Throw"
8. Backend validates, calculates (placeholder), sends command
9. Simulator executes state machine transitions
10. Player sees real-time progress (state changes, ball count)
11. Session completes, player sees summary
```

## MVP Technical Deliverables

| Deliverable                                | Location                                           |
| ------------------------------------------ | -------------------------------------------------- |
| Monorepo setup (pnpm workspaces)           | Root                                               |
| Shared API contracts                       | `packages/api-contracts`                           |
| Database schema + migrations               | `packages/database`                                |
| API server with core routes                | `apps/api`                                         |
| Web app with core pages                    | `apps/web`                                         |
| Pitch visualization + coordinate transform | `packages/ui`, `packages/shared/pitch-coordinates` |
| ESP32 simulator                            | `apps/esp32-simulator`                             |
| Docker Compose (PostgreSQL)                | Root                                               |
| Unit tests for calculation engine          | `apps/api`                                         |
| Integration tests for delivery flow        | `tests/integration`                                |

## MVP Success Criteria

1. Player can complete the full user flow without manual API calls
2. All user-level parameters validated; no machine parameters in frontend
3. Simulator correctly implements state machine transitions
4. WebSocket events delivered to browser in real time
5. Delivery records persisted in PostgreSQL
6. Zero hard-coded physics constants in calculation engine
7. Pitch tap produces UI coordinates → pitch reference transform (no linear Y assumption)
8. Player never enters physical coordinates manually

## MVP Timeline Estimate

| Week | Focus                                                          |
| ---- | -------------------------------------------------------------- |
| 1–2  | Monorepo setup, packages, database schema, API skeleton        |
| 3–4  | Auth integration, machine connection, WebSocket infrastructure |
| 5–6  | Delivery flow, calculation engine placeholder, simulator       |
| 7–8  | Frontend pages, pitch map, session UI, integration testing     |

**Total: ~8 weeks** (estimate, depends on team size and availability)

## Related Documents

- [Roadmap](./ROADMAP.md)
- [Future Expansion](./FUTURE_EXPANSION.md)
- [Development Guide](./DEVELOPMENT_GUIDE.md)
