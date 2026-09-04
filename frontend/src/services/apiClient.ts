import type { HealthResponse } from '../types/api';
import type { Token, User } from '../types/auth';
import type {
  NodeCreate,
  NodeItem,
  NodeUpdate,
  RealityKeys,
  SniProfile,
  SniProfileCreate,
  SniProfileUpdate,
} from '../types/node';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

export async function fetchHealth(): Promise<HealthResponse> {
  const response = await fetch(`${API_BASE_URL}/api/health`, {
    headers: {
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
  }

  const data: HealthResponse = await response.json();
  return data;
}

export async function loginUser(username: string, password: string): Promise<Token> {
  const response = await fetch(`${API_BASE_URL}/api/v1/auth/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({ username, password }),
  });

  if (!response.ok) {
    let errorDetail = 'Authentication failed';
    try {
      const errJson = await response.json();
      if (errJson.detail) {
        errorDetail = errJson.detail;
      }
    } catch {
      // ignore
    }
    throw new Error(errorDetail);
  }

  const data: Token = await response.json();
  return data;
}

export async function fetchCurrentUser(token: string): Promise<User> {
  const response = await fetch(`${API_BASE_URL}/api/v1/auth/me`, {
    headers: {
      'Accept': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Session expired or invalid credentials');
  }

  const data: User = await response.json();
  return data;
}

// ---------------------------------------------------------------------------
// Node & SNI Management API
// ---------------------------------------------------------------------------

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
    const err = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(err.detail || 'Failed to create node');
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
    const err = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(err.detail || 'Failed to update node');
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
    const err = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(err.detail || 'Failed to add SNI profile');
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
    const err = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(err.detail || 'Failed to update SNI profile');
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
