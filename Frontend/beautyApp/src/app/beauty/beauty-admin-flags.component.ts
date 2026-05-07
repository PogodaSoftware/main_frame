/**
 * BeautyAdminFlagsComponent (Presentational)
 * ------------------------------------------
 * Admin screen that lists every Beauty feature flag and lets an
 * authenticated user toggle it. The shell fetches the flag list from
 * the BFF; this component just renders the data and emits the
 * BFF-supplied toggle link with the new value to the auth service.
 *
 * Toggles take effect on the very next BFF resolve because the
 * HateoasService re-reads the flag from the database every call.
 *
 * Audit log entries are written server-side by the toggle endpoint
 * and surfaced read-only in the lower section of the page.
 */

import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import { CommonModule } from '@angular/common';

import { BffLink } from './beauty-bff.types';
import { BeautyProviderSubHeaderComponent } from './provider/prov-sub-header.component';

export interface AdminFlag {
  key: string;
  label: string;
  description: string;
  enabled: boolean;
  toggle: BffLink;
}

export interface AdminFlagAuditEntry {
  flag_key: string;
  old_value: boolean;
  new_value: boolean;
  changed_by_email: string;
  changed_by_user_type: string;
  changed_at: string;
}

export interface FlagToggleEvent {
  link: BffLink;
  body: { key: string; enabled: boolean };
}

@Component({
  selector: 'app-beauty-admin-flags',
  standalone: true,
  imports: [CommonModule, BeautyProviderSubHeaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="beauty-app prov-shell flags-page">
      <app-prov-sub-header
        back="Home"
        title="Feature flags"
        (backClick)="goHome()"
      >
        <div slot="right" class="flags-header-right">
          <button
            *ngIf="links['crm']"
            type="button"
            class="flags-nav-btn"
            data-testid="flags-nav-crm"
            (click)="followLink.emit(links['crm'])"
          >CRM</button>
          <span class="flags-admin-badge" *ngIf="adminEmail">{{ adminEmail }}</span>
        </div>
      </app-prov-sub-header>

      <main id="main" class="flags-main">
        <span class="sr-only" role="status" aria-live="polite">{{ flagAnnouncement }}</span>
        <section class="flags-intro">
          <h1>Runtime feature flags</h1>
          <p>
            Changes take effect on the next page load — no redeploy required.
            Every toggle is recorded in the audit log below.
          </p>
        </section>

        <section class="flags-list" aria-label="Feature flags">
          <article *ngFor="let flag of flags; trackBy: trackByKey" class="flag-card">
            <div class="flag-info">
              <h2 class="flag-label">{{ flag.label }}</h2>
              <code class="flag-key">{{ flag.key }}</code>
              <p class="flag-description">{{ flag.description }}</p>
            </div>
            <div class="flag-control">
              <span
                class="flag-state"
                [class.flag-state--on]="flag.enabled"
                [class.flag-state--off]="!flag.enabled"
              >{{ flag.enabled ? 'On' : 'Off' }}</span>
              <button
                type="button"
                class="flag-toggle"
                role="switch"
                [class.flag-toggle--on]="flag.enabled"
                [disabled]="busyKey === flag.key"
                [attr.aria-checked]="flag.enabled"
                [attr.aria-label]="'Toggle ' + flag.label"
                (click)="onToggle(flag)"
              >
                <span class="flag-toggle__knob"></span>
              </button>
            </div>
          </article>
          <p *ngIf="!flags?.length" class="flags-empty">No feature flags registered.</p>
        </section>

        <section class="flags-audit" aria-label="Audit log">
          <h2>Recent changes</h2>
          <p *ngIf="!audit?.length" class="audit-empty">No flag changes recorded yet.</p>
          <ul *ngIf="audit?.length" class="audit-list">
            <li *ngFor="let entry of audit" class="audit-item">
              <span class="audit-when">{{ formatDate(entry.changed_at) }}</span>
              <code class="audit-key">{{ entry.flag_key }}</code>
              <span class="audit-change">
                {{ entry.old_value ? 'On' : 'Off' }}
                →
                <strong>{{ entry.new_value ? 'On' : 'Off' }}</strong>
              </span>
              <span class="audit-who" *ngIf="entry.changed_by_email">
                by {{ entry.changed_by_email }}
                <em *ngIf="entry.changed_by_user_type">({{ entry.changed_by_user_type }})</em>
              </span>
            </li>
          </ul>
        </section>
      </main>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      font-family: 'Inter', system-ui, sans-serif;
    }
    .beauty-app {
      display: flex; flex-direction: column;
      min-height: 100dvh;
      background: #F2F2F2;
      color: #0F1115;
    }
    .flags-page {}
    .flags-header-right {
      display: flex; align-items: center; gap: 10px; flex-shrink: 0;
    }
    .flags-nav-btn {
      background: transparent; border: 1px solid #DCDCDF;
      border-radius: 8px; padding: 0 12px;
      min-height: 36px; cursor: pointer;
      font-family: inherit; font-size: 13px; font-weight: 500;
      color: #0F1115;
    }
    .flags-nav-btn:hover { background: #EBEBEB; }
    .flags-admin-badge {
      font-size: 12px; padding: 4px 10px; border-radius: 999px;
      background: #0F1115; color: #fff; white-space: nowrap;
    }
    .flags-main {
      flex: 1; overflow-y: auto;
      padding: 16px 14px 64px;
      display: flex; flex-direction: column; gap: 14px;
    }
    .flags-intro h1 { margin: 0 0 6px; font-size: 22px; font-family: 'Cormorant Garamond', Georgia, serif; font-weight: 500; }
    .flags-intro p { margin: 0; color: #6B6F77; font-size: 13px; line-height: 1.5; }
    .flags-list { display: grid; gap: 10px; }
    .flag-card { display: flex; justify-content: space-between; gap: 16px; align-items: center;
      background: #fff; border: 1px solid #DCDCDF; border-radius: 14px; padding: 16px 18px; }
    .flag-info { flex: 1; min-width: 0; }
    .flag-label { margin: 0 0 4px; font-size: 15px; font-weight: 600; color: #0F1115; }
    .flag-key { display: inline-block; font-size: 12px; color: #6B6F77;
      background: #F2F2F2; padding: 2px 6px; border-radius: 6px; }
    .flag-description { margin: 8px 0 0; color: #6B6F77; font-size: 13px; line-height: 1.4; }
    .flag-control { display: flex; flex-direction: column; align-items: flex-end; gap: 8px; padding: 8px 0; min-height: 44px; }
    .flag-state { font-size: 12px; text-transform: uppercase; letter-spacing: 0.04em; font-weight: 600; }
    .flag-state--on { color: #0f7a3a; }
    .flag-state--off { color: #94343b; }
    .flag-toggle { position: relative; width: 52px; height: 30px; border-radius: 999px;
      border: none; background: #8e8e93; cursor: pointer; padding: 0; transition: background 0.18s ease; }
    .flag-toggle:focus-visible { outline: 2px solid #1a3a52; outline-offset: 2px; }
    :host *:focus-visible { outline: 2px solid #1a3a52; outline-offset: 2px; border-radius: 6px; }
    .flag-toggle:disabled { opacity: 0.55; cursor: progress; }
    .flag-toggle--on { background: #0f7a3a; }
    .flag-toggle__knob { position: absolute; top: 3px; left: 3px; width: 24px; height: 24px;
      background: #fff; border-radius: 50%; transition: transform 0.18s ease;
      box-shadow: 0 1px 2px rgba(0,0,0,0.15); }
    .flag-toggle--on .flag-toggle__knob { transform: translateX(22px); }
    .flags-empty, .audit-empty { color: #6B6F77; font-style: italic; font-size: 14px; }
    .flags-audit h2 { margin: 0 0 12px; font-size: 17px; font-weight: 600; }
    .audit-list { list-style: none; padding: 0; margin: 0; display: grid; gap: 8px; }
    .audit-item { display: flex; flex-wrap: wrap; gap: 10px; align-items: center;
      background: #fff; border: 1px solid #DCDCDF; border-radius: 10px; padding: 10px 14px;
      font-size: 13px; }
    .audit-when { color: #6B6F77; font-variant-numeric: tabular-nums; min-width: 160px; }
    .audit-key { background: #F2F2F2; padding: 2px 6px; border-radius: 6px; font-size: 12px; }
    .audit-change strong { color: #0F1115; }
    .audit-who { color: #6B6F77; }
    .audit-who em { color: #8a8a8e; font-style: normal; }
    .sr-only {
      position: absolute !important; width: 1px !important; height: 1px !important;
      padding: 0 !important; margin: -1px !important; overflow: hidden !important;
      clip: rect(0, 0, 0, 0) !important; white-space: nowrap !important; border: 0 !important;
    }
  `],
})
export class BeautyAdminFlagsComponent {
  @Input() flags: AdminFlag[] = [];
  @Input() audit: AdminFlagAuditEntry[] = [];
  @Input() adminEmail: string | null = null;
  @Input() busyKey: string | null = null;
  @Input() links: Record<string, BffLink> = {};

  @Output() toggleFlag = new EventEmitter<FlagToggleEvent>();
  @Output() followLink = new EventEmitter<BffLink>();
  @Output() goHomeRequested = new EventEmitter<void>();

  /** AT-only message announcing the most recent flag flip. */
  flagAnnouncement = '';

  trackByKey(_index: number, flag: AdminFlag): string {
    return flag.key;
  }

  onToggle(flag: AdminFlag): void {
    if (!flag.toggle) {
      return;
    }
    const nextEnabled = !flag.enabled;
    this.flagAnnouncement = `${flag.label} turned ${nextEnabled ? 'on' : 'off'}.`;
    this.toggleFlag.emit({
      link: flag.toggle,
      body: { key: flag.key, enabled: nextEnabled },
    });
  }

  goHome(): void {
    this.goHomeRequested.emit();
  }

  formatDate(iso: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString();
  }
}
