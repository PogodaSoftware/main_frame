/**
 * Business management portal REST shim.
 * Mutations only — screen data comes from BFF (`resolve('beauty_business_*')`).
 */
import { api } from '@/services/api';
import type { WeeklyHourRow } from '@/services/businessApply';

export interface ServicePayload {
  name: string;
  category: string;
  description?: string;
  price_dollars: string;
  duration_minutes: number;
}

export async function createService(payload: ServicePayload): Promise<unknown> {
  const resp = await api.post('/api/beauty/protected/business/services/', payload);
  return resp.data;
}

export async function updateService(
  serviceId: number,
  payload: ServicePayload,
): Promise<unknown> {
  const resp = await api.put(
    `/api/beauty/protected/business/services/${serviceId}/`,
    payload,
  );
  return resp.data;
}

export async function deleteService(serviceId: number): Promise<void> {
  await api.delete(`/api/beauty/protected/business/services/${serviceId}/`);
}

export async function putAvailability(
  href: string,
  rows: WeeklyHourRow[],
): Promise<unknown> {
  const resp = await api.put(href, { weekly_hours: rows });
  return resp.data;
}

export async function changeBusinessPassword(
  href: string,
  payload: { current_password: string; new_password: string },
): Promise<unknown> {
  const resp = await api.post(href, payload);
  return resp.data;
}

export async function patchBusinessContact(
  href: string,
  payload: {
    public_email?: string;
    contact_phone?: string;
    show_phone_publicly?: boolean;
  },
): Promise<unknown> {
  const resp = await api.patch(href, payload);
  return resp.data;
}

export async function replyToReview(href: string, body: string): Promise<unknown> {
  const resp = await api.post(href, { body });
  return resp.data;
}
