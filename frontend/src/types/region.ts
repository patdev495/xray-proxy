export interface RegionItem {
  id: number;
  code: string;
  name: string;
  flag: string;
  is_active: boolean;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
}

export interface RegionCreate {
  code: string;
  name: string;
  flag?: string;
  is_active?: boolean;
  sort_order?: number;
}

export interface RegionUpdate {
  code?: string;
  name?: string;
  flag?: string;
  is_active?: boolean;
  sort_order?: number;
}
