import type { FastifyInstance } from 'fastify';
import { CalculationPreviewRequestSchema } from '@bowling-machine/api-contracts';
import { getAuthContext } from '../auth/middleware.js';
import { rejectClientOwnershipFields } from '../auth/authorization.js';
import type { CalculationPreviewService } from '../services/calculation-preview.service.js';

type CalculationRouteDeps = {
  calculationPreviewService: CalculationPreviewService;
};

/**
 * Calculation-only routes — no machine commands, no persistence.
 * Preview uses the existing Phase 1F calculation engine.
 */
export function registerCalculationRoutes(app: FastifyInstance, deps: CalculationRouteDeps): void {
  app.post('/api/v1/calculation/preview', async (request) => {
    const auth = getAuthContext(request);
    rejectClientOwnershipFields((request.body ?? {}) as Record<string, unknown>);
    const body = CalculationPreviewRequestSchema.parse(request.body);
    const preview = await deps.calculationPreviewService.preview(auth.userId, body);
    return { data: preview };
  });
}
