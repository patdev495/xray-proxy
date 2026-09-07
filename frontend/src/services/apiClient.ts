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
import type {
  SubscriptionCreate,
  SubscriptionItem,
  SubscriptionUpdate,
} from '../types/subscription';

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
    const err = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(err.detail || 'Failed to sync users to node');
  }

  return response.json();
}

// ---------------------------------------------------------------------------
// Subscription Management API
// ---------------------------------------------------------------------------

export async function fetchSubscriptions(token: string): Promise<SubscriptionItem[]> {
  const response = await fetch(`${API_BASE_URL}/api/v1/admin/subscriptions`, {
    headers: {
      'Accept': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch subscriptions: ${response.statusText}`);
  }

  return response.json();
}

export async function createSubscription(
  token: string,
  payload: SubscriptionCreate
): Promise<SubscriptionItem> {
  const response = await fetch(`${API_BASE_URL}/api/v1/admin/subscriptions`, {
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
    throw new Error(err.detail || 'Failed to create subscription');
  }

  return response.json();
}

export async function updateSubscription(
  token: string,
  subId: number,
  payload: SubscriptionUpdate
): Promise<SubscriptionItem> {
  const response = await fetch(`${API_BASE_URL}/api/v1/admin/subscriptions/${subId}`, {
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
    throw new Error(err.detail || 'Failed to update subscription');
  }

  return response.json();
}

export async function deleteSubscription(token: string, subId: number): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/v1/admin/subscriptions/${subId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to delete subscription');
  }
}

export async function triggerLiveStatsSync(token: string): Promise<import('../types/sync').SyncResponse> {
  const response = await fetch(`${API_BASE_URL}/api/v1/admin/sync/live-stats`, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(err.detail || 'Failed to trigger live stats sync');
  }

  return response.json();
}

export async function triggerEnforceLimits(token: string): Promise<import('../types/sync').SyncResponse> {
  const response = await fetch(`${API_BASE_URL}/api/v1/admin/sync/enforce-limits`, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(err.detail || 'Failed to trigger limit enforcement');
  }

  return response.json();
}

export async function fetchSyncStatus(token: string): Promise<import('../types/sync').SyncStatusResponse> {
  const response = await fetch(`${API_BASE_URL}/api/v1/admin/sync/status`, {
    headers: {
      'Accept': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(err.detail || 'Failed to fetch sync status');
  }

  return response.json();
}

export async function fetchRegionsStatus(): Promise<import('../types/node').RegionStatus[]> {
  const response = await fetch(`${API_BASE_URL}/api/v1/regions/status`, {
    headers: {
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(err.detail || 'Failed to fetch regions status');
  }

  return response.json();
}

// ---------------------------------------------------------------------------
// Plan & Settings APIs (Issue 02)
// ---------------------------------------------------------------------------

export async function fetchAdminPlans(token: string): Promise<import('../types/plan').PlanItem[]> {
  const response = await fetch(`${API_BASE_URL}/api/v1/admin/plans`, {
    headers: {
      'Accept': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch plans: ${response.statusText}`);
  }
  return response.json();
}

export async function createAdminPlan(
  token: string,
  payload: import('../types/plan').PlanCreate
): Promise<import('../types/plan').PlanItem> {
  const response = await fetch(`${API_BASE_URL}/api/v1/admin/plans`, {
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
    throw new Error(err.detail || 'Failed to create plan');
  }
  return response.json();
}

export async function updateAdminPlan(
  token: string,
  planId: number,
  payload: import('../types/plan').PlanUpdate
): Promise<import('../types/plan').PlanItem> {
  const response = await fetch(`${API_BASE_URL}/api/v1/admin/plans/${planId}`, {
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
    throw new Error(err.detail || 'Failed to update plan');
  }
  return response.json();
}

export async function deleteAdminPlan(token: string, planId: number): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/v1/admin/plans/${planId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  if (!response.ok) {
    throw new Error(`Failed to delete plan: ${response.statusText}`);
  }
}

export async function fetchPublicPlans(): Promise<import('../types/plan').PlanItem[]> {
  const response = await fetch(`${API_BASE_URL}/api/v1/public/plans`, {
    headers: {
      'Accept': 'application/json',
    },
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch public plans: ${response.statusText}`);
  }
  return response.json();
}

export async function fetchAdminSettings(token: string): Promise<import('../types/plan').SystemSettings> {
  const response = await fetch(`${API_BASE_URL}/api/v1/admin/settings`, {
    headers: {
      'Accept': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch settings: ${response.statusText}`);
  }
  return response.json();
}

export async function updateAdminSettings(
  token: string,
  payload: import('../types/plan').SystemSettings
): Promise<import('../types/plan').SystemSettings> {
  const response = await fetch(`${API_BASE_URL}/api/v1/admin/settings`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(err.detail || 'Failed to update settings');
  }
  return response.json();
}

export async function fetchPublicSettings(): Promise<import('../types/plan').SystemSettings> {
  const response = await fetch(`${API_BASE_URL}/api/v1/public/settings`, {
    headers: {
      'Accept': 'application/json',
    },
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch public settings: ${response.statusText}`);
  }
  return response.json();
}




