export interface SniProfile {
  id: number;
  node_id: number;
  carrier: string;
  domain: string;
  is_active: boolean;
}

export interface SniProfileCreate {
  carrier: string;
  domain: string;
  is_active?: boolean;
}

export interface SniProfileUpdate {
  carrier?: string;
  domain?: string;
  is_active?: boolean;
}

export interface NodeItem {
  id: number;
  name: string;
  host: string;
  location: string;
  flag: string;
  grpc_port: number;
  inbound_port: number;
  reality_private_key: string;
  reality_public_key: string;
  reality_short_id: string;
  is_active: boolean;
  sni_profiles: SniProfile[];
}

export interface NodeCreate {
  name: string;
  host: string;
  location?: string;
  flag?: string;
  grpc_port?: number;
  inbound_port?: number;
  reality_private_key?: string;
  reality_public_key?: string;
  reality_short_id?: string;
  sni_profiles?: SniProfileCreate[];
}

export interface NodeUpdate {
  name?: string;
  host?: string;
  location?: string;
  flag?: string;
  grpc_port?: number;
  inbound_port?: number;
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
