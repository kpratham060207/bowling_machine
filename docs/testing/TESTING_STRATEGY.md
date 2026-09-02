# Testing Strategy

> **Status:** Designed (not implemented)
> **Last updated:** 2026-09-02

## Overview

Testing strategy for the bowling machine software system. No tests exist yet.

## Testing Layers

```
┌─────────────────────────────────────────────┐
│  E2E Tests (Playwright)                     │  Full user flows in browser
├─────────────────────────────────────────────┤
│  Integration Tests (Vitest)                 │  API + DB + Simulator
├─────────────────────────────────────────────┤
│  Unit Tests (Vitest)                        │  Functions, modules, schemas
├─────────────────────────────────────────────┤
│  Firmware Tests (ESP-IDF Unity)             │  State machine, safety, protocol
├─────────────────────────────────────────────┤
│  Contract Tests                             │  API schema validation
└─────────────────────────────────────────────┘
```

## Unit Tests (Vitest)

Scope: Individual functions and modules in isolation.

| Area                      | Test Focus                                         |
| ------------------------- | -------------------------------------------------- |
| Calculation engine        | Input validation, output shape, calibration lookup |
| Zod schemas               | Valid/invalid input acceptance                     |
| State machine (simulator) | Valid/invalid transitions                          |
| Session manager           | Lifecycle state changes                            |
| Auth middleware           | JWT validation, role checking                      |

Location: Co-located with source (`*.test.ts`) or in `tests/unit/`.

## Integration Tests (Vitest)

Scope: Multiple modules working together with test database.

| Area              | Test Focus                                       |
| ----------------- | ------------------------------------------------ |
| API routes        | Request → response with real DB                  |
| Delivery flow     | User request → calculation → command creation    |
| Session lifecycle | Create → execute → complete                      |
| WebSocket         | Connect → subscribe → receive events             |
| Machine gateway   | Command send → telemetry receive (via simulator) |

Location: `tests/integration/`

Dependencies: Test PostgreSQL instance (Docker), ESP32 simulator running.

## E2E Tests (Playwright)

Scope: Full user flows in a real browser.

| Flow            | Steps                                       |
| --------------- | ------------------------------------------- |
| Registration    | Register → verify profile created           |
| Login           | Login → redirect to dashboard               |
| QR Connection   | Scan QR → see machine status                |
| Delivery        | Configure → start → see progress → complete |
| Session history | Complete session → view in history          |

Location: `tests/e2e/`

Dependencies: Full stack running (web + api + db + simulator).

## Firmware Tests (ESP-IDF Unity)

Scope: ESP32 firmware modules.

| Area               | Test Focus                      |
| ------------------ | ------------------------------- |
| State machine      | All valid/invalid transitions   |
| Command validation | Range checks, TTL, state checks |
| Safety monitor     | E-stop response, RPM limits     |
| Protocol codec     | Message parsing/serialization   |

Location: `firmware/esp32/test/`

Note: Hardware-in-the-loop tests require physical machine (future).

## Contract Tests

Validate that API implementations match `packages/api-contracts` schemas:

- Request schemas reject invalid inputs
- Response schemas match documented shapes
- WebSocket events match defined types

## ESP32 Simulator as Test Tool

The simulator (`apps/esp32-simulator`) serves as a test double for the ESP32:

- Responds to protocol messages per spec
- Simulates state machine transitions
- Generates synthetic telemetry
- Configurable fault injection

Used in integration and E2E tests.

## CI Pipeline (Future)

```
On push/PR:
  1. Lint (ESLint)
  2. Type check (TypeScript)
  3. Unit tests (Vitest)
  4. Integration tests (Vitest + Docker PostgreSQL + Simulator)
  5. E2E tests (Playwright) — on main branch only
  6. Firmware tests — on firmware changes only
```

Platform: GitHub Actions.

## Coverage Targets

| Layer                                | Target                |
| ------------------------------------ | --------------------- |
| Calculation engine                   | 90%+                  |
| API routes                           | 80%+                  |
| Auth middleware                      | 90%+                  |
| State machine (simulator + firmware) | 95%+                  |
| Safety monitor (firmware)            | 95%+                  |
| Frontend components                  | 70%+                  |
| E2E critical flows                   | 100% of defined flows |

## Related Documents

- [Development Guide](../architecture/DEVELOPMENT_GUIDE.md)
- [Component Architecture](../architecture/COMPONENT_ARCHITECTURE.md)
