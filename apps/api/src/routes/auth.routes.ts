import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import {
  isEmail,
  normalizeUsername,
  RegisterPlayerRequestSchema,
} from '@bowling-machine/api-contracts';
import type { Database } from '@bowling-machine/database';
import { eq } from 'drizzle-orm';
import { profiles, users } from '@bowling-machine/database';
import type { SupabaseClient } from '@supabase/supabase-js';
import { ensureApplicationUser } from '../auth/provisioning.js';
import { ApiHttpError } from '../errors/http-errors.js';
import { writeAuditEvent } from '../services/audit.service.js';
import { lookupEmailByUsername, setUsernameOnProfile } from '../services/profile.service.js';

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
    passwordResetRedirectTo?: string;
  },
): void {
  app.post('/api/v1/auth/register', async (request, reply) => {
    const body = RegisterPlayerRequestSchema.parse(request.body);

    /**
     * Pre-checking here avoids creating a new auth identity when the requested
     * username is already claimed. The DB unique index still handles races.
     */
    const existingEmail = await lookupEmailByUsername(deps.db, normalizeUsername(body.username));
    if (existingEmail) {
      throw ApiHttpError.conflict('Username is already taken');
    }

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
          username: body.username,
          hasPasswordCredential: true,
          battingHand: body.batting_hand,
          bowlingHand: body.bowling_hand,
          skillLevel: body.skill_level,
          practiceGoals: body.practice_goals,
        },
      });

      /**
       * This helper keeps username assignment logic in one place so registration
       * and later profile edits share the same normalization and conflict rules.
       */
      await setUsernameOnProfile(deps.db, authUser.id, body.username);
    } catch (provisionError) {
      // Best-effort cleanup keeps failed registrations from leaving partial records behind.
      await cleanupFailedRegistration(deps.db, deps.supabaseAdmin, authUser.id, request.log);
      request.log.error(
        { err: provisionError },
        'Application provisioning failed after auth create',
      );
      if (provisionError instanceof ApiHttpError) {
        throw provisionError;
      }
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

  app.post('/api/v1/auth/lookup-identifier', async (request) => {
    const body = z
      .object({
        identifier: z.string().trim().min(1, 'Identifier is required'),
      })
      .parse(request.body);

    if (isEmail(body.identifier)) {
      return { email: body.identifier };
    }

    /**
     * Production should add rate-limiting here because username-to-email lookup
     * is public-facing and could otherwise be abused for enumeration attempts.
     */
    const email = await lookupEmailByUsername(deps.db, normalizeUsername(body.identifier));
    if (!email) {
      throw ApiHttpError.notFound('Account not found');
    }

    return { email };
  });

  app.post('/api/v1/auth/forgot-password', async (request) => {
    const body = z
      .object({
        email: z.string().email('Valid email is required'),
        redirectTo: z.string().url().optional(),
      })
      .parse(request.body);

    const redirectTo = body.redirectTo ?? deps.passwordResetRedirectTo;

    try {
      await deps.supabaseAdmin.auth.resetPasswordForEmail(
        body.email,
        redirectTo ? { redirectTo } : undefined,
      );
    } catch (error: unknown) {
      request.log.warn({ err: error }, 'Supabase forgot-password request failed');
    }

    return {
      message: 'If an account exists for this email, a reset link has been sent.',
    };
  });
}

async function cleanupFailedRegistration(
  db: Database['db'],
  supabaseAdmin: SupabaseClient,
  userId: string,
  requestLogger: {
    warn: (context: Record<string, unknown>, message: string) => void;
  },
): Promise<void> {
  try {
    await db.delete(profiles).where(eq(profiles.userId, userId));
    await db.delete(users).where(eq(users.id, userId));
    await supabaseAdmin.auth.admin.deleteUser(userId);
  } catch (cleanupError) {
    requestLogger.warn({ err: cleanupError, userId }, 'Registration cleanup failed');
  }
}
