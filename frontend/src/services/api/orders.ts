import type { Order } from '../../types/order';
import { API_BASE_URL, parseError } from './client';

export async function createOrder(
  token: string,
  planId: number,
  region: string
): Promise<Order> {
  const response = await fetch(`${API_BASE_URL}/api/v1/orders/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ plan_id: planId, region }),
  });

  if (!response.ok) {
    const errorDetail = await parseError(response, 'Failed to create order');
    throw new Error(errorDetail);
  }

  const data: Order = await response.json();
  return data;
}

export async function fetchOrderByCode(code: string): Promise<Order> {
  const response = await fetch(`${API_BASE_URL}/api/v1/orders/${encodeURIComponent(code)}`, {
    headers: {
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    const errorDetail = await parseError(response, 'Failed to fetch order');
    throw new Error(errorDetail);
  }

  const data: Order = await response.json();
  return data;
}
