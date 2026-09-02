# QR Connection

> **Status:** Designed (not implemented)
> **Last updated:** 2026-09-02

## Overview

Players connect to a bowling machine by scanning a QR code affixed to the machine. The QR code identifies the machine and initiates the connection flow.

## Connection Flow

```
Player scans QR code on machine
        │
        ▼
Browser opens web app URL with machine token
        │
        ▼
Web app extracts qr_token from URL
        │
        ▼
Web app calls POST /api/v1/machines/connect { qr_token }
        │
        ▼
Backend looks up machine_registrations by qr_token
        │
        ├── Not found → Error: "Machine not recognized"
        ├── Machine INACTIVE → Error: "Machine unavailable"
        │
        └── Found → Return machine details + establish WebSocket subscription
                │
                ▼
        Player sees machine status dashboard
```

## QR Code Content

The QR code encodes a URL:

```
https://<app_host>/connect?token=<qr_code_token>
```

| Field           | Description                                             |
| --------------- | ------------------------------------------------------- |
| `app_host`      | Web app hostname (cloud or local)                       |
| `qr_code_token` | Unique token from `machine_registrations.qr_code_token` |

### Local Network Consideration

For offline/local operation, the QR code URL must resolve to the local backend. Options (see [Unresolved Decisions](../architecture/UNRESOLVED_DECISIONS.md)):

1. **Fixed local URL** — QR encodes local IP/host, requires network-specific QR codes
2. **Redirect service** — QR encodes cloud URL that redirects to local IP when reachable
3. **Dual QR** — Machine has two QR codes (local + cloud)

## Security

- QR token is a random 64-character string, not guessable
- Token maps to a specific machine, not a user
- Scanning QR does not grant access without authentication (player must be logged in)
- QR token can be rotated by ADMIN (invalidates old QR code)
- Connection secret (for ESP32 auth) is separate from QR token

## Machine Registration (Admin Flow)

```
ADMIN registers new machine
        │
        ▼
Backend creates:
  - machines row (name, serial_number)
  - machine_registrations row (qr_code_token, connection_secret)
        │
        ▼
System generates QR code image from URL
        │
        ▼
ADMIN prints and affixes QR code to machine
        │
        ▼
ADMIN configures ESP32 with:
  - Wi-Fi credentials
  - Backend address
  - connection_secret
  - machine_id
```

## Multiple Players

When multiple players scan the same machine QR:

- All authenticated players can view machine status
- Only one active practice session per machine at a time
- Second player attempting to start a session receives "Machine in use" (409)
- Viewing status while another player has an active session is allowed

See [Unresolved Decisions](../architecture/UNRESOLVED_DECISIONS.md) for session locking details.

## Related Documents

- [Player Account Architecture](./PLAYER_ACCOUNT_ARCHITECTURE.md)
- [Offline Architecture](./OFFLINE_ARCHITECTURE.md)
- [API Specification](../api/API_SPECIFICATION.md)
