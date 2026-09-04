'use client';

import type { BallType, PitchTarget } from '@bowling-machine/api-contracts';
import clsx from 'clsx';
import { PitchTargetSummary } from '@/components/pitch-target-summary';
import { formatPitchDistanceM, getBowlingLengthFromTarget } from '@/lib/pitch/bowling-length';
import {
  BALL_TYPE_LABELS,
  BALL_TYPES,
  msToSecondsDisplay,
  secondsDisplayToMs,
  SETUP_UI_LIMITS,
  type PracticeSetupState,
} from '@/lib/practice/setup-state';

type PracticeSetupControlsProps = {
  state: PracticeSetupState;
  onChange: (patch: Partial<PracticeSetupState>) => void;
  disabled?: boolean;
};

/** Speed, ball type, count, and timing controls for practice setup. */
export function PracticeSetupControls({ state, onChange, disabled }: PracticeSetupControlsProps) {
  return (
    <div className="space-y-5">
      {/* Target feedback — length is derived automatically from the 2D pitch tap */}
      <PitchTargetSummary target={state.target} />

      {/* Speed slider */}
      <section>
        <label htmlFor="speed-kmh" className="label-text">
          Speed — {state.desired_speed_kmh} km/h
        </label>
        <input
          id="speed-kmh"
          type="range"
          className="mt-1 w-full accent-pitch-700"
          min={SETUP_UI_LIMITS.speedMinKmh}
          max={SETUP_UI_LIMITS.speedMaxKmh}
          step={1}
          value={state.desired_speed_kmh}
          disabled={disabled}
          onChange={(e) => {
            onChange({ desired_speed_kmh: Number(e.target.value) });
          }}
        />
        <div className="mt-1 flex justify-between text-xs text-slate-500">
          <span>{SETUP_UI_LIMITS.speedMinKmh} km/h</span>
          <span>{SETUP_UI_LIMITS.speedMaxKmh} km/h</span>
        </div>
      </section>

      {/* Ball type cards */}
      <section>
        <h3 className="label-text">Ball type</h3>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {BALL_TYPES.map((ballType) => {
            const selected = state.ball_type === ballType;
            return (
              <button
                key={ballType}
                type="button"
                disabled={disabled}
                aria-pressed={selected}
                className={clsx(
                  'min-h-11 rounded-lg border px-2 py-2 text-sm font-medium transition',
                  selected
                    ? 'border-pitch-700 bg-pitch-50 text-pitch-900'
                    : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50',
                )}
                onClick={() => {
                  onChange({ ball_type: ballType as BallType });
                }}
              >
                {BALL_TYPE_LABELS[ballType]}
              </button>
            );
          })}
        </div>
      </section>

      {/* Ball count */}
      <section>
        <label htmlFor="ball-count" className="label-text">
          Number of balls
        </label>
        <input
          id="ball-count"
          type="number"
          className="input-field"
          min={SETUP_UI_LIMITS.ballsMin}
          max={SETUP_UI_LIMITS.ballsMax}
          value={state.number_of_balls}
          disabled={disabled}
          onChange={(e) => {
            onChange({ number_of_balls: Number.parseInt(e.target.value, 10) || 1 });
          }}
        />
      </section>

      {/* Timing controls */}
      <section className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="first-delay" className="label-text">
            First ball delay — {msToSecondsDisplay(state.first_ball_delay_ms)} s
          </label>
          <input
            id="first-delay"
            type="range"
            className="mt-1 w-full accent-pitch-700"
            min={0}
            max={15}
            step={0.5}
            value={state.first_ball_delay_ms / 1000}
            disabled={disabled}
            onChange={(e) => {
              onChange({ first_ball_delay_ms: secondsDisplayToMs(e.target.value) });
            }}
          />
        </div>
        <div>
          <label htmlFor="interval" className="label-text">
            Interval between balls — {msToSecondsDisplay(state.interval_ms)} s
          </label>
          <input
            id="interval"
            type="range"
            className="mt-1 w-full accent-pitch-700"
            min={0}
            max={30}
            step={0.5}
            value={state.interval_ms / 1000}
            disabled={disabled}
            onChange={(e) => {
              onChange({ interval_ms: secondsDisplayToMs(e.target.value) });
            }}
          />
        </div>
      </section>
    </div>
  );
}

type PracticeSetupReviewProps = {
  state: PracticeSetupState;
};

/** Read-only summary shown before the player confirms delivery submission. */
export function PracticeSetupReview({ state }: PracticeSetupReviewProps) {
  const analysis = state.target ? getBowlingLengthFromTarget(state.target) : null;

  return (
    <dl className="grid gap-3 text-sm sm:grid-cols-2">
      <div>
        <dt className="font-semibold text-slate-800">Target</dt>
        <dd className="text-slate-600">
          {analysis
            ? `${analysis.label} · ${formatPitchDistanceM(analysis.distanceFromBatterM)} from batter · ${analysis.lateralLabel}`
            : 'Not selected'}
        </dd>
      </div>
      <div>
        <dt className="font-semibold text-slate-800">Speed</dt>
        <dd className="text-slate-600">{state.desired_speed_kmh} km/h</dd>
      </div>
      <div>
        <dt className="font-semibold text-slate-800">Ball</dt>
        <dd className="text-slate-600">{BALL_TYPE_LABELS[state.ball_type]}</dd>
      </div>
      <div>
        <dt className="font-semibold text-slate-800">Balls</dt>
        <dd className="text-slate-600">{state.number_of_balls}</dd>
      </div>
      <div>
        <dt className="font-semibold text-slate-800">First ball</dt>
        <dd className="text-slate-600">{msToSecondsDisplay(state.first_ball_delay_ms)} s</dd>
      </div>
      <div>
        <dt className="font-semibold text-slate-800">Interval</dt>
        <dd className="text-slate-600">{msToSecondsDisplay(state.interval_ms)} s</dd>
      </div>
    </dl>
  );
}

export type { PitchTarget };
