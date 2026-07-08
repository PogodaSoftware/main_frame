/**
 * Business management portal action-link shim.
 * Every call targets an `href` handed back by a BFF resolver's `_links`
 * (HATEOAS mutations) — no hardcoded REST paths. Screen data comes from
 * BFF (`resolve('beauty_business_*')`).
 */
import { api } from '@/services/api';

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
