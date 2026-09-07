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
  node_names?: string[];
  subscription_url?: string;
  plan_id?: number | null;
  plan_name?: string | null;
  region_id?: number | null;
  region_code?: string | null;
  region_name?: string | null;
  region_flag?: string | null;
  billing_cycle?: 'MONTHLY' | 'DAILY';
  is_renewable?: boolean;
}

export interface EligibleNode {
  id: number;
  name: string;
  host: string;
  flag: string;
  location: string;
  available_slots: number;
  max_subscriptions: number;
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
