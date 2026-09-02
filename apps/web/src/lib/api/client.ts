import type {
  CreateDeliveryRequest,
  CreateSessionRequest,
  Delivery,
  MachineStatus,
  Player,
  PracticeSession,
  UpdatePlayerProfileRequest,
} from '@bowling-machine/api-contracts';
import { getApiBaseUrl } from '@/lib/supabase/client';
import { ApiClientError } from './errors';

type ApiEnvelope<T> = { data: T; meta?: { timestamp?: string } };

/** Machine summary returned by GET /machines — extends identity with control hints. */
export type MachineSummary = {
  machine_id: string;
  name: string;
  serial_number: string;
  kind: 'SIMULATOR' | 'HARDWARE';
  registry_status: string;
  has_control: boolean;
  control_expires_at: string | null;
};

export type MachineDetail = {
  machine: {
    machine_id: string;
    name: string;
    serial_number: string;
    kind: 'SIMULATOR' | 'HARDWARE';
  };
  status: MachineStatus;
  control: {
    connection_id: string;
    acquired_at: string;
    expires_at: string;
    is_owner: boolean;
  } | null;
};

export type ConnectMachineResult = {
  machine_id: string;
  name: string;
  status: string;
  connection_status: string;
};

export type ControlLockResult = {
  machine_id: string;
  connection_id: string;
  acquired_at: string;
  expires_at: string;
};

/**
 * Typed REST client for the bowling machine API.
 * All calls attach the Supabase access token — never accept tokens from callers in URLs.
 */
export class ApiClient {
  constructor(private readonly getAccessToken: () => Promise<string | null>) {}

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const token = await this.getAccessToken();
    if (!token) {
      throw new ApiClientError(401, 'UNAUTHORIZED', 'Authentication required');
    }

    const headers = new Headers(init.headers);
    headers.set('Authorization', `Bearer ${token}`);
    if (init.body && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    const response = await fetch(`${getApiBaseUrl()}${path}`, {
      ...init,
      headers,
      cache: 'no-store',
    });

    if (!response.ok) {
      let body: unknown;
      try {
        body = await response.json();
      } catch {
        body = null;
      }
      throw ApiClientError.fromResponse(response.status, body);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    const json = (await response.json()) as ApiEnvelope<T>;
    return json.data;
  }

  getProfile(): Promise<Player> {
    return this.request<Player>('/api/v1/profile');
  }

  updateProfile(body: UpdatePlayerProfileRequest): Promise<Player> {
    return this.request<Player>('/api/v1/profile', {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  listMachines(): Promise<MachineSummary[]> {
    return this.request<MachineSummary[]>('/machines');
  }

  getMachine(machineId: string): Promise<MachineDetail> {
    return this.request<MachineDetail>(`/machines/${machineId}`);
  }

  connectByQrToken(qrToken: string): Promise<ConnectMachineResult> {
    return this.request<ConnectMachineResult>('/machines/connect', {
      method: 'POST',
      body: JSON.stringify({ qr_token: qrToken }),
    });
  }

  acquireControl(machineId: string): Promise<ControlLockResult> {
    return this.request<ControlLockResult>(`/machines/${machineId}/control/acquire`, {
      method: 'POST',
    });
  }

  releaseControl(machineId: string, connectionId?: string): Promise<{ released_at: string }> {
    return this.request<{ released_at: string }>(`/machines/${machineId}/control/release`, {
      method: 'POST',
      body: JSON.stringify(connectionId ? { connection_id: connectionId } : {}),
    });
  }

  homeMachine(machineId: string): Promise<unknown> {
    return this.request(`/machines/${machineId}/home`, { method: 'POST' });
  }

  stopMachine(machineId: string): Promise<unknown> {
    return this.request(`/machines/${machineId}/stop`, { method: 'POST' });
  }

  /** Short-lived WebSocket ticket — sent as first WS message, never in URL. */
  async getWsTicket(): Promise<string> {
    const result = await this.request<{ ticket: string; expires_at: string }>(
      '/ws/browser/ticket',
      { method: 'POST' },
    );
    return result.ticket;
  }

  listSessions(): Promise<PracticeSession[]> {
    return this.request<PracticeSession[]>('/api/v1/sessions');
  }

  getSession(sessionId: string): Promise<PracticeSession> {
    return this.request<PracticeSession>(`/api/v1/sessions/${sessionId}`);
  }

  createSession(body: CreateSessionRequest): Promise<PracticeSession> {
    return this.request<PracticeSession>('/api/v1/sessions', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  startSession(sessionId: string): Promise<{ delivery: unknown }> {
    return this.request<{ delivery: unknown }>(`/api/v1/sessions/${sessionId}/start`, {
      method: 'POST',
    });
  }

  stopSession(sessionId: string): Promise<{ status: string }> {
    return this.request<{ status: string }>(`/api/v1/sessions/${sessionId}/stop`, {
      method: 'POST',
    });
  }

  /** Creates a delivery for the session — high-level user parameters only. */
  createDelivery(sessionId: string, body: CreateDeliveryRequest): Promise<Delivery> {
    return this.request<Delivery>(`/api/v1/sessions/${sessionId}/deliveries`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }
}

/** Creates an API client using the browser Supabase session access token. */
export function createBrowserApiClient(getAccessToken: () => Promise<string | null>): ApiClient {
  return new ApiClient(getAccessToken);
}
