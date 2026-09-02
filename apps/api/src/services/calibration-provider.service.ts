import { and, desc, eq } from 'drizzle-orm';
import {
  parseSimulationCalibrationData,
  SIMULATION_CALIBRATION_V1_PROFILE,
  type CalibrationProfile,
} from '@bowling-machine/calculation-engine';
import type { Database } from '@bowling-machine/database';
import { calibrationProfiles, machines } from '@bowling-machine/database';

export type CalibrationResolveResult = {
  profile: CalibrationProfile | null;
  /** True when the resolved profile is an explicit simulation fallback, not production calibration. */
  is_simulation_fallback: boolean;
};

/**
 * Loads ACTIVE calibration profiles from PostgreSQL for the calculation engine.
 * Simulator machines may use an explicit simulation fallback; hardware machines require ACTIVE calibration.
 */
export class DatabaseCalibrationProvider {
  constructor(private readonly db: Database['db']) {}

  async resolve(machineId: string): Promise<CalibrationResolveResult> {
    const machineRows = await this.db
      .select({ kind: machines.kind })
      .from(machines)
      .where(eq(machines.id, machineId))
      .limit(1);

    const machineKind = machineRows[0]?.kind ?? 'SIMULATOR';

    const rows = await this.db
      .select()
      .from(calibrationProfiles)
      .where(
        and(eq(calibrationProfiles.machineId, machineId), eq(calibrationProfiles.status, 'ACTIVE')),
      )
      .orderBy(desc(calibrationProfiles.version))
      .limit(1);

    const row = rows[0];
    if (row && parseSimulationCalibrationData(row.data)) {
      return {
        profile: {
          profile_id: row.id,
          calibration_type: row.calibrationType,
          version: row.version,
          data: row.data,
        },
        is_simulation_fallback: row.data['_simulation'] === true,
      };
    }

    if (machineKind === 'SIMULATOR') {
      return {
        profile: SIMULATION_CALIBRATION_V1_PROFILE,
        is_simulation_fallback: true,
      };
    }

    return { profile: null, is_simulation_fallback: false };
  }
}
