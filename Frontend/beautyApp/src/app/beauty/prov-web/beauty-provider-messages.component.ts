/**
 * BeautyProviderMessagesComponent — desktop two-pane Messages (web-msg).
 *
 * Left: conversation inbox (search + Unread/All/Booking filters), fed by the
 * `beauty_business_messages` resolver (data.threads). Right: the selected
 * thread — seeded from `beauty_chat_thread` over the BFF, then kept live by
 * the Django Channels chat socket (BeautyMessagingService). Sends go over the
 * socket; incoming messages/typing/read events update in place. Composer is
 * disabled when the booking's chat window has closed (no `send` link).
 */

import {
  Component, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';

import { BffLink } from './../beauty-bff.types';
import { BeautyBffService } from './../beauty-bff.service';
import { BeautyAuthService } from './../beauty-auth.service';
import {
  BeautyMessagingService, ChatEvent, ChatMessage, ChatSocket, SocketStatus,
} from './../beauty-messaging.service';
import { BeautyProvWebSidebarComponent, ProvWebNav } from './prov-web-sidebar.component';
import { BeautyProvWebTopbarComponent } from './prov-web-topbar.component';

interface Thread {
  booking_id: number;
  service_name: string;
  slot_at: string;
  slot_label: string;
  status: string;
  peer_name: string;
  last_message: string;
  last_at: string | null;
  unread_count: number;
  is_active: boolean;
  _links?: Record<string, BffLink>;
}

@Component({
  selector: 'app-beauty-provider-messages',
  standalone: true,
  imports: [CommonModule, FormsModule, BeautyProvWebSidebarComponent, BeautyProvWebTopbarComponent],
  template: `
    <div class="pw-shell">
      <app-prov-web-sidebar
        active="messages"
        [businessName]="business?.business_name || 'Your storefront'"
        [email]="business?.email || ''"
        [storefrontLive]="true" [badges]="navBadges" (follow)="emit($event)">
      </app-prov-web-sidebar>

      <div class="pw-main">
        <app-prov-web-topbar
          [businessName]="business?.business_name || 'Your storefront'"
          [email]="business?.email || ''" [notifCount]="unreadTotal || 0" (follow)="emit($event)">
        </app-prov-web-topbar>

        <main id="main" class="pw-content">
          <div class="pw-header">
            <div class="pw-header-text pw-header-centered">
              <h1 class="pw-title">Messages</h1>
              <div class="pw-sub">
                Talk with customers about their bookings<span *ngIf="unreadTotal"> · {{ unreadTotal }} unread</span>
              </div>
            </div>
          </div>

          <!-- Empty -->
          <div class="pw-pad" *ngIf="!threads.length">
            <section class="web-card empty-card">
              <div class="empty-ico" aria-hidden="true">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#1a3a52" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              </div>
              <h2 class="empty-h2">No messages yet</h2>
              <div class="empty-body">When customers book or have questions, conversations show up here.</div>
              <button type="button" class="wbtn wbtn-secondary" (click)="emit(links['bookings'])">View bookings →</button>
            </section>
          </div>

          <!-- Two-pane -->
          <div class="pw-pad" *ngIf="threads.length">
            <div class="web-card msg-card">
              <!-- Inbox -->
              <aside class="inbox">
                <div class="inbox-search">
                  <input type="search" class="search-input" placeholder="Search conversations"
                         [(ngModel)]="search" name="msg-search" aria-label="Search conversations"/>
                </div>
                <div class="inbox-filters">
                  <button type="button" class="chip" [class.on]="filter==='unread'" (click)="filter='unread'">Unread <span class="chip-n">{{ unreadTotal }}</span></button>
                  <button type="button" class="chip" [class.on]="filter==='all'" (click)="filter='all'">All <span class="chip-n">{{ threads.length }}</span></button>
                  <button type="button" class="chip" [class.on]="filter==='booking'" (click)="filter='booking'">Booking</button>
                </div>
                <div class="inbox-list">
                  <button type="button" class="convo" *ngFor="let t of visibleThreads"
                          [class.sel]="t.booking_id === selectedId" (click)="selectThread(t)">
                    <span class="convo-av">{{ avatarOf(t.peer_name) }}</span>
                    <span class="convo-body">
                      <span class="convo-top">
                        <span class="convo-name">{{ t.peer_name }}</span>
                        <span class="convo-time">{{ shortAgo(t.last_at || t.slot_at) }}</span>
                      </span>
                      <span class="convo-meta">{{ t.service_name }} · {{ t.slot_label }}</span>
                      <span class="convo-last" [class.unread]="t.unread_count > 0">{{ t.last_message || 'No messages yet' }}</span>
                    </span>
                    <span class="convo-dot" *ngIf="t.unread_count > 0" [attr.aria-label]="t.unread_count + ' unread'"></span>
                  </button>
                  <div *ngIf="!visibleThreads.length" class="inbox-empty">No conversations.</div>
                </div>
              </aside>

              <!-- Thread -->
              <section class="thread">
                <div class="thread-empty" *ngIf="!selectedId">Select a conversation to start chatting.</div>

                <ng-container *ngIf="selectedId">
                  <header class="thread-head">
                    <span class="th-av">{{ avatarOf(threadPeer) }}</span>
                    <div class="th-id">
                      <div class="th-name">{{ threadPeer }}</div>
                      <div class="th-meta">{{ threadService }} <span *ngIf="threadSlotLabel">· {{ threadSlotLabel }}</span></div>
                    </div>
                    <div class="th-right">
                      <span class="recon" *ngIf="status !== 'open'">{{ status === 'connecting' ? 'Connecting…' : 'Reconnecting…' }}</span>
                      <button type="button" class="wbtn wbtn-secondary sm" (click)="openBooking()">Open booking →</button>
                    </div>
                  </header>

                  <div class="thread-scroll" #scroll>
                    <div class="msg-row" *ngFor="let m of messages" [class.mine]="isMine(m)">
                      <div class="bubble" [class.mine]="isMine(m)" [class.pending]="m.pending">
                        <span class="bubble-body">{{ m.body }}</span>
                        <span class="bubble-time">{{ msgTime(m.created_at) }}<span *ngIf="m.pending"> · sending…</span></span>
                      </div>
                    </div>
                    <div class="typing" *ngIf="peerTyping">{{ threadPeer }} is typing…</div>
                  </div>

                  <div class="composer" *ngIf="canSend; else closedNote">
                    <input type="text" class="composer-input" placeholder="Type a message…"
                           [(ngModel)]="draft" name="composer" (ngModelChange)="onTyping()"
                           (keydown.enter)="sendMessage()" aria-label="Message"/>
                    <button type="button" class="send-btn" (click)="sendMessage()" [disabled]="!draft.trim()" aria-label="Send">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>
                    </button>
                  </div>
                  <ng-template #closedNote>
                    <div class="closed-note">This conversation is closed — the booking window has passed.</div>
                  </ng-template>
                </ng-container>
              </section>
            </div>
          </div>
        </main>
      </div>
    </div>
  `,
  styles: [`
    :host {
      --surface: #F2F2F2; --surface-2: #E9E9EB; --line: #DCDCDF; --text: #0F1115; --text-muted: #6B6F77;
      --accent-blue: #CFE3F5; --accent-blue-deep: #7DA8CF; --accent-blue-text: #1a3a52;
      --ink: #0A0A0B; --success: #2F7A47;
      --font-body: 'Inter', system-ui, sans-serif; --font-display: 'Cormorant Garamond', Georgia, serif;
      --font-mono: ui-monospace, 'SF Mono', Menlo, monospace;
      display: block; background: var(--surface);
    }
    :host *:focus-visible { outline: 2px solid #1a3a52; outline-offset: 2px; border-radius: 6px; }
    .pw-shell { display: flex; min-height: 100dvh; background: var(--surface); }
    app-prov-web-sidebar { position: sticky; top: 0; height: 100dvh; }
    .pw-main { flex: 1; min-width: 0; display: flex; flex-direction: column; }
    app-prov-web-topbar { position: sticky; top: 0; z-index: 5; }
    .pw-content { flex: 1; padding: 0 0 28px; display: flex; flex-direction: column; }
    .pw-pad { padding: 16px 28px 0; flex: 1; min-height: 0; display: flex; }
    .pw-header { padding: 24px 28px 4px; }
    .pw-header-centered { text-align: center; }
    .pw-title { margin: 0; font-family: var(--font-display); font-size: 2rem; font-weight: 500; line-height: 1.15; }
    .pw-sub { font-size: 0.8125rem; color: var(--text-muted); margin-top: 6px; }

    .web-card { background: #fff; border: 1px solid var(--line); border-radius: 14px; }
    .wbtn { height: 36px; padding: 0 14px; border-radius: 10px; cursor: pointer; font-family: var(--font-body); font-size: 0.8125rem; font-weight: 600; border: 1px solid transparent; }
    .wbtn.sm { height: 32px; padding: 0 12px; font-size: 0.75rem; }
    .wbtn-secondary { background: #fff; color: var(--text); border-color: var(--line); }
    .wbtn-secondary:hover { border-color: var(--accent-blue-deep); }

    .empty-card { flex: 1; padding: 56px; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center; }
    .empty-ico { width: 64px; height: 64px; border-radius: 16px; background: var(--accent-blue); display: grid; place-items: center; margin-bottom: 16px; }
    .empty-h2 { margin: 0; font-family: var(--font-display); font-size: 1.6rem; font-weight: 500; }
    .empty-body { font-size: 0.875rem; color: var(--text-muted); margin: 8px 0 18px; }

    .msg-card { flex: 1; display: grid; grid-template-columns: 340px minmax(0, 1fr); overflow: hidden; min-height: 0; }

    /* Inbox */
    .inbox { border-right: 1px solid var(--line); display: flex; flex-direction: column; min-height: 0; }
    .inbox-search { padding: 14px 14px 8px; }
    .search-input { width: 100%; box-sizing: border-box; height: 38px; padding: 0 12px; border: 1px solid var(--line); border-radius: 10px; background: var(--surface); font-family: var(--font-body); font-size: 0.8125rem; outline: none; }
    .inbox-filters { display: flex; gap: 6px; padding: 0 14px 10px; border-bottom: 1px solid var(--line); }
    .chip { height: 28px; padding: 0 10px; border-radius: 999px; border: 1px solid var(--line); background: #fff; font-size: 0.6875rem; font-weight: 600; color: var(--text-muted); cursor: pointer; display: inline-flex; align-items: center; gap: 5px; }
    .chip.on { background: var(--ink); color: #fff; border-color: var(--ink); }
    .chip-n { font-family: var(--font-mono); opacity: 0.8; }
    .inbox-list { flex: 1; overflow-y: auto; min-height: 0; }
    .convo { display: flex; gap: 10px; align-items: flex-start; width: 100%; padding: 12px 14px; background: transparent; border: none; border-bottom: 1px solid var(--surface); cursor: pointer; text-align: left; }
    .convo:hover { background: var(--surface); }
    .convo.sel { background: var(--accent-blue); }
    .convo-av { width: 34px; height: 34px; flex-shrink: 0; border-radius: 50%; background: linear-gradient(135deg,#BFD8EE,#7DA8CF); color: #1a3a52; display: grid; place-items: center; font-family: var(--font-display); font-size: 14px; }
    .convo-body { flex: 1; min-width: 0; display: flex; flex-direction: column; }
    .convo-top { display: flex; justify-content: space-between; gap: 8px; }
    .convo-name { font-size: 0.8125rem; font-weight: 700; color: var(--text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .convo-time { font-size: 0.625rem; color: var(--text-muted); font-family: var(--font-mono); flex-shrink: 0; }
    .convo-meta { font-size: 0.625rem; color: var(--accent-blue-deep); margin-top: 1px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .convo-last { font-size: 0.75rem; color: var(--text-muted); margin-top: 3px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .convo-last.unread { color: var(--text); font-weight: 600; }
    .convo-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--accent-blue-deep); flex-shrink: 0; margin-top: 6px; }
    .inbox-empty { padding: 20px 14px; font-size: 0.8125rem; color: var(--text-muted); }

    /* Thread */
    .thread { display: flex; flex-direction: column; min-height: 0; }
    .thread-empty { flex: 1; display: grid; place-items: center; color: var(--text-muted); font-size: 0.875rem; }
    .thread-head { display: flex; align-items: center; gap: 10px; padding: 12px 16px; border-bottom: 1px solid var(--line); }
    .th-av { width: 34px; height: 34px; border-radius: 50%; background: linear-gradient(135deg,#BFD8EE,#7DA8CF); color: #1a3a52; display: grid; place-items: center; font-family: var(--font-display); font-size: 14px; }
    .th-id { flex: 1; min-width: 0; }
    .th-name { font-size: 0.875rem; font-weight: 700; }
    .th-meta { font-size: 0.6875rem; color: var(--text-muted); margin-top: 1px; }
    .th-right { display: flex; align-items: center; gap: 10px; }
    .recon { font-size: 0.6875rem; color: var(--accent-blue-text); background: var(--accent-blue); padding: 3px 8px; border-radius: 999px; }

    .thread-scroll { flex: 1; overflow-y: auto; min-height: 0; padding: 16px; display: flex; flex-direction: column; gap: 8px; background: var(--surface); }
    .msg-row { display: flex; }
    .msg-row.mine { justify-content: flex-end; }
    .bubble { max-width: 72%; padding: 9px 12px; border-radius: 14px; background: #fff; border: 1px solid var(--line); }
    .bubble.mine { background: var(--ink); border-color: var(--ink); }
    .bubble.pending { opacity: 0.6; }
    .bubble-body { display: block; font-size: 0.8125rem; line-height: 1.45; color: var(--text); white-space: pre-wrap; word-break: break-word; }
    .bubble.mine .bubble-body { color: #fff; }
    .bubble-time { display: block; font-size: 0.5625rem; color: var(--text-muted); margin-top: 4px; font-family: var(--font-mono); }
    .bubble.mine .bubble-time { color: rgba(255,255,255,0.6); text-align: right; }
    .typing { font-size: 0.6875rem; color: var(--text-muted); font-style: italic; }

    .composer { display: flex; gap: 8px; align-items: center; padding: 12px 16px; border-top: 1px solid var(--line); }
    .composer-input { flex: 1; height: 42px; padding: 0 14px; border: 1px solid var(--line); border-radius: 999px; background: var(--surface); font-family: var(--font-body); font-size: 0.875rem; outline: none; }
    .send-btn { width: 42px; height: 42px; flex-shrink: 0; border-radius: 50%; border: none; background: var(--ink); color: #fff; display: grid; place-items: center; cursor: pointer; }
    .send-btn:disabled { opacity: 0.4; cursor: not-allowed; }
    .closed-note { padding: 14px 16px; border-top: 1px solid var(--line); font-size: 0.75rem; color: var(--text-muted); text-align: center; }

    @media screen and (max-width: 860px) {
      .msg-card { grid-template-columns: 1fr; }
      .inbox { display: none; }
    }
    @media screen and (max-width: 720px) { app-prov-web-sidebar { display: none; } .pw-header { padding: 16px; } .pw-pad { padding: 12px 16px 0; } }
  `],
})
export class BeautyProviderMessagesComponent implements OnInit, OnChanges, OnDestroy {
  @Input() data: Record<string, unknown> = {};
  @Input() links: Record<string, BffLink> = {};
  @Output() followLink = new EventEmitter<BffLink>();

  private pendingOpenId: number | null = null;

  filter: 'unread' | 'all' | 'booking' = 'all';
  search = '';
  selectedId: number | null = null;

  threadPeer = '';
  threadService = '';
  threadSlotLabel = '';
  messages: (ChatMessage & { pending?: boolean })[] = [];
  draft = '';
  status: SocketStatus = 'closed';
  peerTyping = false;
  canSend = false;

  private socket: ChatSocket | null = null;
  private sendLink: BffLink | null = null;
  private typingTimer: ReturnType<typeof setTimeout> | null = null;
  private peerTypingTimer: ReturnType<typeof setTimeout> | null = null;
  private tmpSeq = -1;

  constructor(
    private bff: BeautyBffService,
    private messaging: BeautyMessagingService,
    private auth: BeautyAuthService,
    private route: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('bookingId'));
    if (id) this.pendingOpenId = id;
    this.tryAutoOpen();
  }

  ngOnChanges(): void { this.tryAutoOpen(); }

  /** Open the thread named in the route (e.g. a "Message" button on the
   *  dashboard/bookings deep-links /business/messages/:bookingId). */
  private tryAutoOpen(): void {
    if (this.pendingOpenId == null) return;
    const t = this.threads.find(x => x.booking_id === this.pendingOpenId);
    if (t) { this.pendingOpenId = null; this.selectThread(t); }
  }

  get business(): { email?: string; business_name?: string } | null {
    return (this.data['business'] as { email?: string; business_name?: string }) || null;
  }
  get viewerType(): string { return (this.data['viewer_type'] as string) || 'business'; }
  get threads(): Thread[] { return (this.data['threads'] as Thread[]) || []; }
  /** Live unread = sum of per-thread counts, so opening/reading a thread
   *  (which zeroes its count) immediately reflects in the chip + nav badge. */
  get unreadTotal(): number {
    return this.threads.reduce((n, t) => n + (t.unread_count || 0), 0);
  }
  get navBadges(): Partial<Record<ProvWebNav, number>> {
    const b = (this.data['badges'] as { bookings_unread?: number }) || {};
    return { bookings: b.bookings_unread || 0, messages: this.unreadTotal || 0 };
  }

  get visibleThreads(): Thread[] {
    let list = this.threads;
    if (this.filter === 'unread') list = list.filter(t => t.unread_count > 0);
    else if (this.filter === 'booking') list = list.filter(t => t.is_active);
    const q = this.search.trim().toLowerCase();
    if (q) list = list.filter(t =>
      (t.peer_name || '').toLowerCase().includes(q) ||
      (t.service_name || '').toLowerCase().includes(q) ||
      (t.last_message || '').toLowerCase().includes(q));
    return list;
  }

  emit(link: BffLink | null | undefined): void { if (link) this.followLink.emit(link); }
  isMine(m: ChatMessage): boolean { return m.sender_type === this.viewerType; }
  avatarOf(name: string): string { return (name || '?').trim()[0]?.toUpperCase() || '?'; }

  shortAgo(iso: string | null): string {
    if (!iso) return '';
    const d = Date.now() - new Date(iso).getTime();
    if (isNaN(d)) return '';
    const m = Math.floor(d / 60000);
    if (m < 1) return 'now';
    if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h`;
    return `${Math.floor(h / 24)}d`;
  }
  msgTime(iso: string): string {
    try { return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }); }
    catch { return ''; }
  }

  selectThread(t: Thread): void {
    if (t.booking_id === this.selectedId) return;
    this.teardownSocket();
    this.selectedId = t.booking_id;
    this.threadPeer = t.peer_name;
    this.threadService = t.service_name;
    this.threadSlotLabel = t.slot_label;
    this.messages = [];
    this.peerTyping = false;
    t.unread_count = 0;  // opening clears unread (resolver also marks read)

    this.bff.resolve('beauty_chat_thread', { bookingId: t.booking_id }).subscribe({
      next: (resp) => {
        const d = (resp.data || {}) as Record<string, unknown>;
        this.messages = ((d['messages'] as ChatMessage[]) || []).slice();
        this.sendLink = (resp._links?.['send'] as BffLink) || null;
        this.canSend = !!this.sendLink;
        this.scrollSoon();
      },
      error: () => { this.canSend = false; },
    });

    void this.messaging.openChatSocket(
      t.booking_id,
      (ev) => this.onEvent(ev),
      (s) => { this.status = s; if (s === 'open') this.socket?.markRead(); },
    ).then((sock) => { this.socket = sock; });
  }

  private onEvent(ev: ChatEvent): void {
    if (ev.type === 'message') {
      const incoming = ev.message;
      // Reconcile an optimistic bubble (mine, pending, same body) if present.
      if (this.isMine(incoming)) {
        const pend = this.messages.find(m => m.pending && m.body === incoming.body);
        if (pend) { Object.assign(pend, incoming, { pending: false }); this.scrollSoon(); return; }
      }
      if (!this.messages.some(m => m.id === incoming.id)) {
        this.messages.push(incoming);
        this.scrollSoon();
      }
      // Keep the inbox row preview live, and since the viewer is looking at
      // this thread, mark the incoming peer message read immediately so the
      // unread badge doesn't falsely accrue while it's on screen.
      const row = this.threads.find(t => t.booking_id === incoming.booking_id);
      if (row) { row.last_message = incoming.body; row.last_at = incoming.created_at; }
      if (incoming.booking_id === this.selectedId && !this.isMine(incoming)) {
        this.socket?.markRead();
        if (row) row.unread_count = 0;
      }
    } else if (ev.type === 'typing') {
      if (ev.sender_type !== this.viewerType) {
        this.peerTyping = ev.is_typing;
        if (this.peerTypingTimer) clearTimeout(this.peerTypingTimer);
        if (ev.is_typing) this.peerTypingTimer = setTimeout(() => { this.peerTyping = false; }, 4000);
      }
    }
  }

  onTyping(): void {
    if (!this.socket) return;
    this.socket.setTyping(true);
    if (this.typingTimer) clearTimeout(this.typingTimer);
    this.typingTimer = setTimeout(() => this.socket?.setTyping(false), 1500);
  }

  sendMessage(): void {
    const body = this.draft.trim();
    if (!body || !this.canSend) return;
    // Optimistic bubble; reconciled by the echoed 'message' event.
    this.messages.push({
      id: this.tmpSeq--, booking_id: this.selectedId || 0,
      sender_type: this.viewerType, sender_id: 0, body,
      created_at: new Date().toISOString(), pending: true,
    });
    this.draft = '';
    this.scrollSoon();
    if (this.socket) {
      this.socket.send(body);
    } else if (this.sendLink) {
      // Fallback: post over REST if the socket isn't open yet.
      this.auth.follow(this.sendLink, { body }).subscribe();
    }
  }

  openBooking(): void {
    this.emit(this.links['bookings']);
  }

  private scrollSoon(): void {
    setTimeout(() => {
      const el = document.querySelector('.thread-scroll');
      if (el) el.scrollTop = el.scrollHeight;
    }, 0);
  }

  private teardownSocket(): void {
    if (this.socket) { try { this.socket.close(); } catch { /* noop */ } this.socket = null; }
    if (this.typingTimer) clearTimeout(this.typingTimer);
    if (this.peerTypingTimer) clearTimeout(this.peerTypingTimer);
    this.status = 'closed';
  }

  ngOnDestroy(): void { this.teardownSocket(); }
}
