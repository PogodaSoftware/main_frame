/**
 * AdminPortalTagManagerComponent — `/admin/portal/crm/tags`
 *
 * Desktop redesign (web) per `web-admin-pages.jsx` WebAdminTagManager. Shared
 * slate chrome + page header + a "New tag" create panel (name + colour palette
 * → real POST) + a real `<table>` of every custom tag with its slug and live
 * account count.
 *
 * Mirrors RN `crm/tags.tsx`: list + create are the only real actions (the
 * per-row "edit" was a dead no-op in RN and has no backend, so it's dropped,
 * along with the design's fabricated Created / Applies-to / Archive columns).
 * Create + refetch are handled in-component (no router navigation → no flicker).
 */

import { ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { BffLink } from '../beauty-bff.types';
import { BeautyAuthService } from '../beauty-auth.service';
import { BeautyBffService } from '../beauty-bff.service';
import { BeautyAdminWebSidebarComponent } from '../admin-web/admin-web-sidebar.component';
import { BeautyAdminWebTopbarComponent } from '../admin-web/admin-web-topbar.component';
import { BeautyAdminWebSessionBarComponent } from '../admin-web/admin-web-session-bar.component';
import { BeautyAdminWebPageHeaderComponent } from '../admin-web/admin-web-page-header.component';

interface CrmTag { id: string; label: string; color: string; tone: string; count: number; }

@Component({
  selector: 'app-admin-portal-tag-manager',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    BeautyAdminWebSidebarComponent,
    BeautyAdminWebTopbarComponent,
    BeautyAdminWebSessionBarComponent,
    BeautyAdminWebPageHeaderComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="admin-web aw-shell">
      <app-admin-web-sidebar active="crm-customers"
        [adminName]="adminName" [adminEmail]="adminEmail" [badges]="navBadges"
        (follow)="followLink.emit($event)"></app-admin-web-sidebar>

      <div class="aw-col">
        <app-admin-web-topbar [notifCount]="notifCount" [adminName]="adminName" [adminEmail]="adminEmail"
          (follow)="followLink.emit($event)"></app-admin-web-topbar>
        <app-admin-web-session-bar [sessionRemaining]="sessionRemaining"
          (follow)="followLink.emit($event)"></app-admin-web-session-bar>

        <main class="aw-main" role="main">
          <app-admin-web-page-header
            [breadcrumb]="['CRM', 'Customers', 'Manage tags']"
            title="Custom tags"
            sub="Tags admins attach to customers and providers. They power CRM filters and the account detail page — users never see them.">
            <div slot="actions" class="aw-hactions">
              <button type="button" class="aw-btn aw-btn--sec" (click)="onBackToCrm()">Back to CRM</button>
            </div>
          </app-admin-web-page-header>

          <div class="aw-body">
            <!-- Create panel -->
            <div class="aw-card aw-card--pad aw-create">
              <h2 class="aw-h2">New tag</h2>
              <div class="aw-card-sub mb">Pick a colour and name it. Created tags appear in the table below and in CRM filters.</div>
              <div class="aw-create-row">
                <span class="aw-swatch" [style.background]="selectedColor" aria-hidden="true"></span>
                <input class="aw-name-in" type="text" [(ngModel)]="newTagName" name="tagname"
                       placeholder="Tag name…" maxlength="40" (keydown.enter)="onCreate()"
                       aria-label="New tag name" />
                <button type="button" class="aw-btn aw-btn--pri" [disabled]="submitting" (click)="onCreate()">
                  {{ submitting ? 'Creating…' : 'Create tag' }}
                </button>
              </div>
              <div class="aw-colors" role="group" aria-label="Tag colour">
                <button type="button" class="aw-cell" *ngFor="let c of colorPalette"
                        [style.background]="c" [class.is-on]="c === selectedColor"
                        (click)="selectedColor = c" [attr.aria-pressed]="c === selectedColor"
                        [attr.aria-label]="'Colour ' + c"></button>
              </div>
              <div class="aw-err" role="alert" *ngIf="errorMessage">{{ errorMessage }}</div>
            </div>

            <!-- Tags table -->
            <div class="aw-card aw-tablecard" [class.is-stale]="loading">
              <div class="aw-tabletop">
                <span>{{ tags.length }} tag{{ tags.length === 1 ? '' : 's' }}</span>
                <span class="aw-loading" *ngIf="loading"><span class="aw-spin" aria-hidden="true"></span> updating…</span>
              </div>
              <table class="aw-table">
                <thead>
                  <tr>
                    <th class="c-tag">Tag</th>
                    <th class="c-id">ID</th>
                    <th class="c-acct">Accounts</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let t of tags" class="aw-trow">
                    <td class="c-tag">
                      <span class="aw-tchip" [style.background]="t.tone" [style.color]="t.color" [style.borderColor]="t.color + '33'">
                        <span class="aw-tdot" [style.background]="t.color"></span>{{ t.label }}
                      </span>
                    </td>
                    <td class="c-id mono">{{ t.id }}</td>
                    <td class="c-acct mono">{{ fmt(t.count) }}</td>
                  </tr>
                  <tr *ngIf="!tags.length"><td colspan="3" class="aw-empty">No tags yet — create one above.</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </div>
  `,
  styles: [`
    :host {
      --line: #DCDCDF; --text: #0F1115; --text-muted: #6B6F77;
      --surface: #F2F2F2; --surface-2: #E9E9EB; --danger: #C0392B; --admin-red: #B23A2D;
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
    .aw-body { padding: 20px 28px 32px; max-width: 880px; }

    .aw-hactions { display: flex; gap: 8px; align-items: center; }
    .aw-btn { height: 38px; padding: 0 14px; border-radius: 10px; font-family: var(--font-body); font-size: 0.8125rem; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; white-space: nowrap; line-height: 1; }
    .aw-btn--sec { background: #fff; color: var(--text); border: 1px solid var(--line); }
    .aw-btn--pri { background: #0F1115; color: #fff; border: 1px solid #0F1115; }
    .aw-btn:disabled { opacity: 0.5; cursor: not-allowed; }

    .aw-card { background: #fff; border: 1px solid var(--line); border-radius: 14px; }
    .aw-card--pad { padding: 20px; }
    .aw-h2 { margin: 0; font-family: var(--font-display); font-size: 1.375rem; font-weight: 500; color: var(--text); line-height: 1.1; }
    .aw-card-sub { font-size: 0.75rem; color: var(--text-muted); margin-top: 2px; }
    .aw-card-sub.mb { margin-bottom: 14px; }

    .aw-create { margin-bottom: 16px; }
    .aw-create-row { display: flex; gap: 8px; align-items: center; }
    .aw-swatch { width: 38px; height: 38px; border-radius: 9px; flex-shrink: 0; border: 2px solid #fff; box-shadow: 0 0 0 1px var(--line); }
    .aw-name-in { flex: 1; height: 38px; border: 1px solid var(--line); border-radius: 10px; background: #fff; padding: 0 12px; font-family: var(--font-body); font-size: 0.875rem; color: var(--text); outline: none; }
    .aw-name-in:focus { border-color: #0F1115; }
    .aw-colors { display: flex; gap: 6px; margin-top: 12px; }
    .aw-cell { width: 26px; height: 26px; border-radius: 7px; border: 1px solid rgba(15,17,21,0.10); cursor: pointer; padding: 0; }
    .aw-cell.is-on { border: 2px solid #0F1115; }
    .aw-err { margin-top: 10px; font-size: 0.75rem; color: var(--danger); }

    .aw-tablecard { overflow: hidden; transition: opacity 120ms ease; }
    .aw-tablecard.is-stale { opacity: 0.6; }
    .aw-tabletop { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; border-bottom: 1px solid var(--line); font-size: 0.6875rem; font-weight: 700; letter-spacing: 1.2px; text-transform: uppercase; color: var(--text-muted); }
    .aw-loading { display: inline-flex; align-items: center; gap: 6px; text-transform: none; letter-spacing: 0; font-weight: 400; }
    .aw-spin { width: 11px; height: 11px; border-radius: 50%; border: 2px solid var(--line); border-top-color: var(--text); display: inline-block; animation: aw-spin 0.7s linear infinite; }
    @keyframes aw-spin { to { transform: rotate(360deg); } }

    .aw-table { width: 100%; border-collapse: collapse; }
    .aw-table thead tr { background: var(--surface); border-bottom: 1px solid var(--line); }
    .aw-table th { padding: 10px 16px; font-size: 0.625rem; font-weight: 700; letter-spacing: 1.2px; text-transform: uppercase; color: var(--text-muted); text-align: left; }
    .aw-table th.c-acct { width: 140px; }
    .aw-table th.c-id { width: 160px; }
    .aw-trow { border-bottom: 1px solid var(--surface); height: 52px; }
    .aw-trow:last-child { border-bottom: none; }
    .aw-table td { padding: 8px 16px; font-size: 0.8125rem; color: var(--text); vertical-align: middle; }
    .aw-table td.mono { font-family: var(--font-mono); font-size: 0.75rem; color: var(--text-muted); }
    .aw-tchip { display: inline-flex; align-items: center; gap: 5px; padding: 4px 10px; border-radius: 999px; border: 1px solid; font-family: var(--font-body); font-size: 0.6875rem; font-weight: 600; line-height: 1.2; }
    .aw-tdot { width: 6px; height: 6px; border-radius: 50%; }
    .aw-empty { padding: 28px 16px; text-align: center; color: var(--text-muted); font-size: 0.8125rem; }

    :host *:focus-visible { outline: 2px solid var(--admin-red); outline-offset: 2px; border-radius: 6px; }
    @media screen and (max-width: 960px) { .aw-body { max-width: none; } }
  `],
})
export class AdminPortalTagManagerComponent {
  private _data: Record<string, unknown> = {};
  @Input() set data(v: Record<string, unknown>) { this._data = v || {}; this.local = null; }
  get data(): Record<string, unknown> { return this._data; }
  @Input() links: Record<string, BffLink> = {};
  @Output() followLink = new EventEmitter<BffLink>();
  /** Retained for shell compatibility; create is handled in-component now. */
  @Output() createTag = new EventEmitter<{ label: string; color: string; tone: string }>();

  private local: Record<string, unknown> | null = null;
  private get d(): Record<string, unknown> { return this.local ?? this._data; }

  newTagName = '';
  selectedColor = '#7DA8CF';
  submitting = false;
  loading = false;
  errorMessage: string | null = null;

  readonly colorPalette = ['#A06B2C', '#2F7A47', '#C0392B', '#7DA8CF', '#5C4A8A', '#8A6A1F', '#1F6E7A', '#0F1115'];
  private readonly toneFor: Record<string, string> = {
    '#A06B2C': '#F4E7D6', '#2F7A47': '#E5F3EA', '#C0392B': '#FCE8E5', '#7DA8CF': '#E6F0FA',
    '#5C4A8A': '#ECE6F5', '#8A6A1F': '#F1E8DA', '#1F6E7A': '#DCEEF1', '#0F1115': '#E9E9EB',
  };

  constructor(
    private auth: BeautyAuthService,
    private bff: BeautyBffService,
    private cdr: ChangeDetectorRef,
  ) {}

  get notifCount(): number | null { return (this.d['notif_count'] as number | null) ?? null; }
  get adminName(): string { return (this.d['first_name'] as string) || 'Maria R.'; }
  get adminEmail(): string { return (this.d['admin_email'] as string) || 'maria@beauty.io'; }
  get sessionRemaining(): string { return (this.d['session_remaining'] as string) ?? '14:32'; }
  get navBadges(): Record<string, number> {
    const badges = (this.d['tab_badges'] as Record<string, number | null>) ?? {};
    const out: Record<string, number> = {};
    if (badges['tickets']) out['tickets'] = badges['tickets'] as number;
    return out;
  }

  get tags(): CrmTag[] { return (this.d['tags'] as CrmTag[]) ?? []; }
  fmt(n: number): string { return (n ?? 0).toLocaleString(); }

  onBackToCrm(): void {
    const link = this.links['crm'];
    if (link) this.followLink.emit(link);
  }

  onCreate(): void {
    const label = (this.newTagName || '').trim();
    if (!label) { this.errorMessage = 'Tag name required.'; return; }
    const link = this.links['create'];
    if (!link) { this.errorMessage = 'Create endpoint unavailable.'; return; }
    const color = this.selectedColor;
    const tone = this.toneFor[color] ?? color;
    this.errorMessage = null;
    this.submitting = true;
    this.cdr.markForCheck();
    this.auth.follow(link, { label, color, tone }, true).subscribe({
      next: () => {
        this.newTagName = '';
        this.selectedColor = '#7DA8CF';
        this.submitting = false;
        this.refetch();
      },
      error: (e) => {
        this.submitting = false;
        this.errorMessage = (e?.error?.detail as string) ?? 'Could not create tag.';
        this.cdr.markForCheck();
      },
    });
  }

  /** Reload the tag list in place (no navigation), mirroring RN's load(). */
  private refetch(): void {
    this.loading = true;
    this.cdr.markForCheck();
    this.bff.resolve('beauty_admin_portal_tag_manager').subscribe({
      next: (resp) => {
        if (resp && resp.action === 'render' && resp.data) {
          this.local = resp.data as Record<string, unknown>;
        }
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => { this.loading = false; this.cdr.markForCheck(); },
    });
  }
}
