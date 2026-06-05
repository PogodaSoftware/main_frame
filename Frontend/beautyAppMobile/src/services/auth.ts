/**
 * Session-lifecycle endpoints (the deliberate non-BFF boundary).
 *
 * `me` is the auth probe the session store calls *before* any screen
 * resolves — it decides which screen/guard applies, so it cannot itself be
 * a BFF screen resolver (that would be circular). `logout` tears the session
 * down. These sit alongside login/signup/forgot (also direct REST) and the
 * short-lived WS ticket: the auth handshake that establishes the session the
 * BFF depends on. Everything that renders a screen or mutates an
 * authenticated resource goes through `resolve()` / HATEOAS action-links.
 */
import { api } from '@/services/api';
import { getDeviceId } from '@/services/deviceId';

export type UserType = 'customer' | 'business';

export interface MeResponse {
  user_id: number;
  user_type: UserType;
  email?: string;
  name?: string;
}

export async function me(): Promise<MeResponse | null> {
  try {
    const resp = await api.get<MeResponse>('/api/beauty/protected/me/');
    return resp.data;
  } catch {
    return null;
  }
}

export async function logout(userType: UserType): Promise<void> {
  const path = userType === 'business' ? '/api/beauty/business/logout/' : '/api/beauty/logout/';
  await api.post(path, { device_id: await getDeviceId() }).catch(() => {});
}
