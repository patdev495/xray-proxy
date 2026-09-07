import { API_BASE_URL } from './client';

export interface AdminUserItem {
  id: number;
  email: string;
  full_name: string | null;
}

export async function fetchAdminUsers(token: string): Promise<AdminUserItem[]> {
  const response = await fetch(`${API_BASE_URL}/api/v1/admin/users`, {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch users: ${response.statusText}`);
  }

  return response.json();
}
