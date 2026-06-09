/**
 * Persists the `beauty_auth` session cookie across app restarts.
 *
 * The backend auth cookie is HttpOnly, so it can't be read from JS — but on
 * React Native (unlike the browser) the native networking layer exposes
 * `Set-Cookie` on responses AND allows sending a manual `Cookie` request
 * header. We capture the cookie value on login/refresh, stash it in
 * SecureStore (localStorage on web), and re-attach it on every request.
 * Without this the cookie lived only in the in-memory native store and was
 * lost on every cold start, logging the user out on each app restart.
 */
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

export const SESSION_COOKIE_NAME = 'beauty_auth';
const KEY = 'beauty.session_cookie';

let cached: string | null = null;
let loaded = false;

// Static import (not per-call `await import()`): the dynamic form cost ~2s
// per call under Metro dev because the module was re-fetched each time.
async function readNative(): Promise<string | null> {
  return SecureStore.getItemAsync(KEY);
}
async function writeNative(value: string): Promise<void> {
  await SecureStore.setItemAsync(KEY, value);
}
async function deleteNative(): Promise<void> {
  await SecureStore.deleteItemAsync(KEY);
}

function webLs(): Storage | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage ?? null;
}

/** Cached cookie value, loading from persistent storage on first call. */
export async function getSessionCookie(): Promise<string | null> {
  if (loaded) return cached;
  try {
    cached = Platform.OS === 'web' ? webLs()?.getItem(KEY) ?? null : await readNative();
  } catch {
    cached = null;
  }
  loaded = true;
  return cached;
}

export async function saveSessionCookie(value: string | null): Promise<void> {
  cached = value || null;
  loaded = true;
  try {
    if (!value) {
      if (Platform.OS === 'web') webLs()?.removeItem(KEY);
      else await deleteNative();
      return;
    }
    if (Platform.OS === 'web') webLs()?.setItem(KEY, value);
    else await writeNative(value);
  } catch {
    /* best-effort persistence */
  }
}

/**
 * Extract the `beauty_auth` value from a response's Set-Cookie header(s).
 * Returns the value, '' if the cookie was cleared (logout), or undefined if
 * this response didn't touch the auth cookie.
 */
export function parseAuthCookie(
  setCookie: string | string[] | undefined,
): string | undefined {
  if (!setCookie) return undefined;
  const list = Array.isArray(setCookie) ? setCookie : [setCookie];
  for (const raw of list) {
    const m = raw.match(new RegExp(`(?:^|;\\s*)${SESSION_COOKIE_NAME}=([^;]*)`));
    if (m) return m[1];
  }
  return undefined;
}
