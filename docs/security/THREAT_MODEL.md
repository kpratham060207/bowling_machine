# Threat Model

> **Status:** Designed (not implemented)
> **Last updated:** 2026-09-02

## Overview

Identifies security threats to the bowling machine system and planned mitigations. This is a design-level threat model; no penetration testing has been performed.

## System Boundaries

```
[Internet] ──▶ [Supabase Auth] ──▶ [Backend API] ◀──WS──▶ [ESP32] ──▶ [Hardware]
                     ▲                  ▲
                     │                  │
                [Browser]          [Local Network]
```

## Threat Actors

| Actor                        | Capability                 | Motivation                  |
| ---------------------------- | -------------------------- | --------------------------- |
| Unauthenticated user         | Network access to web app  | Curiosity, vandalism        |
| Authenticated player         | Valid account, API access  | Misuse, pranks              |
| Malicious local network user | Same Wi-Fi as machine      | Machine control, disruption |
| Compromised backend          | Server access              | Remote machine control      |
| Physical attacker            | Physical access to machine | Sabotage, injury            |

## Threat Analysis

### T1: Unauthorized Machine Control

**Threat:** Attacker sends commands to ESP32 without authentication.

| Mitigation                                       | Layer          |
| ------------------------------------------------ | -------------- |
| Machine connection secret required for WebSocket | ESP32 comm     |
| Command parameter validation and range checks    | ESP32 firmware |
| State machine rejects commands in wrong state    | ESP32 firmware |
| Physical E-stop independent of software          | Hardware       |
| RPM and position limits enforced locally         | ESP32 firmware |

**Residual risk:** Compromised connection secret allows command submission (within validated ranges).

### T2: JWT Theft / Session Hijacking

**Threat:** Attacker steals player JWT to impersonate user.

| Mitigation                                    | Layer     |
| --------------------------------------------- | --------- |
| HTTPS in production                           | Transport |
| JWT expiry (Supabase managed)                 | Auth      |
| Refresh token rotation                        | Auth      |
| No sensitive actions without re-auth (future) | Backend   |

### T3: Injection via API Inputs

**Threat:** Malicious input in delivery parameters, profile data, etc.

| Mitigation                          | Layer    |
| ----------------------------------- | -------- |
| Zod schema validation on all inputs | Backend  |
| Parameterized queries (Drizzle ORM) | Database |
| No dynamic SQL                      | Database |
| JSONB schema validation             | Backend  |

### T4: Denial of Service

**Threat:** Attacker floods API or WebSocket with requests.

| Mitigation                                      | Layer   |
| ----------------------------------------------- | ------- |
| Rate limiting on auth endpoints (future)        | Backend |
| WebSocket connection limits                     | Backend |
| Command TTL prevents stale command accumulation | ESP32   |
| ESP32 ignores commands when busy                | ESP32   |

### T5: Man-in-the-Middle (Local Network)

**Threat:** Attacker on same Wi-Fi intercepts or modifies WebSocket traffic.

| Mitigation                                | Layer          |
| ----------------------------------------- | -------------- |
| WSS (TLS) in production                   | Transport      |
| Machine connection secret                 | Authentication |
| Command TTL limits replay window          | ESP32          |
| Local network only (no internet required) | Network scope  |

**Note:** Local network MITM on unencrypted WebSocket is a known risk in development mode.

### T6: Privilege Escalation

**Threat:** Player attempts to access admin functions.

| Mitigation                              | Layer   |
| --------------------------------------- | ------- |
| Role checked on every admin endpoint    | Backend |
| Role stored in database, not JWT claims | Backend |
| Admin actions logged in audit_logs      | Backend |

### T7: Physical Tampering

**Threat:** Physical access to machine wiring, ESP32, or E-stop.

| Mitigation                                                   | Layer               |
| ------------------------------------------------------------ | ------------------- |
| E-stop is hardware circuit (cannot be bypassed via software) | Hardware            |
| Enclosed machine electronics                                 | Physical            |
| Limit switches prevent over-travel                           | Hardware + firmware |

**Note:** Physical security of the machine enclosure is a hardware design concern.

### T8: Data Exposure

**Threat:** Player data leaked or accessed by unauthorized users.

| Mitigation                            | Layer                 |
| ------------------------------------- | --------------------- |
| Players see only own data             | Backend authorization |
| Admin data access logged              | Audit logs            |
| Database credentials in env vars only | Configuration         |
| No secrets in version control         | Git hygiene           |

## Security Requirements Summary

1. All API inputs validated with Zod
2. All ESP32 commands treated as untrusted
3. No secrets in version control
4. HTTPS/WSS in production
5. Role-based access control (PLAYER/ADMIN)
6. Audit logging for admin actions
7. Physical E-stop independent of software

## Related Documents

- [Safety Architecture](./SAFETY_ARCHITECTURE.md)
- [Player Account Architecture](../architecture/PLAYER_ACCOUNT_ARCHITECTURE.md)
- [SECURITY.md](../../SECURITY.md)
