# Phase 1I — Product Hardening, Practice Data & Calibration Foundations

> **Status:** Complete  
> **Depends on:** Phase 1H-B (`aafddec`)  
> **Does not include:** AI/ML, computer vision, ESP32 firmware, offline machine command queue

## Overview

Phase 1I turns the functional MVP into a training-product foundation with reusable practice plans, improved session history, explicit requested/calculated/observed data separation, admin calibration management, and offline UX resilience.

## Practice Plans

### Concept

A **practice plan** is a saved, player-owned template of high-level delivery parameters. Plans store **requested** configuration only:

- `target_x`, `target_y`
- `desired_speed_kmh`
- `ball_type`
- `number_of_balls`
- `first_ball_delay_ms`
- `interval_ms`

Plans do **not** store wheel RPM, actuator positions, or machine commands.

### Ownership

| Role   | Access                                                                     |
| ------ | -------------------------------------------------------------------------- |
| PLAYER | CRUD on own plans; start own plans                                         |
| ADMIN  | Per existing admin policy (no cross-player private plan access by default) |

Ownership is enforced server-side via authenticated identity — never trust client-supplied player IDs.

### API

```
POST   /api/v1/practice-plans
GET    /api/v1/practice-plans
GET    /api/v1/practice-plans/:planId
PUT    /api/v1/practice-plans/:planId
DELETE /api/v1/practice-plans/:planId
POST   /api/v1/practice-plans/:planId/start
```

### Execution & Snapshot Behavior

Starting a plan:

1. Creates a new practice session via normal Phase 1G orchestration
2. Copies plan deliveries into session delivery records (snapshot)
3. Stores `source_plan_id` on the session for traceability

**Historical immutability:** Later edits to a plan do **not** modify sessions already created from that plan. Deleting a plan does **not** delete historical sessions.

> Historical session and delivery records represent what was requested and what actually occurred and are not rewritten by later practice-plan changes.

### Database

Reuses existing tables:

- `practice_plans`
- `practice_plan_deliveries`

No new migration required for plan MVP.

## Session History & Delivery Review

### History list (`/app/history`)

Shows per session:

- Date/time
- Machine name (when available)
- Status
- Delivery counts (requested, completed, failed/cancelled)
- Duration where derivable from timestamps

### Session detail (`/app/history/[sessionId]`)

Organized into:

1. **Session summary** — status, machine, duration, delivery totals
2. **Requested delivery data** — player configuration
3. **Calculated machine data** — collapsible engineering values (backend only)
4. **Observed/execution data** — timestamps, measured values when available

Uses `DeliveryReviewCard` — never labels calculated values as measured.

## Requested vs Calculated vs Observed

| Category       | Meaning                   | Examples                                      |
| -------------- | ------------------------- | --------------------------------------------- |
| **Requested**  | What the player asked for | target, speed, ball type, count, timing       |
| **Calculated** | What the backend decided  | wheel RPM, actuator positions                 |
| **Observed**   | What the machine reported | execution timestamps, faults, sensor readings |

UI rules:

- Say **"Requested speed: X km/h"** — not **"Ball speed: X km/h"** unless measured
- Show **"Not available"** for missing measurements — never `0` placeholders
- Do not invent accuracy, spin, landing location, or trajectory

## Telemetry Presentation & Persistence

### Live path

High-frequency telemetry → WebSocket/event path (not bulk-persisted).

### Durable path

Meaningful events only → PostgreSQL:

- Faults
- Significant state transitions
- Execution outcomes
- Useful execution measurements

Phase 1I does **not** introduce high-volume telemetry tables.

## Admin Calibration

### Data model

Uses existing `calibration_profiles` table:

- Machine-specific profiles with version, status, `data` JSON
- One **ACTIVE** profile per machine for calculation
- Simulation profiles explicitly marked `_simulation: true`

> Calibration is machine-specific and configurable; simulator values are not production physical constants.

### Calculation flow

```
Machine → Active Calibration → Calculation Engine → Machine Parameters
```

- **SIMULATOR** machines may use explicit simulation fallback (labeled)
- **HARDWARE** machines without ACTIVE calibration → stable error (no silent fake physics)

### Admin API

```
GET  /api/v1/admin/machines
GET  /api/v1/admin/machines/:machineId/calibration
POST /api/v1/admin/machines/:machineId/calibration
GET  /api/v1/admin/calibration/:profileId
PUT  /api/v1/admin/calibration/:profileId
POST /api/v1/admin/calibration/:profileId/activate
```

Calibration changes are written to `audit_logs`. Admin UI does not bypass safety validation or send raw motor commands.

### Admin UI

`/app/admin/calibration` — ADMIN only; list/create/activate profiles.

## Offline / PWA

- Minimal `manifest.webmanifest` for installability
- `OfflineBanner` detects browser offline state
- Machine controls unavailable offline — **no offline command queue**
- Cached static assets only; auth tokens and WS tickets are not cached

## AI Readiness (data model only)

Stable relationships preserved for future linkage:

```
Player → Practice Session → Delivery → Requested / Calculated / Observed
```

No AI schema or inference added in Phase 1I.

## Frontend Routes

| Route                      | Purpose                          |
| -------------------------- | -------------------------------- |
| `/app/plans`               | List saved plans                 |
| `/app/plans/new`           | Create plan                      |
| `/app/plans/[planId]`      | View/edit/delete/start plan      |
| `/app/history`             | Session list                     |
| `/app/history/[sessionId]` | Session detail + delivery review |
| `/app/admin/calibration`   | Admin calibration management     |
| `/app/practice/setup`      | Includes "Save as Practice Plan" |

Shared components reuse Phase 1H-B pitch and setup controls.

## Deferred to Phase 1J

- Full physical calibration wizard / field measurements
- High-frequency telemetry persistence
- Offline command synchronization
- AI/ML analysis and computer vision
- Real ESP32 firmware integration
- Advanced admin dashboard
- Plan sharing between players
