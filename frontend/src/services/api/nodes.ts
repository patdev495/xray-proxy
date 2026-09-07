import type {
  NodeCreate,
  NodeItem,
  NodeUpdate,
  RealityKeys,
  RegionStatus,
  SniProfile,
  SniProfileCreate,
  SniProfileUpdate,
} from '../../types/node';
import { API_BASE_URL, parseError } from './client';

export async function fetchNodes(token: string): Promise<NodeItem[]> {
  const response = await fetch(`${API_BASE_URL}/api/v1/admin/nodes`, {
    headers: {
      'Accept': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch nodes: ${response.statusText}`);
  }

  return response.json();
}

export async function createNode(token: string, payload: NodeCreate): Promise<NodeItem> {
  const response = await fetch(`${API_BASE_URL}/api/v1/admin/nodes`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const err = await parseError(response, 'Failed to create node');
    throw new Error(err);
  }

  return response.json();
}

export async function updateNode(
  token: string,
  nodeId: number,
  payload: NodeUpdate
): Promise<NodeItem> {
  const response = await fetch(`${API_BASE_URL}/api/v1/admin/nodes/${nodeId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const err = await parseError(response, 'Failed to update node');
    throw new Error(err);
  }

  return response.json();
}

export async function deleteNode(token: string, nodeId: number): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/v1/admin/nodes/${nodeId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to delete node');
  }
}

export async function generateRealityKeys(token: string): Promise<RealityKeys> {
  const response = await fetch(`${API_BASE_URL}/api/v1/admin/nodes/generate-keys`, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to generate Reality keys');
  }

  return response.json();
}

export async function addSniProfile(
  token: string,
  nodeId: number,
  payload: SniProfileCreate
): Promise<SniProfile> {
  const response = await fetch(`${API_BASE_URL}/api/v1/admin/nodes/${nodeId}/sni-profiles`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const err = await parseError(response, 'Failed to add SNI profile');
    throw new Error(err);
  }

  return response.json();
}

export async function updateSniProfile(
  token: string,
  nodeId: number,
  sniId: number,
  payload: SniProfileUpdate
): Promise<SniProfile> {
  const response = await fetch(
    `${API_BASE_URL}/api/v1/admin/nodes/${nodeId}/sni-profiles/${sniId}`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    }
  );

  if (!response.ok) {
    const err = await parseError(response, 'Failed to update SNI profile');
    throw new Error(err);
  }

  return response.json();
}

export async function deleteSniProfile(
  token: string,
  nodeId: number,
  sniId: number
): Promise<void> {
  const response = await fetch(
    `${API_BASE_URL}/api/v1/admin/nodes/${nodeId}/sni-profiles/${sniId}`,
    {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error('Failed to delete SNI profile');
  }
}

export async function fetchNodeInstallScript(token: string, nodeId: number): Promise<string> {
  const response = await fetch(`${API_BASE_URL}/api/v1/admin/nodes/${nodeId}/install-script`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch install script');
  }

  return response.text();
}

export async function fetchNodeSyncScript(token: string, nodeId: number): Promise<string> {
  const response = await fetch(`${API_BASE_URL}/api/v1/admin/nodes/${nodeId}/sync-script`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch sync script');
  }

  return response.text();
}

export async function syncNodeUsers(
  token: string,
  nodeId: number
): Promise<{ node_id: number; node_name: string; synced_users: number; inbound_tags: string[] }> {
  const response = await fetch(`${API_BASE_URL}/api/v1/admin/nodes/${nodeId}/sync-users`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    const err = await parseError(response, 'Failed to sync users to node');
    throw new Error(err);
  }

  return response.json();
}

export async function fetchRegionsStatus(): Promise<RegionStatus[]> {
  const response = await fetch(`${API_BASE_URL}/api/v1/regions/status`, {
    headers: {
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    const err = await parseError(response, 'Failed to fetch regions status');
    throw new Error(err);
  }

  return response.json();
}
