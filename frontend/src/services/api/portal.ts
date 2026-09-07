import type { Order } from '../../types/order';
import type { EligibleNode, SubscriptionItem } from '../../types/subscription';
import { API_BASE_URL, parseError } from './client';

export async function fetchMySubscriptions(token: string): Promise<SubscriptionItem[]> {
  const response = await fetch(`${API_BASE_URL}/api/v1/portal/subscriptions`, {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const err = await parseError(response, 'Failed to fetch customer subscriptions');
    throw new Error(err);
  }

  return response.json();
}

export async function fetchEligibleNodes(token: string, subId: number): Promise<EligibleNode[]> {
  const response = await fetch(`${API_BASE_URL}/api/v1/portal/subscriptions/${subId}/eligible-nodes`, {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const err = await parseError(response, 'Failed to fetch eligible nodes');
    throw new Error(err);
  }

  return response.json();
}

export async function switchSubscriptionNode(
  token: string,
  subId: number,
  targetNodeId: number
): Promise<SubscriptionItem> {
  const response = await fetch(`${API_BASE_URL}/api/v1/portal/subscriptions/${subId}/switch-node`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ target_node_id: targetNodeId }),
  });

  if (!response.ok) {
    const err = await parseError(response, 'Failed to switch server node');
    throw new Error(err);
  }

  return response.json();
}

export async function renewSubscription(
  token: string,
  subId: number,
  planId?: number
): Promise<Order> {
  const response = await fetch(`${API_BASE_URL}/api/v1/portal/subscriptions/${subId}/renew`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(planId ? { plan_id: planId } : {}),
  });

  if (!response.ok) {
    const err = await parseError(response, 'Failed to create renewal order');
    throw new Error(err);
  }

  return response.json();
}
