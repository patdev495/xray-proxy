import type {
  SubscriptionCreate,
  SubscriptionItem,
  SubscriptionUpdate,
} from '../../types/subscription';
import { API_BASE_URL, parseError } from './client';

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
    const err = await parseError(response, 'Failed to create subscription');
    throw new Error(err);
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
    const err = await parseError(response, 'Failed to update subscription');
    throw new Error(err);
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
