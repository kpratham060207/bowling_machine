# ESP32 Firmware

> **Status:** Phase 1J — protocol reference and integration boundary defined. Motor-control firmware not implemented.

## Phase 1J Deliverables

- [PROTOCOL.md](./PROTOCOL.md) — wire protocol reference matching backend implementation
- Integration boundary documented in [docs/machine/PHASE_1J.md](../../docs/machine/PHASE_1J.md)

## Reference Implementation

Use the Node.js simulator as protocol reference until firmware is implemented:

- `apps/esp32-simulator/src/client.ts` — WebSocket connection + auth headers
- `apps/esp32-simulator/src/simulator/command-handler.ts` — command handling + telemetry

## Not Implemented

- GPIO / motor drivers
- Encoder / IMU drivers
- NVS calibration storage (simulator uses in-memory store)
- Local watchdog firmware
- OTA updates

## Building Firmware (Future)

Requires ESP-IDF v5.x (exact version TBD — see UD-08).

```
firmware/esp32/
├── main/
├── components/
├── CMakeLists.txt
└── sdkconfig.defaults
```

## Safety

The ESP32 must enforce local safety independently of backend connectivity. See PROTOCOL.md.
