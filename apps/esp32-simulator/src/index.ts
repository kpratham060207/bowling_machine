/**
 * @bowling-machine/esp32-simulator — application entry point
 *
 * PLACEHOLDER — Phase 1A foundation only.
 *
 * This package will simulate ESP32 protocol behavior for backend/frontend development.
 * It does NOT implement machine state machine, protocol, or WebSocket server yet.
 */
import { PROTOCOL_VERSION } from '@bowling-machine/api-contracts';
import { SHARED_PLACEHOLDER } from '@bowling-machine/shared';

export const SIMULATOR_PLACEHOLDER = 'phase-1a-foundation' as const;

export function main(): void {
  console.log('[esp32-simulator] placeholder only — no simulator started');
  console.log('[esp32-simulator] phase:', SIMULATOR_PLACEHOLDER);
  console.log('[esp32-simulator] protocol version:', PROTOCOL_VERSION);
  console.log('[esp32-simulator] shared:', SHARED_PLACEHOLDER);
}

main();
