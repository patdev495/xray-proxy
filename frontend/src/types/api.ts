export interface HealthResponse {
  status: string;
  app: string;
  version: string;
  database: string;
}

export type ConnectionStatus = 'checking' | 'connected' | 'degraded' | 'offline';
