# ADR-0003: Database

## Status

Accepted

## Context

The system needs persistent storage for user profiles, practice sessions, delivery records, machine registrations, calibration data, and audit logs. The data is relational with clear entity relationships.

## Decision

Use **PostgreSQL** with **Drizzle ORM**.

Database runs locally via Docker Compose for development. Production deployment uses a managed or self-hosted PostgreSQL instance.

## Alternatives Considered

| Alternative       | Reason Rejected                                                           |
| ----------------- | ------------------------------------------------------------------------- |
| SQLite            | Insufficient for concurrent WebSocket + API access; no production scaling |
| MongoDB           | Relational data (sessions, deliveries, users) fits SQL better             |
| Supabase Database | Couples storage to Supabase; local offline operation requires local DB    |
| MySQL             | PostgreSQL has better JSON support (JSONB for calibration data)           |
| Prisma ORM        | Heavier runtime; Drizzle is lighter and more SQL-transparent              |

## Consequences

**Positive:**

- PostgreSQL handles relational data, JSONB, and enums natively
- Drizzle is lightweight, TypeScript-native, SQL-transparent
- Docker Compose makes local development simple
- JSONB columns for flexible calibration data and preferences
- Strong ecosystem and tooling

**Negative:**

- Requires Docker for local development
- Drizzle is newer than Prisma (smaller community)
- Database migrations must be managed explicitly

## Related

- [Database Design](../database/DATABASE_DESIGN.md)
- [ADR-0004 Authentication](./ADR-0004-authentication.md)
