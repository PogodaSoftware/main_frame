/**
 * AdminPortalAuditLogComponent — `/admin/portal/audit`
 *
 * Read-only timeline of admin actions. Rows are fully shaped by the BFF
 * (title HTML + meta string + color + icon hint) so this component just
 * renders.
 */

import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

import { BffLink } from '../beauty-bff.types';
import {
  AdmCardComponent,
  AdmHomeIndicatorComponent,
  AdmStatusBarComponent,
  AdmTabBarComponent,
  AdmTopHeaderComponent,
} from './atoms';

interface AuditRow {
  id: number;
  when_label: string;
  when_iso: string;
  icon: string;
  color: string;
  title_html: string;
  meta: string;
  action: string;
  actor_email: string;
}

@Component({
  selector: 'app-admin-portal-audit',
  standalone: true,
  imports: [
    CommonModule,
    AdmCardComponent, AdmHomeIndicatorComponent,
    AdmStatusBarComponent, AdmTabBarComponent, AdmTopHeaderComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="adm-app is-light adm-audit">
      <adm-status-bar tone="slate"></adm-status-bar>
      <adm-top-header [notifCount]="notifCount"></adm-top-header>

      <header class="sub">
        <h1 class="title adm-display">Audit log</h1>
        <div class="summary">
          Every admin action · immutable · last 90 days
          <span *ngIf="total" class="adm-mono"> · {{ total }} event{{ total === 1 ? '' : 's' }}</span>
        </div>
      </header>

      <main class="body adm-body--scroll" role="main">
        <div *ngIf="!rows.length" class="empty">
          <div class="empty-title adm-display">No events yet</div>
          <div class="empty-body">
            Admin actions (suspends, invites, tag changes, ticket updates) are
            recorded here as they happen.
          </div>
        </div>

        <div class="card-wrap" *ngIf="rows.length">
          <adm-card [padding]="14">
            <div *ngFor="let e of rows; let i = index" class="event"
                 [class.last]="i === rows.length - 1">
              <div class="ev-rail">
                <span class="ev-icon" [style.background]="e.color + '1A'" [style.color]="e.color">
                  <ng-container [ngSwitch]="e.icon">
                    <svg *ngSwitchCase="'suspend'" width="12" height="12" viewBox="0 0 24 24"
                         fill="none" stroke="currentColor" stroke-width="2"
                         stroke-linecap="round" stroke-linejoin="round">
                      <circle cx="12" cy="12" r="10"/>
                      <path d="M4.93 4.93l14.14 14.14"/>
                    </svg>
                    <svg *ngSwitchCase="'verify'" width="12" height="12" viewBox="0 0 24 24"
                         fill="none" stroke="currentColor" stroke-width="2"
                         stroke-linecap="round" stroke-linejoin="round">
                      <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
                      <path d="M22 4L12 14.01l-3-3"/>
                    </svg>
                    <svg *ngSwitchCase="'export'" width="12" height="12" viewBox="0 0 24 24"
                         fill="none" stroke="currentColor" stroke-width="2"
                         stroke-linecap="round" stroke-linejoin="round">
                      <path d="M3 8a2 2 0 012-2h6l2 3h7a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z"/>
                    </svg>
                    <svg *ngSwitchCase="'warn'" width="12" height="12" viewBox="0 0 24 24"
                         fill="none" stroke="currentColor" stroke-width="2"
                         stroke-linecap="round" stroke-linejoin="round">
                      <path d="M12 9v4M12 17h.01M10.3 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                    </svg>
                    <svg *ngSwitchDefault width="12" height="12" viewBox="0 0 24 24"
                         fill="none" stroke="currentColor" stroke-width="2"
                         stroke-linecap="round" stroke-linejoin="round">
                      <circle cx="12" cy="12" r="10"/>
                      <path d="M12 16v-4M12 8h.01"/>
                    </svg>
                  </ng-container>
                </span>
                <span class="ev-line" *ngIf="i !== rows.length - 1"></span>
              </div>
              <div class="ev-body">
                <div class="ev-head">
                  <span class="ev-title" [innerHTML]="e.title_html"></span>
                  <span class="ev-when adm-mono">{{ e.when_label }}</span>
                </div>
                <div class="ev-meta adm-mono">{{ e.meta }}</div>
              </div>
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
    .adm-audit { min-height: 100dvh; }

    .sub { background: var(--adm-slate); color: #fff; padding: 12px 14px; border-bottom: 1px solid var(--adm-slate-line); flex-shrink: 0; }
    .title { margin: 0; font-size: 24px; }
    .summary { font-size: 11px; color: var(--adm-slate-muted); margin-top: 2px; }

    .body { padding: 14px; background: #fff; }
    .empty { padding: 32px 16px; text-align: center; }
    .empty-title { font-size: 20px; color: var(--text); margin-bottom: 6px; }
    .empty-body { font-size: 12px; color: var(--text-muted); margin: 0 auto; max-width: 280px; line-height: 1.5; }

    .event { display: flex; gap: 10px; padding-bottom: 14px; position: relative; }
    .event.last { padding-bottom: 0; }
    .ev-rail { display: flex; flex-direction: column; align-items: center; padding-top: 2px; }
    .ev-icon { width: 24px; height: 24px; border-radius: 50%; display: grid; place-items: center; flex-shrink: 0; }
    .ev-line { width: 1.5px; flex: 1; background: var(--line); margin-top: 4px; min-height: 14px; }

    .ev-body { flex: 1; min-width: 0; }
    .ev-head { display: flex; align-items: baseline; gap: 8px; }
    .ev-title { flex: 1; font-size: 12.5px; color: var(--text); line-height: 1.45; }
    .ev-title :global(b) { font-weight: 700; }
    .ev-when { font-size: 10px; color: var(--text-muted); flex-shrink: 0; }
    .ev-meta { font-size: 10.5px; color: var(--text-muted); margin-top: 4px; line-height: 1.5; }
  `],
})
export class AdminPortalAuditLogComponent {
  get notifCount(): number { return (this.data['notif_count'] as number) ?? 0; }
  @Input() data: Record<string, unknown> = {};
  @Input() links: Record<string, BffLink> = {};
  @Output() followLink = new EventEmitter<BffLink>();

  get rows(): AuditRow[] { return (this.data['rows'] as AuditRow[]) ?? []; }
  get total(): number { return (this.data['total'] as number) ?? 0; }

  onTab(kind: string): void {
    const link = this.links[kind === 'home' ? 'home' : kind];
    if (link) this.followLink.emit(link);
  }

  get tabBadges(): Record<string, number | string | null> {
    return (this.data['tab_badges'] as Record<string, number | string | null>) ?? {};
  }
}
