import { describe, expect, it } from 'vitest';
import {
  getApplicationOperatingMode,
  getExecutionAvailability,
  getMachineConnectionLabel,
  getMachineConnectionState,
  resolveCalculationMachineId,
  shouldInvalidateCalculation,
} from '@/lib/practice/operating-context';

describe('operating context', () => {
  it('treats no machine as SOFTWARE_ONLY', () => {
    expect(getApplicationOperatingMode(null, null)).toBe('SOFTWARE_ONLY');
  });

  it('treats selected machine as MACHINE_AVAILABLE', () => {
    expect(
      getApplicationOperatingMode(
        {
          machine_id: '22222222-2222-4222-8222-222222222222',
          name: 'Simulator',
          serial_number: 'SIM-1',
          kind: 'SIMULATOR',
          registry_status: 'ACTIVE',
          has_control: false,
          control_expires_at: null,
        },
        null,
      ),
    ).toBe('MACHINE_AVAILABLE');
  });

  it('reports disconnected when no machine selected', () => {
    expect(getMachineConnectionState(null, null)).toBe('DISCONNECTED');
    expect(getMachineConnectionLabel('DISCONNECTED')).toBe('Machine not connected');
  });

  it('does not require control lock for calculation availability check via execution gate', () => {
    expect(
      getExecutionAvailability({
        selectedMachine: null,
        liveMachineStatus: null,
        controlLock: null,
        sessionId: null,
      }),
    ).toBe('NOT_CONNECTED');
  });

  it('requires session and control for execution', () => {
    expect(
      getExecutionAvailability({
        selectedMachine: {
          machine_id: '22222222-2222-4222-8222-222222222222',
          name: 'Simulator',
          serial_number: 'SIM-1',
          kind: 'SIMULATOR',
          registry_status: 'ACTIVE',
          has_control: false,
          control_expires_at: null,
        },
        liveMachineStatus: null,
        controlLock: null,
        sessionId: 'session-1',
      }),
    ).toBe('UNAVAILABLE');
  });

  it('resolves calculation machine from session first', () => {
    expect(
      resolveCalculationMachineId({
        sessionMachineId: 'session-machine',
        selectedMachineId: 'selected-machine',
        authorizedMachines: [],
      }),
    ).toBe('session-machine');
  });

  it('falls back to authorized simulator when no selection', () => {
    expect(
      resolveCalculationMachineId({
        sessionMachineId: null,
        selectedMachineId: null,
        authorizedMachines: [
          {
            machine_id: 'hardware-id',
            name: 'Hardware',
            serial_number: 'HW-1',
            kind: 'HARDWARE',
            registry_status: 'ACTIVE',
            has_control: false,
            control_expires_at: null,
          },
          {
            machine_id: 'sim-id',
            name: 'Simulator',
            serial_number: 'SIM-1',
            kind: 'SIMULATOR',
            registry_status: 'ACTIVE',
            has_control: false,
            control_expires_at: null,
          },
        ],
      }),
    ).toBe('sim-id');
  });

  it('invalidates calculation when machine context changes', () => {
    expect(
      shouldInvalidateCalculation({
        calculatedForMachineId: 'machine-a',
        currentMachineId: 'machine-b',
      }),
    ).toBe(true);
    expect(
      shouldInvalidateCalculation({
        calculatedForMachineId: null,
        currentMachineId: undefined,
      }),
    ).toBe(false);
  });
});
