import type { BallType } from '@bowling-machine/api-contracts';

/**
 * Ball-type simulation profile — explicit strategy configuration, not scattered if/else.
 * Influences trajectory class, speed multiplier, and wheel differential simulation.
 */
export type BallTypeSimulationProfile = {
  ball_type: BallType;
  /** Multiplier on base RPM calculation — simulation only. */
  speed_multiplier: number;
  /** Simulated wheel differential factor (−1..1) for swing/spin types. */
  wheel_differential_factor: number;
  /** Adjusts simulated length bias on reference_y. */
  length_bias: number;
  /** Simulated lateral launch bias. */
  launch_bias: number;
  trajectory_class: string;
};

/** Strategy interface — one profile per ball type. */
export interface BallTypeStrategy {
  readonly profile: BallTypeSimulationProfile;
}

export class ConfiguredBallTypeStrategy implements BallTypeStrategy {
  constructor(public readonly profile: BallTypeSimulationProfile) {}
}
