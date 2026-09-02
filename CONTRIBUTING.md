# Contributing to Bowling Machine

Thank you for contributing. This project follows structured engineering practices to ensure safety, clarity, and maintainability.

## Current Phase

The project is in **Phase 0: Architecture & Documentation**. No application code exists yet. Phase 1 (MVP) will begin after architecture review.

## Before You Start

1. Read [System Architecture](docs/architecture/SYSTEM_ARCHITECTURE.md)
2. Read [.cursor/rules/project-architecture.mdc](.cursor/rules/project-architecture.mdc)
3. Check [Unresolved Decisions](docs/architecture/UNRESOLVED_DECISIONS.md) for open questions
4. Review relevant ADRs in [docs/decisions/](docs/decisions/)

## Development Workflow

### Branch Naming

```
feature/<description>    — New features
fix/<description>        — Bug fixes
docs/<description>       — Documentation changes
chore/<description>      — Tooling, config, dependencies
```

### Commit Format

```
type(scope): description
```

Types: `feat`, `fix`, `docs`, `chore`, `test`, `refactor`, `ci`

Examples:

- `docs(architecture): add failure modes document`
- `feat(api): add delivery validation endpoint`
- `fix(firmware): clamp actuator position to limit switch range`

### Pull Request Process

1. Create a feature branch from `main`
2. Make changes following project architecture rules
3. Update documentation if architecture or behavior changes
4. Create ADR for significant architectural decisions
5. Open PR with clear description of changes
6. Ensure CI passes (when CI is configured)

## Code Standards

### All Code

- TypeScript strict mode
- Validate all external input with Zod
- Verbose comments explaining **why**, not obvious syntax
- No secrets in code or version control
- Match existing conventions in the file/module

### Frontend (`apps/web`)

- Mobile-first responsive design
- User-level parameters only — never machine parameters
- Use components from `packages/ui`
- Use schemas from `packages/api-contracts`

### Backend (`apps/api`)

- All routes validate input/output with Zod
- Business logic in modules, not route handlers
- Database access via Drizzle ORM only
- Treat ESP32 commands as untrusted

### Firmware (`firmware/esp32`)

- Comments must include units, physical meaning, valid ranges, safety implications
- Safety monitor task has highest priority
- All network commands validated before execution
- State machine enforced locally

## Documentation Requirements

- Update docs when changing architecture or behavior
- Mark implementation status accurately (Designed / In Progress / Implemented / Verified)
- Do not claim features are implemented when they are not
- Do not claim hardware has been tested until it has
- Add entries to [Unresolved Decisions](docs/architecture/UNRESOLVED_DECISIONS.md) rather than silently deciding

## Architecture Decision Records

Create an ADR in `docs/decisions/` when:

- Choosing between technology alternatives
- Making decisions that are difficult to reverse
- Establishing patterns that others must follow

Use the existing ADRs as templates.

## Safety Considerations

This project controls a physical machine that launches cricket balls at high speed. When working on firmware or safety-related code:

- Never bypass safety checks
- Document safety implications in comments
- Test safety mechanisms explicitly
- Physical emergency stop must remain independent of software

## Questions?

Check [Unresolved Decisions](docs/architecture/UNRESOLVED_DECISIONS.md) first. If your question isn't answered there, open a discussion or issue.
