/**
 * Global unread-message store — single source of truth for the Messages
 * tab badge. A tiny external store consumed via `useUnreadTotal()`
 * (useSyncExternalStore), updated three ways:
 *   - `refreshUnreadTotal()` — authoritative fetch from the backend.
 *   - `bumpUnread()` — optimistic +1 when the inbox socket delivers a
 *     message for a thread the user isn't currently viewing.
 *   - `setUnreadTotal()` — direct set (e.g. clear on logout).
 *
 * The count is per signed-in session; callers refresh it on session change
 * and on screen focus so it reconciles with the server after reads.
 */
import { useSyncExternalStore } from 'react';

import { resolve } from '@/services/bff';
import { isRedirect } from '@/bff/types';

let total = 0;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

function getSnapshot(): number {
  return total;
}

export function setUnreadTotal(n: number): void {
  const next = Math.max(0, Math.floor(n));
  if (next === total) return;
  total = next;
  emit();
}

export function bumpUnread(by = 1): void {
  setUnreadTotal(total + by);
}

/** Authoritative refresh from the backend, via the standard BFF chats
 * resolver (`beauty_chats` returns `unread_total` for the signed-in
 * principal). Swallows errors (not signed in, offline) and leaves the
 * current value untouched in that case. */
export async function refreshUnreadTotal(): Promise<void> {
  try {
    const env = await resolve<{ unread_total?: number }>('beauty_chats');
    if (isRedirect(env)) { setUnreadTotal(0); return; } // not signed in
    if (env.action === 'render') setUnreadTotal(env.data?.unread_total ?? 0);
  } catch {
    /* offline / transient — keep last known value */
  }
}

/** React hook — current unread total, re-renders on change. */
export function useUnreadTotal(): number {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
