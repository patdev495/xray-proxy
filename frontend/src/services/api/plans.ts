import type { PlanCreate, PlanItem, PlanUpdate, SystemSettings } from '../../types/plan';
import { API_BASE_URL, parseError } from './client';

export async function fetchAdminPlans(token: string): Promise<PlanItem[]> {
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
  payload: PlanCreate
): Promise<PlanItem> {
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
    const err = await parseError(response, 'Failed to create plan');
    throw new Error(err);
  }
  return response.json();
}

export async function updateAdminPlan(
  token: string,
  planId: number,
  payload: PlanUpdate
): Promise<PlanItem> {
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
    const err = await parseError(response, 'Failed to update plan');
    throw new Error(err);
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

export async function fetchPublicPlans(): Promise<PlanItem[]> {
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

export async function fetchAdminSettings(token: string): Promise<SystemSettings> {
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
  payload: SystemSettings
): Promise<SystemSettings> {
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
    const err = await parseError(response, 'Failed to update settings');
    throw new Error(err);
  }
  return response.json();
}

export async function fetchPublicSettings(): Promise<SystemSettings> {
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
