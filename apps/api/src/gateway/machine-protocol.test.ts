import { randomUUID } from 'node:crypto';
import { describe, expect, it, beforeEach } from 'vitest';
import { MachineEventBus } from '../gateway/event-bus.js';
import { DefaultMachineGateway } from '../gateway/machine-gateway.js';
import { MachineCommandSchema, PROTOCOL_VERSION } from '@bowling-machine/api-contracts';

describe('machine protocol gateway', () => {
  let gateway: DefaultMachineGateway;
  let eventBus: MachineEventBus;
  const machineId = randomUUID();
  const sent: string[] = [];

  beforeEach(() => {
    eventBus = new MachineEventBus();
    gateway = new DefaultMachineGateway(eventBus, 15_000);
    sent.length = 0;
    gateway.attachPeer(machineId, 'SIMULATOR', (msg) => sent.push(msg));
  });

  it('rejects command.ack with unsupported protocol version at schema validation', async () => {
    const command = MachineCommandSchema.parse({
      command_id: randomUUID(),
      machine_id: machineId,
      protocol_version: PROTOCOL_VERSION,
      command_type: 'PING',
      issued_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 30_000).toISOString(),
      payload: {},
    });

    const ackPromise = gateway.sendCommand(command, 5000);

    gateway.handleInboundMessage(
      machineId,
      JSON.stringify({
        type: 'command.ack',
        id: randomUUID(),
        timestamp: new Date().toISOString(),
        payload: {
          command_id: command.command_id,
          machine_id: machineId,
          protocol_version: '9.9',
          timestamp: new Date().toISOString(),
          accepted: true,
          error_code: null,
          message: 'ok',
        },
      }),
    );

    await expect(ackPromise).rejects.toThrow('Command acknowledgement timeout');
    expect(sent.some((msg) => msg.includes('Malformed or unsupported wire message'))).toBe(true);
  });

  it('sends wire error for malformed inbound JSON', () => {
    gateway.handleInboundMessage(machineId, '{not-json');
    expect(sent.some((msg) => msg.includes('Invalid JSON payload'))).toBe(true);
  });

  it('sends wire error for unsupported message type', () => {
    gateway.handleInboundMessage(
      machineId,
      JSON.stringify({
        type: 'unknown.message',
        id: randomUUID(),
        timestamp: new Date().toISOString(),
        payload: {},
      }),
    );
    expect(sent.some((msg) => msg.includes('Malformed or unsupported wire message'))).toBe(true);
  });
});
