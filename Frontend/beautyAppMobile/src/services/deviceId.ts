import { Platform } from 'react-native';
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

const KEY = 'beauty.device_id';

let cached: string | null = null;
// De-dupe concurrent first-reads so a burst of resolve() calls on mount share
// one SecureStore round-trip instead of each paying the native cost.
let inflight: Promise<string> | null = null;

function webStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage ?? null;
}

async function loadOrCreate(): Promise<string> {
  if (Platform.OS === 'web') {
    const ls = webStorage();
    const existing = ls?.getItem(KEY) ?? null;
    if (existing) return existing;
    const fresh = Crypto.randomUUID();
    ls?.setItem(KEY, fresh);
    return fresh;
  }
  const existing = await SecureStore.getItemAsync(KEY);
  if (existing) return existing;
  const fresh = Crypto.randomUUID();
  await SecureStore.setItemAsync(KEY, fresh);
  return fresh;
}

export async function getDeviceId(): Promise<string> {
  // Hot path: every request interceptor + resolve() awaits this. The static
  // `cached` makes repeat calls synchronous-fast; a dynamic `import()` here
  // (the old impl) cost ~2s per call under Metro dev because the module was
  // re-fetched each time.
  if (cached) return cached;
  if (inflight) return inflight;
  inflight = loadOrCreate()
    .then((id) => {
      cached = id;
      return id;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

export async function clearDeviceId(): Promise<void> {
  cached = null;
  if (Platform.OS === 'web') {
    webStorage()?.removeItem(KEY);
    return;
  }
  await SecureStore.deleteItemAsync(KEY);
}
