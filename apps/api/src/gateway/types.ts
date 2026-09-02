import type {
  CommandAcknowledgement,
  MachineCommand,
  MachineConnectionStatus,
  MachineStatus,
  WebSocketEvent,
} from '@bowling-machine/api-contracts';

/**
 * Machine gateway boundary — business logic talks to this interface, not raw WebSockets.
 * Transport details (Fastify WS, headers, wire codec) stay in gateway implementation files.
 */
export interface MachineGateway {
  /** Live status snapshot maintained by the gateway from machine telemetry. */
  getMachineStatus(machineId: string): MachineStatus;

  /** Whether a machine peer WebSocket is currently connected. */
  isMachineConnected(machineId: string): boolean;

  /** Machine ids with an active peer connection. */
  listConnectedMachineIds(): string[];

  /**
   * Sends a domain command and waits for machine acknowledgement or timeout.
   * Duplicate command_id handling is delegated to MachineCommandService persistence.
   */
  sendCommand(command: MachineCommand, ackTimeoutMs: number): Promise<CommandAcknowledgement>;

  /** Register a handler for domain events emitted by connected machine peers. */
  onEvent(listener: (event: WebSocketEvent) => void): () => void;
}

export type PendingCommand = {
  commandId: string;
  resolve: (ack: CommandAcknowledgement) => void;
  reject: (error: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
};

export type MachinePeerConnection = {
  machineId: string;
  connectionStatus: MachineConnectionStatus;
  status: MachineStatus;
  lastHeartbeatAt: string | null;
  pendingCommands: Map<string, PendingCommand>;
  /** In-memory idempotency guard — complements DB command_id PK. */
  processedCommandIds: Set<string>;
  send: (message: string) => void;
};
