/**
 * AdminPortalCustomerDetailComponent — `/admin/portal/crm/customer/:id`
 *
 * Full account detail. Slate hero (identity + meta grid), light body with
 * tag block, lifetime stats, bookings, activity timeline, payment methods,
 * risk meter, support tickets, internal notes.
 */

import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { BffLink } from '../beauty-bff.types';
import {
  AdmStatusBarComponent,
  AdmHomeIndicatorComponent,
  AdmTopHeaderComponent,
  AdmTabBarComponent,
  AdmAvatarComponent,
  AdmCardComponent,
  AdmStatusChipComponent,
  AdmBtnComponent,
} from './atoms';

interface LifetimeStat { value: string; label: string; }
interface BookingRow { id: number; mon: string; day: number; weekday: string; service: string; with_name: string; price: string; status: 'Confirmed' | 'Cancelled' | 'Pending'; }
interface TimelineEvent { when: string; color: string; title: string; meta: string; }
interface PaymentMethod { brand: string; last4: string; exp: string; default?: boolean; }
interface SupportTicket { id: string; subject: string; status: 'Verified' | 'Pending' | 'Flagged' | 'Active'; opened_at: string; }
interface InternalNote { author: string; when: string; text: string; you?: boolean; }
interface DetailTag { id: string; label: string; color: string; tone: string; }

@Component({
  selector: 'app-admin-portal-customer-detail',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    AdmStatusBarComponent,
    AdmHomeIndicatorComponent,
    AdmTopHeaderComponent,
    AdmTabBarComponent,
    AdmAvatarComponent,
    AdmCardComponent,
    AdmStatusChipComponent,
    AdmBtnComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="adm-app is-light adm-detail">
      <adm-status-bar tone="slate"></adm-status-bar>
      <adm-top-header [notifCount]="notifCount"></adm-top-header>

      <!-- Slate hero -->
      <section class="hero">
        <div class="back-row">
          <button type="button" class="back" (click)="onBack()" aria-label="Back to CRM">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
            Customers
          </button>
        </div>

        <div class="id-row">
          <adm-avatar [initials]="initials" [size]="56" kind="customer"></adm-avatar>
          <div class="id-text">
            <h1 class="name adm-display">{{ displayName }}</h1>
            <div class="email adm-mono">{{ email }}</div>
          </div>
        </div>

        <div class="status-row">
          <adm-status-chip [status]="$any(statusLabel)"></adm-status-chip>
          <adm-status-chip *ngFor="let t of statusTags" [status]="$any(t)"></adm-status-chip>
        </div>

        <div class="meta">
          <div><div class="adm-eyebrow">Phone</div><div class="v adm-mono">{{ phone }}</div></div>
          <div><div class="adm-eyebrow">Joined</div><div class="v adm-mono">{{ joinedLabel }}</div></div>
          <div><div class="adm-eyebrow">Last seen</div><div class="v adm-mono">{{ lastSeenLabel }}</div></div>
          <div><div class="adm-eyebrow">Account ID</div><div class="v adm-mono">cust_{{ accountIdHex }}</div></div>
        </div>
      </section>

      <!-- Quick actions -->
      <nav class="actions" aria-label="Quick actions">
        <button type="button" class="ab is-primary" (click)="onMessage()" [disabled]="!hasActiveBooking">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
          In-app msg
        </button>
        <button type="button" class="ab is-disabled" aria-disabled="true" title="Email channel not wired"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16v16H4z"/><path d="M22 6L12 13 2 6"/></svg>Email</button>
        <button type="button" class="ab is-disabled" aria-disabled="true" title="SMS channel not wired"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="3"/><path d="M11 18h2"/></svg>SMS</button>
        <button type="button" class="ab" (click)="toggleNoteComposer()">Add note</button>
        <button type="button" class="ab" (click)="onManageTags()">Tag</button>
        <button type="button" class="ab" (click)="onExport()">Export</button>
        <button type="button" class="ab is-danger" (click)="onSuspend()">
          {{ isSuspended ? 'Reinstate' : 'Suspend' }}
        </button>
      </nav>

      <!-- Inline composers -->
      <div class="composer" *ngIf="messageOpen">
        <div class="adm-eyebrow on-light">Send in-app message</div>
        <textarea rows="3" [(ngModel)]="messageBody" placeholder="Message to {{ displayName }}…" aria-label="Message body"></textarea>
        <div class="composer-actions">
          <span class="hint" *ngIf="!hasActiveBooking">Customer has no active booking thread — message cannot be delivered.</span>
          <span class="hint err" *ngIf="messageError" role="alert">{{ messageError }}</span>
          <span class="hint ok" *ngIf="messageSent" role="status">Sent.</span>
          <span class="grow"></span>
          <adm-btn variant="secondary" size="sm" (press)="messageOpen = false">Cancel</adm-btn>
          <adm-btn variant="primary" size="sm" (press)="onSendMessage()" [disabled]="!messageBody.trim() || !hasActiveBooking">Send</adm-btn>
        </div>
      </div>

      <div class="composer" *ngIf="noteOpen">
        <div class="adm-eyebrow on-light">Add internal note</div>
        <textarea rows="3" [(ngModel)]="noteBody" placeholder="Private note (admin-only)…" aria-label="Note body"></textarea>
        <div class="composer-actions">
          <span class="hint err" *ngIf="noteError" role="alert">{{ noteError }}</span>
          <span class="hint ok" *ngIf="noteSaved" role="status">Saved.</span>
          <span class="grow"></span>
          <adm-btn variant="secondary" size="sm" (press)="noteOpen = false">Cancel</adm-btn>
          <adm-btn variant="primary" size="sm" (press)="onSaveNote()" [disabled]="!noteBody.trim()">Save note</adm-btn>
        </div>
      </div>

      <main class="body adm-body--scroll" role="main">

        <!-- Tags -->
        <section class="sec">
          <header class="sec-head">
            <h2 class="adm-display">Tags</h2>
            <a href="#" class="action" (click)="onManageTags($event)">Manage →</a>
          </header>
          <div class="sec-sub">Admin-only · filter via CRM</div>
          <adm-card [padding]="12">
            <div class="grp-head">
              <span class="adm-eyebrow on-light">Attached</span>
              <span class="line"></span>
              <span class="cnt adm-mono">{{ attachedTags.length }}</span>
            </div>
            <div class="tag-list">
              <span *ngFor="let t of attachedTags" class="tchip" [style.background]="t.tone" [style.color]="t.color" [style.borderColor]="t.color + '33'">
                <span class="dot" [style.background]="t.color"></span>{{ t.label }}<span class="x">×</span>
              </span>
              <button type="button" class="add-tag" (click)="onManageTags()">+ Add tag</button>
            </div>
            <div class="grp-head" style="margin-top: 4px;">
              <span class="adm-eyebrow on-light">Suggested</span>
              <span class="line"></span>
            </div>
            <div class="tag-list">
              <span *ngFor="let t of suggestedTags" class="tsug">
                <span class="plus adm-mono">+</span>
                <span class="dot" [style.background]="t.color"></span>
                {{ t.label }}
              </span>
            </div>
          </adm-card>
        </section>

        <!-- Lifetime stats -->
        <section class="sec">
          <header class="sec-head"><h2 class="adm-display">Lifetime stats</h2></header>
          <div class="stats">
            <div *ngFor="let s of lifetimeStats" class="stat">
              <div class="sv adm-mono">{{ s.value }}</div>
              <div class="sl">{{ s.label }}</div>
            </div>
          </div>
        </section>

        <!-- Bookings -->
        <section class="sec">
          <header class="sec-head">
            <h2 class="adm-display">Bookings</h2>
            <a href="#" class="action">View all →</a>
          </header>
          <div class="sec-sub">{{ bookings.length }} of {{ totalBookings }} · most recent</div>
          <adm-card [padding]="0">
            <div *ngIf="!bookings.length" class="empty">No bookings yet.</div>
            <div *ngFor="let b of bookings; let last = last" class="bkg" [class.last]="last">
              <div class="bk-date">
                <div class="mon">{{ b.mon }}</div>
                <div class="day">{{ b.day }}</div>
                <div class="wd">{{ b.weekday }}</div>
              </div>
              <div class="bk-text">
                <div class="bk-service">{{ b.service }}</div>
                <div class="bk-with adm-mono">{{ b.with_name }}</div>
              </div>
              <div class="bk-right">
                <div class="bk-price adm-mono">{{ b.price }}</div>
                <adm-status-chip [status]="$any(b.status)"></adm-status-chip>
              </div>
            </div>
          </adm-card>
        </section>

        <!-- Activity timeline -->
        <section class="sec">
          <header class="sec-head"><h2 class="adm-display">Activity timeline</h2></header>
          <div class="sec-sub">Last 7 days</div>
          <adm-card [padding]="14">
            <div *ngIf="!timeline.length" class="empty">No recent activity.</div>
            <div *ngFor="let e of timeline; let last = last" class="tline" [class.last]="last">
              <div class="tl-icon" [style.background]="e.color + '1A'" [style.color]="e.color">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                </svg>
                <span *ngIf="!last" class="tl-stem"></span>
              </div>
              <div class="tl-body">
                <div class="tl-title" [innerHTML]="e.title"></div>
                <div class="tl-meta adm-mono">{{ e.when }} · {{ e.meta }}</div>
              </div>
            </div>
          </adm-card>
        </section>

        <!-- Payment methods -->
        <section class="sec">
          <header class="sec-head"><h2 class="adm-display">Payment methods</h2></header>
          <adm-card [padding]="0">
            <div *ngIf="!paymentMethods.length" class="empty">No cards on file.</div>
            <div *ngFor="let p of paymentMethods; let i = index" class="pmrow" [class.first]="i === 0">
              <div class="pmbrand adm-mono">{{ p.brand }}</div>
              <div class="pmbody">
                <div class="adm-mono">•••• {{ p.last4 }}</div>
                <div class="pmexp">Exp {{ p.exp }}</div>
              </div>
              <adm-status-chip *ngIf="p.default" status="Verified"></adm-status-chip>
            </div>
          </adm-card>
        </section>

        <!-- Risk -->
        <section class="sec">
          <header class="sec-head"><h2 class="adm-display">Risk signals</h2></header>
          <adm-card [padding]="12">
            <div class="risk-head">
              <div>
                <div class="adm-eyebrow on-light">Risk score</div>
                <div class="risk-num adm-display">{{ riskScore }}<span class="risk-denom">/100</span></div>
              </div>
              <span class="risk-chip" [style.background]="riskColor + '1A'" [style.color]="riskColor">{{ riskLabel }}</span>
            </div>
            <div class="risk-bar"><div class="risk-fill" [style.width.%]="riskScore" [style.background]="riskColor"></div></div>
            <div class="risk-axis adm-mono"><span>0</span><span>30</span><span>70</span><span>100</span></div>
          </adm-card>
        </section>

        <!-- Notes -->
        <section class="sec">
          <header class="sec-head"><h2 class="adm-display">Internal notes</h2></header>
          <div *ngIf="!internalNotes.length" class="empty card">No internal notes yet.</div>
          <div *ngFor="let n of internalNotes" class="note" [class.is-you]="n.you">
            <div class="note-head">
              <span class="note-author">{{ n.author }}</span>
              <span class="note-when adm-mono">{{ n.when }}</span>
            </div>
            <div class="note-text">{{ n.text }}</div>
          </div>
        </section>
      </main>

      <adm-tab-bar active="crm" [badges]="tabBadges"></adm-tab-bar>
      <adm-home-indicator tone="slate"></adm-home-indicator>
    </div>
  `,
  styles: [`
    :host { display: block; min-height: 100dvh; background: var(--surface); }
    .adm-detail { min-height: 100dvh; }

    .hero { background: var(--adm-slate); color: #fff; padding: 0 14px 16px; flex-shrink: 0; }
    .back-row { height: 48px; display: flex; align-items: center; gap: 10px; margin-bottom: 6px; }
    .back { height: 32px; padding: 0 6px 0 4px; border-radius: 8px; background: transparent; border: none; color: var(--adm-slate-muted); display: inline-flex; align-items: center; gap: 4px; cursor: pointer; font-family: var(--adm-font-body); font-size: 12px; font-weight: 500; }
    .grow { flex: 1; }
    .kebab { height: 30px; width: 30px; border-radius: 8px; background: var(--adm-slate-2); border: 1px solid var(--adm-slate-line); color: #fff; display: grid; place-items: center; cursor: pointer; }

    .id-row { display: flex; align-items: center; gap: 12px; }
    .id-text { flex: 1; min-width: 0; }
    .name { margin: 0; font-family: var(--adm-font-display); font-size: 24px; font-weight: 500; color: #fff; line-height: 1.1; letter-spacing: 0.1px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .email { font-size: 11px; color: var(--adm-slate-muted); margin-top: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

    .status-row { display: flex; gap: 6px; margin-top: 12px; flex-wrap: wrap; }

    .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 14px; font-family: var(--adm-font-body); font-size: 10.5px; }
    .meta .adm-eyebrow { color: var(--adm-slate-muted); }
    .meta .v { color: #fff; font-size: 12px; margin-top: 3px; }

    .actions { display: flex; gap: 6px; padding: 10px 14px; overflow-x: auto; background: var(--surface); border-bottom: 1px solid var(--line); flex-shrink: 0; }
    .ab { flex-shrink: 0; height: 34px; padding: 0 12px; background: #fff; color: var(--text); border: 1px solid var(--line); border-radius: 999px; font-family: var(--adm-font-body); font-size: 12px; font-weight: 600; letter-spacing: 0.1px; cursor: pointer; display: inline-flex; align-items: center; gap: 5px; }
    .ab.is-primary { background: #0F1115; color: #fff; border-color: #0F1115; }
    .ab.is-danger { background: var(--adm-red); color: #fff; border-color: var(--adm-red); }
    .ab.is-disabled { opacity: 0.45; cursor: not-allowed; }
    .ab:disabled { opacity: 0.45; cursor: not-allowed; }

    .composer { background: #fff; border-top: 1px solid var(--line); padding: 10px 14px; }
    .composer textarea { width: 100%; background: var(--surface); border: 1px solid var(--line); border-radius: 10px; padding: 8px 10px; font-family: var(--adm-font-body); font-size: 13px; color: var(--text); resize: vertical; min-height: 60px; outline: none; }
    .composer-actions { display: flex; align-items: center; gap: 8px; margin-top: 8px; }
    .composer-actions .grow { flex: 1; }
    .composer-actions .hint { font-size: 11px; color: var(--text-muted); }
    .composer-actions .hint.err { color: var(--danger); }
    .composer-actions .hint.ok { color: var(--adm-green); }

    .body { padding: 14px 14px 24px; background: var(--surface); }

    .sec { margin-bottom: 14px; }
    .sec-head { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 4px; }
    .sec-head h2 { margin: 0; font-size: 18px; color: var(--text); }
    .sec-sub { font-size: 10.5px; color: var(--text-muted); margin: 0 0 8px; }
    .action { font-size: 11px; color: #1a3a52; font-weight: 600; text-decoration: none; }

    .grp-head { display: flex; align-items: center; gap: 6px; margin-bottom: 8px; }
    .grp-head .line { flex: 1; height: 1px; background: #ECECEE; }
    .grp-head .cnt { font-size: 10px; color: var(--text-muted); }

    .tag-list { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 12px; }
    .tchip { display: inline-flex; align-items: center; gap: 5px; padding: 4px 9px; border-radius: 999px; border: 1px solid; font-family: var(--adm-font-body); font-size: 11px; font-weight: 600; line-height: 1.2; white-space: nowrap; }
    .tchip .dot { width: 6px; height: 6px; border-radius: 50%; }
    .tchip .x { margin-left: 2px; opacity: 0.7; font-family: var(--adm-font-mono); font-size: 9px; }
    .add-tag { padding: 4px 9px; border-radius: 999px; background: #fff; border: 1px dashed var(--line); font-family: var(--adm-font-body); font-size: 11px; color: var(--text-muted); cursor: pointer; }
    .tsug { display: inline-flex; align-items: center; gap: 4px; padding: 3px 8px 3px 4px; border-radius: 999px; background: var(--surface); border: 1px solid var(--line); font-family: var(--adm-font-body); font-size: 11px; color: var(--text); cursor: pointer; }
    .tsug .plus { font-size: 12px; color: var(--text-muted); margin-right: 2px; }
    .tsug .dot { width: 6px; height: 6px; border-radius: 50%; }

    .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; }
    .stat { background: #fff; border: 1px solid var(--line); border-radius: 10px; padding: 10px 8px; text-align: center; }
    .stat .sv { font-size: 14px; font-weight: 600; color: var(--text); line-height: 1; }
    .stat .sl { font-size: 9px; color: var(--text-muted); margin-top: 4px; letter-spacing: 0.3px; text-transform: uppercase; font-weight: 600; }

    .bkg { display: flex; align-items: center; gap: 10px; padding: 10px 14px; border-top: 1px solid #ECECEE; }
    .bkg:first-child { border-top: none; }
    .bk-date { text-align: center; min-width: 36px; flex-shrink: 0; font-family: var(--adm-font-mono); }
    .bk-date .mon { font-size: 8.5px; font-weight: 700; color: var(--text-muted); letter-spacing: 0.4px; }
    .bk-date .day { font-size: 18px; font-weight: 600; color: var(--text); line-height: 1; }
    .bk-date .wd { font-size: 8.5px; font-weight: 600; color: var(--text-muted); letter-spacing: 0.3px; }
    .bk-text { flex: 1; min-width: 0; }
    .bk-service { font-size: 12.5px; color: var(--text); font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .bk-with { font-size: 10.5px; color: var(--text-muted); margin-top: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .bk-right { text-align: right; flex-shrink: 0; }
    .bk-price { font-size: 12.5px; font-weight: 600; color: var(--text); }

    .tline { display: flex; gap: 10px; padding-bottom: 14px; position: relative; }
    .tline.last { padding-bottom: 0; }
    .tl-icon { width: 26px; height: 26px; border-radius: 7px; display: grid; place-items: center; flex-shrink: 0; position: relative; }
    .tl-icon .tl-stem { position: absolute; top: 28px; bottom: -14px; left: 12px; width: 1px; background: var(--line); }
    .tl-body { flex: 1; min-width: 0; padding-top: 2px; }
    .tl-title { font-size: 12.5px; color: var(--text); line-height: 1.4; }
    .tl-meta { font-size: 10px; color: var(--text-muted); margin-top: 2px; }

    .empty { padding: 16px; text-align: center; color: var(--text-muted); font-size: 12px; }
    .empty.card { background: #fff; border: 1px dashed var(--line); border-radius: 12px; }

    .pmrow { display: flex; align-items: center; gap: 12px; padding: 12px 14px; border-top: 1px solid #ECECEE; }
    .pmrow.first { border-top: none; }
    .pmbrand { width: 42px; height: 28px; border-radius: 6px; background: linear-gradient(135deg, #0F1115, #2A3441); color: #fff; display: grid; place-items: center; font-size: 9.5px; font-weight: 700; letter-spacing: 0.5px; }
    .pmbody { flex: 1; min-width: 0; }
    .pmbody > div:first-child { font-size: 12px; color: var(--text); }
    .pmexp { font-size: 10px; color: var(--text-muted); margin-top: 2px; }

    .risk-head { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 8px; }
    .risk-num { font-size: 24px; color: var(--text); line-height: 1; }
    .risk-denom { color: var(--text-muted); font-size: 16px; }
    .risk-chip { padding: 4px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; letter-spacing: 0.4px; }
    .risk-bar { height: 6px; border-radius: 3px; background: #ECECEE; overflow: hidden; }
    .risk-fill { height: 100%; border-radius: 3px; }
    .risk-axis { display: flex; justify-content: space-between; font-size: 9px; color: var(--text-muted); margin-top: 4px; }

    .note { background: #FFF8DC; border: 1px solid rgba(165,122,31,0.20); border-radius: 12px; padding: 10px; margin-bottom: 8px; color: var(--text); }
    .note.is-you { background: #0F1115; border: none; color: #fff; }
    .note-head { display: flex; justify-content: space-between; margin-bottom: 4px; }
    .note-author { font-size: 11px; font-weight: 700; }
    .note-when { font-size: 9.5px; color: #8A6A1F; }
    .note.is-you .note-when { color: rgba(255,255,255,0.55); }
    .note-text { font-size: 12px; line-height: 1.5; }
  `],
})
export class AdminPortalCustomerDetailComponent {
  @Input() data: Record<string, unknown> = {};
  @Input() links: Record<string, BffLink> = {};
  @Output() followLink = new EventEmitter<BffLink>();
  @Output() sendMessage = new EventEmitter<string>();
  @Output() saveNote = new EventEmitter<string>();
  @Output() exportAccount = new EventEmitter<void>();

  messageOpen = false;
  messageBody = '';
  messageError: string | null = null;
  messageSent = false;

  noteOpen = false;
  noteBody = '';
  noteError: string | null = null;
  noteSaved = false;

  constructor(private location: Location) {}

  get displayName(): string { return (this.data['display_name'] as string) ?? 'Customer'; }
  get initials(): string {
    const n = this.displayName;
    const parts = n.split(/\s+/).filter(Boolean);
    if (!parts.length) return '?';
    return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase();
  }
  get email(): string { return (this.data['email'] as string) ?? ''; }
  get phone(): string { return (this.data['phone'] as string) ?? '—'; }
  get joinedLabel(): string { return (this.data['joined_label'] as string) ?? '—'; }
  get lastSeenLabel(): string { return (this.data['last_seen_label'] as string) ?? '—'; }
  get accountIdHex(): string {
    const id = (this.data['id'] as number) ?? 0;
    return id.toString(16).padStart(6, '0');
  }
  get isSuspended(): boolean { return Boolean(this.data['is_suspended']); }
  get statusLabel(): string { return this.isSuspended ? 'Suspended' : 'Active'; }
  get statusTags(): string[] { return (this.data['status_tags'] as string[]) ?? []; }
  get attachedTags(): DetailTag[] { return (this.data['attached_tags'] as DetailTag[]) ?? []; }
  get suggestedTags(): DetailTag[] { return (this.data['suggested_tags'] as DetailTag[]) ?? []; }
  get lifetimeStats(): LifetimeStat[] { return (this.data['lifetime_stats'] as LifetimeStat[]) ?? []; }
  get bookings(): BookingRow[] { return (this.data['bookings'] as BookingRow[]) ?? []; }
  get totalBookings(): number { return (this.data['total_bookings'] as number) ?? this.bookings.length; }
  get timeline(): TimelineEvent[] { return (this.data['timeline'] as TimelineEvent[]) ?? []; }
  get paymentMethods(): PaymentMethod[] { return (this.data['payment_methods'] as PaymentMethod[]) ?? []; }
  get internalNotes(): InternalNote[] { return (this.data['internal_notes'] as InternalNote[]) ?? []; }
  get riskScore(): number { return (this.data['risk_score'] as number) ?? 0; }
  get riskLabel(): string { return (this.data['risk_label'] as string) ?? 'Low'; }
  get riskColor(): string {
    return this.riskScore < 30 ? '#2F7A47' : this.riskScore < 70 ? '#8A6A1F' : '#C0392B';
  }

  get hasActiveBooking(): boolean {
    return Boolean(this.data['has_active_booking']);
  }

  onMessage(): void {
    this.messageOpen = !this.messageOpen;
    this.messageError = null;
    this.messageSent = false;
  }

  toggleNoteComposer(): void {
    this.noteOpen = !this.noteOpen;
    this.noteError = null;
    this.noteSaved = false;
  }

  onSendMessage(): void {
    const body = this.messageBody.trim();
    if (!body || !this.hasActiveBooking) return;
    this.sendMessage.emit(body);
  }

  onSaveNote(): void {
    const body = this.noteBody.trim();
    if (!body) return;
    this.saveNote.emit(body);
  }

  onExport(): void {
    this.exportAccount.emit();
  }

  /** Shell callbacks set these so component can show inline feedback. */
  messageResult(ok: boolean, err?: string): void {
    if (ok) {
      this.messageSent = true;
      this.messageBody = '';
      setTimeout(() => { this.messageOpen = false; this.messageSent = false; }, 1200);
    } else {
      this.messageError = err ?? 'Failed to send.';
    }
  }
  noteResult(ok: boolean, err?: string): void {
    if (ok) {
      this.noteSaved = true;
      this.noteBody = '';
      setTimeout(() => { this.noteOpen = false; this.noteSaved = false; }, 1000);
    } else {
      this.noteError = err ?? 'Failed to save.';
    }
  }

  onBack(): void {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      this.location.back();
      return;
    }
    const link = this.links['back'];
    if (link) this.followLink.emit(link);
  }

  onSuspend(): void {
    const link = this.links['suspend'];
    if (link) this.followLink.emit(link);
  }

  onManageTags(ev?: Event): void {
    if (ev) ev.preventDefault();
    const link = this.links['manage_tags'];
    if (link) this.followLink.emit(link);
  }

  get tabBadges(): Record<string, number | string | null> {
    return (this.data['tab_badges'] as Record<string, number | string | null>) ?? {};
  }
}
