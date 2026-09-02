# Project Glossary

> **Last updated:** 2026-09-02

## A

**Actuator** — A lead-screw positioning motor that adjusts the machine's physical orientation or position. The machine has 4 actuators.

**ADMIN** — System-level administrative role. Can register machines, manage users, and manage calibration data.

## B

**Backend** — The Fastify API server (`apps/api`) that handles validation, calculation, session management, and machine communication.

**Ball Type** — Category of delivery (FAST, MEDIUM, SLOW, BOUNCER, YORKER, FULL, INSWING, OUTSWING, LEG_SPIN, OFF_SPIN). Affects calculation engine behavior.

## C

**Calculation Engine** — Backend module that transforms user-level delivery parameters into machine-level physical parameters using calibration data.

**Calibration** — The process of empirically determining mappings between user parameters and machine parameters for a specific physical machine.

**Calibration Data** — Stored mappings (speed→RPM, position→trajectory, etc.) used by the calculation engine. Stored per machine, versioned.

**Command TTL** — Time-to-live for machine commands. Commands older than TTL are rejected by the ESP32.

## D

**Delivery** — A single configured ball-throwing action within a practice session. Contains user-level parameters and resulting machine command.

**Delivery Request** — User-level input specifying where, how fast, and what type of ball to deliver.

## E

**Emergency Stop (E-Stop)** — Physical hardware switch that immediately cuts power to motors. Independent of all software.

**Encoder** — Rotary sensor on launch wheels providing speed feedback (RPM measurement).

**ESP32** — Microcontroller running the machine firmware. Final authority on machine safety and real-time control.

**ESP32 Simulator** — Software (`apps/esp32-simulator`) that simulates ESP32 protocol behavior for development without hardware.

## F

**Feeder / Feed Motor** — Motor and mechanism that releases a ball into the launch wheels at the correct timing.

**Firmware** — Software running on the ESP32 (`firmware/esp32`), written in C/C++ with ESP-IDF.

**FreeRTOS** — Real-time operating system used by ESP32-IDF for task scheduling.

## H

**Homing** — Process of moving all actuators to their known home position using limit switches. Required after power-on or error recovery.

## I

**IMU** — Inertial Measurement Unit providing machine orientation feedback (pitch, roll, yaw).

## L

**Launch Wheel** — High-speed wheel that grips and propels the cricket ball. The machine has 2 launch wheels driven by independent motors.

**Limit Switch** — Mechanical switch at actuator extremes that prevents over-travel.

**Local Wi-Fi** — The machine, backend, and player phone communicate over a local wireless network without requiring internet.

## M

**Machine Command** — Low-level parameters sent to the ESP32 (wheel RPM, actuator positions, feeder timing). Produced by the calculation engine.

**Machine Gateway** — Backend module maintaining WebSocket connections to ESP32 instances.

**Machine State** — Current operational state of the machine (OFF, READY, SPINNING_UP, etc.). Owned by ESP32 firmware.

**Modular Monolith** — Architecture pattern where the backend is a single deployable service with clear internal module boundaries.

## N

**Normalized UI Coordinates (`ui_x`, `ui_y`)** — Tap position on the pitch visualization image (0.0–1.0 relative to image bounds). Perspective-distorted image space. Input to Pitch Coordinate Mapper.

**NVS (Non-Volatile Storage)** — ESP32 flash storage for calibration data and configuration that persists across reboots.

## P

**Pitch Coordinate Mapper** — Configurable, replaceable abstraction in `packages/shared/pitch-coordinates` that converts normalized UI coordinates to persisted pitch target coordinates (`target_x`, `target_y`). Handles perspective correction. Does not contain machine geometry or physics constants.

**Pitch Target Coordinates (`target_x`, `target_y`)** — Persisted normalized coordinates (0.0–1.0) representing the user-selected location in the interactive pitch coordinate system. Authoritative input to the calculation engine. Not screen pixels.

**PitchMapSelector** — Interactive frontend component for the Throw Ball UI; renders pitch visualization, captures tap/click, displays marker and target summary.

**PLAYER** — Primary user role. Can connect to machines, configure deliveries, manage sessions, and view personal data.

**Practice Plan** — Saved collection of delivery configurations that can be reused across sessions.

**Practice Session** — A period of batting practice comprising one or more deliveries on a connected machine.

**PWM (Pulse Width Modulation)** — Technique for controlling motor speed by varying the duty cycle of a digital signal.

## Q

**QR Connection** — Method for players to identify and connect to a machine by scanning a QR code affixed to it.

## S

**Safety Monitor** — Highest-priority FreeRTOS task on the ESP32 that continuously checks safety conditions.

## T

**Telemetry** — Real-time status data sent from ESP32 to backend (state, RPM, positions, sensor readings).

**TTL (Time To Live)** — Expiration time for commands. Prevents execution of stale commands after network delays.

## U

**User-Level Parameters** — Delivery configuration from the player's perspective: target location, speed, ball type, count, timing. Never includes machine-level values.

## W

**Watchdog Timer** — Hardware timer on the ESP32 that resets the system if firmware stops responding.

**WebSocket (WS/WSS)** — Protocol used for real-time communication between browser↔backend and backend↔ESP32.

## Z

**Zod** — TypeScript schema validation library used for all API input/output validation.
