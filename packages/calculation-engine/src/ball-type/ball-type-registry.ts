import type { BallType } from '@bowling-machine/api-contracts';
import { ConfiguredBallTypeStrategy, type BallTypeStrategy } from './ball-type-strategy.js';

/**
 * Registry of ball-type simulation strategies.
 * Add new ball types by registering profiles — avoid branching across the engine.
 */
export class BallTypeStrategyRegistry {
  private readonly strategies = new Map<BallType, BallTypeStrategy>();

  register(strategy: BallTypeStrategy): void {
    this.strategies.set(strategy.profile.ball_type, strategy);
  }

  get(ballType: BallType): BallTypeStrategy | undefined {
    return this.strategies.get(ballType);
  }

  has(ballType: BallType): boolean {
    return this.strategies.has(ballType);
  }
}

/** Default simulation profiles for all supported ball types — SIMULATION ONLY. */
export function createDefaultBallTypeRegistry(): BallTypeStrategyRegistry {
  const registry = new BallTypeStrategyRegistry();

  const profiles = [
    {
      ball_type: 'FAST',
      speed_multiplier: 1.0,
      wheel_differential_factor: 0,
      length_bias: 0,
      launch_bias: 0,
      trajectory_class: 'sim_fast',
    },
    {
      ball_type: 'MEDIUM',
      speed_multiplier: 0.85,
      wheel_differential_factor: 0,
      length_bias: 0,
      launch_bias: 0,
      trajectory_class: 'sim_medium',
    },
    {
      ball_type: 'SLOW',
      speed_multiplier: 0.65,
      wheel_differential_factor: 0,
      length_bias: 0,
      launch_bias: 0,
      trajectory_class: 'sim_slow',
    },
    {
      ball_type: 'BOUNCER',
      speed_multiplier: 0.9,
      wheel_differential_factor: 0,
      length_bias: -0.25,
      launch_bias: 0,
      trajectory_class: 'sim_bouncer',
    },
    {
      ball_type: 'YORKER',
      speed_multiplier: 0.88,
      wheel_differential_factor: 0,
      length_bias: 0.3,
      launch_bias: 0,
      trajectory_class: 'sim_yorker',
    },
    {
      ball_type: 'FULL',
      speed_multiplier: 0.87,
      wheel_differential_factor: 0,
      length_bias: 0.1,
      launch_bias: 0,
      trajectory_class: 'sim_full',
    },
    {
      ball_type: 'INSWING',
      speed_multiplier: 0.92,
      wheel_differential_factor: 0.35,
      length_bias: 0,
      launch_bias: -0.2,
      trajectory_class: 'sim_inswing',
    },
    {
      ball_type: 'OUTSWING',
      speed_multiplier: 0.92,
      wheel_differential_factor: -0.35,
      length_bias: 0,
      launch_bias: 0.2,
      trajectory_class: 'sim_outswing',
    },
    {
      ball_type: 'LEG_SPIN',
      speed_multiplier: 0.55,
      wheel_differential_factor: 0.45,
      length_bias: -0.05,
      launch_bias: -0.15,
      trajectory_class: 'sim_leg_spin',
    },
    {
      ball_type: 'OFF_SPIN',
      speed_multiplier: 0.55,
      wheel_differential_factor: -0.45,
      length_bias: -0.05,
      launch_bias: 0.15,
      trajectory_class: 'sim_off_spin',
    },
  ] as const;

  for (const profile of profiles) {
    registry.register(new ConfiguredBallTypeStrategy(profile));
  }

  return registry;
}
