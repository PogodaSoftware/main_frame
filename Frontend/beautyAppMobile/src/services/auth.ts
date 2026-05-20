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
