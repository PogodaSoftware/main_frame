/**
 * Real-time chat WebSocket client (beauty messaging).
 *
 * Connects to the Django Channels consumer at
 *   ws(s)://<host>/ws/beauty/chat/<bookingId>/?device_id=<id>
 * authenticating with the persisted `beauty_auth` cookie (sent as a Cookie
 * header — RN WebSocket supports a headers option). Auto-reconnects with
 * backoff. Emits parsed server events ({type:'message'|'typing'|'read'|
 * 'connected'|'error'}) to the caller.
 */
import { API_BASE_URL } from '@/constants/env';
import { api } from '@/services/api';
import { getDeviceId } from '@/services/deviceId';

export type ChatEvent =
  | { type: 'connected'; booking_id: number; viewer_type: string }
  | { type: 'message'; message: any }
  | { type: 'typing'; sender_type: string; is_typing: boolean }
  | { type: 'read'; sender_type: string; at?: string }
  | { type: 'error'; detail: string };

export type SocketStatus = 'connecting' | 'open' | 'closed';

export interface ChatSocket {
  send(body: string): void;
  setTyping(isTyping: boolean): void;
  markRead(at?: string): void;
  close(): void;
}

function wsBase(): string {
  return API_BASE_URL.replace(/^http/i, 'ws');
}

export async function openChatSocket(
  bookingId: number,
  onEvent: (ev: ChatEvent) => void,
  onStatus?: (s: SocketStatus) => void,
): Promise<ChatSocket> {
  const deviceId = await getDeviceId();
  // Mint a short-lived WS ticket over authenticated REST (works via the
  // native cookie jar); pass it on the handshake instead of replaying the
  // long-lived cookie, which RN's WebSocket can't reliably attach.
  let ticket = '';
  try {
    const resp = await api.get<{ ticket: string }>('/api/beauty/protected/chat/ws-ticket/');
    ticket = resp.data?.ticket ?? '';
  } catch { /* will connect unauthenticated → server closes */ }
  const url =
    `${wsBase()}/ws/beauty/chat/${bookingId}/` +
    `?device_id=${encodeURIComponent(deviceId)}&ticket=${encodeURIComponent(ticket)}`;
  const options = undefined;

  let ws: WebSocket | null = null;
  let closedByCaller = false;
  let attempt = 0;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  const connect = () => {
    onStatus?.('connecting');
    // RN WebSocket accepts (url, protocols, options) — options.headers is RN-only.
    const socket: WebSocket = new (WebSocket as any)(url, undefined, options);
    ws = socket;
    socket.onopen = () => { attempt = 0; onStatus?.('open'); };
    socket.onmessage = (e: any) => {
      try { onEvent(JSON.parse(e.data) as ChatEvent); } catch { /* ignore */ }
    };
    socket.onclose = () => {
      onStatus?.('closed');
      if (closedByCaller) return;
      attempt += 1;
      const delay = Math.min(1000 * 2 ** (attempt - 1), 10000);
      reconnectTimer = setTimeout(connect, delay);
    };
    socket.onerror = () => { try { socket.close(); } catch { /* noop */ } };
  };

  connect();

  const sendRaw = (obj: Record<string, unknown>) => {
    if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(obj));
  };

  return {
    send: (body: string) => sendRaw({ type: 'send', body }),
    setTyping: (isTyping: boolean) => sendRaw({ type: 'typing', is_typing: isTyping }),
    markRead: (at?: string) => sendRaw({ type: 'read', at }),
    close: () => {
      closedByCaller = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      try { ws?.close(); } catch { /* noop */ }
    },
  };
}
