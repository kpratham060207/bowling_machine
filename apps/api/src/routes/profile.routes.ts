import type { FastifyInstance } from 'fastify';
import { UpdatePlayerProfileRequestSchema } from '@bowling-machine/api-contracts';
import type { Database } from '@bowling-machine/database';
import { getAuthContext } from '../auth/middleware.js';
import { rejectClientOwnershipFields } from '../auth/authorization.js';
import { getProfileForUser, updateProfileForUser } from '../services/profile.service.js';
import { writeAuditEvent } from '../services/audit.service.js';

/**
 * Player profile routes — identity always from JWT/session, never request body user_id.
 */
export function registerProfileRoutes(app: FastifyInstance, deps: { db: Database['db'] }): void {
  app.get('/api/v1/profile', async (request) => {
    const auth = getAuthContext(request);
    const profile = await getProfileForUser(deps.db, auth.userId);

    return {
      data: profile,
      meta: { timestamp: new Date().toISOString() },
    };
  });

  app.put('/api/v1/profile', async (request) => {
    const auth = getAuthContext(request);
    const rawBody = request.body;

    if (rawBody && typeof rawBody === 'object') {
      rejectClientOwnershipFields(rawBody as Record<string, unknown>);
    }

    const body = UpdatePlayerProfileRequestSchema.parse(rawBody);
    const profile = await updateProfileForUser(deps.db, auth.userId, {
      displayName: body.display_name,
      battingHand: body.batting_hand,
      bowlingHand: body.bowling_hand,
      skillLevel: body.skill_level,
      practiceGoals: body.practice_goals,
      preferences: body.preferences,
    });

    await writeAuditEvent(deps.db, {
      userId: auth.userId,
      action: 'profile.updated',
      resourceType: 'profile',
      resourceId: auth.userId,
      ipAddress: request.ip,
    });

    return {
      data: profile,
      meta: { timestamp: new Date().toISOString() },
    };
  });
}
