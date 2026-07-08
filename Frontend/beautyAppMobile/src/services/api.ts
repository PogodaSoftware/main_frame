import axios, {
  AxiosError,
  AxiosInstance,
  InternalAxiosRequestConfig,
} from 'axios';

import { API_BASE_URL } from '@/constants/env';
import { getDeviceId } from '@/services/deviceId';
import { setOffline } from '@/services/connectivity';
import {
  SESSION_COOKIE_NAME,
  getSessionCookie,
  parseAuthCookie,
  saveSessionCookie,
} from '@/services/sessionCookie';

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
  // Re-attach the persisted auth cookie (survives cold starts; the native
  // in-memory cookie store is lost on app restart). RN allows a manual
  // Cookie header, unlike the browser.
  const cookie = await getSessionCookie();
  if (cookie) {
    config.headers.set('Cookie', `${SESSION_COOKIE_NAME}=${cookie}`);
  }
  return config;
});

// Capture the auth cookie from any response that sets/clears it.
function captureAuthCookie(headers: unknown): void {
  const sc = (headers as Record<string, unknown> | undefined)?.['set-cookie'] as
    | string
    | string[]
    | undefined;
  const value = parseAuthCookie(sc);
  if (value !== undefined) {
    // '' means the server cleared the cookie (logout) → drop it.
    void saveSessionCookie(value || null);
  }
}

api.interceptors.response.use(
  (resp) => {
    // Any successful response means we're back online.
    setOffline(false);
    captureAuthCookie(resp.headers);
    return resp;
  },
  async (error: AxiosError) => {
    captureAuthCookie(error.response?.headers);
    const original = error.config as RetryConfig | undefined;
    const status = error.response?.status;

    // No HTTP response + not a deliberate cancel ⇒ network/offline error.
    if (!error.response && error.code !== 'ERR_CANCELED') {
      setOffline(true);
    } else {
      setOffline(false);
    }

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
      // Stored cookie is dead — drop it so we don't re-attach it next launch.
      void saveSessionCookie(null);
      onAuthFailure?.();
      return Promise.reject(error);
    }
    original.__retried = true;
    return api.request(original);
  },
);
