import {
  BallTypeSchema,
  CreateSessionDeliveryInputSchema,
  type BallType,
  type CreateSessionDeliveryInput,
  type PitchTarget,
} from '@bowling-machine/api-contracts';

/**
 * UI-facing setup state for practice configuration.
 * Stores only high-level user parameters — never machine-calculated values.
 */
export type PracticeSetupState = {
  target: PitchTarget | null;
  desired_speed_kmh: number;
  ball_type: BallType;
  number_of_balls: number;
  first_ball_delay_ms: number;
  interval_ms: number;
};

/** Defaults aligned with calculation-engine test fixture — backend remains authoritative. */
export const DEFAULT_PRACTICE_SETUP: PracticeSetupState = {
  target: null,
  desired_speed_kmh: 120,
  ball_type: 'FAST',
  number_of_balls: 6,
  first_ball_delay_ms: 3000,
  interval_ms: 8000,
};

/** All supported ball types from the shared contract enum. */
export const BALL_TYPES = BallTypeSchema.options;

/** Human-friendly labels — underlying enum values stay exact for the API. */
export const BALL_TYPE_LABELS: Record<BallType, string> = {
  FAST: 'Fast',
  MEDIUM: 'Medium',
  SLOW: 'Slow',
  BOUNCER: 'Bouncer',
  YORKER: 'Yorker',
  FULL: 'Full',
  INSWING: 'Inswing',
  OUTSWING: 'Outswing',
  LEG_SPIN: 'Leg Spin',
  OFF_SPIN: 'Off Spin',
};

/**
 * UI validation limits — structural hints only; backend/calibration validation is authoritative.
 * max_balls_per_sequence and min_interval_ms come from simulation calibration defaults.
 */
export const SETUP_UI_LIMITS = {
  speedMinKmh: 30,
  speedMaxKmh: 160,
  ballsMin: 1,
  ballsMax: 24,
  delayMinMs: 0,
  delayMaxMs: 60_000,
  intervalMinMs: 0,
  intervalMaxMs: 120_000,
} as const;

export type SetupValidationResult = {
  valid: boolean;
  errors: string[];
};

/** Validates obvious UI-level issues before review/submit — not machine safety logic. */
export function validatePracticeSetup(state: PracticeSetupState): SetupValidationResult {
  const errors: string[] = [];

  if (!state.target) {
    errors.push('Select a pitch target before starting practice');
  }

  if (state.desired_speed_kmh <= 0) {
    errors.push('Speed must be greater than 0 km/h');
  } else if (state.desired_speed_kmh < SETUP_UI_LIMITS.speedMinKmh) {
    errors.push(`Speed should be at least ${SETUP_UI_LIMITS.speedMinKmh} km/h`);
  } else if (state.desired_speed_kmh > SETUP_UI_LIMITS.speedMaxKmh) {
    errors.push(`Speed should not exceed ${SETUP_UI_LIMITS.speedMaxKmh} km/h`);
  }

  if (!Number.isInteger(state.number_of_balls) || state.number_of_balls < 1) {
    errors.push('At least one ball is required');
  } else if (state.number_of_balls > SETUP_UI_LIMITS.ballsMax) {
    errors.push(`Maximum ${SETUP_UI_LIMITS.ballsMax} balls per sequence`);
  }

  if (state.first_ball_delay_ms < 0) {
    errors.push('First ball delay cannot be negative');
  }

  if (state.interval_ms < 0) {
    errors.push('Interval cannot be negative');
  }

  // When target exists, verify payload shape against shared contract (structural only).
  if (state.target) {
    const payload = setupStateToDeliveryInput(state);
    const parsed = CreateSessionDeliveryInputSchema.safeParse(payload);
    if (!parsed.success) {
      errors.push(...parsed.error.issues.map((issue) => issue.message));
    }
  }

  return { valid: errors.length === 0, errors };
}

/** Converts setup state to the API delivery input — high-level fields only. */
export function setupStateToDeliveryInput(state: PracticeSetupState): CreateSessionDeliveryInput {
  if (!state.target) {
    throw new Error('Cannot build delivery input without a pitch target');
  }

  return {
    target_x: state.target.target_x,
    target_y: state.target.target_y,
    desired_speed_kmh: state.desired_speed_kmh,
    ball_type: state.ball_type,
    number_of_balls: state.number_of_balls,
    first_ball_delay_ms: state.first_ball_delay_ms,
    interval_ms: state.interval_ms,
  };
}

/** Formats milliseconds as seconds for display controls. */
export function msToSecondsDisplay(ms: number): string {
  return (ms / 1000).toFixed(1);
}

/** Parses a seconds string from UI into integer milliseconds. */
export function secondsDisplayToMs(value: string): number {
  const parsed = Number.parseFloat(value);
  if (Number.isNaN(parsed) || parsed < 0) {
    return 0;
  }
  return Math.round(parsed * 1000);
}
