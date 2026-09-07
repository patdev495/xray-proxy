export interface PlanItem {
  id: number;
  name: string;
  price_vnd: number;
  quota_gb: number;
  days_valid: number;
  allowed_regions: string[];
  is_active: boolean;
  sort_order: number;
  traffic_quota_bytes: number;
  enable_daily?: boolean;
  price_daily_vnd?: number;
  quota_daily_gb?: number;
  quota_daily_bytes?: number;
  created_at: string;
  updated_at: string;
}

export interface PlanCreate {
  name: string;
  price_vnd: number;
  quota_gb: number;
  days_valid: number;
  allowed_regions?: string[];
  is_active?: boolean;
  sort_order?: number;
  enable_daily?: boolean;
  price_daily_vnd?: number;
  quota_daily_gb?: number;
}

export interface PlanUpdate {
  name?: string;
  price_vnd?: number;
  quota_gb?: number;
  days_valid?: number;
  allowed_regions?: string[];
  is_active?: boolean;
  sort_order?: number;
  enable_daily?: boolean;
  price_daily_vnd?: number;
  quota_daily_gb?: number;
}

export interface SystemSettings {
  support_telegram_url: string;
  support_zalo_url: string;
  bank_id?: string;
  bank_account_number?: string;
  bank_account_name?: string;
  bank_transfer_prefix?: string;
  sepay_api_key?: string;
}
