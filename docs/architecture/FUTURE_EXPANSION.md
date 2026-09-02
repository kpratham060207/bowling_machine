# Future Expansion Strategy

> **Status:** Designed (not implemented)
> **Last updated:** 2026-09-02

## Overview

This document outlines planned future capabilities beyond the MVP. None of these are committed to specific timelines.

## Near-Term Expansion (Phase 2–3)

### Enhanced Session Management

- Multi-delivery sessions with varied configurations
- Session templates and saved practice plans
- Session sharing (export/import plans)

### Analytics Dashboard

- Delivery accuracy trends over time
- Speed and type distribution charts
- Session frequency and duration stats
- Personal bests and milestones

### Admin Portal

- Full admin UI (not just API)
- Machine fleet management
- User management dashboard
- Calibration review and approval workflow
- System health monitoring

## Medium-Term Expansion (Phase 4–5)

### Advanced Calibration

- Physics-based calculation engine (model-driven, not just table lookup)
- Automatic calibration suggestions based on session data
- Per-ball-type fine-tuning
- Environmental compensation (temperature, humidity)

### AI-Powered Features

- **Ball tracking:** Camera-based ball trajectory tracking (YOLO + OpenCV)
- **Form analysis:** Batting stance and shot analysis (MediaPipe)
- **Adaptive practice:** AI adjusts delivery difficulty based on player performance
- **Video integration:** Record and replay batting sessions

Architecture for AI services:

```
┌──────────────┐     ┌──────────────┐
│  Backend API │────▶│  AI Service  │
│  (Node.js)   │◀────│  (Python)    │
└──────────────┘     └──────────────┘
                           │
                     ┌─────▼─────┐
                     │  Camera    │
                     │  (future)  │
                     └───────────┘
```

AI services:

- Separate Python process (PyTorch, OpenCV, MediaPipe)
- Communicates with backend via internal API (not direct to frontend or ESP32)
- NEVER controls hardware directly
- Optional — system works fully without AI

### Multi-Machine Support

- Multiple machines at a facility
- Machine selection from list (in addition to QR)
- Machine availability calendar
- Cross-machine analytics

## Long-Term Expansion

### Cloud Sync and Remote Access

- Optional cloud backend for remote monitoring
- Practice data sync across devices
- Coach/family view-only access (requires ADR for new role)

### Competition Mode

- Scored practice sessions
- Leaderboards (personal, not global initially)
- Challenge modes (e.g., "hit 10 consecutive drives")

### Hardware Extensions

- Additional sensor types (ball speed radar, spin rate)
- Automatic ball return mechanism
- Multiple ball type support (different ball weights/conditions)
- Lighting conditions sensor

### Commercial Features

- Multi-tenant support (requires ADR)
- Payment/subscription integration (Stripe — requires ADR)
- Usage metering and billing

## Expansion Principles

1. **Core first** — Every expansion must not break the core delivery flow
2. **Optional enhancements** — AI, cloud, analytics are additive, not required
3. **ADR required** — New roles, services, or infrastructure require an ADR
4. **Safety never deferred** — Safety features cannot be postponed for feature work
5. **Cost conscious** — Prefer local/free solutions; cloud is optional

## Related Documents

- [Roadmap](./ROADMAP.md)
- [MVP Definition](./MVP.md)
- [System Architecture](./SYSTEM_ARCHITECTURE.md)
