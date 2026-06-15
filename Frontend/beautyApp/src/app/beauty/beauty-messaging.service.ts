/**
 * BeautyMessagingService — web WebSocket chat client.
 *
 * Mirrors the React-Native `openChatSocket` so web + mobile share one
 * transport contract against the Django Channels consumer at
 *   ws(s)://<host>/ws/beauty/chat/<bookingId>/?device_id=&ticket=
 *
 * A short-lived ticket is minted over authenticated REST
 * (`/api/beauty/protected/chat/ws-ticket/`) and passed on the handshake —
 * browsers can't set WebSocket headers, so the ticket (not the cookie)
 * carries auth. Auto-reconnects with exponential backoff. Server events:
 *   { type: 'connected' | 'message' | 'typing' | 'read' | 'error' }
 */

import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../environments/environment';
import { BeautyAuthService } from './beauty-auth.service';

export type ChatEvent =
  | { type: 'connected'; booking_id: number; viewer_type: string }
  | { type: 'message'; message: ChatMessage }
  | { type: 'typing'; sender_type: string; is_typing: boolean }
  | { type: 'read'; sender_type: string; at?: string }
  | { type: 'error'; detail: string };

export interface ChatMessage {
  id: number;
  booking_id: number;
  sender_type: string;
  sender_id: number;
  body: string;
  created_at: string;
}

export type SocketStatus = 'connecting' | 'open' | 'closed';

export interface ChatSocket {
  send(body: string): void;
  setTyping(isTyping: boolean): void;
  markRead(at?: string): void;
  close(): void;
}

@Injectable({ providedIn: 'root' })
export class BeautyMessagingService {
  constructor(private auth: BeautyAuthService) {}

  private wsBase(): string {
    return environment.apiBaseUrl.replace(/^http/i, 'ws');
  }

  private async mintTicket(): Promise<string> {
    try {
      const resp = await firstValueFrom(
        this.auth.follow<{ ticket: string }>(
          {
            rel: 'ws-ticket',
            href: `${environment.apiBaseUrl}/api/beauty/protected/chat/ws-ticket/`,
            method: 'GET', screen: null, route: null, prompt: null,
          },
        ),
      );
      return resp?.ticket ?? '';
    } catch {
      return '';
    }
  }

  /** Open a live chat socket for one booking. Returns a handle with
   *  send/typing/read/close. Reconnects with backoff until close(). */
  async openChatSocket(
    bookingId: number,
    onEvent: (ev: ChatEvent) => void,
    onStatus?: (s: SocketStatus) => void,
  ): Promise<ChatSocket> {
    const deviceId = this.auth.getDeviceId();
    let ws: WebSocket | null = null;
    let closedByCaller = false;
    let attempt = 0;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    const connect = async () => {
      if (closedByCaller) return;
      onStatus?.('connecting');
      const ticket = await this.mintTicket();
      if (closedByCaller) return;
      const url =
        `${this.wsBase()}/ws/beauty/chat/${bookingId}/` +
        `?device_id=${encodeURIComponent(deviceId)}&ticket=${encodeURIComponent(ticket)}`;
      const socket = new WebSocket(url);
      ws = socket;
      socket.onopen = () => { attempt = 0; onStatus?.('open'); };
      socket.onmessage = (e) => {
        try { onEvent(JSON.parse(e.data) as ChatEvent); } catch { /* ignore */ }
      };
      socket.onclose = () => {
        onStatus?.('closed');
        if (closedByCaller) return;
        attempt += 1;
        const delay = Math.min(1000 * 2 ** (attempt - 1), 10000);
        reconnectTimer = setTimeout(() => { void connect(); }, delay);
      };
      socket.onerror = () => { try { socket.close(); } catch { /* noop */ } };
    };

    void connect();

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
}
