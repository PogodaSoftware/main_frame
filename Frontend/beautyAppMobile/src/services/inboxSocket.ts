/**
 * Global inbox WebSocket — one per signed-in user. Receives every new
 * message addressed to them (any booking) to drive a cross-screen toast.
 * Auth via the same short-lived ticket as the per-thread socket. If the
 * user isn't authed yet (ticket 401), it backs off and retries rather than
 * spamming rejected handshakes.
 */
import { API_BASE_URL } from '@/constants/env';
import { api } from '@/services/api';
import { getDeviceId } from '@/services/deviceId';

export interface InboxEvent {
  type: 'inbox';
  booking_id: number;
  peer_name: string;
  service_name: string;
  body: string;
  viewer_type: 'customer' | 'business';
}

function wsBase(): string {
  return API_BASE_URL.replace(/^http/i, 'ws');
}

export function startInboxSocket(onInbox: (ev: InboxEvent) => void): () => void {
  let ws: WebSocket | null = null;
  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let attempt = 0;

  const retry = (ms: number) => {
    if (stopped) return;
    if (timer) clearTimeout(timer);
    timer = setTimeout(connect, ms);
  };

  const connect = async () => {
    if (stopped) return;
    const deviceId = await getDeviceId();
    let ticket = '';
    try {
      const resp = await api.get<{ ticket: string }>('/api/beauty/protected/chat/ws-ticket/');
      ticket = resp.data?.ticket ?? '';
    } catch {
      retry(8000); // not signed in yet → try again later
      return;
    }
    if (!ticket) { retry(8000); return; }

    const url = `${wsBase()}/ws/beauty/inbox/?device_id=${encodeURIComponent(deviceId)}&ticket=${encodeURIComponent(ticket)}`;
    const socket: WebSocket = new (WebSocket as any)(url, undefined, undefined);
    ws = socket;
    socket.onopen = () => { attempt = 0; };
    socket.onmessage = (e: any) => {
      try {
        const ev = JSON.parse(e.data);
        if (ev?.type === 'inbox') onInbox(ev as InboxEvent);
      } catch { /* ignore */ }
    };
    socket.onclose = () => {
      if (stopped) return;
      attempt += 1;
      retry(Math.min(1000 * 2 ** (attempt - 1), 10000));
    };
    socket.onerror = () => { try { socket.close(); } catch { /* noop */ } };
  };

  connect();

  return () => {
    stopped = true;
    if (timer) clearTimeout(timer);
    try { ws?.close(); } catch { /* noop */ }
  };
}
