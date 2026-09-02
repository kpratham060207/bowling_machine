import type { FastifyInstance } from 'fastify';
import { RegisterPlayerRequestSchema } from '@bowling-machine/api-contracts';
import type { Database } from '@bowling-machine/database';
import type { SupabaseClient } from '@supabase/supabase-js';
import { ensureApplicationUser } from '../auth/provisioning.js';
import { ApiHttpError } from '../errors/http-errors.js';
import { writeAuditEvent } from '../services/audit.service.js';

/**
 * Registration route — server-side provisioning is authoritative.
 *
 * Flow:
 * 1. Create Supabase Auth user via admin API (service role — server only)
 * 2. Create matching users + profiles rows in PostgreSQL
 * 3. Return success — client completes session via Supabase login
 *
 * We do not rely solely on a frontend callback; this endpoint owns initial provisioning.
 */
export function registerAuthRoutes(
  app: FastifyInstance,
  deps: {
    db: Database['db'];
    supabaseAdmin: SupabaseClient;
  },
): void {
  app.post('/api/v1/auth/register', async (request, reply) => {
    const body = RegisterPlayerRequestSchema.parse(request.body);

    const { data, error } = await deps.supabaseAdmin.auth.admin.createUser({
      email: body.email,
      password: body.password,
      email_confirm: true,
    });

    if (error) {
      if (error.message.toLowerCase().includes('already')) {
        throw ApiHttpError.conflict('An account with this email already exists');
      }
      request.log.warn({ err: error.message }, 'Supabase registration failed');
      throw ApiHttpError.validation('Registration failed — check email and password requirements');
    }

    const authUser = data.user;

    try {
      await ensureApplicationUser(deps.db, {
        userId: authUser.id,
        email: body.email,
        profile: {
          displayName: body.display_name,
          battingHand: body.batting_hand,
          bowlingHand: body.bowling_hand,
          skillLevel: body.skill_level,
          practiceGoals: body.practice_goals,
        },
      });
    } catch (provisionError) {
      // Roll back auth user if application records cannot be created — avoids orphaned auth identity.
      await deps.supabaseAdmin.auth.admin.deleteUser(authUser.id);
      request.log.error(
        { err: provisionError },
        'Application provisioning failed after auth create',
      );
      throw ApiHttpError.internal('Account provisioning failed');
    }

    await writeAuditEvent(deps.db, {
      userId: authUser.id,
      action: 'player.registered',
      resourceType: 'user',
      resourceId: authUser.id,
      ipAddress: request.ip,
      details: { email: body.email },
    });

    return reply.status(201).send({
      data: {
        user_id: authUser.id,
        email: body.email,
        message: 'Account created — sign in to continue',
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  });
}
