# Unresolved Decisions

> **Status:** Living document
> **Last updated:** 2026-09-02 (UD-01 resolved — interaction model defined; physical mapping deferred)

## Overview

This document tracks architectural and engineering decisions that have NOT been made yet. Items listed here must NOT be silently decided during implementation — they require explicit discussion and resolution (often via ADR).

## Defined (No Longer Open)

### UD-01: Pitch Target Coordinate Model

**Decision:** The interaction model and normalized coordinate representation are **defined**.

| Aspect                    | Status                                | Detail                                                                            |
| ------------------------- | ------------------------------------- | --------------------------------------------------------------------------------- |
| Player interaction        | **Defined**                           | Tap/click on perspective pitch visualization; no manual coordinate entry          |
| Normalized UI coordinates | **Defined**                           | `ui_x`, `ui_y` — pointer position relative to image bounds (0.0–1.0)              |
| Pitch Coordinate Mapper   | **Defined**                           | Configurable, replaceable abstraction: UI coords → `target_x`, `target_y`         |
| Persisted target          | **Defined**                           | `target_x`, `target_y` — normalized interactive pitch coordinate system (0.0–1.0) |
| Perspective correction    | **Defined**                           | Screen Y must NOT map linearly to pitch distance; handled by mapper               |
| Frontend/backend boundary | **Defined**                           | Frontend: display, selection, mapper; Backend: trajectory, machine params         |
| Cricket region labels     | **Defined (deferred implementation)** | Eventually supported; must NOT be hard-coded unless explicitly configured         |

**What remains calibration-dependent:**

The exact transformation from the **pitch coordinate system** to the **machine's physical coordinate system** remains calibration-dependent and must be finalized using the actual machine geometry and experimental calibration.

**Why physical mapping is intentionally deferred:**

- Machine geometry (actuator layout, wheel placement, feed mechanism) is not yet finalized
- No experimental calibration data exists
- Inventing RPM mappings, launch angles, actuator positions, or physical constants would create false confidence and unsafe assumptions
- The calculation engine is designed as a replaceable, calibration-driven module that cannot operate without real data

**Documents:** [Pitch Visualization](../frontend/PITCH_VISUALIZATION.md), [Calculation Engine](../calibration/CALCULATION_ENGINE.md), [ADR-0010](../decisions/ADR-0010-pitch-coordinate-layers.md)

**Status:** RESOLVED (interaction model); physical pitch→machine mapping tracked under [Remaining Physical Calibration Questions](#remaining-physical-calibration-questions) below

---

## Critical (Block Hardware / Calibration Phase)

### UD-02: Actuator Position Units

**Question:** What units are used for actuator positions (steps, mm, degrees, normalized)?

**Context:** Machine commands include `actuator1_target_position` through `actuator4_target_position` but the unit and range are undefined.

**Impact:** ESP32 firmware, calculation engine, calibration system, protocol.

**Status:** UNRESOLVED

---

### UD-03: Wheel RPM Range

**Question:** What are the safe and achievable RPM ranges for the launch wheels?

**Context:** Safety architecture requires maximum RPM enforcement, but actual values depend on motor/wheel specifications.

**Impact:** Safety system, calibration, calculation engine.

**Status:** UNRESOLVED — depends on hardware selection.

---

## High Priority (Block Phase 2+)

### UD-04: QR Code URL Strategy for Offline

**Question:** How does the QR code URL work when there is no internet?

**Context:** QR codes typically encode cloud URLs, but the system must work offline on local Wi-Fi.

**Options:**

1. QR encodes local IP/hostname directly (network-specific QR codes)
2. QR encodes cloud URL that redirects to local IP when reachable
3. QR encodes app URL with token; app discovers backend via mDNS
4. Dual QR codes (local + cloud)

**Impact:** QR connection flow, machine registration, offline architecture.

**Status:** UNRESOLVED

---

### UD-05: Offline Authentication Fallback

**Question:** How do players authenticate when Supabase Auth is unreachable?

**Context:** Supabase requires internet. Local Wi-Fi may not have internet access.

**Options:**

1. Cached JWT with extended local validation (accept expired JWT locally)
2. Local auth fallback (separate local credentials)
3. Require internet for first login, then cache session indefinitely
4. Machine-generated temporary access tokens

**Impact:** Offline architecture, auth flow, security.

**Status:** UNRESOLVED

---

### UD-06: Session Locking Strategy

**Question:** What happens when multiple players connect to the same machine?

**Context:** Multiple players may scan the same QR code. Only one should control the machine at a time.

**Options:**

1. First-come-first-served session lock (MVP approach)
2. Queue system (players wait their turn)
3. Shared viewing, single controller (others watch only)
4. Admin-assigned priority

**Impact:** Session management, UX, API design.

**Status:** UNRESOLVED — MVP assumes option 1.

---

### UD-07: Network Loss During Active Delivery

**Question:** What should the ESP32 do when backend connection is lost mid-delivery?

**Context:** Safety architecture says "complete current ball then stop" but the exact behavior is not finalized.

**Options:**

1. Complete current ball, then stop and wait for reconnection
2. Complete entire loaded sequence, then stop
3. Stop immediately (safest)
4. Continue sequence with locally stored commands (requires command buffering)

**Impact:** Safety, ESP32 firmware, offline architecture.

**Status:** UNRESOLVED

---

## Medium Priority (Block Phase 1 UI)

### UD-18: Perspective Transform Algorithm

**Question:** Which algorithm maps normalized UI coordinates to pitch reference coordinates for the perspective reference image?

**Context:** The reference image uses perspective foreshortening. Screen Y must not map linearly to pitch distance. A configurable transformation is required, versioned with the reference image asset.

**Options:**

1. Bilinear / triangle mesh interpolation over manually defined control points
2. Inverse homography from image corner/line correspondences
3. 2D lookup grid with bilinear interpolation
4. Combination: homography for rough mapping + local correction grid from calibration

**Impact:** `packages/shared/pitch-coordinates`, PitchMapSelector accuracy, unit tests.

**Status:** UNRESOLVED — do not implement until reference image is finalized.

---

### UD-19: Reference Image Asset

**Question:** When will the cricket-pitch perspective reference image be supplied and what are its exact dimensions/viewpoint?

**Context:** The Throw Ball UI must visually match this asset. Perspective transform config is tied to the specific image. Asset path: `apps/web/public/assets/cricket-pitch-reference.webp`.

**Impact:** Pitch visualization implementation, perspective config, UI layout.

**Status:** UNRESOLVED — asset not yet in repository.

---

## Medium Priority (Block Phase 3+)

### UD-08: ESP-IDF Version

**Question:** Which ESP-IDF version to target?

**Context:** ESP-IDF v5.x is current, but exact minor version affects API availability.

**Impact:** Firmware development.

**Status:** UNRESOLVED — recommend latest stable v5.x when firmware phase begins.

---

### UD-09: Build Orchestration Tool

**Question:** Turborepo vs pnpm recursive scripts for monorepo build orchestration?

**Context:** Both work with pnpm workspaces. Turborepo adds caching but also complexity.

**Impact:** Developer experience, CI pipeline.

**Status:** UNRESOLVED — decide during Phase 1 setup.

---

### UD-10: Deployment Mechanism

**Question:** How to deploy to production VPS?

**Options:**

1. Docker containers on VPS
2. Direct Node.js with PM2/systemd
3. rsync + restart script
4. GitHub Actions → SSH deploy

**Impact:** Deployment, CI/CD.

**Status:** UNRESOLVED — decide during Phase 2.

---

### UD-11: E-Stop Recovery Procedure

**Question:** After E-stop release, can the machine auto-recover or is power cycle required?

**Context:** Safety architecture mentions both options. Depends on hardware E-stop circuit design.

**Impact:** State machine, recovery UX.

**Status:** UNRESOLVED — depends on hardware design.

---

### UD-12: IMU Failure Behavior

**Question:** Can the machine operate without IMU feedback?

**Context:** IMU provides orientation data. If it fails, should deliveries be blocked or allowed with degraded accuracy?

**Impact:** Safety, firmware, calculation engine.

**Status:** UNRESOLVED

---

### UD-12a: IMU Angle Units

**Question:** What physical unit do IMU pitch/roll/yaw values use (degrees, radians, raw sensor counts)?

**Context:** Architecture identifies pitch/roll/yaw axes but does not finalize the hardware representation. Phase 1B contracts store numeric values only with unit marked UNRESOLVED. Firmware may provisionally use degrees, but this is replaceable once hardware specification is complete.

**Impact:** ESP32 firmware, telemetry parsing, calibration.

**Status:** UNRESOLVED

---

### UD-13: Command Buffering on ESP32

**Question:** Should the ESP32 buffer multiple commands locally for offline operation?

**Context:** Would allow pre-loading a full session sequence, enabling operation without continuous backend connection.

**Impact:** ESP32 firmware complexity, offline capability, safety.

**Status:** UNRESOLVED

---

### UD-14: Speed Unit Validation Range

**Question:** What is the maximum achievable/desirable ball speed in km/h?

**Context:** API validates `desired_speed_kmh > 0` but upper bound is undefined.

**Impact:** API validation, calculation engine, calibration.

**Status:** UNRESOLVED — depends on hardware capability.

---

## Low Priority (Future)

### UD-15: mDNS for Local Discovery

**Question:** Should the backend and/or ESP32 advertise via mDNS for automatic discovery?

**Status:** UNRESOLVED

### UD-16: Firmware Update Mechanism

**Question:** How to update ESP32 firmware in the field (OTA, USB, SD card)?

**Status:** UNRESOLVED — requires ADR when needed.

### UD-17: Database Backup Strategy

**Question:** How to backup PostgreSQL in production?

**Status:** UNRESOLVED — decide during Phase 2.

### UD-20: Cricket Region Classification Configuration

**Question:** How should human-readable region labels (yorker, good length, outside off, etc.) be defined and configured?

**Context:** The Throw Ball UI will eventually display cricket-oriented target descriptions. These must NOT be hard-coded in UI logic unless explicitly defined in configuration.

**Options:**

1. Configurable region polygons in pitch coordinate space (versioned JSON)
2. Backend-provided label lookup from `target_x`/`target_y`
3. Defer until after initial calibration establishes pitch coordinate semantics

**Impact:** Frontend target summary, UX clarity.

**Status:** UNRESOLVED — optional for Phase 1; display normalized coords or generic label until defined

---

### UD-21: Machine Peer Authentication Semantics

**Question:** What is the final machine-to-backend authentication mechanism?

**Context:** Phase 1C stores `machine_registrations.connection_secret_hash` as provisional infrastructure for ESP32 WebSocket peer auth. ADR-0005 accepts header-based connection secret in principle, but details are not finalized: header names, rotation policy, challenge-response, simulator vs hardware differences, and relationship to QR token lookup.

**Constraints (fixed):**

- QR code identifies machine via `qr_code_token` only — no secrets in QR
- Plaintext peer credentials never persisted in database
- Browser never authenticates as machine peer

**Impact:** ESP32 protocol, machine gateway, `machine_registrations` table usage, threat model T1/T5.

**Status:** UNRESOLVED — table retained as provisional registration model (Phase 1C review decision A)

---

## Remaining Physical Calibration Questions

These questions cannot be answered until actual machine geometry exists and experimental calibration is performed. They are **intentionally deferred** — not oversights.

| ID     | Question                                                                                           | Depends On                                        |
| ------ | -------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| PCQ-01 | Mapping from `target_x`/`target_y` to physical pitch location (metres from stumps, lateral offset) | Machine geometry, calibration experiments         |
| PCQ-02 | Mapping from pitch target to required trajectory (launch angle, orientation)                       | PCQ-01, ball physics, machine mounting            |
| PCQ-03 | Mapping from trajectory to wheel RPM pair                                                          | Motor/wheel specs, encoder feedback, calibration  |
| PCQ-04 | Mapping from trajectory to actuator positions                                                      | Actuator mechanics, limit switches, calibration   |
| PCQ-05 | Mapping from speed + ball type to feeder timing                                                    | Feed mechanism, wheel acceleration profile        |
| PCQ-06 | Safe maximum/minimum wheel RPM                                                                     | Hardware specs, structural limits, safety testing |
| PCQ-07 | Actuator position units and safe ranges                                                            | Hardware specs, homing procedure                  |
| PCQ-08 | Pitch Coordinate Mapper control points for reference image                                         | Reference image asset finalized (UD-19)           |

**Why deferred:** Answering these without hardware would require inventing physical constants, which violates project safety and calibration architecture. The calculation engine and Pitch Coordinate Mapper are designed to accept configuration/calibration data when available.

---

## Resolution Process

1. Identify decision needed (during implementation or review)
2. Document options and trade-offs in this file
3. Discuss with team/stakeholders
4. Create ADR if decision is architectural
5. Update this file with resolution and link to ADR
6. Update affected architecture documents

## Related Documents

- [ADRs](../decisions/)
- [Roadmap](./ROADMAP.md)
- [MVP Definition](./MVP.md)
