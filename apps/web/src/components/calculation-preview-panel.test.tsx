/**
 * @vitest-environment happy-dom
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { CalculationPreviewResponse } from '@bowling-machine/api-contracts';
import { DeliveryCalculationResultPanel } from '@/components/calculation-preview-panel';

const sampleResult: CalculationPreviewResponse = {
  preview: true,
  result_mode: 'SIMULATION',
  disclaimer: 'Calculated values use simulation calibration only.',
  machine_id: null,
  requested: {
    target: { target_x: 0.5, target_y: 0.4 },
    desired_speed_kmh: 120,
    ball_type: 'FAST',
    number_of_balls: 6,
    first_ball_delay_ms: 3000,
    interval_ms: 8000,
  },
  calculated: {
    wheel1_target_rpm: 1200,
    wheel2_target_rpm: 1180,
    actuator1_target_position: 500,
    actuator2_target_position: 500,
    actuator3_target_position: 500,
    actuator4_target_position: 500,
    feeder_delay_ms: 250,
    ball_count: 6,
    first_ball_delay_ms: 3000,
    interval_ms: 8000,
  },
  validation: { valid: true, errors: [] },
  calibration: {
    profile_id: 'simulation-calibration-v1-fixture',
    calibration_type: 'SIMULATION_CALIBRATION',
    version: 1,
    simulation: true,
    is_simulation_fallback: true,
  },
  warnings: [],
};

describe('DeliveryCalculationResultPanel', () => {
  it('shows calculation complete with requested, calculated, and execution sections', () => {
    render(
      <DeliveryCalculationResultPanel
        result={sampleResult}
        machineLabel="Machine not connected"
        executionAvailability="NOT_CONNECTED"
      />,
    );

    expect(screen.getByText('Calculation complete')).toBeTruthy();
    expect(screen.getByText('Requested')).toBeTruthy();
    expect(screen.getByText('Calculated')).toBeTruthy();
    expect(screen.getByText('1200 RPM')).toBeTruthy();
    expect(screen.getByText('Not executed — no machine connected')).toBeTruthy();
    expect(screen.getByText('Connect machine to execute')).toBeTruthy();
  });

  it('shows validation errors when calculation failed', () => {
    render(
      <DeliveryCalculationResultPanel
        result={{
          ...sampleResult,
          validation: {
            valid: false,
            errors: [{ code: 'INVALID_TARGET', message: 'Target out of bounds' }],
          },
          calculated: null,
        }}
        machineLabel="Machine not connected"
        executionAvailability="NOT_CONNECTED"
      />,
    );

    expect(screen.getByText('Target out of bounds')).toBeTruthy();
  });
});
