import { randomUUID } from 'node:crypto';
import { describe, expect, it, beforeEach } from 'vitest';
import { MachineEventBus } from '../gateway/event-bus.js';
import { DefaultMachineGateway } from '../gateway/machine-gateway.js';
import { MachineCommandSchema } from '@bowling-machine/api-contracts';

describe('DefaultMachineGateway', () => {
  let gateway: DefaultMachineGateway;
  let eventBus: MachineEventBus;
  const machineId = randomUUID();

  beforeEach(() => {
    eventBus = new MachineEventBus();
    gateway = new DefaultMachineGateway(eventBus, 15_000);
  });

  it('tracks peer connection and status', () => {
    const sent: string[] = [];
    gateway.attachPeer(machineId, 'SIMULATOR', (msg) => sent.push(msg));
    expect(gateway.isMachineConnected(machineId)).toBe(true);
    expect(gateway.getMachineStatus(machineId).connection_status).toBe('CONNECTED');
  });

  it('resolves command acknowledgement from peer messages', async () => {
    gateway.attachPeer(machineId, 'SIMULATOR', () => undefined);

    const command = MachineCommandSchema.parse({
      command_id: randomUUID(),
      machine_id: machineId,
      protocol_version: '1.0',
      command_type: 'PING',
      issued_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 30_000).toISOString(),
      payload: {},
    });

    const ackPromise = gateway.sendCommand(command, 5000);

    // Simulate peer ack after dispatch
    setTimeout(() => {
      gateway.handleInboundMessage(
        machineId,
        JSON.stringify({
          type: 'command.ack',
          id: randomUUID(),
          timestamp: new Date().toISOString(),
          payload: {
            command_id: command.command_id,
            machine_id: machineId,
            protocol_version: '1.0',
            timestamp: new Date().toISOString(),
            accepted: true,
            error_code: null,
            message: 'ok',
          },
        }),
      );
    }, 10);

    const ack = await ackPromise;
    expect(ack.accepted).toBe(true);
  });

  it('marks duplicate command_id as idempotent at gateway after first ack', async () => {
    gateway.attachPeer(machineId, 'SIMULATOR', () => undefined);

    const command = MachineCommandSchema.parse({
      command_id: randomUUID(),
      machine_id: machineId,
      protocol_version: '1.0',
      command_type: 'STATUS',
      issued_at: new Date().toISOString(),
      payload: {},
    });

    const internal = gateway as unknown as {
      peers: Map<string, { processedCommandIds: Set<string> }>;
    };
    const peerState = internal.peers.get(machineId);
    if (!peerState) {
      throw new Error('Expected peer state in test');
    }
    peerState.processedCommandIds.add(command.command_id);

    const result = await gateway.sendCommand(command, 100);
    expect(result.accepted).toBe(true);
    expect(result.message).toContain('Duplicate command_id');
  });
});
