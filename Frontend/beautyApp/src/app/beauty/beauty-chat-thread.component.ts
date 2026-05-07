/**
 * BeautyChatThreadComponent — redesigned per Business Provider Portal handoff (msg-thread).
 * Custom header (back + avatar + booking-context subline + booking-icon button).
 * Booking-summary chip · asymmetric-radius bubbles · sticky composer with attach + send.
 * Shared between customer and business sessions via `viewer_type`.
 */

import {
  AfterViewChecked,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { BeautyAuthService } from './beauty-auth.service';
import { BffLink } from './beauty-bff.types';

interface Message {
  id: number;
  booking_id: number;
  sender_type: 'customer' | 'business';
  sender_id: number;
  body: string;
  created_at: string;
}

@Component({
  selector: 'app-beauty-chat-thread',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="beauty-app prov-shell" data-testid="chat-thread-root">
      <header class="thread-header">
        <button type="button" class="back-btn" (click)="emit(links['back'])"
                aria-label="Back" data-testid="chat-back">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M15 18l-6-6 6-6"/>
          </svg>
        </button>
        <div class="hdr-avatar" aria-hidden="true">{{ peerInitial }}</div>
        <div class="hdr-text">
          <div class="hdr-name" data-testid="chat-peer-name">{{ peerName }}</div>
          <div class="hdr-sub">{{ serviceName }} · {{ slotLabel }}</div>
        </div>
        <button type="button" class="booking-btn" aria-label="View booking"
                (click)="emit(links['view_booking'])" [disabled]="!links['view_booking']">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <rect x="3" y="5" width="18" height="16" rx="2.5"/>
            <path d="M3 10h18M8 3v4M16 3v4"/>
          </svg>
        </button>
      </header>

      <div class="summary-wrap" *ngIf="hasSummary">
        <div class="summary-chip">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <rect x="3" y="5" width="18" height="16" rx="2.5"/><path d="M3 10h18M8 3v4M16 3v4"/>
          </svg>
          <span class="summary-text">{{ summaryText }}</span>
          <button type="button" class="summary-open"
                  (click)="emit(links['view_booking'])"
                  [disabled]="!links['view_booking']">Open →</button>
        </div>
      </div>

      <main #scrollEl id="main" class="messages-pane" data-testid="messages-pane">
        <div *ngIf="!messages.length && !isActive" class="empty-card" data-testid="chat-closed">
          <div class="empty-title">Chat closed</div>
          <div class="empty-sub">This conversation ended 24 hours after the appointment.</div>
        </div>
        <div *ngIf="!messages.length && isActive" class="empty-card" data-testid="chat-empty">
          <div class="empty-title">Say hello</div>
          <div class="empty-sub">Send your first message about this booking.</div>
        </div>
        <div *ngFor="let m of messages"
             class="msg" [class.is-mine]="m.sender_type === viewerType"
             [attr.data-testid]="'msg-' + m.id">
          <div class="bubble">
            {{ m.body }}
            <div class="msg-time">{{ formatTime(m.created_at) }}</div>
          </div>
        </div>
      </main>

      <form class="composer"
            *ngIf="isActive && links['send']"
            (ngSubmit)="send()"
            data-testid="chat-composer">
        <button type="button" class="attach-btn" aria-label="Attach" disabled>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M12 5v14M5 12h14"/>
          </svg>
        </button>
        <input type="text"
               class="composer-input"
               name="body"
               [(ngModel)]="draft"
               [placeholder]="composerPlaceholder"
               autocomplete="off"
               [disabled]="busy"
               data-testid="chat-input"/>
        <button type="submit" class="send-btn"
                [disabled]="busy || !draft.trim()"
                aria-label="Send" data-testid="chat-send">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M5 12h14M13 6l6 6-6 6"/>
          </svg>
        </button>
      </form>
      <div *ngIf="!isActive" class="composer-disabled" data-testid="composer-disabled">
        Messaging disabled — chat closed.
      </div>
    </div>
  `,
  styles: [`
    :host {
      --surface: #F2F2F2; --surface-2: #E9E9EB; --line: #DCDCDF;
      --text: #0F1115; --text-muted: #6B6F77;
      --accent-blue: #CFE3F5; --accent-blue-deep: #7DA8CF;
      --ink: #0F1115;
      --font-body: 'Inter', system-ui, sans-serif;
      --font-display: 'Cormorant Garamond', Georgia, serif;
      --font-mono: ui-monospace, 'SF Mono', Menlo, monospace;
      display: block;
      background: var(--surface);
    }
    :host *:focus-visible { outline: 2px solid #1a3a52; outline-offset: 2px; border-radius: 6px; }
    .prov-shell {
      display: flex; flex-direction: column;
      min-height: 100vh; max-height: 100vh;
      background: var(--surface); color: var(--text);
      font-family: var(--font-body);
    }

    .thread-header {
      background: var(--surface);
      padding: 8px 12px;
      display: flex; align-items: center; gap: 10px;
      border-bottom: 1px solid var(--line);
      flex-shrink: 0;
    }
    .back-btn {
      width: 44px; height: 44px;
      min-width: 44px; min-height: 44px;
      border-radius: 8px;
      background: transparent;
      border: none;
      cursor: pointer;
      display: grid; place-items: center;
      color: var(--text);
    }
    .hdr-avatar {
      width: 36px; height: 36px;
      border-radius: 50%;
      background: linear-gradient(135deg, #BFD8EE, #7DA8CF);
      display: grid; place-items: center;
      font-family: var(--font-display);
      font-size: 15px; font-weight: 500;
      color: #1a3a52;
      flex-shrink: 0;
    }
    .hdr-text { flex: 1; min-width: 0; }
    .hdr-name { font-size: 14px; font-weight: 600; color: var(--text); line-height: 1.1; }
    .hdr-sub {
      font-size: 10px; font-weight: 600;
      color: var(--accent-blue-deep);
      margin-top: 2px;
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    .booking-btn {
      width: 32px; height: 32px;
      min-width: 44px; min-height: 44px;
      border-radius: 8px;
      background: transparent;
      border: 1px solid var(--line);
      cursor: pointer;
      display: grid; place-items: center;
      color: var(--text);
    }

    .summary-wrap { padding: 10px 16px 0; flex-shrink: 0; }
    .summary-chip {
      display: flex; align-items: center; gap: 8px;
      background: rgba(207,227,245,0.6);
      border: 1px solid rgba(125,168,207,0.33);
      border-radius: 10px;
      padding: 8px 12px;
      color: #1a3a52;
    }
    .summary-text { font-size: 11px; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .summary-open {
      background: transparent; border: none; cursor: pointer;
      font-size: 11px; font-weight: 600; color: #1a3a52;
      padding: 6px 8px;
    }

    .messages-pane {
      flex: 1;
      overflow-y: auto;
      padding: 14px 16px;
    }

    .empty-card {
      background: var(--accent-blue);
      border: 1px solid rgba(125,168,207,0.2);
      border-radius: 12px;
      padding: 24px 16px;
      text-align: center;
      margin: 16px auto;
      max-width: 320px;
    }
    .empty-title { font-family: var(--font-display); font-size: 18px; color: #1a3a52; margin-bottom: 4px; }
    .empty-sub { font-size: 12px; color: #1a3a52; opacity: 0.8; }

    .msg {
      display: flex;
      margin-bottom: 8px;
    }
    .msg .bubble {
      max-width: 74%;
      padding: 10px 14px;
      font-size: 13px;
      line-height: 1.45;
      word-break: break-word;
    }
    .msg:not(.is-mine) { justify-content: flex-start; }
    .msg:not(.is-mine) .bubble {
      background: #FFFFFF;
      color: var(--text);
      border: 1px solid var(--line);
      border-radius: 16px 16px 16px 4px;
    }
    .msg.is-mine { justify-content: flex-end; }
    .msg.is-mine .bubble {
      background: var(--ink);
      color: #FFFFFF;
      border: none;
      border-radius: 16px 16px 4px 16px;
    }
    .msg-time {
      font-family: var(--font-mono);
      font-size: 9px;
      margin-top: 4px;
      text-align: right;
    }
    .msg.is-mine .msg-time { color: rgba(255,255,255,0.6); }
    .msg:not(.is-mine) .msg-time { color: var(--text-muted); }

    .composer {
      background: #FFFFFF;
      border-top: 1px solid var(--line);
      padding: 10px 12px;
      display: flex; align-items: center; gap: 8px;
      flex-shrink: 0;
      padding-bottom: calc(10px + env(safe-area-inset-bottom));
    }
    .attach-btn {
      width: 36px; height: 36px;
      min-width: 44px; min-height: 44px;
      border-radius: 50%;
      background: var(--surface);
      border: 1px solid var(--line);
      cursor: pointer;
      display: grid; place-items: center;
      color: var(--text);
      flex-shrink: 0;
    }
    .composer-input {
      flex: 1;
      height: 36px;
      min-height: 36px;
      background: var(--surface);
      border: 1px solid var(--line);
      border-radius: 999px;
      padding: 0 14px;
      font-size: 13px;
      font-family: var(--font-body);
      color: var(--text);
      outline: none;
    }
    .composer-input:focus { border-color: #1a3a52; outline: 2px solid #1a3a52; outline-offset: 0; }
    .send-btn {
      width: 36px; height: 36px;
      min-width: 44px; min-height: 44px;
      border-radius: 50%;
      background: var(--ink);
      color: #fff;
      border: none;
      cursor: pointer;
      display: grid; place-items: center;
      flex-shrink: 0;
    }
    .send-btn:disabled { opacity: 0.45; cursor: not-allowed; }

    .composer-disabled {
      padding: 14px;
      text-align: center;
      font-size: 12px;
      color: var(--text-muted);
      background: #FFFFFF;
      border-top: 1px solid var(--line);
      flex-shrink: 0;
    }

    @media screen and (min-width: 768px) {
      .beauty-app { max-width: 430px; margin: 0 auto; box-shadow: 0 0 40px rgba(15,35,60,0.15); }
    }
  `],
})
export class BeautyChatThreadComponent implements OnChanges, AfterViewChecked {
  @Input() data: Record<string, unknown> = {};
  @Input() links: Record<string, BffLink> = {};
  @Output() followLink = new EventEmitter<BffLink>();

  @ViewChild('scrollEl') scrollEl?: ElementRef<HTMLElement>;

  draft = '';
  busy = false;
  private shouldAutoScroll = true;

  constructor(private auth: BeautyAuthService) {}

  ngOnChanges(): void { this.shouldAutoScroll = true; }
  ngAfterViewChecked(): void {
    if (this.shouldAutoScroll && this.scrollEl) {
      const el = this.scrollEl.nativeElement;
      el.scrollTop = el.scrollHeight;
      this.shouldAutoScroll = false;
    }
  }

  get messages(): Message[] { return (this.data['messages'] as Message[]) || []; }
  get peerName(): string { return (this.data['peer_name'] as string) || ''; }
  get peerInitial(): string {
    return (this.peerName || '·').trim()[0]?.toUpperCase() || '·';
  }
  get serviceName(): string { return (this.data['service_name'] as string) || ''; }
  get slotLabel(): string { return (this.data['slot_label'] as string) || ''; }
  get isActive(): boolean { return Boolean(this.data['is_active']); }
  get viewerType(): 'customer' | 'business' {
    return (this.data['viewer_type'] as 'customer' | 'business') || 'customer';
  }
  get composerPlaceholder(): string {
    return this.peerName ? `Message ${this.peerName.split(' ')[0]}…` : 'Message…';
  }
  get hasSummary(): boolean { return !!(this.serviceName && this.slotLabel); }
  get summaryText(): string {
    const status = (this.data['status'] as string) || '';
    const dur = (this.data['service_duration_minutes'] as number) || 0;
    const price = (this.data['service_price_dollars'] as string) || '';
    const parts: string[] = [];
    if (status === 'booked' || status === 'completed') parts.push('Confirmed');
    if (dur) parts.push(`${dur} min`);
    if (price) parts.push(`$${price} paid`);
    return parts.join(' · ') || `${this.serviceName} · ${this.slotLabel}`;
  }

  send(): void {
    const link = this.links['send'];
    const body = this.draft.trim();
    if (!link || !body || this.busy) return;
    this.busy = true;
    this.auth.follow(link, { body }).subscribe({
      next: () => {
        this.busy = false;
        this.draft = '';
        const self = this.links['self'];
        if (self) this.followLink.emit(self);
      },
      error: () => { this.busy = false; },
    });
  }

  emit(link: BffLink | null | undefined): void {
    if (link) this.followLink.emit(link);
  }

  formatTime(iso: string): string {
    try {
      return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
    } catch { return ''; }
  }
}
