import type { MachineCommandService } from './machine-command.service.js';
import type { MachineGateway } from '../gateway/types.js';

export type ConfigurationPushResult = {
  pushed: boolean;
  command_id?: string;
  message: string;
};

/**
 * Pushes active calibration to a connected machine peer via SET_CONFIGURATION.
 * Calibration changes are inputs to normal calculation — they do not bypass safety.
 */
export class MachineConfigurationService {
  constructor(
    private readonly commandService: MachineCommandService,
    private readonly gateway: MachineGateway,
  ) {}

  async pushCalibrationProfile(
    machineId: string,
    profile: { calibration_type: string; version: number; data: Record<string, unknown> },
  ): Promise<ConfigurationPushResult> {
    if (!this.gateway.isMachineConnected(machineId)) {
      return {
        pushed: false,
        message: 'Machine peer is not connected — calibration stored but not pushed to device',
      };
    }

    const command = this.commandService.buildCommand(machineId, 'SET_CONFIGURATION', {
      calibration_type: profile.calibration_type,
      version: profile.version,
      data: profile.data,
    });

    try {
      const result = await this.commandService.dispatch(command);
      if (result.status === 'REJECTED' || result.status === 'FAILED') {
        return {
          pushed: false,
          command_id: command.command_id,
          message: result.acknowledgement?.message ?? 'Machine rejected configuration update',
        };
      }

      return {
        pushed: true,
        command_id: command.command_id,
        message: 'Configuration pushed to connected machine peer',
      };
    } catch (error) {
      return {
        pushed: false,
        command_id: command.command_id,
        message: error instanceof Error ? error.message : 'Configuration push failed',
      };
    }
  }
}
