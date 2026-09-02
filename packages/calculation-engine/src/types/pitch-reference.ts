/**
 * Pitch reference coordinate — output of the Pitch Coordinate Mapper.
 *
 * SIMULATION ONLY for MVP: values are deterministic normalized references,
 * NOT physical millimetres or metres. Replace mapper + calibration for real geometry.
 */
export type PitchReferenceCoordinate = {
  /** Simulated horizontal reference — normalized 0–1, NOT physical distance. */
  reference_x: number;
  /** Simulated length reference — normalized 0–1, NOT physical distance. */
  reference_y: number;
  /** True when produced by SimulationPitchCoordinateMapper. */
  simulation: boolean;
};
