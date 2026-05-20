import { Platform } from 'react-native';
import * as Crypto from 'expo-crypto';

const KEY = 'beauty.device_id';

let cached: string | null = null;

async function readNative(): Promise<string | null> {
  const SecureStore = await import('expo-secure-store');
  return SecureStore.getItemAsync(KEY);
}

async function writeNative(value: string): Promise<void> {
  const SecureStore = await import('expo-secure-store');
  await SecureStore.setItemAsync(KEY, value);
}

async function deleteNative(): Promise<void> {
  const SecureStore = await import('expo-secure-store');
  await SecureStore.deleteItemAsync(KEY);
}

function webStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage ?? null;
}

export async function getDeviceId(): Promise<string> {
  if (cached) return cached;

  if (Platform.OS === 'web') {
    const ls = webStorage();
    const existing = ls?.getItem(KEY) ?? null;
    if (existing) {
      cached = existing;
      return existing;
    }
    const fresh = Crypto.randomUUID();
    ls?.setItem(KEY, fresh);
    cached = fresh;
    return fresh;
  }

  const existing = await readNative();
  if (existing) {
    cached = existing;
    return existing;
  }
  const fresh = Crypto.randomUUID();
  await writeNative(fresh);
  cached = fresh;
  return fresh;
}

export async function clearDeviceId(): Promise<void> {
  cached = null;
  if (Platform.OS === 'web') {
    webStorage()?.removeItem(KEY);
    return;
  }
  await deleteNative();
}
