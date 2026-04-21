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
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flags-page">
      <header class="flags-header">
        <div class="flags-brand">
          <button class="brand-name-btn" (click)="goHome()">Beauty</button>
          <span class="flags-subtitle">Feature flags</span>
        </div>
        <div class="flags-admin-badge" *ngIf="adminEmail">
          {{ adminEmail }}
        </div>
      </header>

      <main class="flags-main">
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
                [class.flag-toggle--on]="flag.enabled"
                [disabled]="busyKey === flag.key"
                [attr.aria-pressed]="flag.enabled"
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
    :host { display: block; min-height: 100dvh; background: #f7f7f8; color: #1c1c1e;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    .flags-page { max-width: 860px; margin: 0 auto; padding: 24px 20px 64px; }
    .flags-header { display: flex; justify-content: space-between; align-items: center;
      padding-bottom: 16px; border-bottom: 1px solid #e5e5ea; margin-bottom: 24px; }
    .flags-brand { display: flex; align-items: baseline; gap: 12px; }
    .brand-name-btn { background: none; border: none; padding: 0; cursor: pointer;
      font-size: 1.5rem; font-weight: 700; color: #1c1c1e; }
    .flags-subtitle { color: #6b6b70; font-size: 0.95rem; }
    .flags-admin-badge { font-size: 0.85rem; padding: 6px 12px; border-radius: 999px;
      background: #1c1c1e; color: #fff; }
    .flags-intro h1 { margin: 0 0 8px; font-size: 1.6rem; }
    .flags-intro p { margin: 0 0 24px; color: #5b5b60; line-height: 1.4; }
    .flags-list { display: grid; gap: 12px; margin-bottom: 32px; }
    .flag-card { display: flex; justify-content: space-between; gap: 16px;
      background: #fff; border: 1px solid #e5e5ea; border-radius: 12px; padding: 16px 18px; }
    .flag-info { flex: 1; min-width: 0; }
    .flag-label { margin: 0 0 4px; font-size: 1.05rem; }
    .flag-key { display: inline-block; font-size: 0.78rem; color: #6b6b70;
      background: #f1f1f3; padding: 2px 6px; border-radius: 6px; }
    .flag-description { margin: 8px 0 0; color: #4a4a4f; font-size: 0.92rem; line-height: 1.4; }
    .flag-control { display: flex; flex-direction: column; align-items: flex-end; gap: 8px; }
    .flag-state { font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.04em; }
    .flag-state--on { color: #0f7a3a; }
    .flag-state--off { color: #94343b; }
    .flag-toggle { position: relative; width: 52px; height: 30px; border-radius: 999px;
      border: none; background: #c7c7cc; cursor: pointer; padding: 0; transition: background 0.18s ease; }
    .flag-toggle:disabled { opacity: 0.55; cursor: progress; }
    .flag-toggle--on { background: #0f7a3a; }
    .flag-toggle__knob { position: absolute; top: 3px; left: 3px; width: 24px; height: 24px;
      background: #fff; border-radius: 50%; transition: transform 0.18s ease;
      box-shadow: 0 1px 2px rgba(0,0,0,0.15); }
    .flag-toggle--on .flag-toggle__knob { transform: translateX(22px); }
    .flags-empty, .audit-empty { color: #6b6b70; font-style: italic; }
    .flags-audit h2 { margin: 0 0 12px; font-size: 1.2rem; }
    .audit-list { list-style: none; padding: 0; margin: 0; display: grid; gap: 8px; }
    .audit-item { display: flex; flex-wrap: wrap; gap: 10px; align-items: center;
      background: #fff; border: 1px solid #e5e5ea; border-radius: 10px; padding: 10px 14px;
      font-size: 0.9rem; }
    .audit-when { color: #6b6b70; font-variant-numeric: tabular-nums; min-width: 160px; }
    .audit-key { background: #f1f1f3; padding: 2px 6px; border-radius: 6px; font-size: 0.78rem; }
    .audit-change strong { color: #1c1c1e; }
    .audit-who { color: #5b5b60; }
    .audit-who em { color: #8a8a8e; font-style: normal; }
  `],
})
export class BeautyAdminFlagsComponent {
  @Input() flags: AdminFlag[] = [];
  @Input() audit: AdminFlagAuditEntry[] = [];
  @Input() adminEmail: string | null = null;
  @Input() busyKey: string | null = null;

  @Output() toggleFlag = new EventEmitter<FlagToggleEvent>();
  @Output() followLink = new EventEmitter<BffLink>();
  @Output() goHomeRequested = new EventEmitter<void>();

  trackByKey(_index: number, flag: AdminFlag): string {
    return flag.key;
  }

  onToggle(flag: AdminFlag): void {
    if (!flag.toggle) {
      return;
    }
    this.toggleFlag.emit({
      link: flag.toggle,
      body: { key: flag.key, enabled: !flag.enabled },
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
