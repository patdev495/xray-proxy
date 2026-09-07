import type { SyncResponse, SyncStatusResponse } from '../../types/sync';
import { API_BASE_URL, parseError } from './client';

export async function triggerLiveStatsSync(token: string): Promise<SyncResponse> {
  const response = await fetch(`${API_BASE_URL}/api/v1/admin/sync/live-stats`, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const err = await parseError(response, 'Failed to trigger live stats sync');
    throw new Error(err);
  }

  return response.json();
}

export async function triggerEnforceLimits(token: string): Promise<SyncResponse> {
  const response = await fetch(`${API_BASE_URL}/api/v1/admin/sync/enforce-limits`, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const err = await parseError(response, 'Failed to trigger limit enforcement');
    throw new Error(err);
  }

  return response.json();
}

export async function fetchSyncStatus(token: string): Promise<SyncStatusResponse> {
  const response = await fetch(`${API_BASE_URL}/api/v1/admin/sync/status`, {
    headers: {
      'Accept': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const err = await parseError(response, 'Failed to fetch sync status');
    throw new Error(err);
  }

  return response.json();
}
