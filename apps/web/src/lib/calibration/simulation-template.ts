/** Explicit simulation calibration template for ADMIN draft profiles — not production physics. */
export const SIMULATION_CALIBRATION_V1 = {
  _simulation: true,
  _label: 'SIMULATION_CALIBRATION_V1',
  speed_rpm: {
    base_rpm_per_kmh: 18,
    max_wheel_differential_rpm: 400,
  },
  position: {
    actuator_scale: 100,
  },
  feeder: {
    base_delay_ms: 500,
  },
  limits: {
    min_wheel_rpm: 200,
    max_wheel_rpm: 3500,
    min_interval_ms: 500,
    max_balls_per_sequence: 24,
  },
} as const;
