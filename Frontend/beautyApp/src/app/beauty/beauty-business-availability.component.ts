/**
 * BeautyBusinessAvailabilityComponent — desktop redesign per Business Provider
 * Portal · Web handoff (web-hours).
 *
 * Sidebar + topbar chrome, breadcrumb + Cormorant heading + Cancel / Save,
 * two-column body: left card hosts the shared weekly-hours editor (flat,
 * TZ banner suppressed) with QUICK SET + SCHEDULE; right rail shows a TIME
 * ZONE card + an UPCOMING OVERRIDES card. BFF contract unchanged
 * (weekly_hours rows + submit link).
 */

import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { BeautyAuthService } from './beauty-auth.service';
import { BffLink } from './beauty-bff.types';
import { BeautyProvWebSidebarComponent } from './prov-web/prov-web-sidebar.component';
import { BeautyProvWebTopbarComponent } from './prov-web/prov-web-topbar.component';
import {
  BeautyWeeklyHoursEditorComponent,
  DayRow,
} from './beauty-weekly-hours-editor.component';

@Component({
  selector: 'app-beauty-business-availability',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    BeautyProvWebSidebarComponent,
    BeautyProvWebTopbarComponent,
    BeautyWeeklyHoursEditorComponent,
  ],
  template: `
    <div class="pw-shell">
      <app-prov-web-sidebar
        active="hours"
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
              <h1 class="pw-title">Weekly hours</h1>
              <div class="pw-sub">When customers can book you. Set once, override per-day for vacations.</div>
            </div>
            <div class="pw-header-actions">
              <button type="button" class="wbtn wbtn-secondary"
                      (click)="emit(links['business_home'])" [disabled]="isSaving">Cancel</button>
              <button type="button" class="wbtn wbtn-success"
                      (click)="save()" [disabled]="isSaving">
                {{ isSaving ? 'Saving…' : 'Save' }}
              </button>
            </div>
          </div>

          <div class="pw-pad hours-grid">
            <div class="web-card hours-main">
              <app-beauty-weekly-hours-editor
                [rows]="rows" [flat]="true" [hideTzBanner]="true">
              </app-beauty-weekly-hours-editor>
              <p *ngIf="message" class="msg" [class.error]="isError"
                 [attr.role]="isError ? 'alert' : 'status'" aria-live="polite">{{ message }}</p>
            </div>

            <aside class="side-rail">
              <div class="web-card rail-card">
                <div class="rail-eyebrow">Time zone</div>
                <div class="tz-name">{{ tzCityLabel }}</div>
                <div class="tz-meta">{{ tzOffsetLabel }}</div>
                <label class="tz-select-wrap">
                  <select class="tz-select" [(ngModel)]="selectedTz" name="storefront-tz" aria-label="Storefront timezone">
                    <option *ngFor="let z of allZones" [value]="z">{{ z.replace('_', ' ') }}</option>
                  </select>
                </label>
                <button type="button" class="tz-detect" (click)="useDeviceTz()"
                        *ngIf="deviceTz && deviceTz !== selectedTz">
                  Use my timezone ({{ deviceTz.replace('_', ' ') }})
                </button>
                <div class="tz-note">Set your storefront's local time. Hours are entered in this zone; every customer sees them converted to their own.</div>
              </div>

              <div class="web-card rail-card">
                <div class="rail-eyebrow">Upcoming overrides</div>
                <div class="rail-empty">{{ overrideMsg || 'Nothing scheduled.' }}</div>
                <button type="button" class="wbtn wbtn-secondary block-btn" (click)="blockOff()">
                  + Block off dates
                </button>
              </div>
            </aside>
          </div>
        </main>
      </div>
    </div>
  `,
  styles: [`
    :host {
      --surface: #F2F2F2; --line: #DCDCDF; --text: #0F1115; --text-muted: #6B6F77;
      --accent-blue: #CFE3F5; --accent-blue-deep: #7DA8CF; --accent-blue-text: #1a3a52;
      --ink: #0A0A0B; --success: #2F7A47; --danger: #C0392B;
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

    .pw-header { position: relative; display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; padding: 24px 28px 4px; }
    .pw-header-text { flex: 1; min-width: 0; }
    .pw-header-centered { text-align: center; }
    .pw-title { margin: 0; font-family: var(--font-display); font-size: 2rem; font-weight: 500; letter-spacing: 0.2px; line-height: 1.15; }
    .pw-sub { font-size: 0.8125rem; color: var(--text-muted); margin-top: 6px; }
    .pw-header-actions { position: absolute; top: 24px; right: 28px; display: flex; gap: 8px; align-items: center; flex-shrink: 0; }

    .wbtn { height: 40px; padding: 0 16px; border-radius: 10px; cursor: pointer; font-family: var(--font-body); font-size: 0.8125rem; font-weight: 600; display: inline-flex; align-items: center; justify-content: center; gap: 6px; border: 1px solid transparent; white-space: nowrap; }
    .wbtn:disabled { opacity: 0.5; cursor: not-allowed; }
    .wbtn-success { background: var(--success); color: #fff; border-color: var(--success); }
    .wbtn-success:hover:not(:disabled) { background: #276539; }
    .wbtn-secondary { background: #fff; color: var(--text); border-color: var(--line); }
    .wbtn-secondary:hover:not(:disabled) { border-color: var(--accent-blue-deep); }

    .web-card { background: #fff; border: 1px solid var(--line); border-radius: 14px; }

    .hours-grid { display: grid; grid-template-columns: minmax(0, 1fr) 300px; gap: 20px; align-items: start; }
    .hours-main { padding: 18px 20px 20px; }

    .side-rail { display: flex; flex-direction: column; gap: 16px; }
    .rail-card { padding: 16px; }
    .rail-eyebrow { font-size: 0.625rem; font-weight: 700; letter-spacing: 1.2px; text-transform: uppercase; color: var(--text-muted); margin-bottom: 10px; }
    .tz-name { font-family: var(--font-display); font-size: 1.125rem; font-weight: 500; }
    .tz-meta { font-family: var(--font-mono); font-size: 0.6875rem; color: var(--text-muted); margin-top: 2px; }
    .tz-select-wrap { display: block; margin-top: 10px; }
    .tz-select { width: 100%; height: 38px; padding: 0 28px 0 10px; background: #fff; border: 1px solid var(--line); border-radius: 10px; font-family: var(--font-body); font-size: 0.8125rem; color: var(--text); cursor: pointer; appearance: none;
      background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236B6F77' stroke-width='2'><path d='M6 9l6 6 6-6'/></svg>"); background-repeat: no-repeat; background-position: right 10px center; }
    .tz-detect { margin-top: 8px; background: none; border: none; padding: 0; cursor: pointer; font: inherit; font-size: 0.75rem; font-weight: 600; color: var(--accent-blue-text); }
    .tz-detect:hover { text-decoration: underline; }
    .tz-note { margin-top: 12px; font-size: 0.75rem; line-height: 1.5; color: var(--accent-blue-text); background: rgba(207,227,245,0.55); border: 1px solid rgba(125,168,207,0.33); border-radius: 10px; padding: 10px 12px; }
    .rail-empty { font-size: 0.8125rem; color: var(--text-muted); }
    .block-btn { width: 100%; margin-top: 12px; }

    .msg { padding: 12px 0 0; color: var(--accent-blue-deep); font-size: 0.8125rem; }
    .msg.error { color: var(--danger); }

    @media screen and (max-width: 900px) {
      .hours-grid { grid-template-columns: 1fr; }
      .side-rail { order: -1; }
    }
    @media screen and (max-width: 720px) {
      app-prov-web-sidebar { display: none; }
      .pw-header { flex-direction: column; padding: 16px; }
      .pw-pad { padding: 16px; }
    }
  `],
})
export class BeautyBusinessAvailabilityComponent implements OnChanges {
  @Input() data: Record<string, unknown> = {};
  @Input() links: Record<string, BffLink> = {};
  @Output() followLink = new EventEmitter<BffLink>();

  rows: DayRow[] = [];
  isSaving = false;
  message = '';
  isError = false;
  overrideMsg = '';

  selectedTz = 'UTC';
  deviceTz = '';
  allZones: string[] = [];

  constructor(private authService: BeautyAuthService) {
    try {
      this.deviceTz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    } catch { this.deviceTz = ''; }
    try {
      const sv = (Intl as unknown as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf;
      this.allZones = sv ? sv('timeZone') : [];
    } catch { this.allZones = []; }
    if (!this.allZones.length) {
      this.allZones = ['UTC', 'America/New_York', 'America/Chicago', 'America/Denver',
        'America/Los_Angeles', 'Europe/London', 'Europe/Paris', 'Asia/Tokyo'];
    }
  }

  ngOnChanges(_: SimpleChanges): void {
    const incoming = (this.data['weekly_hours'] as DayRow[]) || [];
    this.rows = incoming.map((r) => ({ ...r, is_24h: !!r.is_24h }));

    const stored = (this.data['timezone'] as string) || '';
    // Auto-detect: an unset/UTC-default storefront adopts the provider's
    // device tz so the first save records their real zone; an explicitly
    // configured zone is preserved.
    this.selectedTz = (stored && stored !== 'UTC') ? stored : (this.deviceTz || stored || 'UTC');
    if (this.selectedTz && !this.allZones.includes(this.selectedTz)) {
      this.allZones = [this.selectedTz, ...this.allZones];
    }
  }

  useDeviceTz(): void {
    if (this.deviceTz) this.selectedTz = this.deviceTz;
  }

  get tzCityLabel(): string {
    const z = this.selectedTz || 'UTC';
    if (z === 'UTC') return 'Coordinated Universal Time';
    return z.split('/').pop()?.replace(/_/g, ' ') || z;
  }

  get tzOffsetLabel(): string {
    const z = this.selectedTz || 'UTC';
    try {
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: z, hour: '2-digit', minute: '2-digit', timeZoneName: 'short', hour12: true,
      }).formatToParts(new Date());
      const t = parts.filter(p => p.type !== 'timeZoneName').map(p => p.value).join('');
      const abbr = parts.find(p => p.type === 'timeZoneName')?.value || '';
      return `${z.replace(/_/g, ' ')} · ${abbr} · ${t.trim()} now`;
    } catch {
      return z.replace(/_/g, ' ');
    }
  }

  get business(): { email?: string; business_name?: string } | null {
    return (this.data['business'] as { email?: string; business_name?: string }) || null;
  }

  get navBadges(): { bookings?: number; messages?: number } {
    const b = (this.data['badges'] as { messages_unread?: number; bookings_unread?: number }) || {};
    return { bookings: b.bookings_unread || 0, messages: b.messages_unread || 0 };
  }

  emit(link: BffLink | null | undefined): void {
    if (link) this.followLink.emit(link);
  }

  blockOff(): void {
    // Date-specific overrides have no backend endpoint yet — surface the
    // intent without faking a save. Wire to a real override API when it lands.
    this.overrideMsg = 'Date overrides are coming soon.';
  }

  save(): void {
    if (this.isSaving) return;
    this.isSaving = true;
    this.message = '';
    this.isError = false;

    const submitLink: BffLink = {
      rel: 'submit',
      href: (this.data['submit_href'] as string) || '/api/beauty/protected/business/availability/',
      method: ((this.data['submit_method'] as string) || 'PUT') as BffLink['method'],
      screen: null, route: null, prompt: null,
    };

    this.authService.follow(submitLink, { weekly_hours: this.rows, timezone: this.selectedTz }).subscribe({
      next: () => {
        this.isSaving = false;
        this.message = 'Saved.';
        const self = this.links['self'];
        if (self) this.followLink.emit(self);
      },
      error: (err) => {
        this.isSaving = false;
        this.isError = true;
        this.message = err?.error?.detail || 'Could not save. Please check the times.';
      },
    });
  }
}
