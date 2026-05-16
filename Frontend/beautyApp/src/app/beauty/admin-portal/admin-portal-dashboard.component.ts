/**
 * AdminPortalDashboardComponent — `/admin/portal/dashboard`
 *
 * Light-body dashboard with slate chrome (top header + tab bar). KPI 2x2 grid,
 * trend sparkline, two-up mini-bars, quick-link tiles, activity feed.
 *
 * Data still mostly static; counts that exist in the DB (customers, providers,
 * bookings, GMV) are filled by the resolver. Activity feed wires to
 * `BeautyAdminAuditEvent` once that model ships.
 */

import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

import { BffLink } from '../beauty-bff.types';
import {
  AdmStatusBarComponent,
  AdmHomeIndicatorComponent,
  AdmTopHeaderComponent,
  AdmTabBarComponent,
  AdmCardComponent,
  AdmSectionTitleComponent,
} from './atoms';

interface KpiTile { label: string; value: string; delta: string; tone: 'up' | 'down' | 'flat'; }
interface ActivityRow { color: string; title: string; meta: string; time: string; }
interface QuickLink { color: string; label: string; sub: string; badge?: number | null; screen?: string; }

@Component({
  selector: 'app-admin-portal-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    AdmStatusBarComponent,
    AdmHomeIndicatorComponent,
    AdmTopHeaderComponent,
    AdmTabBarComponent,
    AdmCardComponent,
    AdmSectionTitleComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="adm-app is-light adm-dash">
      <adm-status-bar tone="slate"></adm-status-bar>
      <adm-top-header [notifCount]="notifCount"></adm-top-header>

      <!-- session bar -->
      <div class="session" role="status">
        <span class="left">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/><path d="M12 7v5l3 2"/>
          </svg>
          Session ends in <span class="mono">14:32</span>
        </span>
        <a href="#" (click)="$event.preventDefault()">Extend</a>
      </div>

      <main class="body adm-body--scroll" role="main">
        <!-- Greeting -->
        <div class="greet">
          <div class="adm-eyebrow on-light">{{ todayLabel }} · Overview</div>
          <h1 class="adm-display gtitle">Good morning, {{ firstName }}</h1>
          <div class="gsub">{{ newSignups }} new signups overnight · {{ flagged }} flagged accounts need review</div>
        </div>

        <!-- KPI 2x2 -->
        <div class="kpi-grid">
          <div class="kpi-tile" *ngFor="let k of kpis">
            <div class="lbl">{{ k.label }}</div>
            <div class="val">{{ k.value }}</div>
            <div class="delta" [class.up]="k.tone === 'up'" [class.down]="k.tone === 'down'">
              {{ k.tone === 'up' ? '▲' : (k.tone === 'down' ? '▼' : '·') }} {{ k.delta }}
            </div>
          </div>
        </div>

        <!-- Trend card -->
        <adm-card>
          <div class="trend-head">
            <div>
              <div class="adm-eyebrow on-light">Signups · last 12 weeks</div>
              <div class="trend-val adm-display">+1,948</div>
            </div>
            <div class="range">
              <span class="r is-on">12W</span>
              <span class="r">30D</span>
              <span class="r">YTD</span>
            </div>
          </div>
          <svg class="spark" viewBox="0 0 320 60" preserveAspectRatio="none">
            <polyline fill="none" stroke="#7DA8CF" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" [attr.points]="sparkPoints"/>
            <polyline fill="rgba(125,168,207,0.16)" stroke="none" [attr.points]="sparkFillPoints"/>
          </svg>
          <div class="spark-axis">
            <span>Feb 12</span><span>Mar 12</span><span>Apr 9</span><span>May 6</span>
          </div>
        </adm-card>

        <!-- two-up mini bars -->
        <div class="two-up">
          <adm-card [padding]="12">
            <div class="adm-eyebrow on-light">Bookings · 7d</div>
            <div class="bars">
              <span *ngFor="let v of bookingsBars; let last = last" class="bar" [style.height.%]="(v / bookingsMax) * 100" [style.background]="'#0F1115'" [style.opacity]="last ? 1 : 0.55"></span>
            </div>
            <div class="bars-foot adm-mono"><span class="strong">826</span> · +5.1%</div>
          </adm-card>
          <adm-card [padding]="12">
            <div class="adm-eyebrow on-light">GMV · 7d</div>
            <div class="bars">
              <span *ngFor="let v of gmvBars; let last = last" class="bar" [style.height.%]="(v / gmvMax) * 100" [style.background]="'#7DA8CF'" [style.opacity]="last ? 1 : 0.55"></span>
            </div>
            <div class="bars-foot adm-mono"><span class="strong">$42.1k</span> · +9.4%</div>
          </adm-card>
        </div>

        <!-- Quick admin -->
        <div class="adm-eyebrow on-light qa-head">Quick admin</div>
        <div class="ql-grid">
          <button *ngFor="let q of quickLinks" type="button" class="ql" (click)="onQuick(q)">
            <div class="ql-icon" [style.background]="q.color + '14'" [style.color]="q.color">
              <ng-container [ngSwitch]="q.label">
                <svg *ngSwitchCase="'Customer & provider CRM'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3.5"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="17.5" cy="9.5" r="2.5"/><path d="M14.5 18.5c.4-2.4 2.4-4 5-4"/></svg>
                <svg *ngSwitchCase="'All bookings'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2.5"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>
                <svg *ngSwitchCase="'Support tickets'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4V8z"/></svg>
                <svg *ngSwitchCase="'Admin team'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="9" r="3"/><circle cx="17" cy="9" r="3"/><path d="M2 19c0-2.8 2.7-5 6-5s6 2.2 6 5M14 19c0-2.4 2-4.5 4.5-5"/></svg>
              </ng-container>
            </div>
            <div class="ql-label">{{ q.label }}</div>
            <div class="ql-sub">{{ q.sub }}</div>
            <span class="ql-badge" *ngIf="q.badge">{{ q.badge }}</span>
          </button>
        </div>

        <!-- Activity feed -->
        <adm-card>
          <adm-section-title sub="Audit log · last 24h">
            Activity
            <a slot="action" class="view-all" href="#" (click)="onViewAllActivity($event)">View all →</a>
          </adm-section-title>

          <div *ngFor="let a of activity" class="act-row">
            <div class="act-icon" [style.background]="a.color + '1A'" [style.color]="a.color">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"/>
              </svg>
            </div>
            <div class="act-body">
              <div class="act-title" [innerHTML]="a.title"></div>
              <div class="act-meta adm-mono">{{ a.meta }}</div>
            </div>
            <div class="act-time adm-mono">{{ a.time }}</div>
          </div>
        </adm-card>
      </main>

      <adm-tab-bar active="home" [badges]="tabBadges" (select)="onTab($event)"></adm-tab-bar>
      <adm-home-indicator tone="slate"></adm-home-indicator>
    </div>
  `,
  styles: [`
    :host { display: block; min-height: 100dvh; background: var(--surface); }
    .adm-dash { min-height: 100dvh; }

    .session { display: flex; align-items: center; justify-content: space-between; background: #FFF4DA; border-bottom: 1px solid rgba(165,122,31,0.18); padding: 6px 14px; font-size: 11px; color: #8A6A1F; flex-shrink: 0; }
    .session .left { display: inline-flex; align-items: center; gap: 6px; }
    .session .mono { font-family: var(--adm-font-mono); font-weight: 700; }
    .session a { color: #8A6A1F; text-decoration: underline; text-underline-offset: 2px; font-weight: 600; }

    .body { padding: 14px 14px 24px; }

    .greet { margin-bottom: 14px; }
    .greet .gtitle { margin: 4px 0 4px; font-size: 26px; color: var(--text); }
    .greet .gsub { font-size: 12px; color: var(--text-muted); }

    .kpi-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 12px; }
    .kpi-tile { background: #fff; border: 1px solid var(--line); border-radius: 14px; padding: 12px; min-width: 0; }
    .kpi-tile .lbl { font-family: var(--adm-font-body); font-size: 9px; font-weight: 700; letter-spacing: 1.4px; text-transform: uppercase; color: var(--text-muted); margin-bottom: 6px; }
    .kpi-tile .val { font-family: var(--adm-font-mono); font-size: 22px; font-weight: 600; color: var(--text); line-height: 1; margin-bottom: 4px; letter-spacing: -0.2px; }
    .kpi-tile .delta { font-size: 10px; font-family: var(--adm-font-mono); font-weight: 600; }
    .kpi-tile .delta.up { color: var(--adm-green); }
    .kpi-tile .delta.down { color: #C0392B; }

    adm-card { display: block; margin-bottom: 12px; }
    .trend-head { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 10px; }
    .trend-val { font-size: 22px; font-weight: 500; color: var(--text); line-height: 1; margin-top: 4px; }
    .range { display: flex; gap: 4px; }
    .range .r { font-size: 9px; font-weight: 700; padding: 3px 7px; border: 1px solid var(--line); border-radius: 999px; color: var(--text-muted); background: #fff; }
    .range .r.is-on { background: #0F1115; color: #fff; border-color: #0F1115; }
    .spark { width: 100%; height: 60px; display: block; }
    .spark-axis { display: flex; justify-content: space-between; margin-top: 6px; font-family: var(--adm-font-mono); font-size: 9px; color: var(--text-muted); }

    .two-up { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 12px; }
    .two-up adm-card { margin-bottom: 0; }
    .bars { display: flex; align-items: flex-end; gap: 4px; height: 60px; margin-top: 8px; }
    .bar { flex: 1; border-radius: 2px; min-height: 4px; }
    .bars-foot { font-size: 11px; color: var(--text-muted); margin-top: 6px; }
    .bars-foot .strong { color: var(--text); font-weight: 600; }

    .qa-head { margin-bottom: 8px; }
    .ql-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 8px; }
    .ql { display: flex; flex-direction: column; align-items: flex-start; gap: 6px; padding: 12px; background: #fff; border: 1px solid var(--line); border-radius: 12px; cursor: pointer; position: relative; text-align: left; font-family: var(--adm-font-body); min-width: 0; }
    .ql-icon { width: 30px; height: 30px; border-radius: 8px; display: grid; place-items: center; flex-shrink: 0; }
    .ql-label { font-size: 13px; font-weight: 600; color: var(--text); }
    .ql-sub { font-size: 10.5px; color: var(--text-muted); }
    .ql-badge { position: absolute; top: 10px; right: 10px; min-width: 18px; height: 18px; padding: 0 5px; border-radius: 999px; background: var(--adm-red); color: #fff; font-size: 10px; font-weight: 700; line-height: 18px; text-align: center; }

    .view-all { font-size: 11px; color: var(--accent-blue-deep); font-weight: 600; text-decoration: none; }

    .act-row { display: flex; align-items: flex-start; gap: 10px; padding: 10px 0; border-top: 1px solid #ECECEE; }
    .act-row:first-of-type { border-top: none; }
    .act-icon { width: 28px; height: 28px; border-radius: 8px; flex-shrink: 0; display: grid; place-items: center; }
    .act-body { flex: 1; min-width: 0; }
    .act-title { font-size: 12.5px; color: var(--text); line-height: 1.4; }
    .act-meta { font-size: 10px; color: var(--text-muted); margin-top: 2px; }
    .act-time { font-size: 10px; color: var(--text-muted); flex-shrink: 0; }
  `],
})
export class AdminPortalDashboardComponent {
  @Input() data: Record<string, unknown> = {};
  @Input() links: Record<string, BffLink> = {};
  @Output() followLink = new EventEmitter<BffLink>();

  get todayLabel(): string {
    return (this.data['today_label'] as string) ?? 'Tue, May 6';
  }
  get firstName(): string {
    return (this.data['first_name'] as string) ?? 'Maria';
  }
  get newSignups(): number {
    return (this.data['new_signups'] as number) ?? 12;
  }
  get flagged(): number {
    return (this.data['flagged'] as number) ?? 3;
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
    return (this.data['activity'] as ActivityRow[]) ?? [
      { color: '#C0392B', title: '<b>Maria R.</b> suspended provider <b>Glow Studio NYC</b> (3 refund disputes)', meta: 'ID prov_8f2a · reason: Repeated chargebacks', time: '14m' },
      { color: '#2F7A47', title: '<b>Daniel K.</b> verified business <b>Studio Six Brooklyn</b>',                meta: 'ID prov_4c91 · License #NY-CMT-2024-3318',    time: '42m' },
      { color: '#7DA8CF', title: 'Ticket <b>#3082</b> assigned to <b>Priya S.</b> · refund request',             meta: 'Customer cust_78a · $145.00 · Booking #BK-91204', time: '1h' },
      { color: '#8A6A1F', title: '4 new signups flagged for manual review',                                      meta: 'Risk score ≥ 70 · disposable email domain',   time: '3h' },
      { color: '#6B6F77', title: '<b>Priya S.</b> impersonated customer <b>Anika P.</b> for 4m 12s',             meta: 'Audit: ticket #3071 · session expired',       time: '5h' },
    ];
  }

  // Static sparkline points for visual fidelity.
  readonly sparkPoints = '0,52 29,42 58,46 87,30 116,34 145,22 174,18 203,24 232,12 261,16 290,8 320,4';
  readonly sparkFillPoints = `0,60 ${this.sparkPoints} 320,60`;

  readonly bookingsBars = [12, 18, 14, 22, 19, 26, 30];
  readonly bookingsMax = 30;
  readonly gmvBars = [14, 16, 18, 15, 22, 24, 28];
  readonly gmvMax = 28;

  onQuick(q: QuickLink): void {
    if (!q.screen) return;
    const link = this.links[q.screen];
    if (link) this.followLink.emit(link);
  }

  onTab(kind: string): void {
    const link = this.links[kind === 'home' ? 'self' : kind];
    if (link) this.followLink.emit(link);
  }

  get tabBadges(): Record<string, number | string | null> {
    return (this.data['tab_badges'] as Record<string, number | string | null>) ?? {};
  }

  onViewAllActivity(ev: Event): void {
    ev.preventDefault();
    const link = this.links['view_all'] || this.links['audit'];
    if (link) this.followLink.emit(link);
  }
}
