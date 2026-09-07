export interface Order {
  id: number;
  code: string;
  user_id: number;
  plan_id: number;
  plan_name: string;
  region: string;
  amount_vnd: number;
  status: 'PENDING' | 'PAID' | 'CANCELLED' | 'EXPIRED';
  created_at: string;
  expires_at: string;
  vietqr_url: string;
  bank_id: string;
  bank_account_number: string;
  bank_account_name: string;
}

export interface OrderCreateRequest {
  plan_id: number;
  region: string;
}
