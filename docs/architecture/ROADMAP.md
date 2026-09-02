# Development Roadmap

> **Status:** Designed (not implemented)
> **Last updated:** 2026-09-02

## Phase Overview

```
Phase 0: Architecture & Documentation     Complete
Phase 1A: Repository & Dev Foundation     Complete
Phase 1B: Shared Application Contracts    Next
Phase 1: MVP (Simulator-Based)
Phase 2: Core Features & Production Readiness
Phase 3: ESP32 Firmware & Hardware Integration
Phase 4: Calibration & Physical Validation
Phase 5: AI Services & Advanced Features
```

## Phase 0: Architecture & Documentation

**Goal:** Establish complete architecture and documentation foundation.

| Deliverable                      | Status |
| -------------------------------- | ------ |
| System architecture documents    | Done   |
| ADRs for key decisions           | Done   |
| Repository structure             | Done   |
| Requirements traceability matrix | Done   |
| MVP definition                   | Done   |
| Development roadmap              | Done   |
| Cursor rules                     | Done   |

## Phase 1A: Repository & Development Foundation

**Goal:** Monorepo tooling ready for implementation.

| Deliverable                         | Status |
| ----------------------------------- | ------ |
| pnpm workspaces                     | Done   |
| Strict TypeScript configs           | Done   |
| ESLint + Prettier                   | Done   |
| Package/app structural placeholders | Done   |
| Docker Compose (PostgreSQL)         | Done   |
| Vitest + Playwright smoke tests     | Done   |
| GitHub Actions CI                   | Done   |
| Development documentation           | Done   |

## Phase 1: MVP (Simulator-Based)

**Goal:** End-to-end delivery flow using ESP32 simulator.

| Deliverable                                            | Priority |
| ------------------------------------------------------ | -------- |
| packages/api-contracts (Zod schemas)                   | P0       |
| packages/database (Drizzle schema + migrations)        | P0       |
| apps/api (core routes, WebSocket, auth)                | P0       |
| apps/esp32-simulator (protocol + state machine)        | P0       |
| apps/web (login, QR connect, delivery config, session) | P0       |
| Calculation engine (placeholder)                       | P0       |
| Docker Compose (PostgreSQL)                            | P0       |
| Unit tests (calculation, validation)                   | P1       |
| Integration tests (delivery flow)                      | P1       |

**Exit criteria:** Full user flow works with simulator.

## Phase 2: Core Features & Production Readiness

**Goal:** Complete feature set for player use; prepare for deployment.

| Deliverable                        | Priority |
| ---------------------------------- | -------- |
| Multi-delivery sessions            | P0       |
| Pause/resume/stop session controls | P0       |
| Saved practice plans               | P1       |
| Practice history and analytics     | P1       |
| Admin API endpoints + basic UI     | P1       |
| E2E tests (Playwright)             | P1       |
| CI pipeline (GitHub Actions)       | P1       |
| Production deployment setup        | P2       |
| Offline auth fallback              | P2       |
| Rate limiting                      | P2       |

**Exit criteria:** Feature-complete for player use; deployable to VPS.

## Phase 3: ESP32 Firmware & Hardware Integration

**Goal:** Real machine control via ESP32 firmware.

| Deliverable                              | Priority |
| ---------------------------------------- | -------- |
| ESP-IDF project setup                    | P0       |
| State machine implementation             | P0       |
| Motor control (PWM + encoder feedback)   | P0       |
| Actuator control (position + homing)     | P0       |
| Feeder control                           | P0       |
| Safety monitor task                      | P0       |
| WebSocket client (comm module)           | P0       |
| Command validation                       | P0       |
| Sensor reading (IMU, encoders, switches) | P1       |
| NVS calibration storage                  | P1       |
| Firmware unit tests                      | P1       |
| Hardware-in-the-loop testing             | P1       |

**Exit criteria:** ESP32 controls real hardware; simulator and firmware pass same protocol tests.

## Phase 4: Calibration & Physical Validation

**Goal:** Accurate, calibrated ball delivery on real machine.

| Deliverable                                     | Priority |
| ----------------------------------------------- | -------- |
| Calibration workflow UI                         | P0       |
| Calibration data collection                     | P0       |
| Real calculation engine (table lookup)          | P0       |
| Speed calibration (RPM → km/h)                  | P0       |
| Position calibration (coordinates → trajectory) | P0       |
| Ball type modifiers                             | P1       |
| Calibration versioning and rollback             | P1       |
| Safety validation on real hardware              | P0       |
| Physical testing and iteration                  | P0       |

**Exit criteria:** Machine delivers balls to targeted locations with acceptable accuracy.

## Phase 5: AI Services & Advanced Features

**Goal:** AI-enhanced practice experience.

| Deliverable                   | Priority |
| ----------------------------- | -------- |
| Ball tracking (YOLO/CV)       | P2       |
| Form analysis (MediaPipe)     | P2       |
| Adaptive delivery (AI-driven) | P3       |
| Video recording and playback  | P2       |
| Advanced analytics            | P2       |
| Multi-machine support         | P3       |

**Exit criteria:** AI features enhance but do not gate core functionality.

## Related Documents

- [MVP Definition](./MVP.md)
- [Future Expansion](./FUTURE_EXPANSION.md)
- [Unresolved Decisions](./UNRESOLVED_DECISIONS.md)
