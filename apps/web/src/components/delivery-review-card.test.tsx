/**
 * @vitest-environment happy-dom
 */
import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import type { Delivery } from '@bowling-machine/api-contracts';
import { DeliveryReviewCard } from './delivery-review-card';

const sampleDelivery: Delivery = {
  delivery_id: 'delivery-1',
  session_id: 'session-1',
  sequence_number: 1,
  status: 'COMPLETED',
  requested: {
    target_x: 0.5,
    target_y: 0.5,
    desired_speed_kmh: 120,
    ball_type: 'FAST',
    number_of_balls: 6,
    first_ball_delay_ms: 3000,
    interval_ms: 8000,
  },
  calculated_parameters: {
    wheel1_target_rpm: 1500,
    wheel2_target_rpm: 1600,
    actuator1_target_position: null,
    actuator2_target_position: null,
    actuator3_target_position: null,
    actuator4_target_position: null,
    feeder_delay_ms: 100,
    ball_count: 6,
    first_ball_delay_ms: 3000,
    interval_ms: 8000,
  },
  command_id: null,
  measured: undefined,
  created_at: '2026-09-02T09:00:00.000Z',
  executed_at: '2026-09-02T10:00:00.000Z',
  error: null,
};

describe('DeliveryReviewCard', () => {
  afterEach(() => {
    cleanup();
  });

  it('labels requested speed separately from measured values', () => {
    render(<DeliveryReviewCard delivery={sampleDelivery} />);
    expect(screen.getByText(/Requested speed: 120 km\/h/i)).toBeTruthy();
    expect(screen.getByText(/Measured ball speed: Not available/i)).toBeTruthy();
  });

  it('shows calculated values in collapsible section', () => {
    render(<DeliveryReviewCard delivery={sampleDelivery} />);
    expect(screen.getAllByText(/Calculated \(backend\)/i).length).toBeGreaterThan(0);
  });
});
