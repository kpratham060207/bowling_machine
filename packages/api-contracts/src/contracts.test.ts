/**
 * Contract validation tests — valid acceptance and invalid rejection.
 * No database, simulator, or network dependencies.
 */
import { describe, expect, it } from 'vitest';
import {
  CommandAcknowledgementSchema,
  DeliveryRequestSchema,
  MachineCommandSchema,
  MachineFaultSchema,
  MachineIdentitySchema,
  MachineStatusSchema,
  PitchTargetSchema,
  PlayerSchema,
  PROTOCOL_VERSION,
  ProtocolVersionStringSchema,
  TelemetrySampleSchema,
  WebSocketEventSchema,
  isSupportedProtocolVersion,
} from './index.js';

const UUID = '550e8400-e29b-41d4-a716-446655440000';
const UUID2 = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
const TS = '2026-09-02T12:00:00.000Z';

const validPlayer = {
  id: UUID,
  display_name: 'Test Player',
  batting_hand: 'RIGHT' as const,
  bowling_hand: 'RIGHT' as const,
  skill_level: 'intermediate',
  practice_goals: ['improve cover drive'],
  preferences: { locale: 'en-IN' },
  created_at: TS,
  updated_at: TS,
};

const validPitchTarget = { target_x: 0.5, target_y: 0.3 };

const validDeliveryRequest = {
  target_x: 0.5,
  target_y: 0.4,
  desired_speed_kmh: 120,
  ball_type: 'FAST' as const,
  number_of_balls: 6,
  first_ball_delay_ms: 0,
  interval_ms: 3000,
};

const validMachineIdentity = {
  machine_id: UUID,
  name: 'Lane 1 Simulator',
  registry_status: 'ACTIVE' as const,
  kind: 'SIMULATOR' as const,
  protocol_version: PROTOCOL_VERSION,
  firmware_version: '0.1.0',
};

const actuatorPositions = [null, null, null, null] as [null, null, null, null];

const validMachineStatus = {
  machine_id: UUID,
  timestamp: TS,
  kind: 'SIMULATOR' as const,
  connection_status: 'CONNECTED' as const,
  state: 'READY' as const,
  active_command_id: null,
  active_delivery_id: null,
  wheel1_current_rpm: 0,
  wheel2_current_rpm: 0,
  wheel1_target_rpm: null,
  wheel2_target_rpm: null,
  actuator_current_positions: actuatorPositions,
  actuator_target_positions: actuatorPositions,
  feeder_status: 'IDLE' as const,
  homing_status: 'HOMED' as const,
  emergency_stop_active: false,
  active_fault: null,
};

const validCommand = {
  command_id: UUID2,
  machine_id: UUID,
  protocol_version: PROTOCOL_VERSION,
  command_type: 'PING' as const,
  issued_at: TS,
  payload: {},
};

const validAck = {
  command_id: UUID2,
  machine_id: UUID,
  protocol_version: PROTOCOL_VERSION,
  timestamp: TS,
  accepted: true,
  error_code: null,
  message: null,
};

const validTelemetry = {
  timestamp: TS,
  machine_id: UUID,
  state: 'READY_TO_THROW' as const,
  wheel1_current_rpm: 1500,
  wheel2_current_rpm: 1400,
  wheel1_target_rpm: 1500,
  wheel2_target_rpm: 1400,
  actuator_current_positions: actuatorPositions,
  actuator_target_positions: actuatorPositions,
  feeder_status: 'READY' as const,
  homing_status: 'HOMED' as const,
  emergency_stop_active: false,
  active_fault: null,
};

const validFault = {
  fault_code: 'FEEDER_JAM' as const,
  severity: 'ERROR' as const,
  timestamp: TS,
  machine_id: UUID,
  message: 'Feeder jam detected',
  recoverable: true,
};

const validEvent = {
  event_id: UUID2,
  event_type: 'MACHINE_STATE_CHANGED' as const,
  timestamp: TS,
  machine_id: UUID,
  payload: {
    machine_id: UUID,
    previous_state: 'SPINNING_UP' as const,
    new_state: 'READY_TO_THROW' as const,
  },
};

describe('PlayerSchema', () => {
  it('accepts valid player', () => {
    expect(PlayerSchema.safeParse(validPlayer).success).toBe(true);
  });

  it('rejects invalid UUID id', () => {
    expect(PlayerSchema.safeParse({ ...validPlayer, id: 'not-a-uuid' }).success).toBe(false);
  });

  it('rejects empty display name', () => {
    expect(PlayerSchema.safeParse({ ...validPlayer, display_name: '' }).success).toBe(false);
  });
});

describe('PitchTargetSchema', () => {
  it('accepts valid normalized coordinates', () => {
    expect(PitchTargetSchema.safeParse(validPitchTarget).success).toBe(true);
  });

  it('rejects coordinates outside 0–1', () => {
    expect(PitchTargetSchema.safeParse({ target_x: 1.5, target_y: 0.5 }).success).toBe(false);
    expect(PitchTargetSchema.safeParse({ target_x: -0.1, target_y: 0.5 }).success).toBe(false);
  });
});

describe('DeliveryRequestSchema', () => {
  it('accepts valid delivery request', () => {
    expect(DeliveryRequestSchema.safeParse(validDeliveryRequest).success).toBe(true);
  });

  it('rejects invalid ball type', () => {
    expect(
      DeliveryRequestSchema.safeParse({ ...validDeliveryRequest, ball_type: 'GOOGLY' }).success,
    ).toBe(false);
  });

  it('rejects negative ball count', () => {
    expect(
      DeliveryRequestSchema.safeParse({ ...validDeliveryRequest, number_of_balls: 0 }).success,
    ).toBe(false);
  });

  it('does not enforce unfinalized max ball count (machine validation responsibility)', () => {
    expect(
      DeliveryRequestSchema.safeParse({ ...validDeliveryRequest, number_of_balls: 100 }).success,
    ).toBe(true);
  });

  it('does not enforce unfinalized minimum interval (machine validation responsibility)', () => {
    expect(
      DeliveryRequestSchema.safeParse({ ...validDeliveryRequest, interval_ms: 100 }).success,
    ).toBe(true);
  });

  it('rejects negative interval', () => {
    expect(
      DeliveryRequestSchema.safeParse({ ...validDeliveryRequest, interval_ms: -1 }).success,
    ).toBe(false);
  });

  it('rejects non-positive speed', () => {
    expect(
      DeliveryRequestSchema.safeParse({ ...validDeliveryRequest, desired_speed_kmh: 0 }).success,
    ).toBe(false);
  });

  it('accepts high speed without shared contract max (safety validation is downstream)', () => {
    expect(
      DeliveryRequestSchema.safeParse({ ...validDeliveryRequest, desired_speed_kmh: 999 }).success,
    ).toBe(true);
  });
});

describe('MachineIdentitySchema', () => {
  it('accepts valid machine identity', () => {
    expect(MachineIdentitySchema.safeParse(validMachineIdentity).success).toBe(true);
  });

  it('rejects unsupported protocol version', () => {
    expect(
      MachineIdentitySchema.safeParse({ ...validMachineIdentity, protocol_version: '2.0' }).success,
    ).toBe(false);
  });
});

describe('MachineStatusSchema', () => {
  it('accepts valid machine status', () => {
    expect(MachineStatusSchema.safeParse(validMachineStatus).success).toBe(true);
  });

  it('rejects invalid machine state enum', () => {
    expect(MachineStatusSchema.safeParse({ ...validMachineStatus, state: 'RUNNING' }).success).toBe(
      false,
    );
  });
});

describe('MachineCommandSchema', () => {
  it('accepts valid PING command', () => {
    expect(MachineCommandSchema.safeParse(validCommand).success).toBe(true);
  });

  it('accepts valid THROW_SEQUENCE command', () => {
    const cmd = {
      ...validCommand,
      command_type: 'THROW_SEQUENCE' as const,
      payload: {
        sequence_id: UUID2,
        delivery_count: 3,
        parameters: {
          wheel1_target_rpm: 1500,
          wheel2_target_rpm: 1400,
          actuator1_target_position: null,
          actuator2_target_position: null,
          actuator3_target_position: null,
          actuator4_target_position: null,
          feeder_delay_ms: 500,
          ball_count: 3,
          first_ball_delay_ms: 0,
          interval_ms: 2000,
        },
      },
    };
    expect(MachineCommandSchema.safeParse(cmd).success).toBe(true);
  });

  it('rejects missing required fields', () => {
    const incomplete = { ...validCommand };
    delete (incomplete as { command_id?: string }).command_id;
    expect(MachineCommandSchema.safeParse(incomplete).success).toBe(false);
  });

  it('rejects invalid command type', () => {
    expect(MachineCommandSchema.safeParse({ ...validCommand, command_type: 'FIRE' }).success).toBe(
      false,
    );
  });
});

describe('CommandAcknowledgementSchema', () => {
  it('accepts valid acknowledgement', () => {
    expect(CommandAcknowledgementSchema.safeParse(validAck).success).toBe(true);
  });

  it('accepts failed ack with error code', () => {
    expect(
      CommandAcknowledgementSchema.safeParse({
        ...validAck,
        accepted: false,
        error_code: 'COMMAND_REJECTED',
        message: 'Machine not ready',
      }).success,
    ).toBe(true);
  });
});

describe('TelemetrySampleSchema', () => {
  it('accepts valid telemetry', () => {
    expect(TelemetrySampleSchema.safeParse(validTelemetry).success).toBe(true);
  });

  it('rejects negative RPM', () => {
    expect(
      TelemetrySampleSchema.safeParse({ ...validTelemetry, wheel1_current_rpm: -100 }).success,
    ).toBe(false);
  });
});

describe('MachineFaultSchema', () => {
  it('accepts valid fault', () => {
    expect(MachineFaultSchema.safeParse(validFault).success).toBe(true);
  });

  it('rejects invalid fault code', () => {
    expect(
      MachineFaultSchema.safeParse({ ...validFault, fault_code: 'STACK_OVERFLOW' }).success,
    ).toBe(false);
  });
});

describe('WebSocketEventSchema', () => {
  it('accepts valid MACHINE_STATE_CHANGED event', () => {
    expect(WebSocketEventSchema.safeParse(validEvent).success).toBe(true);
  });

  it('rejects invalid event type', () => {
    expect(
      WebSocketEventSchema.safeParse({ ...validEvent, event_type: 'UNKNOWN_EVENT' }).success,
    ).toBe(false);
  });

  it('rejects malformed event payload', () => {
    expect(
      WebSocketEventSchema.safeParse({
        ...validEvent,
        payload: { machine_id: UUID, previous_state: 'INVALID', new_state: 'READY' },
      }).success,
    ).toBe(false);
  });
});

describe('Protocol versioning', () => {
  it('exports PROTOCOL_VERSION 1.0', () => {
    expect(PROTOCOL_VERSION).toBe('1.0');
  });

  it('isSupportedProtocolVersion accepts 1.0', () => {
    expect(isSupportedProtocolVersion('1.0')).toBe(true);
  });

  it('isSupportedProtocolVersion rejects unsupported versions', () => {
    expect(isSupportedProtocolVersion('2.0')).toBe(false);
  });

  it('ProtocolVersionStringSchema validates major.minor format', () => {
    expect(ProtocolVersionStringSchema.safeParse('1.0').success).toBe(true);
    expect(ProtocolVersionStringSchema.safeParse('v1.0').success).toBe(false);
  });
});
