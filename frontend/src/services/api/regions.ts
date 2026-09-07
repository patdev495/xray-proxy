import type { RegionCreate, RegionItem, RegionUpdate } from '../../types/region';
import type { RegionStatus } from '../../types/node';
import { API_BASE_URL, parseError } from './client';

export async function fetchAdminRegions(token: string): Promise<RegionItem[]> {
  const response = await fetch(`${API_BASE_URL}/api/v1/admin/regions`, {
    headers: {
      'Accept': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch regions: ${response.statusText}`);
  }
  return response.json();
}

export async function createAdminRegion(
  token: string,
  payload: RegionCreate
): Promise<RegionItem> {
  const response = await fetch(`${API_BASE_URL}/api/v1/admin/regions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const err = await parseError(response, 'Failed to create region');
    throw new Error(err);
  }
  return response.json();
}

export async function updateAdminRegion(
  token: string,
  regionId: number,
  payload: RegionUpdate
): Promise<RegionItem> {
  const response = await fetch(`${API_BASE_URL}/api/v1/admin/regions/${regionId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const err = await parseError(response, 'Failed to update region');
    throw new Error(err);
  }
  return response.json();
}

export async function deleteAdminRegion(token: string, regionId: number): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/v1/admin/regions/${regionId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  if (!response.ok) {
    throw new Error(`Failed to delete region: ${response.statusText}`);
  }
}

export async function fetchPublicRegions(): Promise<RegionItem[]> {
  const response = await fetch(`${API_BASE_URL}/api/v1/public/regions`, {
    headers: {
      'Accept': 'application/json',
    },
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch public regions: ${response.statusText}`);
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
    throw new Error(`Failed to fetch regions status: ${response.statusText}`);
  }
  return response.json();
}
