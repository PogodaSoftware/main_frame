/**
 * BeautyChatsComponent — redesigned per Business Provider Portal handoff (msg-list).
 * Shared between customer and business sessions; viewer_type from BFF picks bottom nav variant.
 */

import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

import { BffLink } from './beauty-bff.types';
import { BeautyProviderSubHeaderComponent } from './provider/prov-sub-header.component';
import { BeautyProviderTabBarComponent, ProviderTab } from './provider/prov-tab-bar.component';
import { resolveTabLink } from './provider/prov-tab-nav';
import { BeautyProviderCardComponent } from './provider/prov-card.component';
import { BeautyProviderButtonComponent } from './provider/prov-btn.component';
import { BeautyProviderEmptyHintComponent } from './provider/prov-empty-hint.component';

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
    BeautyProviderSubHeaderComponent,
    BeautyProviderTabBarComponent,
    BeautyProviderCardComponent,
    BeautyProviderButtonComponent,
    BeautyProviderEmptyHintComponent,
  ],
  template: `
    <div class="beauty-app prov-shell" data-testid="chats-root">
      <app-prov-sub-header back="Dashboard" title="Messages"
                           (backClick)="emit(links['home'])"></app-prov-sub-header>

      <main id="main" class="prov-body">
        <div class="title-block">
          <h2 class="page-title">Inbox</h2>
          <div class="page-sub">{{ subtitleCopy }}</div>
        </div>

        <ng-container *ngIf="threads.length; else emptyState">
          <div class="search-row" aria-hidden="true">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="11" cy="11" r="7"/><path d="M21 21l-4.4-4.4"/>
            </svg>
            <span>Search conversations</span>
          </div>
          <app-prov-card padding="0 14px" class="list-card">
            <button *ngFor="let t of threads; let last = last" type="button"
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
        </ng-container>

        <ng-template #emptyState>
          <app-prov-empty-hint
            [title]="emptyTitle"
            [body]="emptyBody">
            <app-prov-btn variant="secondary" (clicked)="emit(links['home'])">{{ emptyCta }}</app-prov-btn>
          </app-prov-empty-hint>
        </ng-template>
      </main>

      <app-prov-tab-bar *ngIf="isBusiness"
                        active="messages" [badges]="tabBadges" (tabClick)="onTab($event)"></app-prov-tab-bar>

      <nav *ngIf="!isBusiness" class="bottom-nav" aria-label="Primary">
        <button type="button" class="nav-tab" (click)="emit(links['home'])" [disabled]="!links['home']">
          <span class="nav-dot"></span>
          <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M3 11l9-7 9 7v9a1.5 1.5 0 0 1-1.5 1.5H4.5A1.5 1.5 0 0 1 3 20v-9z"/>
          </svg>
          <span class="nav-label">Home</span>
        </button>
        <button type="button" class="nav-tab is-active" data-testid="nav-chat">
          <span class="nav-dot"></span>
          <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M21 12a8 8 0 0 1-11.6 7.1L4 21l1.9-5.4A8 8 0 1 1 21 12z"/>
          </svg>
          <span class="nav-label">Messages</span>
        </button>
        <button type="button" class="nav-tab" (click)="emit(links['profile'])" [disabled]="!links['profile']">
          <span class="nav-dot"></span>
          <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <circle cx="12" cy="8.5" r="3.8"/>
            <path d="M4.5 21c0-4.1 3.4-7.5 7.5-7.5s7.5 3.4 7.5 7.5"/>
          </svg>
          <span class="nav-label">Profile</span>
        </button>
      </nav>
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
  `],
})
export class BeautyChatsComponent {
  @Input() data: Record<string, unknown> = {};
  @Input() links: Record<string, BffLink> = {};
  @Output() followLink = new EventEmitter<BffLink>();

  get threads(): ChatThread[] {
    return (this.data['threads'] as ChatThread[]) || [];
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
