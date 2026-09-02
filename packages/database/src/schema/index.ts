export * from './enums';
export * from './users';
export * from './profiles';
export * from './firmware-versions';
export * from './machines';
export * from './machine-access';
export * from './machine-registrations';
export * from './practice-sessions';
export * from './machine-commands';
export * from './deliveries';
export * from './practice-plans';
export * from './practice-plan-deliveries';
export * from './telemetry';
export * from './faults';
export * from './calibration-profiles';
export * from './audit-logs';

import { users } from './users';
import { profiles } from './profiles';
import { firmwareVersions } from './firmware-versions';
import { machines } from './machines';
import { machineAccess } from './machine-access';
import { machineRegistrations } from './machine-registrations';
import { practiceSessions } from './practice-sessions';
import { machineCommands } from './machine-commands';
import { deliveries } from './deliveries';
import { practicePlans } from './practice-plans';
import { practicePlanDeliveries } from './practice-plan-deliveries';
import { telemetrySamples } from './telemetry';
import { faults } from './faults';
import { calibrationProfiles } from './calibration-profiles';
import { auditLogs } from './audit-logs';

/** Combined schema object for Drizzle client and migrations. */
export const schema = {
  users,
  profiles,
  firmwareVersions,
  machines,
  machineAccess,
  machineRegistrations,
  practiceSessions,
  machineCommands,
  deliveries,
  practicePlans,
  practicePlanDeliveries,
  telemetrySamples,
  faults,
  calibrationProfiles,
  auditLogs,
};
