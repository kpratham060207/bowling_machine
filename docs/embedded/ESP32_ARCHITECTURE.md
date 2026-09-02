# ESP32 Architecture

> **Status:** Designed (not implemented)
> **Last updated:** 2026-09-02

## Overview

The ESP32 firmware is the real-time machine controller and the **final authority on machine safety**. It runs on ESP-IDF and manages all hardware interactions directly.

## Hardware Interfaces

| Component           | Interface                       | Purpose                      |
| ------------------- | ------------------------------- | ---------------------------- |
| Launch Motor 1      | PWM + GPIO                      | Wheel 1 speed control        |
| Launch Motor 2      | PWM + GPIO                      | Wheel 2 speed control        |
| Feed Motor          | PWM + GPIO                      | Ball feeding mechanism       |
| Actuator 1–4        | Stepper/servo driver            | Lead-screw positioning       |
| IMU                 | I2C/SPI                         | Machine orientation feedback |
| Encoders (×2)       | GPIO interrupt                  | Launch wheel speed feedback  |
| Limit/Home Switches | GPIO input                      | Actuator position limits     |
| Emergency Stop      | GPIO input (hardware interrupt) | Physical safety stop         |
| Main Power Switch   | GPIO input                      | Power state detection        |
| Status Sensors      | GPIO/ADC                        | Additional safety/status     |

## Firmware Module Structure

```
firmware/esp32/
├── main/
│   ├── main.c                  # Entry point, FreeRTOS task creation
│   ├── state_machine.c/h       # Machine state machine
│   ├── motor_control.c/h       # Launch wheel motor control
│   ├── actuator_control.c/h    # Lead-screw actuator control
│   ├── feeder_control.c/h      # Ball feed mechanism
│   ├── sensor_reader.c/h       # IMU, encoders, switches
│   ├── safety_monitor.c/h      # Watchdog, limits, E-stop
│   ├── comm_client.c/h         # WebSocket client to backend
│   ├── command_handler.c/h     # Command validation and dispatch
│   ├── config_store.c/h        # NVS calibration/config storage
│   └── telemetry.c/h           # Status reporting
├── components/                 # ESP-IDF reusable components
├── CMakeLists.txt
└── sdkconfig.defaults
```

## FreeRTOS Task Architecture

| Task               | Priority | Responsibility                           |
| ------------------ | -------- | ---------------------------------------- |
| `safety_monitor`   | Highest  | E-stop, watchdog, limit checks           |
| `motor_control`    | High     | Launch wheel PWM, encoder feedback loop  |
| `actuator_control` | High     | Position control, homing                 |
| `feeder_control`   | Medium   | Ball feed timing                         |
| `state_machine`    | Medium   | State transitions, command orchestration |
| `sensor_reader`    | Medium   | IMU polling, encoder counting            |
| `comm_client`      | Low      | WebSocket to backend                     |
| `telemetry`        | Low      | Periodic status reporting                |

Safety task runs at highest priority and can override all other tasks.

## Responsibilities

### Real-Time Motor Control

- PWM generation for launch wheel motors
- Closed-loop speed control using encoder feedback
- Independent wheel speed for swing/spin variation
- Ramp-up/ramp-down profiles (calibration-dependent)

### Actuator Control

- Position commands for 4 lead-screw actuators
- Homing sequence using limit switches
- Position feedback and limit enforcement

### Feeder Control

- Timed ball release mechanism
- Coordination with wheel speed readiness

### Safety (Non-Negotiable)

- Physical emergency stop handling (hardware interrupt)
- Maximum wheel RPM enforcement
- Actuator position limits via limit switches
- Stale command rejection (TTL expiry)
- Invalid command rejection (range checks)
- Watchdog timer (reset if firmware hangs)
- Safe state on network loss (stop motors)
- Safe state on power interruption recovery
- Safe state on firmware restart (require homing)

### Command Validation

All commands from the backend are treated as **untrusted input**:

- Validate all parameter ranges against calibration limits
- Reject commands if machine is not in appropriate state
- Reject expired commands (TTL)
- Log rejected commands for diagnostics

### Telemetry

Periodic and event-driven status reports:

- Current machine state
- Wheel speeds (actual RPM from encoders)
- Actuator positions
- IMU orientation
- Safety sensor states
- Error/fault codes

## Calibration Storage

Calibration data stored in ESP32 NVS (Non-Volatile Storage):

- Maximum/minimum wheel RPM
- Actuator position limits
- Speed-to-RPM mapping tables
- Position-to-coordinate mapping
- Feeder timing parameters

Calibration can be updated via backend command (validated, versioned).

## Boot Sequence

```
Power On
    │
    ▼
INITIALIZING (self-test, sensor check)
    │
    ▼
Network connect attempt (non-blocking)
    │
    ▼
HOMING (all actuators to home position via limit switches)
    │
    ▼
READY (awaiting commands)
```

If homing fails → ERROR state.
If E-stop active at boot → EMERGENCY_STOP state.

## Network Behavior

- ESP32 connects to local Wi-Fi (configured via provisioning or pre-configured SSID)
- Maintains WebSocket connection to backend
- On connection loss: stop active operations, enter safe state, retry connection
- Machine operations do NOT require active network connection once a valid command sequence is loaded (see [Unresolved Decisions](../architecture/UNRESOLVED_DECISIONS.md) for offline command buffering)

## Development

- ESP-IDF v5.x (exact version TBD)
- Built with `idf.py build`
- Flashed with `idf.py flash monitor`
- Simulator (`apps/esp32-simulator`) available for protocol testing without hardware

## Related Documents

- [Machine State Machine](./MACHINE_STATE_MACHINE.md)
- [ESP32 Protocol](../protocol/ESP32_PROTOCOL.md)
- [Safety Architecture](../security/SAFETY_ARCHITECTURE.md)
- [Calibration System](../calibration/CALIBRATION_SYSTEM.md)
