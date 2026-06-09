import { api } from '@/services/api';
import { getDeviceId } from '@/services/deviceId';
import type { BffEnvelope } from '@/bff/types';

export async function resolve<TData = Record<string, unknown>>(
  screen: string,
  params?: Record<string, unknown>,
): Promise<BffEnvelope<TData>> {
  const device_id = await getDeviceId();
  const resp = await api.post<BffEnvelope<TData>>('/api/bff/beauty/resolve/', {
    screen,
    device_id,
    params: params ?? {},
  });
  return resp.data;
}
