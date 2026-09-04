export interface SyncDetails {
  synced_nodes: number;
  updated_subscriptions: number;
  suspended_count: number;
}

export interface SyncResponse {
  success: boolean;
  message: string;
  details: SyncDetails;
  timestamp: string;
}

export interface NodeGrpcStatus {
  id: number;
  name: string;
  host: string;
  grpc_port: number;
  is_reachable: boolean;
}

export interface SyncStatusResponse {
  timestamp: string;
  active_nodes_count: number;
  nodes: NodeGrpcStatus[];
}
