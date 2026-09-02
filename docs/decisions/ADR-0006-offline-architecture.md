# ADR-0006: Offline Architecture

## Status

Accepted

## Context

The bowling machine operates in environments with unreliable or no internet access. Players connect via local Wi-Fi to a backend running on a local machine (Mac or small server). The system must minimize cost and infrastructure dependencies.

## Decision

Design for **local-first operation** with optional cloud connectivity:

1. Backend and PostgreSQL run locally (Docker Compose on Mac or VPS)
2. ESP32 connects to backend via local Wi-Fi WebSocket
3. Player phone connects to backend via local Wi-Fi
4. Supabase Auth used when internet available; offline fallback TBD (UD-05)
5. No mandatory cloud services for machine operation
6. Modular monolith (single backend process)

## Alternatives Considered

| Alternative                   | Reason Rejected                                              |
| ----------------------------- | ------------------------------------------------------------ |
| Cloud-only backend            | Requires internet; adds cost and latency                     |
| ESP32 standalone (no backend) | Cannot run calculation engine; no session management         |
| Raspberry Pi as backend       | Additional hardware cost; Mac sufficient for dev/small scale |
| Kubernetes                    | Massive overkill; expensive; complex                         |
| Microservices                 | Unnecessary complexity for MVP scale                         |
| Redis for pub/sub             | No demonstrated need; WebSocket sufficient                   |

## Consequences

**Positive:**

- Zero cloud cost for local operation
- Low latency (local network)
- Machine works without internet
- Simple deployment (one server process)
- Developer Mac sufficient for development

**Negative:**

- Offline auth not yet solved (UD-05)
- QR code URL strategy unclear for offline (UD-04)
- No automatic cloud backup of session data
- Single point of failure (one backend instance)

## Related

- [Offline Architecture](../architecture/OFFLINE_ARCHITECTURE.md)
- [Deployment](../deployment/DEPLOYMENT.md)
- [Unresolved Decisions](../architecture/UNRESOLVED_DECISIONS.md)
