/**
 * ESP32 machine simulator — connects to backend /ws/machine and implements protocol 1.0.
 *
 * SIMULATED BEHAVIOR ONLY — does not control physical hardware.
 * See docs/protocol/SIMULATOR.md for state machine and failure injection.
 */
import { PROTOCOL_VERSION } from '@bowling-machine/api-contracts';
import { loadSimulatorConfig, SimulatorClient } from './client.js';

export function main(): void {
  const config = loadSimulatorConfig();
  console.log('[esp32-simulator] starting (simulated machine peer)');
  console.log('[esp32-simulator] protocol version:', PROTOCOL_VERSION);
  console.log('[esp32-simulator] machine id:', config.machineId);
  console.log('[esp32-simulator] backend:', config.backendUrl);
  console.log('[esp32-simulator] failure mode:', config.failureMode);

  const client = new SimulatorClient(config);
  client.connect();

  const shutdown = (): void => {
    console.log('[esp32-simulator] shutting down');
    client.disconnect();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main();
