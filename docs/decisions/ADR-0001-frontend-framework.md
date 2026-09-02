# ADR-0001: Frontend Framework

## Status

Accepted

## Context

The bowling machine requires a mobile-first web application for players to configure deliveries, manage sessions, and view machine status. The application must work on phone browsers connected to local Wi-Fi.

## Decision

Use **Next.js** with **React**, **TypeScript**, **Tailwind CSS**, and **shadcn/ui**.

Supporting libraries:

- TanStack Query for server state
- React Hook Form + Zod for forms and validation
- Shared UI components in `packages/ui`

## Alternatives Considered

| Alternative      | Reason Rejected                                                             |
| ---------------- | --------------------------------------------------------------------------- |
| React (Vite/SPA) | No SSR/SSG; Next.js provides routing, optimization, and deployment benefits |
| Vue/Nuxt         | Less ecosystem alignment with chosen backend (TypeScript/Node)              |
| React Native     | Overkill for MVP; web app works on phone browsers without app store         |
| Svelte/SvelteKit | Smaller ecosystem; team TypeScript/React familiarity assumed                |
| Plain HTML/JS    | Insufficient for complex UI (pitch map, real-time status, forms)            |

## Consequences

**Positive:**

- Strong TypeScript ecosystem for shared types with backend
- App Router supports mobile-first responsive design
- shadcn/ui provides accessible components without vendor lock-in
- TanStack Query handles caching and real-time data well
- Large community and documentation

**Negative:**

- Next.js adds framework complexity vs plain React SPA
- SSR features may be underutilized (most pages are client-interactive)
- shadcn/ui requires Tailwind CSS setup

## Related

- [Frontend Architecture](../frontend/FRONTEND_ARCHITECTURE.md)
- [ADR-0009 Repository Structure](./ADR-0009-repository-structure.md)
