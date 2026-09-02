# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability, please report it responsibly. Do not open a public issue.

Contact: TBD (project maintainer email)

## Security Principles

1. **Defense in depth** — Multiple independent security layers
2. **Least privilege** — PLAYER and ADMIN roles with minimum necessary access
3. **No trust in network input** — All inputs validated; ESP32 commands treated as untrusted
4. **Secrets never in version control** — Environment variables only
5. **Safety independent of software** — Physical E-stop, ESP32 watchdog, local limits

## Secrets Management

### Never Commit

- Passwords or password hashes
- API keys or tokens
- Supabase service role keys
- Database credentials
- Machine connection secrets
- Private keys or certificates
- `.env` files

### Use Environment Variables

Copy `.env.example` to `.env` and fill in values locally. See `.env.example` for the full list.

### Git Hygiene

- `.gitignore` excludes `.env`, secrets, and credentials
- Pre-commit secret scanning recommended (future CI setup)
- Rotate secrets immediately if accidentally committed

## Authentication

- Supabase Auth manages passwords and JWT issuance
- JWT verified on every API request
- Role (PLAYER/ADMIN) stored in local database, looked up per request
- Admin role assigned manually, logged in audit trail

## Input Validation

- All API inputs validated with Zod schemas from `packages/api-contracts`
- ESP32 validates all received commands (range, TTL, state)
- Database queries via Drizzle ORM (parameterized, no raw SQL)
- JSONB fields validated against expected schemas

## Network Security

- HTTPS/WSS in production
- Machine WebSocket authenticated via connection secret
- Command TTL prevents stale command execution
- Local network operation reduces external attack surface

## Known Limitations

- Local network WebSocket may be unencrypted in development
- Offline auth fallback not yet designed (see UD-05)
- No rate limiting in MVP (planned for Phase 2)
- No penetration testing performed

## Threat Model

See [Threat Model](docs/security/THREAT_MODEL.md) for detailed threat analysis.

## Safety vs Security

Safety (preventing physical harm) is enforced by ESP32 firmware independently of security (preventing unauthorized access). Both are critical but operate at different layers. See [Safety Architecture](docs/security/SAFETY_ARCHITECTURE.md).
