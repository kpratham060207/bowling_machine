# Frontend Architecture

> **Status:** Phase 1I product hardening complete; see `PHASE_1I.md`  
> **Last updated:** 2026-09-03

## Overview

The frontend is a mobile-first web application built with Next.js. It provides the player interface for configuring deliveries, managing practice sessions, and viewing machine status. The browser NEVER controls hardware directly.

## Technology Stack

| Technology           | Purpose                                                        |
| -------------------- | -------------------------------------------------------------- |
| Next.js (App Router) | Framework, routing, SSR/SSG where beneficial                   |
| React                | UI rendering                                                   |
| TypeScript           | Type safety                                                    |
| Tailwind CSS         | Utility-first styling                                          |
| shadcn/ui            | Accessible component library (via `packages/ui`)               |
| TanStack Query       | Server state management, caching, refetching                   |
| React Hook Form      | Form state management                                          |
| Zod                  | Client-side validation (schemas from `packages/api-contracts`) |

## Design Principles

### Mobile-First

Primary use case: player standing near the machine with a phone. All layouts, touch targets, and interactions are designed for mobile screens first, then enhanced for tablet/desktop.

### No Hardware Control

The frontend sends **user-level parameters** only:

- Normalized pitch target coordinates (`target_x`, `target_y` in 0.0–1.0 range) — produced by Pitch Coordinate Mapper from tap selection
- Speed in km/h
- Ball type (enum)
- Ball count, delays, intervals

The frontend NEVER sends or stores as authoritative target:

- Wheel RPM values
- Actuator positions
- PWM duty cycles
- GPIO states
- Raw screen pixels
- Physical trajectory, machine orientation, or physics-based feeder timing

### Pitch Target Selection (Throw Ball UI)

The Throw Ball interface contains an interactive cricket-pitch visualization inspired by the project owner's reference image. See [Pitch Visualization & Coordinate Architecture](./PITCH_VISUALIZATION.md).

**Frontend is responsible only for:**

| Responsibility                   | Detail                                                                |
| -------------------------------- | --------------------------------------------------------------------- |
| Display the pitch                | Render perspective visualization                                      |
| Allow target selection           | Tap/click directly on pitch                                           |
| Display selected target          | Marker + human-readable summary                                       |
| Normalized coordinate conversion | Tap → `ui_x`/`ui_y` → Pitch Coordinate Mapper → `target_x`/`target_y` |
| Pre-delivery confirmation        | Target visible before throw starts                                    |

**Frontend must NOT calculate:**

- Actuator positions
- Wheel RPM
- Machine orientation
- Physical trajectory
- Feeder timing based on physics

**Interaction rules:**

- Player does NOT enter physical coordinates manually
- Screen Y must NOT be assumed to map linearly to pitch distance (perspective image)
- Cricket region labels (yorker, good length, etc.) are display-only and must not be hard-coded unless explicitly configured
- Player may retarget by tapping elsewhere; reset control clears selection

### Real-Time Status via WebSocket

Machine status, session progress, and telemetry are received via WebSocket connection to the backend. TanStack Query handles REST data; a dedicated WebSocket hook manages real-time events.

### Offline Awareness

The UI must gracefully handle:

- Backend unreachable (show local network troubleshooting)
- WebSocket disconnection (show reconnecting state)
- Machine disconnected (show last known status with staleness indicator)

## Page Structure (Planned)

| Route                   | Purpose                      | Auth Required |
| ----------------------- | ---------------------------- | ------------- |
| `/`                     | Landing / redirect           | No            |
| `/login`                | Supabase Auth login          | No            |
| `/register`             | Account creation             | No            |
| `/connect`              | QR scan / machine connection | Yes (PLAYER)  |
| `/machine/[id]`         | Machine status dashboard     | Yes (PLAYER)  |
| `/machine/[id]/throw`   | Delivery configurator        | Yes (PLAYER)  |
| `/machine/[id]/session` | Active practice session      | Yes (PLAYER)  |
| `/profile`              | Player profile management    | Yes (PLAYER)  |
| `/history`              | Practice history             | Yes (PLAYER)  |
| `/analytics`            | Personal analytics           | Yes (PLAYER)  |
| `/calibration`          | Calibration tools            | Yes (PLAYER)  |
| `/admin/*`              | Admin pages                  | Yes (ADMIN)   |

## Key UI Components (Planned)

### PitchMapSelector (Throw Ball UI)

Interactive cricket-pitch visualization inspired by the project owner's reference image.

**On tap/click:**

1. Display clear target marker
2. Store normalized coordinates via Pitch Coordinate Mapper
3. Display selected target and human-readable summary
4. Allow retarget by tapping elsewhere
5. Provide reset control
6. Require target visible before delivery starts

- Normalized UI coordinates (`ui_x`, `ui_y`) captured from pointer relative to image bounds
- Pitch Coordinate Mapper produces persisted `target_x`, `target_y`
- No coordinate text inputs; no physical distance/angle entry
- Cricket region labels (yorker, full, good length, etc.) — eventual, configurable, not hard-coded

Full specification: [Pitch Visualization & Coordinate Architecture](./PITCH_VISUALIZATION.md)

### Delivery Configurator

Form combining:

- Pitch map selection
- Speed slider/input (km/h)
- Ball type selector (enum dropdown)
- Ball count, first-ball delay, interval between balls

Validated client-side with Zod, then submitted to backend.

### Machine Status Panel

Real-time display of:

- Current machine state (from state enum)
- Connection status
- Safety indicators
- Active session progress

### Session Progress

During an active practice session:

- Balls delivered / remaining
- Current machine state
- Last delivery result (if telemetry available)
- Stop/pause controls

## State Management

| State Type                     | Tool                      | Source   |
| ------------------------------ | ------------------------- | -------- |
| Server data (profile, history) | TanStack Query            | REST API |
| Real-time (machine status)     | WebSocket hook            | WSS      |
| Form state (delivery config)   | React Hook Form           | Local    |
| Auth state                     | Supabase Auth client      | Supabase |
| UI state (modals, nav)         | React useState/useReducer | Local    |

## API Client Layer

```
apps/web/src/lib/
├── api-client.ts              # REST client (fetch wrapper with auth headers)
├── ws-client.ts               # WebSocket client with reconnect logic
├── auth.ts                    # Supabase Auth helpers
├── query-keys.ts              # TanStack Query key factory
└── pitch-coordinates/
    └── usePitchTargetSelection.ts  # Hook: tap → ui coords → pitch reference

packages/shared/src/pitch-coordinates/   # Pitch Coordinate Mapper (no React dependency)
├── pitch-coordinate-mapper.ts   # ui → target_x/target_y — perspective-aware, configurable
├── inverse-mapper.ts            # target → UI position for marker rendering
└── config/default-perspective.json
```

All API types imported from `packages/api-contracts` — never duplicated in the frontend.

## Authentication Flow

1. Player registers/logs in via Supabase Auth (email/password initially)
2. Supabase returns JWT
3. Frontend stores session via Supabase client
4. JWT attached to all API requests (Authorization header)
5. Backend verifies JWT and resolves role (PLAYER/ADMIN)

See [Player Account Architecture](../architecture/PLAYER_ACCOUNT_ARCHITECTURE.md).

## Accessibility

- shadcn/ui components provide ARIA-compliant base
- Touch targets minimum 44×44px
- Color contrast meets WCAG 2.1 AA
- Screen reader labels on all interactive elements

## Related Documents

- [System Architecture](../architecture/SYSTEM_ARCHITECTURE.md)
- [API Specification](../api/API_SPECIFICATION.md)
- [WebSocket Events](../protocol/WEBSOCKET_EVENTS.md)
- [QR Connection](../architecture/QR_CONNECTION.md)
- [Pitch Visualization & Coordinate Architecture](./PITCH_VISUALIZATION.md)
- [ADR-0010 Pitch Coordinate Layers](../decisions/ADR-0010-pitch-coordinate-layers.md)
