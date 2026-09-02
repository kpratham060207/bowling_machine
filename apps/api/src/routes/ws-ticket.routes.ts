import type { FastifyInstance } from 'fastify';
import { getAuthContext } from '../auth/middleware.js';
import type { BrowserWsTicketService } from '../websocket/ws-ticket.service.js';

type WsTicketRouteDeps = {
  wsTicketService: BrowserWsTicketService;
};

/**
 * Authenticated REST endpoint to obtain a short-lived browser WebSocket ticket.
 * Avoids placing JWTs in WebSocket URLs — ticket is sent as the first WS message.
 */
export function registerWsTicketRoutes(app: FastifyInstance, deps: WsTicketRouteDeps): void {
  app.post('/ws/browser/ticket', (request) => {
    const auth = getAuthContext(request);
    const ticket = deps.wsTicketService.issue(auth.userId);
    return { data: ticket };
  });
}
