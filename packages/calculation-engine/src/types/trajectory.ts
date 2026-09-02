import type { BallType } from '@bowling-machine/api-contracts';
import type { PitchReferenceCoordinate } from './pitch-reference.js';

/**
 * Intermediate trajectory representation between pitch target and machine parameters.
 *
 * Decouples user intent from motors/actuators. MVP fields are explicitly simulated —
 * no aerodynamic equations or physical launch angles are claimed.
 */
export type TrajectoryRepresentation = {
  /** Mapped pitch reference used for parameter lookup. */
  pitch_reference: PitchReferenceCoordinate;
  /** User-requested speed — km/h (known unit). */
  desired_speed_kmh: number;
  ball_type: BallType;
  /**
   * Simulated trajectory class label for debugging/reproduction.
   * NOT a physical model output.
   */
  trajectory_class: string;
  /**
   * Simulated lateral launch bias (−1..1) derived from ball-type strategy.
   * UNRESOLVED physical meaning — simulation placeholder only.
   */
  launch_bias_simulated: number;
  /**
   * Simulated length bias applied to reference_y (−1..1).
   * UNRESOLVED physical meaning — simulation placeholder only.
   */
  length_bias_simulated: number;
  simulation: true;
};
