export interface SniProfile {
  id: number;
  node_id: number;
  carrier: string;
  domain: string;
  port: number;
  is_active: boolean;
}

export interface SniProfileCreate {
  carrier: string;
  domain: string;
  port?: number;
  is_active?: boolean;
}

export interface SniProfileUpdate {
  carrier?: string;
  domain?: string;
  port?: number;
  is_active?: boolean;
}

export interface NodeItem {
  id: number;
  name: string;
  host: string;
  location: string;
  flag: string;
  region_id?: number;
  grpc_port: number;
  inbound_port: number;
  reality_private_key: string;
  reality_public_key: string;
  reality_short_id: string;
  max_subscriptions: number;
  active_subscriptions_count?: number;
  is_active: boolean;
  sni_profiles: SniProfile[];
}

export interface NodeCreate {
  name: string;
  host: string;
  region_id?: number;
  location?: string;
  flag?: string;
  grpc_port?: number;
  inbound_port?: number;
  max_subscriptions?: number;
  reality_private_key?: string;
  reality_public_key?: string;
  reality_short_id?: string;
  sni_profiles?: SniProfileCreate[];
}

export interface NodeUpdate {
  name?: string;
  host?: string;
  region_id?: number;
  location?: string;
  flag?: string;
  grpc_port?: number;
  inbound_port?: number;
  max_subscriptions?: number;
  reality_private_key?: string;
  reality_public_key?: string;
  reality_short_id?: string;
  is_active?: boolean;
}

export interface RealityKeys {
  private_key: string;
  public_key: string;
  short_id: string;
}

export interface RegionStatus {
  flag: string;
  location: string;
  total_nodes: number;
  active_nodes: number;
  total_capacity: number;
  active_subscriptions: number;
  available_slots: number;
  is_sold_out: boolean;
}

