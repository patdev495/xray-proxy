export type SubscriptionStatus = 'ACTIVE' | 'SUSPENDED' | 'EXPIRED';

export interface SubscriptionItem {
  id: number;
  customer_name: string;
  token: string;
  uuid: string;
  traffic_quota_bytes: number;
  traffic_used_bytes: number;
  expires_at: string;
  status: SubscriptionStatus;
  created_at: string;
  node_ids?: number[];
}

export interface SubscriptionCreate {
  customer_name: string;
  quota_gb: number;
  days_valid: number;
  node_ids?: number[];
}

export interface SubscriptionUpdate {
  customer_name?: string;
  traffic_quota_gb?: number;
  add_quota_gb?: number;
  add_days?: number;
  expires_at?: string;
  status?: SubscriptionStatus;
  node_ids?: number[];
}
