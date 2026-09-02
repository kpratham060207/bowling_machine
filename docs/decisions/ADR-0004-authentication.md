# ADR-0004: Authentication

## Status

Accepted

## Context

The system needs user authentication for PLAYER and ADMIN roles. Auth must support registration, login, and JWT-based API authorization. Offline operation is a requirement, creating tension with cloud-only auth.

## Decision

Use **Supabase Auth** for authentication (registration, login, JWT issuance).

Local `users` table mirrors Supabase user ID and stores the **role** (PLAYER/ADMIN). Role is looked up from the local database on each request, not from JWT claims.

## Alternatives Considered

| Alternative                | Reason Rejected                                     |
| -------------------------- | --------------------------------------------------- |
| Custom auth (bcrypt + JWT) | Reinventing auth; security risk; maintenance burden |
| Auth0                      | Paid service; overkill for two roles                |
| Firebase Auth              | Google ecosystem lock-in                            |
| Clerk                      | Paid service; unnecessary for MVP                   |
| Local-only auth            | No remote access; no account recovery               |
| Passport.js                | More setup than Supabase; no hosted auth features   |

## Consequences

**Positive:**

- Supabase free tier sufficient for MVP
- JWT verification via JWKS (standard)
- Email/password auth out of the box
- Role stored locally enables immediate revocation
- OAuth providers available if needed later

**Negative:**

- Requires internet for registration and initial login
- Offline auth fallback not yet designed (see UD-05)
- Dependency on Supabase availability
- Service role key must be protected (never in frontend)

## Related

- [Player Account Architecture](../architecture/PLAYER_ACCOUNT_ARCHITECTURE.md)
- [Unresolved Decisions: UD-05](../architecture/UNRESOLVED_DECISIONS.md)
- [Threat Model](../security/THREAT_MODEL.md)
