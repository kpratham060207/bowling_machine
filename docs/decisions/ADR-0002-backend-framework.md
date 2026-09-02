# ADR-0002: Backend Framework

## Status

Accepted

## Context

The backend must handle REST API requests, WebSocket connections (browser and ESP32), request validation, authentication, and business logic including the calculation engine. It should be lightweight, TypeScript-native, and suitable for a modular monolith.

## Decision

Use **Node.js** with **Fastify**, **TypeScript**, and **Zod**.

WebSocket support via the `ws` library integrated as a Fastify plugin.

## Alternatives Considered

| Alternative      | Reason Rejected                                                            |
| ---------------- | -------------------------------------------------------------------------- |
| Express          | Slower; less TypeScript-native; less structured plugin system              |
| NestJS           | Over-engineered for modular monolith; heavy decorator pattern              |
| Hono             | Less mature WebSocket ecosystem                                            |
| Go (Gin/Fiber)   | Different language from frontend; splits TypeScript ecosystem              |
| Python (FastAPI) | Better for AI services (future); not ideal for real-time WebSocket gateway |
| tRPC             | Couples frontend/backend too tightly; ESP32 cannot use tRPC                |

## Consequences

**Positive:**

- Shared TypeScript types with frontend via `packages/api-contracts`
- Fastify is one of the fastest Node.js frameworks
- Zod validation shared across frontend and backend
- Single language (TypeScript) for web + API + simulator
- Good WebSocket plugin support

**Negative:**

- Node.js single-threaded (mitigated by async I/O for this workload)
- Less structured than NestJS (mitigated by clear module boundaries)

## Related

- [Backend Architecture](../backend/BACKEND_ARCHITECTURE.md)
- [ADR-0009 Repository Structure](./ADR-0009-repository-structure.md)
