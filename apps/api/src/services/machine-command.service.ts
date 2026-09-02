import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import {
  MachineCommandSchema,
  PROTOCOL_VERSION,
  type CommandAcknowledgement,
  type CommandId,
  type MachineCommand,
} from '@bowling-machine/api-contracts';
import type { Database } from '@bowling-machine/database';
import { machineCommands } from '@bowling-machine/database';
import { ApiHttpError } from '../errors/http-errors.js';
import { addMilliseconds, isExpired, nowIso } from '../lib/machine-crypto.js';
import type { MachineGateway } from '../gateway/types.js';

export type CommandDispatchResult = {
  commandId: string;
  status: 'DISPATCHED' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED' | 'FAILED' | 'PENDING';
  acknowledgement?: CommandAcknowledgement;
};

/**
 * Persists commands, enforces idempotency via command_id PK, and dispatches through the gateway.
 * HTTP success means the application accepted the request; machine ack is separate.
 */
export class MachineCommandService {
  constructor(
    private readonly db: Database['db'],
    private readonly gateway: MachineGateway,
    private readonly commandTtlMs: number,
    private readonly ackTimeoutMs: number,
  ) {}

  /** Builds a domain command with metadata — caller supplies command_type-specific payload. */
  buildCommand(
    machineId: string,
    commandType: MachineCommand['command_type'],
    payload: MachineCommand['payload'],
    commandId: CommandId = randomUUID(),
  ): MachineCommand {
    const issuedAt = nowIso();
    const expiresAt = addMilliseconds(issuedAt, this.commandTtlMs);

    const candidate = {
      command_id: commandId,
      machine_id: machineId,
      protocol_version: '1.0' as const,
      command_type: commandType,
      issued_at: issuedAt,
      expires_at: expiresAt,
      payload,
    };

    return MachineCommandSchema.parse(candidate);
  }

  /**
   * Idempotency: duplicate command_id returns the stored outcome without re-dispatching
   * to the machine peer (prevents unsafe duplicate execution on retries).
   */
  async dispatch(
    command: MachineCommand,
    options?: { sessionId?: string },
  ): Promise<CommandDispatchResult> {
    const incomingVersion: string = command.protocol_version;
    if (incomingVersion !== PROTOCOL_VERSION) {
      throw ApiHttpError.validation('Unsupported protocol version', {
        protocol_version: command.protocol_version,
      });
    }

    if (isExpired(command.expires_at)) {
      await this.persistCommand(command, 'EXPIRED', {
        accepted: false,
        error_code: 'COMMAND_EXPIRED',
        message: 'Command expired before dispatch',
      });
      return {
        commandId: command.command_id,
        status: 'EXPIRED',
        acknowledgement: {
          command_id: command.command_id,
          machine_id: command.machine_id,
          protocol_version: command.protocol_version,
          timestamp: nowIso(),
          accepted: false,
          error_code: 'COMMAND_EXPIRED',
          message: 'Command expired before dispatch',
        },
      };
    }

    const existing = await this.db
      .select()
      .from(machineCommands)
      .where(eq(machineCommands.id, command.command_id))
      .limit(1);

    if (existing.length > 0) {
      const row = existing[0];
      if (!row) {
        throw ApiHttpError.internal('Unexpected empty command lookup result');
      }
      return {
        commandId: row.id,
        status: row.status,
        acknowledgement:
          row.ackAccepted === null
            ? undefined
            : {
                command_id: row.id,
                machine_id: row.machineId,
                protocol_version: row.protocolVersion as '1.0',
                timestamp: row.ackedAt ?? nowIso(),
                accepted: row.ackAccepted,
                error_code: row.ackErrorCode,
                message: row.ackMessage,
              },
      };
    }

    await this.db.insert(machineCommands).values({
      id: command.command_id,
      machineId: command.machine_id,
      commandType: command.command_type,
      protocolVersion: command.protocol_version,
      issuedAt: command.issued_at,
      expiresAt: command.expires_at ?? null,
      payload: command,
      status: 'PENDING',
      sessionId: options?.sessionId ?? null,
    });

    if (!this.gateway.isMachineConnected(command.machine_id)) {
      await this.updateCommandStatus(command.command_id, 'FAILED', {
        accepted: false,
        error_code: 'COMMAND_REJECTED',
        message: 'Machine peer is not connected',
        timestamp: nowIso(),
      });
      throw ApiHttpError.conflict('Machine is not connected', { machine_id: command.machine_id });
    }

    await this.updateCommandStatus(command.command_id, 'DISPATCHED');

    try {
      const acknowledgement = await this.gateway.sendCommand(command, this.ackTimeoutMs);
      const status = acknowledgement.accepted ? 'ACCEPTED' : 'REJECTED';
      await this.updateCommandStatus(command.command_id, status, acknowledgement);
      return { commandId: command.command_id, status, acknowledgement };
    } catch (error) {
      const timedOut = error instanceof Error && error.message.includes('timeout');
      const status = timedOut ? 'FAILED' : 'FAILED';
      await this.updateCommandStatus(command.command_id, status, {
        accepted: false,
        error_code: timedOut ? 'COMMAND_REJECTED' : 'UNKNOWN',
        message: error instanceof Error ? error.message : 'Command dispatch failed',
        timestamp: nowIso(),
      });
      throw ApiHttpError.conflict(
        timedOut ? 'Machine did not acknowledge command in time' : 'Command dispatch failed',
        { command_id: command.command_id },
      );
    }
  }

  private async persistCommand(
    command: MachineCommand,
    status: typeof machineCommands.$inferSelect.status,
    ack: Pick<CommandAcknowledgement, 'accepted' | 'error_code' | 'message'>,
  ): Promise<void> {
    await this.db
      .insert(machineCommands)
      .values({
        id: command.command_id,
        machineId: command.machine_id,
        commandType: command.command_type,
        protocolVersion: command.protocol_version,
        issuedAt: command.issued_at,
        expiresAt: command.expires_at ?? null,
        payload: command,
        status,
        ackAccepted: ack.accepted,
        ackErrorCode: ack.error_code ?? undefined,
        ackMessage: ack.message ?? undefined,
        ackedAt: nowIso(),
      })
      .onConflictDoNothing();
  }

  private async updateCommandStatus(
    commandId: string,
    status: typeof machineCommands.$inferSelect.status,
    acknowledgement?: Pick<
      CommandAcknowledgement,
      'accepted' | 'error_code' | 'message' | 'timestamp'
    >,
  ): Promise<void> {
    await this.db
      .update(machineCommands)
      .set({
        status,
        ackAccepted: acknowledgement?.accepted,
        ackErrorCode: acknowledgement?.error_code ?? undefined,
        ackMessage: acknowledgement?.message ?? undefined,
        ackedAt: acknowledgement ? acknowledgement.timestamp : undefined,
        updatedAt: nowIso(),
      })
      .where(eq(machineCommands.id, commandId));
  }
}
