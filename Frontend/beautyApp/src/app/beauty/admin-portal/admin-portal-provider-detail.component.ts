/**
 * AdminPortalProviderDetailComponent — `/admin/portal/crm/provider/:id`
 *
 * Provider account detail. Slate hero, action toolbar, performance stats,
 * payouts, service catalog, reviews aggregate, weekly hours, risk, notes.
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

interface PerfStat { value: string; label: string; }
interface ServiceItem { id: number; name: string; duration: string; price: string; category: string; }
interface Payout { date: string; amount: string; verified: boolean; }
interface WeekRow { day: string; hours: string; closed?: boolean; }
interface InternalNote { author: string; when: string; text: string; you?: boolean; }
interface ReviewBucket { stars: number; pct: number; }

@Component({
  selector: 'app-admin-portal-provider-detail',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    AdmStatusBarComponent, AdmHomeIndicatorComponent,
    AdmTopHeaderComponent, AdmTabBarComponent,
    AdmAvatarComponent, AdmCardComponent, AdmStatusChipComponent, AdmBtnComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="adm-app is-light adm-detail">
      <adm-status-bar tone="slate"></adm-status-bar>
      <adm-top-header [notifCount]="notifCount"></adm-top-header>

      <section class="hero">
        <div class="back-row">
          <button type="button" class="back" (click)="onBack()" aria-label="Back to providers">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
            Providers
          </button>
        </div>

        <div class="id-row">
          <adm-avatar [initials]="initials" [size]="56" kind="provider"></adm-avatar>
          <div class="id-text">
            <h1 class="name adm-display">{{ businessName }}</h1>
            <div class="email adm-mono">{{ email }}</div>
          </div>
        </div>

        <div class="status-row">
          <adm-status-chip [status]="$any(statusLabel)"></adm-status-chip>
          <adm-status-chip *ngIf="verified" status="Verified"></adm-status-chip>
        </div>

        <div class="meta">
          <div><div class="adm-eyebrow">Public phone</div><div class="v adm-mono">{{ phone }}</div></div>
          <div><div class="adm-eyebrow">Since</div><div class="v adm-mono">{{ joinedLabel }}</div></div>
          <div><div class="adm-eyebrow">Last active</div><div class="v adm-mono">{{ lastSeenLabel }}</div></div>
          <div><div class="adm-eyebrow">Account ID</div><div class="v adm-mono">prov_{{ accountIdHex }}</div></div>
        </div>
      </section>

      <nav class="actions" aria-label="Quick actions">
        <button type="button" class="ab is-primary" (click)="toggleMessage()" [disabled]="!hasActiveBooking">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
          In-app msg
        </button>
        <button type="button" class="ab is-disabled" aria-disabled="true" title="Email channel not wired">Email</button>
        <button type="button" class="ab is-disabled" aria-disabled="true" title="SMS channel not wired">SMS</button>
        <button type="button" class="ab" (click)="toggleNote()">Add note</button>
        <button type="button" class="ab" (click)="onManageTags()">Tag</button>
        <button type="button" class="ab" (click)="onExport()">Export</button>
        <button type="button" class="ab is-danger" (click)="onSuspend()">{{ isSuspended ? 'Reinstate' : 'Suspend' }}</button>
      </nav>

      <div class="composer" *ngIf="messageOpen">
        <div class="adm-eyebrow on-light">Send in-app message</div>
        <textarea rows="3" [(ngModel)]="messageBody" placeholder="Message to {{ businessName }}…" aria-label="Message body"></textarea>
        <div class="composer-actions">
          <span class="hint" *ngIf="!hasActiveBooking">Provider has no active booking thread to deliver into.</span>
          <span class="hint err" *ngIf="messageError" role="alert">{{ messageError }}</span>
          <span class="hint ok" *ngIf="messageSent" role="status">Sent.</span>
          <span class="grow"></span>
          <adm-btn variant="secondary" size="sm" (press)="messageOpen = false">Cancel</adm-btn>
          <adm-btn variant="primary" size="sm" (press)="onSendMessage()" [disabled]="!messageBody.trim() || !hasActiveBooking">Send</adm-btn>
        </div>
      </div>

      <div class="composer" *ngIf="noteOpen">
        <div class="adm-eyebrow on-light">Add internal note</div>
        <textarea rows="3" [(ngModel)]="noteBody" placeholder="Private note (admin-only)…"></textarea>
        <div class="composer-actions">
          <span class="hint err" *ngIf="noteError" role="alert">{{ noteError }}</span>
          <span class="hint ok" *ngIf="noteSaved" role="status">Saved.</span>
          <span class="grow"></span>
          <adm-btn variant="secondary" size="sm" (press)="noteOpen = false">Cancel</adm-btn>
          <adm-btn variant="primary" size="sm" (press)="onSaveNote()" [disabled]="!noteBody.trim()">Save note</adm-btn>
        </div>
      </div>

      <main class="body adm-body--scroll" role="main">
        <!-- Performance -->
        <section class="sec">
          <header class="sec-head"><h2 class="adm-display">Performance</h2></header>
          <div class="stats">
            <div *ngFor="let s of performance" class="stat">
              <div class="sv adm-mono">{{ s.value }}</div>
              <div class="sl">{{ s.label }}</div>
            </div>
          </div>
        </section>

        <!-- Service catalog -->
        <section class="sec">
          <header class="sec-head"><h2 class="adm-display">Service catalog</h2></header>
          <div class="sec-sub">{{ services.length }} active service{{ services.length === 1 ? '' : 's' }}</div>
          <adm-card [padding]="0">
            <div *ngIf="!services.length" class="empty">No services published.</div>
            <div *ngFor="let s of services; let i = index" class="svc" [class.first]="i === 0">
              <div class="svc-icon" [attr.data-category]="s.category"></div>
              <div class="svc-body">
                <div class="svc-name">{{ s.name }}</div>
                <div class="svc-sub adm-mono">{{ s.category }} · {{ s.duration }}</div>
              </div>
              <div class="svc-price adm-mono">{{ s.price }}</div>
            </div>
          </adm-card>
        </section>

        <!-- Reviews -->
        <section class="sec">
          <header class="sec-head"><h2 class="adm-display">Reviews</h2></header>
          <adm-card [padding]="12">
            <div class="rev-head">
              <div class="rev-num adm-display">{{ avgRating }}<span class="rev-star">★</span></div>
              <div class="rev-sub">avg · {{ reviewsCount }} review{{ reviewsCount === 1 ? '' : 's' }}</div>
            </div>
            <div *ngFor="let b of reviewBuckets" class="rev-row">
              <span class="rev-lbl adm-mono">{{ b.stars }}★</span>
              <span class="rev-bar"><span class="rev-fill" [style.width.%]="b.pct"></span></span>
              <span class="rev-pct adm-mono">{{ b.pct }}%</span>
            </div>
          </adm-card>
        </section>

        <!-- Payouts -->
        <section class="sec">
          <header class="sec-head"><h2 class="adm-display">Payouts</h2></header>
          <adm-card [padding]="0">
            <div *ngIf="!payouts.length" class="empty">No payouts yet.</div>
            <div *ngFor="let p of payouts; let i = index" class="payout" [class.first]="i === 0">
              <div class="po-date adm-mono">{{ p.date }}</div>
              <div class="po-amt adm-mono">{{ p.amount }}</div>
              <adm-status-chip *ngIf="p.verified" status="Verified"></adm-status-chip>
            </div>
          </adm-card>
        </section>

        <!-- Weekly hours -->
        <section class="sec">
          <header class="sec-head"><h2 class="adm-display">Weekly hours</h2></header>
          <adm-card [padding]="0">
            <div *ngIf="!weeklyHours.length" class="empty">Hours not yet published.</div>
            <div *ngFor="let w of weeklyHours; let i = index" class="hours" [class.first]="i === 0">
              <span class="hday">{{ w.day }}</span>
              <span class="grow"></span>
              <span class="hh adm-mono" [class.closed]="w.closed">{{ w.hours }}</span>
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
    .name { margin: 0; font-size: 24px; color: #fff; line-height: 1.1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .email { font-size: 11px; color: var(--adm-slate-muted); margin-top: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .status-row { display: flex; gap: 6px; margin-top: 12px; flex-wrap: wrap; }
    .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 14px; font-size: 10.5px; }
    .meta .adm-eyebrow { color: var(--adm-slate-muted); }
    .meta .v { color: #fff; font-size: 12px; margin-top: 3px; }

    .actions { display: flex; gap: 6px; padding: 10px 14px; overflow-x: auto; background: var(--surface); border-bottom: 1px solid var(--line); flex-shrink: 0; }
    .ab { flex-shrink: 0; height: 34px; padding: 0 12px; background: #fff; color: var(--text); border: 1px solid var(--line); border-radius: 999px; font-family: var(--adm-font-body); font-size: 12px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 5px; }
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
    .empty { padding: 16px; text-align: center; color: var(--text-muted); font-size: 12px; }
    .empty.card { background: #fff; border: 1px dashed var(--line); border-radius: 12px; }

    .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; }
    .stat { background: #fff; border: 1px solid var(--line); border-radius: 10px; padding: 10px 8px; text-align: center; }
    .stat .sv { font-size: 14px; font-weight: 600; color: var(--text); line-height: 1; }
    .stat .sl { font-size: 9px; color: var(--text-muted); margin-top: 4px; letter-spacing: 0.3px; text-transform: uppercase; font-weight: 600; }

    .svc { display: flex; align-items: center; gap: 10px; padding: 10px 14px; border-top: 1px solid #ECECEE; }
    .svc.first { border-top: none; }
    .svc-icon { width: 30px; height: 30px; border-radius: 8px; background: linear-gradient(135deg, #C8A57E, #6B4F3A); flex-shrink: 0; }
    .svc-icon[data-category='hair']   { background: linear-gradient(135deg, #C8A57E, #6B4F3A); }
    .svc-icon[data-category='nails']  { background: linear-gradient(135deg, #CFE3F5, #7DA8CF); }
    .svc-icon[data-category='makeup'] { background: linear-gradient(135deg, #F1E8DA, #8A6A1F); }
    .svc-icon[data-category='skin']   { background: linear-gradient(135deg, #E5F3EA, #2F7A47); }
    .svc-body { flex: 1; min-width: 0; }
    .svc-name { font-size: 12.5px; font-weight: 600; color: var(--text); }
    .svc-sub { font-size: 10.5px; color: var(--text-muted); margin-top: 2px; }
    .svc-price { font-size: 12.5px; font-weight: 600; color: var(--text); flex-shrink: 0; }

    .rev-head { display: flex; align-items: baseline; gap: 8px; margin-bottom: 10px; }
    .rev-num { font-size: 28px; color: var(--text); line-height: 1; }
    .rev-num .rev-star { color: #8A6A1F; font-size: 22px; }
    .rev-sub { font-size: 11px; color: var(--text-muted); }
    .rev-row { display: flex; align-items: center; gap: 8px; padding: 4px 0; }
    .rev-lbl { font-size: 10px; color: var(--text-muted); width: 22px; }
    .rev-bar { flex: 1; height: 4px; background: var(--surface-2); border-radius: 2px; overflow: hidden; }
    .rev-fill { display: block; height: 100%; background: var(--accent-blue-deep); border-radius: 2px; }
    .rev-pct { font-size: 10px; color: var(--text-muted); width: 36px; text-align: right; }

    .payout { display: flex; align-items: center; gap: 10px; padding: 10px 14px; border-top: 1px solid #ECECEE; }
    .payout.first { border-top: none; }
    .po-date { font-size: 11px; color: var(--text-muted); width: 100px; }
    .po-amt { flex: 1; font-size: 13px; font-weight: 600; color: var(--text); }

    .hours { display: flex; align-items: center; gap: 10px; padding: 10px 14px; border-top: 1px solid #ECECEE; }
    .hours.first { border-top: none; }
    .hday { font-size: 12px; color: var(--text); }
    .hh { font-size: 11px; color: var(--text); }
    .hh.closed { color: var(--danger); }

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
export class AdminPortalProviderDetailComponent {
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
  get notifCount(): number { return (this.data['notif_count'] as number) ?? 0; }

  get businessName(): string { return (this.data['business_name'] as string) ?? 'Provider'; }
  get initials(): string {
    const n = this.businessName;
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
  get verified(): boolean { return Boolean(this.data['verified']); }
  get hasActiveBooking(): boolean { return Boolean(this.data['has_active_booking']); }

  get performance(): PerfStat[] { return (this.data['performance'] as PerfStat[]) ?? []; }
  get services(): ServiceItem[] { return (this.data['services'] as ServiceItem[]) ?? []; }
  get payouts(): Payout[] { return (this.data['payouts'] as Payout[]) ?? []; }
  get weeklyHours(): WeekRow[] { return (this.data['weekly_hours'] as WeekRow[]) ?? []; }
  get internalNotes(): InternalNote[] { return (this.data['internal_notes'] as InternalNote[]) ?? []; }
  get avgRating(): string { return (this.data['avg_rating'] as string) ?? '—'; }
  get reviewsCount(): number { return (this.data['reviews_count'] as number) ?? 0; }
  get reviewBuckets(): ReviewBucket[] { return (this.data['review_buckets'] as ReviewBucket[]) ?? []; }
  get riskScore(): number { return (this.data['risk_score'] as number) ?? 0; }
  get riskLabel(): string { return (this.data['risk_label'] as string) ?? 'Low'; }
  get riskColor(): string {
    return this.riskScore < 30 ? '#2F7A47' : this.riskScore < 70 ? '#8A6A1F' : '#C0392B';
  }

  toggleMessage(): void { this.messageOpen = !this.messageOpen; this.messageError = null; this.messageSent = false; }
  toggleNote(): void { this.noteOpen = !this.noteOpen; this.noteError = null; this.noteSaved = false; }

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
  onExport(): void { this.exportAccount.emit(); }

  messageResult(ok: boolean, err?: string): void {
    if (ok) {
      this.messageSent = true; this.messageBody = '';
      setTimeout(() => { this.messageOpen = false; this.messageSent = false; }, 1200);
    } else {
      this.messageError = err ?? 'Failed to send.';
    }
  }
  noteResult(ok: boolean, err?: string): void {
    if (ok) {
      this.noteSaved = true; this.noteBody = '';
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
  onManageTags(): void {
    const link = this.links['manage_tags'];
    if (link) this.followLink.emit(link);
  }

  get tabBadges(): Record<string, number | string | null> {
    return (this.data['tab_badges'] as Record<string, number | string | null>) ?? {};
  }
}
