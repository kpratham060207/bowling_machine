/**
 * Optional machine configuration injected by backend — not queried from DB by the engine.
 * Used for capability/safety validation boundaries.
 */
export type MachineConfiguration = {
  machine_id?: string;
  kind: 'SIMULATOR' | 'HARDWARE';
  /** Simulation or calibrated RPM bounds — NOT physical safety certification. */
  max_wheel_rpm?: number | null;
  min_wheel_rpm?: number | null;
  /** Minimum safe inter-ball interval — ms; from machine config when known. */
  min_interval_ms?: number | null;
  /** Maximum balls per sequence when known. */
  max_balls_per_sequence?: number | null;
};
