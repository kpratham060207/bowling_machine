import type { Database } from '@bowling-machine/database';
import { auditLogs } from '@bowling-machine/database';

export type AuditEventInput = {
  userId?: string | null;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  details?: Record<string, unknown>;
  ipAddress?: string | null;
};

/**
 * Writes security-relevant events to audit_logs.
 * Avoid logging tokens, passwords, or secrets in details.
 */
export async function writeAuditEvent(db: Database['db'], event: AuditEventInput): Promise<void> {
  await db.insert(auditLogs).values({
    userId: event.userId ?? null,
    action: event.action,
    resourceType: event.resourceType,
    resourceId: event.resourceId ?? null,
    details: event.details,
    ipAddress: event.ipAddress ?? null,
  });
}
