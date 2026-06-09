/**
 * BeautyChatsComponent — redesigned per Business Provider Portal handoff (msg-list).
 * Shared between customer and business sessions; viewer_type from BFF picks bottom nav variant.
 */

import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { BffLink } from './beauty-bff.types';
import { BeautyProviderSubHeaderComponent } from './provider/prov-sub-header.component';
import { BeautyProviderTabBarComponent, ProviderTab } from './provider/prov-tab-bar.component';
import { resolveTabLink } from './provider/prov-tab-nav';
import { BeautyProviderCardComponent } from './provider/prov-card.component';
import { BeautyProviderButtonComponent } from './provider/prov-btn.component';
import { BeautyProviderEmptyHintComponent } from './provider/prov-empty-hint.component';
import { CustTopNavComponent } from './cust-web/cust-top-nav.component';
import { BeautyHomeSearchComponent } from './beauty-home-search.component';

interface ChatThread {
  booking_id: number;
  service_name: string;
  slot_at: string;
  slot_label: string;
  status: string;
  peer_name: string;
  last_message: string;
  last_at: string | null;
  is_active: boolean;
  expires_at: string;
  unread_count?: number;
  _links?: Record<string, BffLink>;
}

@Component({
  selector: 'app-beauty-chats',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    BeautyProviderSubHeaderComponent,
    BeautyProviderTabBarComponent,
    BeautyProviderCardComponent,
    BeautyProviderButtonComponent,
    BeautyProviderEmptyHintComponent,
    CustTopNavComponent,
    BeautyHomeSearchComponent,
  ],
  template: `
    <div class="beauty-app prov-shell" [class.cust-desk]="!isBusiness" data-testid="chats-root">
      <app-cust-top-nav *ngIf="!isBusiness" active="messages" [links]="links" [signedIn]="true" (follow)="emit($event)">
        <app-beauty-home-search topnav-search></app-beauty-home-search>
      </app-cust-top-nav>
      <app-prov-sub-header *ngIf="isBusiness" back="Dashboard" title="Messages"
                           (backClick)="emit(links['home'])"></app-prov-sub-header>

      <main id="main" class="prov-body">
        <div class="title-block">
          <h2 class="page-title">Inbox</h2>
          <div class="page-sub">{{ subtitleCopy }}</div>
        </div>

        <ng-container *ngIf="threads.length; else emptyState">
          <div class="search-row">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <circle cx="11" cy="11" r="7"/><path d="M21 21l-4.4-4.4"/>
            </svg>
            <input class="search-input" type="search" autocomplete="off"
                   placeholder="Search conversations"
                   aria-label="Search conversations"
                   [(ngModel)]="query"/>
          </div>
          <app-prov-card padding="0 14px" class="list-card" *ngIf="filteredThreads.length; else noMatch">
            <button *ngFor="let t of filteredThreads; let last = last" type="button"
                    class="conv-row" [class.last]="last" [class.is-inactive]="!t.is_active"
                    [attr.data-testid]="'chat-thread-' + t.booking_id"
                    (click)="open(t)">
              <div class="avatar-wrap">
                <div class="avatar" [style.background]="avatarBg(t)" aria-hidden="true">{{ initialOf(t.peer_name) }}</div>
                <span class="unread-badge" *ngIf="t.unread_count">{{ t.unread_count }}</span>
              </div>
              <div class="conv-text">
                <div class="conv-row-1">
                  <span class="conv-name" [class.unread]="t.unread_count">{{ t.peer_name }}</span>
                  <span class="conv-time" *ngIf="t.last_at">{{ formatRelative(t.last_at) }}</span>
                </div>
                <div class="conv-svc">{{ t.service_name }} · {{ t.slot_label }}</div>
                <div class="conv-preview" [class.unread]="t.unread_count">
                  {{ t.last_message || 'Tap to start the conversation.' }}
                </div>
              </div>
            </button>
          </app-prov-card>
          <ng-template #noMatch>
            <div class="no-match" data-testid="chats-no-match">No conversations match “{{ query }}”.</div>
          </ng-template>
        </ng-container>

        <ng-template #emptyState>
          <app-prov-empty-hint
            data-testid="chats-empty"
            [title]="emptyTitle"
            [body]="emptyBody">
            <app-prov-btn variant="secondary" (clicked)="emit(links['home'])">{{ emptyCta }}</app-prov-btn>
          </app-prov-empty-hint>
        </ng-template>
      </main>

      <app-prov-tab-bar *ngIf="isBusiness"
                        active="messages" [badges]="tabBadges" (tabClick)="onTab($event)"></app-prov-tab-bar>
    </div>
  `,
  styles: [`
    :host {
      --surface: #F2F2F2; --surface-2: #E9E9EB; --line: #DCDCDF;
      --text: #0F1115; --text-muted: #6B6F77;
      --accent-blue: #CFE3F5; --accent-blue-deep: #7DA8CF;
      --danger: #C0392B;
      --font-body: 'Inter', system-ui, sans-serif;
      --font-display: 'Cormorant Garamond', Georgia, serif;
      --font-mono: ui-monospace, 'SF Mono', Menlo, monospace;
      display: block;
      background: var(--surface);
    }
    :host *:focus-visible { outline: 2px solid #1a3a52; outline-offset: 2px; border-radius: 6px; }
    .prov-shell {
      display: flex; flex-direction: column;
      min-height: 100vh;
      background: var(--surface); color: var(--text);
      font-family: var(--font-body);
    }
    .prov-body { flex: 1; padding: 14px 16px; overflow-y: auto; }

    .title-block { margin-bottom: 12px; }
    .page-title {
      margin: 0;
      font-family: var(--font-display);
      font-size: 22px; font-weight: 500;
      color: var(--text);
      letter-spacing: 0.2px;
    }
    .page-sub {
      font-size: 12px;
      color: var(--text-muted);
      margin-top: 2px;
    }

    .search-row {
      display: flex; align-items: center; gap: 8px;
      background: #FFFFFF;
      border: 1px solid var(--line);
      border-radius: 10px;
      height: 40px;
      padding: 0 12px;
      margin-bottom: 12px;
      color: var(--text-muted);
      font-size: 13px;
    }
    .search-input {
      flex: 1; min-width: 0; height: 100%;
      border: none; background: transparent; outline: none;
      font-family: var(--font-body); font-size: 13px; color: var(--text);
    }
    .search-input::placeholder { color: var(--text-muted); }
    .no-match { padding: 24px 4px; text-align: center; font-size: 13px; color: var(--text-muted); }

    .list-card { display: block; }
    .conv-row {
      display: flex; align-items: center; gap: 12px;
      width: 100%;
      padding: 14px 0;
      border: none;
      border-bottom: 1px solid var(--line);
      background: transparent;
      cursor: pointer;
      text-align: left;
      font-family: var(--font-body);
      color: var(--text);
    }
    .conv-row.last { border-bottom: none; }
    .conv-row.is-inactive { opacity: 0.6; }

    .avatar-wrap { position: relative; flex-shrink: 0; }
    .avatar {
      width: 44px; height: 44px;
      border-radius: 50%;
      display: grid; place-items: center;
      font-family: var(--font-display);
      font-size: 18px; font-weight: 500;
      color: #1a3a52;
    }
    .unread-badge {
      position: absolute;
      bottom: -2px; right: -2px;
      width: 16px; height: 16px;
      border-radius: 50%;
      background: var(--danger); color: #fff;
      font-size: 10px; font-weight: 700;
      display: grid; place-items: center;
      border: 2px solid #fff;
    }
    .conv-text { flex: 1; min-width: 0; }
    .conv-row-1 {
      display: flex; justify-content: space-between; align-items: baseline; gap: 8px;
    }
    .conv-name { font-size: 14px; font-weight: 600; color: var(--text); }
    .conv-name.unread { font-weight: 700; }
    .conv-time {
      font-family: var(--font-mono);
      font-size: 10px;
      color: var(--text-muted);
      flex-shrink: 0;
    }
    .conv-svc {
      font-size: 11px; font-weight: 600;
      color: var(--accent-blue-deep);
      margin-top: 1px;
    }
    .conv-preview {
      font-size: 12px;
      color: var(--text-muted);
      margin-top: 3px;
      line-height: 1.4;
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    .conv-preview.unread { color: var(--text); font-weight: 600; }

    /* Customer bottom nav */
    .bottom-nav {
      display: flex; background: #FFFFFF;
      border-top: 1px solid var(--line);
      box-shadow: 0 -2px 14px rgba(15,35,60,0.08);
      flex-shrink: 0;
      padding-bottom: env(safe-area-inset-bottom);
    }
    .nav-tab {
      flex: 1; height: 64px;
      background: transparent; border: none; cursor: pointer;
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      gap: 4px; position: relative;
      color: var(--text); font-family: var(--font-body);
    }
    .nav-tab:disabled { opacity: 0.4; cursor: not-allowed; }
    .nav-tab.is-active { color: var(--accent-blue-deep); }
    .nav-dot { position: absolute; top: -4px; width: 6px; height: 6px; border-radius: 50%; background: transparent; }
    .nav-tab.is-active .nav-dot { background: var(--accent-blue-deep); }
    .nav-icon { width: 24px; height: 24px; }
    .nav-label { font-size: 11px; font-weight: 500; line-height: 1; letter-spacing: 0.1px; }
    .nav-tab.is-active .nav-label { font-weight: 600; }

    @media screen and (min-width: 768px) {
      .beauty-app { max-width: 430px; margin: 0 auto; box-shadow: 0 0 40px rgba(15,35,60,0.15); }
    }

    /* Customer desktop (CustTopNav chrome) — overrides the mobile phone-frame. */
    .cust-desk.beauty-app { max-width: none; margin: 0; box-shadow: none; min-height: 100dvh; }
    .cust-desk .prov-body { max-width: 1280px; width: 100%; margin: 0 auto; padding: 32px; }
    .cust-desk .title-block { text-align: center; }
    .cust-desk .page-title { font-size: 42px; }
    .cust-desk .page-sub { font-size: 14px; }
    .cust-desk .search-row { height: 44px; border-radius: 999px; max-width: 420px; margin-left: auto; margin-right: auto; justify-content: center; }
    .cust-desk .conv-row { padding: 16px 0; }
    .cust-desk .avatar { width: 48px; height: 48px; font-size: 20px; }
    .cust-desk .conv-name { font-size: 15px; }
    .cust-desk .conv-preview { font-size: 13px; }
    @media screen and (max-width: 920px) {
      .cust-desk .prov-body { padding: 20px; }
      .cust-desk .page-title { font-size: 30px; }
    }
  `],
})
export class BeautyChatsComponent {
  @Input() data: Record<string, unknown> = {};
  @Input() links: Record<string, BffLink> = {};
  @Output() followLink = new EventEmitter<BffLink>();

  query = '';

  get threads(): ChatThread[] {
    return (this.data['threads'] as ChatThread[]) || [];
  }

  get filteredThreads(): ChatThread[] {
    const q = this.query.trim().toLowerCase();
    if (!q) return this.threads;
    return this.threads.filter((t) =>
      [t.peer_name, t.service_name, t.last_message]
        .some((f) => (f || '').toLowerCase().includes(q)),
    );
  }

  get viewerType(): 'customer' | 'business' {
    return (this.data['viewer_type'] as 'customer' | 'business') || 'customer';
  }
  get isBusiness(): boolean { return this.viewerType === 'business'; }

  get subtitleCopy(): string {
    return this.isBusiness
      ? 'Talk with customers about their bookings.'
      : 'Talk with your providers about your bookings.';
  }
  get emptyTitle(): string {
    return this.isBusiness ? 'No conversations yet' : 'No conversations yet';
  }
  get emptyBody(): string {
    return this.isBusiness
      ? 'Once a customer books a service, you can message them about prep, arrival, and follow-up.'
      : 'Book an appointment to start messaging your provider.';
  }
  get emptyCta(): string {
    return this.isBusiness ? 'View bookings →' : 'Browse services →';
  }

  get tabBadges(): { bookings?: number; messages?: number } {
    const b = (this.data['badges'] as { messages_unread?: number; bookings_unread?: number }) || {};
    return { bookings: b.bookings_unread || 0, messages: b.messages_unread || 0 };
  }

  initialOf(name: string): string {
    return (name || '·').trim()[0]?.toUpperCase() || '·';
  }

  avatarBg(t: ChatThread): string {
    const seed = (t.peer_name || '').charCodeAt(0) || 0;
    const palettes = [
      'linear-gradient(135deg, #BFD8EE, #7DA8CF)',
      'linear-gradient(135deg, #E8C5B8, #B98C7A)',
      'linear-gradient(135deg, #C5D8B8, #8FA876)',
      'linear-gradient(135deg, #DCC8E0, #9D7CB1)',
    ];
    return palettes[seed % palettes.length];
  }

  open(t: ChatThread): void {
    const link = t._links?.['open'];
    if (link) this.followLink.emit(link);
  }

  emit(link: BffLink | null | undefined): void {
    if (link) this.followLink.emit(link);
  }

  onTab(tab: ProviderTab): void {
    this.emit(resolveTabLink(tab, this.links, 'chats'));
  }

  formatRelative(iso: string): string {
    try {
      const then = new Date(iso).getTime();
      const diff = Date.now() - then;
      const m = Math.floor(diff / 60000);
      if (m < 1) return 'now';
      if (m < 60) return `${m}m`;
      const h = Math.floor(m / 60);
      if (h < 24) return `${h}h`;
      const d = Math.floor(h / 24);
      if (d < 7) return `${d}d`;
      return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } catch { return ''; }
  }
}
