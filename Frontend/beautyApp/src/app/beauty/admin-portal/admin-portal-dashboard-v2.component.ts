/**
 * AdminPortalDashboardV2Component — `/admin/portal/dashboard/v2`
 *
 * Variant 2: slate GMV hero + inline KPI list + Needs-Attention card.
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
} from './atoms';

interface KpiRow { label: string; value: string; delta: string; tone: 'up' | 'down'; }
interface AttentionRow { color: string; title: string; meta: string; time: string; }

@Component({
  selector: 'app-admin-portal-dashboard-v2',
  standalone: true,
  imports: [
    CommonModule,
    AdmStatusBarComponent,
    AdmHomeIndicatorComponent,
    AdmTopHeaderComponent,
    AdmTabBarComponent,
    AdmCardComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="adm-app is-light adm-dash2">
      <adm-status-bar tone="slate"></adm-status-bar>
      <adm-top-header [notifCount]="notifCount"></adm-top-header>

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
        <!-- slate hero -->
        <div class="hero">
          <div class="adm-eyebrow">Platform GMV · this month</div>
          <div class="gmv adm-display">{{ gmvWhole }}<span class="cents">{{ gmvCents }}</span></div>
          <div class="meta">
            <span class="up">▲ {{ momPct }} MoM</span>
            <span class="dim">Forecast {{ forecast }} · +12% YoY</span>
          </div>
          <svg class="spark" viewBox="0 0 320 56" preserveAspectRatio="none">
            <polyline fill="none" stroke="#7DA8CF" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" [attr.points]="sparkPoints"/>
            <polyline fill="rgba(125,168,207,0.16)" stroke="none" [attr.points]="sparkFillPoints"/>
          </svg>
        </div>

        <div class="content">
          <!-- inline KPI list -->
          <adm-card [padding]="0">
            <div *ngFor="let r of rows; let i = index" class="row" [class.first]="i === 0">
              <div class="lbl">{{ r.label }}</div>
              <div class="val adm-mono">{{ r.value }}</div>
              <div class="delta adm-mono" [class.up]="r.tone === 'up'" [class.down]="r.tone === 'down'">
                {{ r.tone === 'up' ? '▲' : '▼' }} {{ r.delta }}
              </div>
            </div>
          </adm-card>

          <div class="adm-eyebrow on-light section-head">Needs attention</div>
          <adm-card [padding]="0">
            <div *ngFor="let a of attention; let i = index" class="att" [class.first]="i === 0">
              <div class="att-icon" [style.background]="a.color + '1A'" [style.color]="a.color">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="10"/><path d="M12 7v5l3 2"/>
                </svg>
              </div>
              <div class="att-body">
                <div class="att-title" [innerHTML]="a.title"></div>
                <div class="att-meta adm-mono">{{ a.meta }}</div>
              </div>
              <div class="att-time adm-mono">{{ a.time }}</div>
            </div>
          </adm-card>
        </div>
      </main>

      <adm-tab-bar active="home" [badges]="tabBadges" (select)="onTab($event)"></adm-tab-bar>
      <adm-home-indicator tone="slate"></adm-home-indicator>
    </div>
  `,
  styles: [`
    :host { display: block; min-height: 100dvh; background: var(--surface); }
    .adm-dash2 { min-height: 100dvh; }

    .session { display: flex; align-items: center; justify-content: space-between; background: #FFF4DA; border-bottom: 1px solid rgba(165,122,31,0.18); padding: 6px 14px; font-size: 11px; color: #8A6A1F; flex-shrink: 0; }
    .session .left { display: inline-flex; align-items: center; gap: 6px; }
    .session .mono { font-family: var(--adm-font-mono); font-weight: 700; }
    .session a { color: #8A6A1F; text-decoration: underline; text-underline-offset: 2px; font-weight: 600; }

    .hero { background: var(--adm-slate); color: #fff; padding: 14px 16px 18px; }
    .hero .adm-eyebrow { color: var(--adm-slate-muted); margin-bottom: 4px; }
    .gmv { font-size: 38px; font-weight: 500; color: #fff; line-height: 1; letter-spacing: 0.2px; }
    .gmv .cents { font-size: 18px; color: var(--adm-slate-muted); }
    .meta { display: flex; gap: 14px; margin-top: 10px; font-size: 11px; }
    .meta .up { color: #86C49B; }
    .meta .dim { color: var(--adm-slate-muted); }
    .spark { width: 100%; height: 56px; display: block; margin-top: 14px; }

    .content { padding: 14px; }

    .row { display: flex; align-items: center; gap: 10px; padding: 12px 14px; border-top: 1px solid #ECECEE; }
    .row.first { border-top: none; }
    .row .lbl { flex: 1; font-size: 12px; color: var(--text-muted); }
    .row .val { font-size: 14px; font-weight: 600; color: var(--text); }
    .row .delta { width: 76px; text-align: right; font-size: 10px; font-weight: 600; }
    .row .delta.up { color: var(--adm-green); }
    .row .delta.down { color: #C0392B; }

    .section-head { margin: 16px 0 8px; }

    .att { display: flex; align-items: flex-start; gap: 10px; padding: 12px 14px; border-top: 1px solid #ECECEE; }
    .att.first { border-top: none; }
    .att-icon { width: 28px; height: 28px; border-radius: 8px; flex-shrink: 0; display: grid; place-items: center; }
    .att-body { flex: 1; min-width: 0; }
    .att-title { font-size: 12.5px; color: var(--text); line-height: 1.4; }
    .att-meta { font-size: 10px; color: var(--text-muted); margin-top: 2px; }
    .att-time { font-size: 10px; color: var(--text-muted); flex-shrink: 0; }
  `],
})
export class AdminPortalDashboardV2Component {
  @Input() data: Record<string, unknown> = {};
  @Input() links: Record<string, BffLink> = {};
  @Output() followLink = new EventEmitter<BffLink>();

  get gmvWhole(): string { return (this.data['gmv_whole'] as string) ?? '$184,219'; }
  get gmvCents(): string { return (this.data['gmv_cents'] as string) ?? '.40'; }
  get momPct(): string { return (this.data['mom_pct'] as string) ?? '8.7%'; }
  get forecast(): string { return (this.data['forecast'] as string) ?? '$204k'; }
  get rows(): KpiRow[] {
    return (this.data['rows'] as KpiRow[]) ?? [
      { label: 'Customers',       value: '12,840', delta: '+182 · 7d', tone: 'up' },
      { label: 'Providers',       value: '486',    delta: '+9 · 7d',   tone: 'up' },
      { label: 'Active bookings', value: '1,308',  delta: '+4.2%',     tone: 'up' },
      { label: 'Refund rate',     value: '1.4%',   delta: '−0.3pp',    tone: 'up' },
      { label: 'Avg rating',      value: '4.78',   delta: '+0.02',     tone: 'up' },
    ];
  }
  get attention(): AttentionRow[] {
    return (this.data['attention'] as AttentionRow[]) ?? [];
  }

  get tabBadges(): Record<string, number | string | null> {
    return (this.data['tab_badges'] as Record<string, number | string | null>) ?? {};
  }

  readonly sparkPoints = '0,48 29,42 58,46 87,34 116,38 145,26 174,22 203,28 232,16 261,18 290,10 320,6';
  readonly sparkFillPoints = `0,56 ${this.sparkPoints} 320,56`;

  onTab(kind: string): void {
    const link = this.links[kind === 'home' ? 'dashboard_v1' : kind];
    if (link) this.followLink.emit(link);
  }
}
