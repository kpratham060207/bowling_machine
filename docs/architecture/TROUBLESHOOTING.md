# Troubleshooting

> **Status:** Designed (not implemented)
> **Last updated:** 2026-09-02

## Overview

Common issues and diagnostic steps. This document will grow as the system is implemented and tested.

## Connection Issues

### Player cannot connect to machine

| Symptom                          | Possible Cause                         | Diagnostic Steps                                   |
| -------------------------------- | -------------------------------------- | -------------------------------------------------- |
| QR scan opens wrong URL          | QR code outdated or misconfigured      | Verify QR token in `machine_registrations`         |
| "Machine not recognized"         | Invalid or expired QR token            | ADMIN: check machine registration                  |
| "Machine unavailable"            | Machine status INACTIVE or MAINTENANCE | ADMIN: check machine status                        |
| Machine shows offline            | ESP32 not connected to backend         | Check ESP32 Wi-Fi, backend address, WebSocket logs |
| WebSocket disconnects frequently | Network instability                    | Check Wi-Fi signal, router logs                    |

### ESP32 cannot connect to backend

| Symptom                 | Possible Cause               | Diagnostic Steps                              |
| ----------------------- | ---------------------------- | --------------------------------------------- |
| No WebSocket connection | Wrong backend address in NVS | Verify backend IP/hostname in ESP32 config    |
| Authentication rejected | Wrong connection_secret      | Verify secret matches `machine_registrations` |
| Connection drops        | Backend not running          | Check API server status, port availability    |

## Machine Operation Issues

### Machine stuck in state

| State                 | Recovery                                   |
| --------------------- | ------------------------------------------ |
| INITIALIZING          | Wait 30s, then power cycle                 |
| HOMING                | Check limit switches, power cycle          |
| ERROR                 | Clear fault via admin, send homing command |
| EMERGENCY_STOP        | Release physical E-stop, power cycle       |
| SPINNING_UP (timeout) | Send stop command, check encoders          |

### Delivery fails

| Symptom                  | Possible Cause             | Diagnostic Steps                       |
| ------------------------ | -------------------------- | -------------------------------------- |
| "Machine not calibrated" | No calibration data        | ADMIN: upload calibration data         |
| Command rejected         | Machine not in READY state | Check current state, wait or reset     |
| Command expired          | TTL exceeded               | Check network latency, increase TTL    |
| Ball not delivered       | Feed mechanism fault       | Check feed motor, machine enters ERROR |

## Backend Issues

### API returns errors

| Status | Meaning            | Action                              |
| ------ | ------------------ | ----------------------------------- |
| 401    | Auth token expired | Re-login                            |
| 403    | Insufficient role  | Check user role                     |
| 409    | Machine busy       | Wait for active session to complete |
| 500    | Server error       | Check API logs                      |

### Database connection fails

- Verify PostgreSQL is running: `docker compose ps`
- Check DATABASE_URL in `.env`
- Check migration status: `pnpm db:migrate`

## Development Issues

### pnpm install fails

- Verify Node.js 20 LTS installed
- Clear cache: `pnpm store prune`

### Docker Compose fails

- Verify Docker is running
- Check port 5432 is not in use

## Log Locations (Future)

| Component  | Log Location                                 |
| ---------- | -------------------------------------------- |
| API        | stdout / `logs/api.log`                      |
| Web        | Browser dev tools console                    |
| ESP32      | Serial monitor (`idf.py monitor`)            |
| PostgreSQL | Docker logs (`docker compose logs postgres`) |
| Simulator  | stdout                                       |

## Related Documents

- [Failure Modes](./FAILURE_MODES.md)
- [Safety Architecture](../security/SAFETY_ARCHITECTURE.md)
- [Development Guide](./DEVELOPMENT_GUIDE.md)
