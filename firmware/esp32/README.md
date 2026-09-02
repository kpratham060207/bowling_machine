# ESP32 Firmware (Structural Placeholder)

> **Status:** Phase 1A — directory only. No firmware implementation.

This directory is reserved for ESP-IDF firmware (`C/C++`) per [ESP32 Architecture](../../docs/embedded/ESP32_ARCHITECTURE.md).

## Not implemented in Phase 1A

- GPIO pin assignments
- Motor drivers
- Encoder / IMU drivers
- Actuator control
- RPM limits or physical units
- Machine state machine code

Firmware development begins in Phase 3 after simulator and backend protocol work.

## Future layout (planned)

```
firmware/esp32/
├── main/
├── components/
├── CMakeLists.txt
└── sdkconfig.defaults
```

Build with ESP-IDF v5.x (exact version TBD — see UD-08).
