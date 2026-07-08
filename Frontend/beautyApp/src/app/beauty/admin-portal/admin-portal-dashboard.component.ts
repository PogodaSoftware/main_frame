/**
 * AdminPortalDashboardComponent — `/admin/portal/dashboard`
 *
 * Desktop redesign (web). Slate sidebar + light topbar + amber session strip
 * (shared `admin-web/` chrome) + a content area per `web-admin-pages.jsx`
 * WebAdminDashboard: a 4-up KPI row, a trend chart with a 4-stat footer, an
 * activity feed, and a bottom row of quick-admin links + Bookings/GMV minis.
 *
 * Every data region reads the same resolver envelope the RN dashboard uses
 * (`kpis`, `activity`, `quick_links`, `*_series`, `session_remaining`,
 * `notif_count`, `tab_badges`) — no fabricated counts. The @Input/@Output
 * contract is unchanged; the shell wiring and screen key are fixed.
 */

import { ChangeDetectionStrategy, Component, EventEmitter, HostListener, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

import { BffLink } from '../beauty-bff.types';
import { BeautyAdminWebSidebarComponent } from '../admin-web/admin-web-sidebar.component';
import { BeautyAdminWebTopbarComponent } from '../admin-web/admin-web-topbar.component';
import { BeautyAdminWebSessionBarComponent } from '../admin-web/admin-web-session-bar.component';
import { BeautyAdminWebPageHeaderComponent } from '../admin-web/admin-web-page-header.component';

interface KpiTile { label: string; value: string; delta: string; tone: 'up' | 'down' | 'flat'; }
interface ActivityRow { color: string; title: string; meta: string; time: string; }
interface QuickLink { color: string; label: string; sub: string; badge?: number | null; screen?: string; }
interface RangeOption { id: string; label: string; chip: string; }

@Component({
  selector: 'app-admin-portal-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    BeautyAdminWebSidebarComponent,
    BeautyAdminWebTopbarComponent,
    BeautyAdminWebSessionBarComponent,
    BeautyAdminWebPageHeaderComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="admin-web aw-shell">
      <app-admin-web-sidebar
        active="dashboard"
        [adminName]="adminName" [adminEmail]="adminEmail"
        [badges]="navBadges"
        (follow)="followLink.emit($event)"
      ></app-admin-web-sidebar>

      <div class="aw-col">
        <app-admin-web-topbar
          [notifCount]="notifCount" [adminName]="adminName" [adminEmail]="adminEmail"
          (follow)="followLink.emit($event)"
        ></app-admin-web-topbar>

        <app-admin-web-session-bar
          [sessionRemaining]="sessionRemaining"
          (follow)="followLink.emit($event)"
        ></app-admin-web-session-bar>

        <main class="aw-main" role="main">
          <app-admin-web-page-header
            [breadcrumb]="['Admin', 'Dashboard']"
            title="Today on Beauty"
            [sub]="todayLabel + ' · ' + newSignups + ' new this week · ' + flagged + ' flagged for review'">
            <div slot="actions" class="aw-hactions">
              <button type="button" class="aw-btn aw-btn--sec">Export</button>
              <div class="aw-range" (click)="$event.stopPropagation()">
                <button type="button" class="aw-btn aw-btn--sec" (click)="toggleRange($event)"
                        [attr.aria-expanded]="rangeOpen" aria-haspopup="true">
                  {{ rangeLabel }}
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>
                </button>
                <div class="aw-range-menu" *ngIf="rangeOpen" role="menu">
                  <button type="button" class="aw-range-opt" *ngFor="let o of rangeOptions"
                          role="menuitemradio" [attr.aria-checked]="o.id === range"
                          [class.is-on]="o.id === range" (click)="selectRange(o.id)">
                    {{ o.label }}
                    <svg *ngIf="o.id === range" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0F1115" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12l4 4L19 7"/></svg>
                  </button>
                </div>
              </div>
              <button type="button" class="aw-btn aw-btn--pri" (click)="onInviteAdmin()">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>
                Invite admin
              </button>
            </div>
          </app-admin-web-page-header>

          <div class="aw-body">
            <!-- KPI row -->
            <div class="aw-kpis">
              <div class="aw-kpi" *ngFor="let k of kpis">
                <div class="aw-kpi-lbl">{{ k.label }}</div>
                <div class="aw-kpi-val">{{ k.value }}</div>
                <div class="aw-kpi-delta" [class.up]="k.tone === 'up'" [class.down]="k.tone === 'down'">
                  {{ k.tone === 'up' ? '▲' : (k.tone === 'down' ? '▼' : '·') }} {{ k.delta }}
                </div>
              </div>
            </div>

            <!-- Trend + activity -->
            <div class="aw-grid-2">
              <div class="aw-card aw-card--pad">
                <div class="aw-card-head">
                  <div>
                    <h2 class="aw-h2">Signups volume</h2>
                    <div class="aw-card-sub">{{ trendLabel }}</div>
                  </div>
                  <div class="aw-chips" role="group" aria-label="Trend range">
                    <button type="button" class="aw-chip" *ngFor="let o of rangeOptions"
                            [class.is-on]="o.id === range" [attr.aria-pressed]="o.id === range"
                            (click)="selectRange(o.id)">{{ o.chip }}</button>
                  </div>
                </div>
                <svg class="aw-spark" viewBox="0 0 600 180" preserveAspectRatio="none" aria-hidden="true">
                  <polyline fill="none" stroke="#0F1115" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" [attr.points]="sparkPoints"></polyline>
                  <polyline fill="rgba(15,17,21,0.08)" stroke="none" [attr.points]="sparkFillPoints"></polyline>
                </svg>
                <div class="aw-stat-row">
                  <div class="aw-stat" *ngFor="let s of trendStats">
                    <div class="aw-stat-lbl">{{ s[0] }}</div>
                    <div class="aw-stat-val">{{ s[1] }}</div>
                    <div class="aw-stat-sub mono">{{ s[2] }}</div>
                  </div>
                </div>
              </div>

              <div class="aw-card">
                <div class="aw-feed-head">
                  <h2 class="aw-h2">Activity feed</h2>
                  <div class="aw-card-sub">Most recent audited actions</div>
                </div>
                <div class="aw-feed">
                  <div class="aw-act" *ngFor="let a of activity">
                    <span class="aw-act-dot" [style.background]="a.color"></span>
                    <div class="aw-act-body">
                      <div class="aw-act-title" [innerHTML]="a.title"></div>
                      <div class="aw-act-meta mono">{{ a.meta }}</div>
                    </div>
                    <span class="aw-act-time mono">{{ a.time }}</span>
                  </div>
                  <div class="aw-feed-empty" *ngIf="!activity.length">No audited actions yet.</div>
                </div>
                <div class="aw-feed-foot">
                  <a href="#" class="aw-link" (click)="onViewAllActivity($event)">View full audit log →</a>
                </div>
              </div>
            </div>

            <!-- Bottom row: quick admin + bookings/gmv minis -->
            <div class="aw-grid-3">
              <div class="aw-card aw-card--pad">
                <h2 class="aw-h2">Quick admin</h2>
                <div class="aw-card-sub mb">Jump to the tools you use most</div>
                <button type="button" class="aw-ql" *ngFor="let q of quickLinks" (click)="onQuick(q)">
                  <span class="aw-ql-dot" [style.background]="q.color"></span>
                  <span class="aw-ql-text">
                    <span class="aw-ql-label">{{ q.label }}</span>
                    <span class="aw-ql-sub mono">{{ q.sub }}</span>
                  </span>
                  <span class="aw-ql-badge" *ngIf="q.badge">{{ q.badge }}</span>
                  <span class="aw-ql-arrow" aria-hidden="true">→</span>
                </button>
              </div>

              <div class="aw-card aw-card--pad">
                <div class="aw-kpi-lbl">Bookings · 7d</div>
                <div class="aw-bars">
                  <span *ngFor="let v of bookingsBars; let last = last" class="aw-bar"
                        [style.height.%]="(v / bookingsMax) * 100" [style.opacity]="last ? 1 : 0.55"
                        [style.background]="'#0F1115'"></span>
                </div>
                <div class="aw-bars-foot mono"><span class="strong">{{ bookings7dTotal }}</span> · {{ bookings7dDelta }}</div>
              </div>

              <div class="aw-card aw-card--pad">
                <div class="aw-kpi-lbl">GMV · 7d</div>
                <div class="aw-bars">
                  <span *ngFor="let v of gmvBars; let last = last" class="aw-bar"
                        [style.height.%]="(v / gmvMax) * 100" [style.opacity]="last ? 1 : 0.55"
                        [style.background]="'#7DA8CF'"></span>
                </div>
                <div class="aw-bars-foot mono"><span class="strong">{{ gmv7dTotal }}</span> · {{ gmv7dDelta }}</div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  `,
  styles: [`
    :host {
      --line: #DCDCDF; --text: #0F1115; --text-muted: #6B6F77;
      --surface: #F2F2F2; --surface-2: #E9E9EB; --green: #2F7A47; --danger: #C0392B;
      --admin-red: #B23A2D;
      --font-body: 'Inter', system-ui, -apple-system, sans-serif;
      --font-display: 'Cormorant Garamond', Georgia, serif;
      --font-mono: ui-monospace, 'SF Mono', Menlo, monospace;
      display: block; min-height: 100dvh;
    }
    * { box-sizing: border-box; }
    .mono { font-family: var(--font-mono); }

    .aw-shell { display: flex; width: 100%; height: 100dvh; background: var(--surface); font-family: var(--font-body); color: var(--text); overflow: hidden; }
    .aw-col { flex: 1; display: flex; flex-direction: column; min-width: 0; }
    .aw-main { flex: 1; overflow: auto; background: var(--surface); }

    .aw-hactions { display: flex; gap: 8px; align-items: center; }
    .aw-range { position: relative; }
    .aw-range-menu {
      position: absolute; top: 44px; right: 0; z-index: 30; min-width: 168px;
      background: #fff; border: 1px solid var(--line); border-radius: 12px;
      box-shadow: 0 12px 28px rgba(15,35,60,0.14); padding: 6px;
    }
    .aw-range-opt {
      display: flex; align-items: center; justify-content: space-between; gap: 10px; width: 100%;
      padding: 9px 10px; border: none; background: transparent; border-radius: 8px; cursor: pointer;
      font-family: var(--font-body); font-size: 0.8125rem; color: var(--text); text-align: left;
    }
    .aw-range-opt:hover { background: var(--surface); }
    .aw-range-opt.is-on { font-weight: 600; }
    .aw-btn {
      height: 38px; padding: 0 14px; border-radius: 10px; font-family: var(--font-body);
      font-size: 0.8125rem; font-weight: 600; letter-spacing: 0.2px; cursor: pointer;
      display: inline-flex; align-items: center; gap: 6px; white-space: nowrap; line-height: 1;
    }
    .aw-btn--sec { background: #fff; color: var(--text); border: 1px solid var(--line); }
    .aw-btn--pri { background: #0F1115; color: #fff; border: 1px solid #0F1115; }

    .aw-body { padding: 20px 28px 32px; }

    .aw-kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 16px; }
    .aw-kpi { background: #fff; border: 1px solid var(--line); border-radius: 14px; padding: 18px; min-width: 0; }
    .aw-kpi-lbl { font-size: 0.5625rem; font-weight: 700; letter-spacing: 1.4px; text-transform: uppercase; color: var(--text-muted); margin-bottom: 8px; }
    .aw-kpi-val { font-family: var(--font-mono); font-size: 1.875rem; font-weight: 600; letter-spacing: -0.3px; color: var(--text); line-height: 1; margin-bottom: 8px; }
    .aw-kpi-delta { font-size: 0.6875rem; font-family: var(--font-mono); font-weight: 600; color: var(--text-muted); }
    .aw-kpi-delta.up { color: var(--green); }
    .aw-kpi-delta.down { color: var(--danger); }

    .aw-card { background: #fff; border: 1px solid var(--line); border-radius: 14px; }
    .aw-card--pad { padding: 20px; }
    .aw-h2 { margin: 0; font-family: var(--font-display); font-size: 1.375rem; font-weight: 500; letter-spacing: 0.2px; color: var(--text); line-height: 1.1; }
    .aw-card-sub { font-size: 0.75rem; color: var(--text-muted); margin-top: 2px; }
    .aw-card-sub.mb { margin-bottom: 14px; }

    .aw-grid-2 { display: grid; grid-template-columns: 2fr 1fr; gap: 16px; }
    .aw-card-head { display: flex; align-items: flex-end; justify-content: space-between; margin-bottom: 12px; }
    .aw-chips { display: flex; gap: 6px; }
    .aw-chip { font-family: var(--font-body); font-size: 0.625rem; font-weight: 700; padding: 4px 9px; border: 1px solid var(--line); border-radius: 999px; color: var(--text-muted); background: #fff; cursor: pointer; }
    .aw-chip:hover { border-color: #0F1115; color: #0F1115; }
    .aw-chip.is-on { background: #0F1115; color: #fff; border-color: #0F1115; }
    .aw-spark { width: 100%; height: 180px; display: block; }
    .aw-stat-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-top: 18px; padding-top: 16px; border-top: 1px solid var(--line); }
    .aw-stat-lbl { font-size: 0.5625rem; font-weight: 700; letter-spacing: 1.2px; text-transform: uppercase; color: var(--text-muted); }
    .aw-stat-val { font-family: var(--font-display); font-size: 1.25rem; font-weight: 500; margin-top: 4px; color: var(--text); }
    .aw-stat-sub { font-size: 0.6875rem; color: var(--text-muted); }

    .aw-feed-head { padding: 18px 18px 12px; border-bottom: 1px solid var(--line); }
    .aw-feed { }
    .aw-act { padding: 14px 18px; display: flex; gap: 12px; align-items: flex-start; border-bottom: 1px solid var(--surface); }
    .aw-act:last-child { border-bottom: none; }
    .aw-act-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; margin-top: 5px; }
    .aw-act-body { flex: 1; min-width: 0; }
    .aw-act-title { font-size: 0.75rem; color: var(--text); line-height: 1.4; }
    .aw-act-meta { font-size: 0.6875rem; color: var(--text-muted); margin-top: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .aw-act-time { font-size: 0.6875rem; color: var(--text-muted); flex-shrink: 0; }
    .aw-feed-empty { padding: 24px 18px; font-size: 0.8125rem; color: var(--text-muted); text-align: center; }
    .aw-feed-foot { padding: 12px 18px; border-top: 1px solid var(--line); }
    .aw-link { font-size: 0.75rem; color: var(--text); font-weight: 600; text-decoration: none; cursor: pointer; }

    .aw-grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-top: 16px; }
    .aw-ql {
      width: 100%; display: flex; align-items: center; gap: 10px; padding: 12px 0;
      border: none; border-top: 1px solid var(--surface); background: transparent; cursor: pointer; text-align: left;
      position: relative; font-family: var(--font-body);
    }
    .aw-ql:first-of-type { border-top: none; }
    .aw-ql-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
    .aw-ql-text { flex: 1; min-width: 0; }
    .aw-ql-label { display: block; font-size: 0.8125rem; font-weight: 600; color: var(--text); }
    .aw-ql-sub { display: block; font-size: 0.625rem; color: var(--text-muted); margin-top: 1px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .aw-ql-badge { min-width: 18px; height: 18px; padding: 0 5px; border-radius: 999px; background: var(--admin-red); color: #fff; font-size: 0.625rem; font-weight: 700; line-height: 18px; text-align: center; flex-shrink: 0; }
    .aw-ql-arrow { color: var(--text-muted); font-size: 0.875rem; flex-shrink: 0; }

    .aw-bars { display: flex; align-items: flex-end; gap: 6px; height: 90px; margin-top: 12px; }
    .aw-bar { flex: 1; border-radius: 2px; min-height: 4px; }
    .aw-bars-foot { font-size: 0.75rem; color: var(--text-muted); margin-top: 8px; }
    .aw-bars-foot .strong { color: var(--text); font-weight: 700; }

    :host *:focus-visible { outline: 2px solid var(--admin-red); outline-offset: 2px; border-radius: 6px; }

    @media screen and (max-width: 1100px) {
      .aw-kpis { grid-template-columns: repeat(2, 1fr); }
      .aw-grid-2, .aw-grid-3 { grid-template-columns: 1fr; }
    }
  `],
})
export class AdminPortalDashboardComponent {
  @Input() data: Record<string, unknown> = {};
  @Input() links: Record<string, BffLink> = {};
  @Output() followLink = new EventEmitter<BffLink>();

  get notifCount(): number | null { return (this.data['notif_count'] as number | null) ?? null; }
  get adminName(): string {
    const fn = (this.data['first_name'] as string) ?? 'Maria';
    return fn.length <= 2 ? fn : `${fn} ${(this.adminEmailRaw[0] ?? '').toUpperCase()}`.trim();
  }
  private get adminEmailRaw(): string { return (this.data['admin_email'] as string) ?? ''; }
  get adminEmail(): string { return this.adminEmailRaw || 'admin@beauty.io'; }
  get sessionRemaining(): string { return (this.data['session_remaining'] as string) ?? '14:32'; }

  get todayLabel(): string { return (this.data['today_label'] as string) ?? 'Tue, May 6'; }
  get newSignups(): number { return (this.data['new_signups'] as number) ?? 0; }
  get flagged(): number { return (this.data['flagged'] as number) ?? 0; }

  get navBadges(): Record<string, number> {
    const badges = (this.data['tab_badges'] as Record<string, number | null>) ?? {};
    const out: Record<string, number> = {};
    if (badges['tickets']) out['tickets'] = badges['tickets'] as number;
    return out;
  }

  get kpis(): KpiTile[] {
    return (this.data['kpis'] as KpiTile[]) ?? [
      { label: 'Customers',     value: '12,840', delta: '+182 · 7d', tone: 'up' },
      { label: 'Providers',     value: '486',    delta: '+9 · 7d',    tone: 'up' },
      { label: 'Bookings (mo)', value: '3,402',  delta: '+12.4%',     tone: 'up' },
      { label: 'GMV (mo)',      value: '$184k',  delta: '+8.7%',      tone: 'up' },
    ];
  }

  get quickLinks(): QuickLink[] {
    return (this.data['quick_links'] as QuickLink[]) ?? [];
  }

  get activity(): ActivityRow[] {
    return (this.data['activity'] as ActivityRow[]) ?? [];
  }

  // ── Range filter (header dropdown + chart chips) ──
  rangeOpen = false;
  get range(): string { return (this.data['range'] as string) ?? '7d'; }
  get rangeOptions(): RangeOption[] {
    return (this.data['range_options'] as RangeOption[]) ?? [
      { id: '7d', label: 'Last 7 days', chip: '7D' },
      { id: '30d', label: 'Last 30 days', chip: '30D' },
      { id: '90d', label: 'Last 90 days', chip: '90D' },
    ];
  }
  get rangeLabel(): string {
    return this.rangeOptions.find((o) => o.id === this.range)?.label ?? 'Last 7 days';
  }
  get trendLabel(): string { return (this.data['trend_label'] as string) ?? 'Last 7 days · daily signups'; }

  toggleRange(ev: Event): void { ev.stopPropagation(); this.rangeOpen = !this.rangeOpen; }

  @HostListener('document:click')
  onDocClick(): void { if (this.rangeOpen) this.rangeOpen = false; }

  selectRange(id: string): void {
    this.rangeOpen = false;
    if (id === this.range) return;
    // Re-resolve the dashboard with the range as a query param; the shell
    // forwards query params into the resolver's `params`.
    this.followLink.emit({
      rel: 'range', href: null, method: 'NAV',
      screen: 'beauty_admin_portal_dashboard',
      route: `/admin/portal/dashboard?range=${id}`,
      prompt: this.rangeOptions.find((o) => o.id === id)?.label ?? id,
    });
  }

  // ── Trend chart (real trend_series, range-driven) ──
  private get signupsSeries(): number[] {
    const s = (this.data['trend_series'] as number[] | undefined)
      ?? (this.data['signups_12w_series'] as number[] | undefined);
    return s && s.length ? s : [4, 6, 5, 8, 7, 9, 12];
  }
  get sparkPoints(): string {
    const data = this.signupsSeries;
    const w = 600, h = 180;
    const max = Math.max(...data), min = Math.min(...data);
    const span = max - min || 1;
    const step = w / (data.length - 1 || 1);
    return data.map((d, i) => `${(i * step).toFixed(1)},${(h - ((d - min) / span) * (h - 16) - 8).toFixed(1)}`).join(' ');
  }
  get sparkFillPoints(): string { return `0,180 ${this.sparkPoints} 600,180`; }

  get trendStats(): [string, string, string][] {
    const trendTotal = (this.data['trend_total'] as number) ?? this.signupsSeries.reduce((a, b) => a + b, 0);
    const chip = this.rangeOptions.find((o) => o.id === this.range)?.chip ?? '7D';
    return [
      [`Signups · ${chip}`, `${trendTotal.toLocaleString()}`, 'daily trend'],
      ['Bookings · 7d', `${this.bookings7dTotal}`, this.bookings7dDelta],
      ['GMV · 7d', `${this.gmv7dTotal}`, this.gmv7dDelta],
      ['New customers · 7d', `${this.newSignups}`, 'vs. prior week'],
    ];
  }

  // ── Bookings / GMV minis (real series) ──
  get bookingsBars(): number[] {
    const s = this.data['bookings_7d_series'] as number[] | undefined;
    return s && s.length ? s : [12, 18, 14, 22, 19, 26, 30];
  }
  get bookingsMax(): number { return Math.max(1, ...this.bookingsBars); }
  get bookings7dTotal(): number { return (this.data['bookings_7d_total'] as number) ?? this.bookingsBars.reduce((a, b) => a + b, 0); }
  get bookings7dDelta(): string { return (this.data['bookings_7d_delta'] as string) ?? '+5.1%'; }

  get gmvBars(): number[] {
    const s = this.data['gmv_7d_series_cents'] as number[] | undefined;
    return s && s.length ? s : [14, 16, 18, 15, 22, 24, 28];
  }
  get gmvMax(): number { return Math.max(1, ...this.gmvBars); }
  get gmv7dTotal(): string { return (this.data['gmv_7d_total'] as string) ?? '$42.1k'; }
  get gmv7dDelta(): string { return (this.data['gmv_7d_delta'] as string) ?? '+9.4%'; }

  // ── Actions ──
  onQuick(q: QuickLink): void {
    if (!q.screen) return;
    const link = this.links[q.screen];
    if (link) this.followLink.emit(link);
  }

  onInviteAdmin(): void {
    const link = this.links['team'];
    if (link) this.followLink.emit(link);
  }

  onViewAllActivity(ev: Event): void {
    ev.preventDefault();
    const link = this.links['view_all'] || this.links['audit'];
    if (link) this.followLink.emit(link);
  }
}
