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
  plan_id?: number | null;
  plan_name?: string | null;
  region_id?: number | null;
  region_code?: string | null;
  region_name?: string | null;
  region_flag?: string | null;
}

export interface SubscriptionCreate {
  customer_name: string;
  quota_gb?: number;
  days_valid?: number;
  plan_id?: number;
  region_id?: number;
  node_ids?: number[];
}

export interface SubscriptionUpdate {
  customer_name?: string;
  traffic_quota_gb?: number;
  add_quota_gb?: number;
  add_days?: number;
  expires_at?: string;
  status?: SubscriptionStatus;
  plan_id?: number;
  region_id?: number;
  node_ids?: number[];
}
