/**
 * BeautyBusinessProfileComponent — desktop redesign per Business Provider
 * Portal · Web handoff (web-prof). Sidebar/topbar chrome, centered title,
 * two columns: left storefront-identity card; right Earnings 4-up + folded
 * Customer reviews (average, rating breakdown, recent list with inline
 * reply). BFF: data.business / identity / earnings / reviews, reply via the
 * per-review `reply` action-link. The standalone /business/reviews screen
 * stays available via links.reviews.
 */

import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { BeautyAuthService } from './beauty-auth.service';
import { BffLink } from './beauty-bff.types';
import { BeautyProvWebSidebarComponent, ProvWebNav } from './prov-web/prov-web-sidebar.component';
import { BeautyProvWebTopbarComponent } from './prov-web/prov-web-topbar.component';

interface EarningsPayload {
  total_dollars?: string; this_month_dollars?: string; this_year_dollars?: string;
  total_cents?: number; this_month_cents?: number; this_year_cents?: number;
  paid_bookings_count?: number;
}
interface ReviewItem {
  id: number; rating: number; body: string; created_at: string;
  customer: { initial: string; display_name: string };
  service: { name: string };
  business_reply: string; business_reply_at: string | null;
  _links?: { reply?: BffLink };
}
interface ReviewsPayload {
  average: number | null; count: number; new_this_week: number;
  breakdown: { stars: number; count: number }[];
  items: ReviewItem[];
}
interface IdentityPayload { address?: string; categories?: string[]; since?: string; }

@Component({
  selector: 'app-beauty-business-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, BeautyProvWebSidebarComponent, BeautyProvWebTopbarComponent],
  template: `
    <div class="pw-shell">
      <app-prov-web-sidebar
        active="profile"
        [businessName]="business?.business_name || 'Your storefront'"
        [email]="business?.email || ''"
        [storefrontLive]="true"
        [badges]="navBadges"
        (follow)="emit($event)">
      </app-prov-web-sidebar>

      <div class="pw-main">
        <app-prov-web-topbar
          [businessName]="business?.business_name || 'Your storefront'"
          [email]="business?.email || ''"
          [notifCount]="0"
          (follow)="emit($event)">
        </app-prov-web-topbar>

        <main id="main" class="pw-content">
          <div class="pw-header">
            <div class="pw-header-text pw-header-centered">
              <h1 class="pw-title">Profile</h1>
              <div class="pw-sub">Your public storefront identity · earnings · reviews</div>
            </div>
          </div>

          <div class="pw-pad prof-grid">
            <!-- Identity -->
            <aside class="web-card ident-card">
              <div class="avatar" aria-hidden="true">{{ initial }}</div>
              <div class="biz-name">{{ business?.business_name || 'Your storefront' }}</div>
              <div class="biz-email mono">{{ business?.email }}</div>
              <div class="status-line"><span class="green-dot"></span> Storefront live</div>

              <dl class="ident-fields">
                <div *ngIf="identity.address"><dt>Address</dt><dd>{{ identity.address }}</dd></div>
                <div *ngIf="identity.categories?.length"><dt>Categories</dt><dd>{{ identity.categories?.join(' · ') }}</dd></div>
                <div *ngIf="identity.since"><dt>Since</dt><dd>{{ identity.since }}</dd></div>
              </dl>

              <div class="ident-actions">
                <button type="button" class="wbtn wbtn-secondary" (click)="comingSoon()">Edit profile</button>
                <button type="button" class="wbtn wbtn-secondary" (click)="comingSoon()">Upload photos</button>
              </div>
              <div *ngIf="note" class="note">{{ note }}</div>
            </aside>

            <div class="prof-right">
              <!-- Earnings -->
              <section class="web-card earn-card">
                <div class="card-head">
                  <h2 class="card-title">Earnings</h2>
                  <button type="button" class="link-btn" (click)="comingSoon()">View payouts →</button>
                </div>
                <div class="earn-grid">
                  <div><div class="kpi-label">Lifetime</div><div class="kpi-val" data-testid="earnings-total">\${{ totalDollars }}</div></div>
                  <div><div class="kpi-label">This year</div><div class="kpi-val" data-testid="earnings-year">\${{ yearDollars }}</div></div>
                  <div><div class="kpi-label">This month</div><div class="kpi-val" data-testid="earnings-month">\${{ monthDollars }}</div></div>
                  <div><div class="kpi-label">Paid bookings</div><div class="kpi-val" data-testid="earnings-count">{{ earnings.paid_bookings_count ?? 0 }}</div></div>
                </div>
              </section>

              <!-- Reviews -->
              <section class="web-card rev-card">
                <div class="rev-head">
                  <div>
                    <h2 class="card-title">Customer reviews</h2>
                    <div class="rev-sub" *ngIf="reviews.count">
                      {{ avgLabel }}★ · {{ reviews.count }} review{{ reviews.count === 1 ? '' : 's' }}
                      <span *ngIf="reviews.new_this_week"> · {{ reviews.new_this_week }} new this week</span>
                    </div>
                    <div class="rev-sub" *ngIf="!reviews.count">No reviews yet.</div>
                  </div>
                  <div class="rev-big" *ngIf="reviews.count">
                    <span class="rev-big-num">{{ avgLabel }}</span>
                    <span class="rev-big-stars" aria-hidden="true">{{ stars(roundedAvg) }}</span>
                  </div>
                </div>

                <div class="rev-breakdown" *ngIf="reviews.count">
                  <div class="bd-row" *ngFor="let b of reviews.breakdown">
                    <span class="bd-star">{{ b.stars }}</span>
                    <span class="bd-track"><span class="bd-fill" [style.width.%]="pct(b.count)"></span></span>
                    <span class="bd-pct">{{ pct(b.count) }}%</span>
                  </div>
                </div>

                <div class="rev-list">
                  <article class="rev-item" *ngFor="let r of reviews.items">
                    <div class="rev-item-top">
                      <span class="rev-name">{{ r.customer.display_name }}</span>
                      <span class="rev-svc" *ngIf="r.service.name">{{ r.service.name }}</span>
                      <span class="rev-stars" aria-hidden="true">{{ stars(r.rating) }}</span>
                      <span class="rev-ago">{{ ago(r.created_at) }}</span>
                    </div>
                    <p class="rev-body" *ngIf="r.body">{{ r.body }}</p>

                    <div class="reply-block" *ngIf="r.business_reply">
                      <div class="reply-head">{{ business?.business_name || 'You' }} replied</div>
                      <p class="reply-body">{{ r.business_reply }}</p>
                    </div>

                    <ng-container *ngIf="!r.business_reply">
                      <button type="button" class="link-btn" *ngIf="openReplyId !== r.id"
                              (click)="openReply(r)">Reply →</button>
                      <div class="reply-edit" *ngIf="openReplyId === r.id">
                        <textarea class="reply-input" rows="2" [(ngModel)]="replyDraft"
                                  [name]="'reply-' + r.id" placeholder="Write a reply…"></textarea>
                        <div class="reply-actions">
                          <button type="button" class="wbtn wbtn-secondary sm" (click)="cancelReply()" [disabled]="replyBusy">Cancel</button>
                          <button type="button" class="wbtn wbtn-ink sm" (click)="sendReply(r)" [disabled]="replyBusy || !replyDraft.trim()">
                            {{ replyBusy ? 'Sending…' : 'Send reply' }}
                          </button>
                        </div>
                      </div>
                    </ng-container>
                  </article>
                </div>
              </section>
            </div>
          </div>
        </main>
      </div>
    </div>
  `,
  styles: [`
    :host {
      --surface: #F2F2F2; --line: #DCDCDF; --text: #0F1115; --text-muted: #6B6F77;
      --accent-blue: #CFE3F5; --accent-blue-deep: #7DA8CF; --accent-blue-text: #1a3a52;
      --ink: #0A0A0B; --success: #2F7A47; --gold: #C79A3A;
      --font-body: 'Inter', system-ui, sans-serif;
      --font-display: 'Cormorant Garamond', Georgia, serif;
      --font-mono: ui-monospace, 'SF Mono', Menlo, monospace;
      display: block; background: var(--surface);
    }
    :host *:focus-visible { outline: 2px solid #1a3a52; outline-offset: 2px; border-radius: 6px; }

    .pw-shell { display: flex; min-height: 100dvh; background: var(--surface); }
    app-prov-web-sidebar { position: sticky; top: 0; height: 100dvh; }
    .pw-main { flex: 1; min-width: 0; display: flex; flex-direction: column; }
    app-prov-web-topbar { position: sticky; top: 0; z-index: 5; }
    .pw-content { flex: 1; padding: 0 0 40px; }
    .pw-pad { padding: 20px 28px 28px; }

    .pw-header { position: relative; display: flex; justify-content: space-between; gap: 16px; padding: 24px 28px 4px; }
    .pw-header-text { flex: 1; min-width: 0; }
    .pw-header-centered { text-align: center; }
    .pw-title { margin: 0; font-family: var(--font-display); font-size: 2rem; font-weight: 500; line-height: 1.15; }
    .pw-sub { font-size: 0.8125rem; color: var(--text-muted); margin-top: 6px; }
    .pw-header-actions { position: absolute; top: 24px; right: 28px; display: flex; gap: 8px; }

    .wbtn { height: 40px; padding: 0 16px; border-radius: 10px; cursor: pointer; font-family: var(--font-body); font-size: 0.8125rem; font-weight: 600; display: inline-flex; align-items: center; justify-content: center; gap: 6px; border: 1px solid transparent; white-space: nowrap; }
    .wbtn.sm { height: 32px; padding: 0 12px; font-size: 0.75rem; }
    .wbtn:disabled { opacity: 0.5; cursor: not-allowed; }
    .wbtn-secondary { background: #fff; color: var(--text); border-color: var(--line); }
    .wbtn-secondary:hover:not(:disabled) { border-color: var(--accent-blue-deep); }
    .wbtn-ink { background: var(--ink); color: #fff; border-color: var(--ink); }
    .wbtn-ink:hover:not(:disabled) { background: #1F1F22; }
    .link-btn { background: none; border: none; padding: 0; cursor: pointer; font: inherit; font-size: 0.75rem; font-weight: 700; color: var(--accent-blue-text); }
    .link-btn:hover { text-decoration: underline; }

    .web-card { background: #fff; border: 1px solid var(--line); border-radius: 14px; }
    .mono { font-family: var(--font-mono); }

    .prof-grid { display: grid; grid-template-columns: 320px minmax(0, 1fr); gap: 20px; align-items: start; }
    .prof-right { display: flex; flex-direction: column; gap: 20px; }

    /* Identity */
    .ident-card { padding: 22px 20px; text-align: center; }
    .avatar { width: 64px; height: 64px; border-radius: 50%; margin: 0 auto 12px; background: linear-gradient(135deg, #BFD8EE, #7DA8CF); display: grid; place-items: center; font-family: var(--font-display); font-size: 26px; color: #1a3a52; }
    .biz-name { font-family: var(--font-display); font-size: 1.5rem; font-weight: 500; }
    .biz-email { font-size: 0.6875rem; color: var(--text-muted); margin-top: 2px; }
    .status-line { display: inline-flex; align-items: center; gap: 5px; margin-top: 8px; font-size: 0.6875rem; font-weight: 700; color: var(--success); }
    .green-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--success); }
    .ident-fields { margin: 18px 0 16px; padding: 0; text-align: left; display: flex; flex-direction: column; gap: 12px; }
    .ident-fields dt { font-size: 0.625rem; font-weight: 700; letter-spacing: 0.8px; text-transform: uppercase; color: var(--text-muted); }
    .ident-fields dd { margin: 2px 0 0; font-size: 0.8125rem; color: var(--text); }
    .ident-actions { display: flex; flex-direction: column; gap: 8px; }
    .ident-actions .wbtn { width: 100%; }
    .note { margin-top: 10px; font-size: 0.6875rem; color: var(--text-muted); }

    /* Cards shared head */
    .card-head { display: flex; align-items: center; justify-content: space-between; padding: 16px 18px 12px; border-bottom: 1px solid var(--line); }
    .card-title { margin: 0; font-family: var(--font-display); font-size: 1.25rem; font-weight: 500; }

    /* Earnings */
    .earn-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; padding: 16px 18px; }
    .kpi-label { font-size: 0.625rem; font-weight: 700; letter-spacing: 0.8px; text-transform: uppercase; color: var(--text-muted); }
    .kpi-val { font-family: var(--font-display); font-size: 1.5rem; font-weight: 500; margin-top: 4px; }

    /* Reviews */
    .rev-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; padding: 16px 18px 12px; }
    .rev-sub { font-size: 0.75rem; color: var(--text-muted); margin-top: 4px; }
    .rev-big { text-align: right; white-space: nowrap; }
    .rev-big-num { font-family: var(--font-display); font-size: 2rem; font-weight: 500; }
    .rev-big-stars { color: var(--gold); margin-left: 6px; letter-spacing: 1px; }
    .rev-breakdown { padding: 4px 18px 14px; border-bottom: 1px solid var(--line); display: flex; flex-direction: column; gap: 5px; }
    .bd-row { display: flex; align-items: center; gap: 8px; }
    .bd-star { width: 10px; font-size: 0.6875rem; color: var(--text-muted); font-family: var(--font-mono); }
    .bd-track { flex: 1; height: 6px; background: var(--surface); border-radius: 3px; overflow: hidden; }
    .bd-fill { display: block; height: 100%; background: var(--gold); border-radius: 3px; }
    .bd-pct { width: 34px; text-align: right; font-size: 0.6875rem; color: var(--text-muted); font-family: var(--font-mono); }

    .rev-list { padding: 4px 18px 8px; }
    .rev-item { padding: 14px 0; border-bottom: 1px solid var(--surface); }
    .rev-item:last-child { border-bottom: none; }
    .rev-item-top { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .rev-name { font-weight: 700; font-size: 0.8125rem; }
    .rev-svc { font-size: 0.5625rem; font-weight: 700; letter-spacing: 0.8px; text-transform: uppercase; color: var(--accent-blue-deep); }
    .rev-stars { color: var(--gold); font-size: 0.75rem; letter-spacing: 1px; }
    .rev-ago { margin-left: auto; font-size: 0.6875rem; color: var(--text-muted); font-family: var(--font-mono); }
    .rev-body { margin: 6px 0 0; font-size: 0.8125rem; line-height: 1.5; color: var(--text); }
    .reply-block { margin-top: 10px; background: var(--surface); border-radius: 10px; padding: 10px 12px; }
    .reply-head { font-size: 0.625rem; font-weight: 700; letter-spacing: 0.6px; text-transform: uppercase; color: var(--text-muted); }
    .reply-body { margin: 4px 0 0; font-size: 0.8125rem; color: var(--text); line-height: 1.45; }
    .reply-edit { margin-top: 10px; }
    .reply-input { width: 100%; box-sizing: border-box; border: 1px solid var(--line); border-radius: 10px; padding: 10px 12px; font-family: var(--font-body); font-size: 0.8125rem; resize: vertical; }
    .reply-actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 8px; }

    @media screen and (max-width: 960px) {
      .prof-grid { grid-template-columns: 1fr; }
      .earn-grid { grid-template-columns: repeat(2, 1fr); }
    }
    @media screen and (max-width: 720px) {
      app-prov-web-sidebar { display: none; }
      .pw-header { flex-direction: column; padding: 16px; }
      .pw-header-actions { position: static; }
      .pw-pad { padding: 16px; }
    }
  `],
})
export class BeautyBusinessProfileComponent {
  @Input() data: Record<string, unknown> = {};
  @Input() links: Record<string, BffLink> = {};
  @Output() followLink = new EventEmitter<BffLink>();

  openReplyId: number | null = null;
  replyDraft = '';
  replyBusy = false;
  note = '';

  constructor(private authService: BeautyAuthService) {}

  get business(): { email?: string; business_name?: string } | null {
    return (this.data['business'] as { email?: string; business_name?: string }) || null;
  }
  get identity(): IdentityPayload { return (this.data['identity'] as IdentityPayload) || {}; }
  get earnings(): EarningsPayload { return (this.data['earnings'] as EarningsPayload) || {}; }
  get reviews(): ReviewsPayload {
    return (this.data['reviews'] as ReviewsPayload) || { average: null, count: 0, new_this_week: 0, breakdown: [], items: [] };
  }
  get navBadges(): Partial<Record<ProvWebNav, number>> {
    const b = (this.data['badges'] as { messages_unread?: number; bookings_unread?: number }) || {};
    return { bookings: b.bookings_unread || 0, messages: b.messages_unread || 0 };
  }

  get initial(): string { return (this.business?.business_name || '·').trim()[0]?.toUpperCase() || '·'; }
  get totalDollars(): string { return this.fmt(this.earnings.total_dollars, this.earnings.total_cents); }
  get monthDollars(): string { return this.fmt(this.earnings.this_month_dollars, this.earnings.this_month_cents); }
  get yearDollars(): string { return this.fmt(this.earnings.this_year_dollars, this.earnings.this_year_cents); }
  get avgLabel(): string { return this.reviews.average != null ? this.reviews.average.toFixed(2) : '—'; }
  get roundedAvg(): number { return Math.round(this.reviews.average || 0); }

  stars(n: number): string { return '★★★★★'.slice(0, Math.max(0, Math.min(5, n))); }
  pct(count: number): number {
    const tot = this.reviews.count || 0;
    return tot ? Math.round((count / tot) * 100) : 0;
  }
  ago(iso: string): string {
    const then = new Date(iso).getTime();
    if (isNaN(then)) return '';
    const days = Math.floor((Date.now() - then) / 86400000);
    if (days <= 0) return 'today';
    if (days < 7) return `${days}d ago`;
    if (days < 30) return `${Math.floor(days / 7)}w ago`;
    if (days < 365) return `${Math.floor(days / 30)}mo ago`;
    return `${Math.floor(days / 365)}y ago`;
  }

  private fmt(dollars?: string, cents?: number): string {
    const v = dollars ? parseFloat(dollars) : (cents || 0) / 100;
    return v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  emit(link: BffLink | null | undefined): void { if (link) this.followLink.emit(link); }
  comingSoon(): void { this.note = 'Profile editing & payouts are coming soon.'; }

  openReply(r: ReviewItem): void { this.openReplyId = r.id; this.replyDraft = ''; }
  cancelReply(): void { this.openReplyId = null; this.replyDraft = ''; }

  sendReply(r: ReviewItem): void {
    const link = r._links?.reply;
    const text = this.replyDraft.trim();
    if (!link || !text || this.replyBusy) return;
    this.replyBusy = true;
    this.authService.follow(link, { reply: text }).subscribe({
      next: () => {
        r.business_reply = text;
        r.business_reply_at = new Date().toISOString();
        this.replyBusy = false;
        this.openReplyId = null;
        this.replyDraft = '';
      },
      error: () => { this.replyBusy = false; this.note = 'Could not post reply. Try again.'; },
    });
  }
}
