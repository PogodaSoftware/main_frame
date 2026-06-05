/**
 * Minimal connectivity store — no native deps. The axios interceptor
 * (services/api.ts) flips `offline` true on a network error (a rejected
 * request with no HTTP response) and false on any successful response.
 * `OfflineGate` subscribes via useSyncExternalStore to show/hide the
 * offline error surface.
 */
let offline = false;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

export function setOffline(next: boolean) {
  if (offline === next) return;
  offline = next;
  emit();
}

export function getOffline(): boolean {
  return offline;
}

export function subscribeOffline(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
