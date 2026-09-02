import { and, desc, eq } from 'drizzle-orm';
import {
  parseSimulationCalibrationData,
  SIMULATION_CALIBRATION_V1_PROFILE,
  type CalibrationProfile,
} from '@bowling-machine/calculation-engine';
import type { Database } from '@bowling-machine/database';
import { calibrationProfiles } from '@bowling-machine/database';

/**
 * Loads ACTIVE calibration profiles from PostgreSQL for the calculation engine.
 * Falls back to the deterministic SIMULATION_CALIBRATION_V1 fixture when DB data
 * is missing or not parseable — keeps simulator/dev flows working without real calibration.
 */
export class DatabaseCalibrationProvider {
  constructor(private readonly db: Database['db']) {}

  async resolve(machineId: string): Promise<CalibrationProfile | null> {
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
        profile_id: row.id,
        calibration_type: row.calibrationType,
        version: row.version,
        data: row.data,
      };
    }

    return SIMULATION_CALIBRATION_V1_PROFILE;
  }
}
