import axios, {
  AxiosError,
  AxiosInstance,
  InternalAxiosRequestConfig,
} from 'axios';

import { API_BASE_URL } from '@/constants/env';
import { getDeviceId } from '@/services/deviceId';

type RetryConfig = InternalAxiosRequestConfig & {
  __retried?: boolean;
  __skipAuthRetry?: boolean;
};

let refreshInFlight: Promise<boolean> | null = null;
let onAuthFailure: (() => void) | null = null;

export function setOnAuthFailure(fn: () => void) {
  onAuthFailure = fn;
}

async function refreshSession(client: AxiosInstance): Promise<boolean> {
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = (async () => {
    try {
      await client.post('/api/beauty/session/refresh/', null, {
        headers: { 'X-Device-ID': await getDeviceId() },
        __skipAuthRetry: true,
      } as any);
      return true;
    } catch {
      return false;
    } finally {
      refreshInFlight = null;
    }
  })();
  return refreshInFlight;
}

export const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  timeout: 15000,
  headers: { Accept: 'application/json' },
});

api.interceptors.request.use(async (config) => {
  const deviceId = await getDeviceId();
  config.headers.set('X-Device-ID', deviceId);
  return config;
});

api.interceptors.response.use(
  (resp) => resp,
  async (error: AxiosError) => {
    const original = error.config as RetryConfig | undefined;
    const status = error.response?.status;

    if (!original || status !== 401) {
      return Promise.reject(error);
    }
    if ((original as any).__skipAuthRetry || original.__retried) {
      return Promise.reject(error);
    }
    if (original.url?.includes('/api/beauty/session/refresh/')) {
      return Promise.reject(error);
    }

    const ok = await refreshSession(api);
    if (!ok) {
      onAuthFailure?.();
      return Promise.reject(error);
    }
    original.__retried = true;
    return api.request(original);
  },
);
