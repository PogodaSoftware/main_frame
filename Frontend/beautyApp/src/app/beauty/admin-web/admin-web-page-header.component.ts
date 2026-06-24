/**
 * BeautyAdminWebPageHeaderComponent — shared content-area page header for the
 * Admin Portal (web). Per `web-chrome.jsx` WebPageHeader: white header with a
 * breadcrumb, a Cormorant 32px title, an optional sub line, a right-action
 * slot (projected via `[slot=actions]`), and optional tabs with mono count
 * badges (used by CRM / tickets / team / detail).
 *
 * Tabs emit (tabSelect) with the tab id; the consuming page maps that to a
 * BffLink. Breadcrumb is display-only.
 */
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import { CommonModule } from '@angular/common';

export interface AdminWebTab {
  id: string;
  label: string;
  count?: number | null;
}

@Component({
  selector: 'app-admin-web-page-header',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="awph" [class.has-tabs]="tabs?.length">
      <div class="awph-top">
        <div class="awph-head">
          <div class="awph-crumb" *ngIf="breadcrumb?.length">
            <ng-container *ngFor="let b of breadcrumb; let i = index; let last = last">
              <span class="awph-sep" *ngIf="i > 0" aria-hidden="true">›</span>
              <span class="awph-crumb-item" [class.is-last]="last">{{ b }}</span>
            </ng-container>
          </div>
          <h1 class="awph-title">{{ title }}</h1>
          <div class="awph-sub" *ngIf="sub">{{ sub }}</div>
        </div>
        <div class="awph-actions"><ng-content select="[slot=actions]"></ng-content></div>
      </div>

      <div class="awph-tabs" *ngIf="tabs?.length" role="tablist" [attr.aria-label]="title + ' views'">
        <button *ngFor="let t of tabs" type="button" class="awph-tab"
                role="tab" [class.is-active]="t.id === activeTab"
                [attr.aria-selected]="t.id === activeTab"
                (click)="tabSelect.emit(t.id)">
          {{ t.label }}
          <span class="awph-tab-count" *ngIf="t.count != null">{{ t.count }}</span>
          <span class="awph-tab-bar" *ngIf="t.id === activeTab" aria-hidden="true"></span>
        </button>
      </div>
    </div>
  `,
  styles: [`
    :host {
      --line: #DCDCDF; --text: #0F1115; --text-muted: #6B6F77; --surface-2: #E9E9EB;
      --admin-red: #B23A2D;
      --font-body: 'Inter', system-ui, -apple-system, sans-serif;
      --font-display: 'Cormorant Garamond', Georgia, serif;
      --font-mono: ui-monospace, 'SF Mono', Menlo, monospace;
      display: block;
    }
    :host *:focus-visible { outline: 2px solid var(--admin-red); outline-offset: 2px; border-radius: 6px; }

    .awph { padding: 20px 28px 0; background: #fff; font-family: var(--font-body); }
    .awph.has-tabs { border-bottom: 1px solid var(--line); }
    .awph-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
    .awph-head { min-width: 0; }

    .awph-crumb { font-size: 0.6875rem; color: var(--text-muted); margin-bottom: 6px; display: flex; align-items: center; gap: 4px; flex-wrap: wrap; }
    .awph-sep { opacity: 0.5; }
    .awph-crumb-item { font-weight: 500; }
    .awph-crumb-item.is-last { color: var(--text); font-weight: 600; }

    .awph-title {
      margin: 0; font-family: var(--font-display); font-size: 2rem; font-weight: 500;
      letter-spacing: 0.2px; color: var(--text); line-height: 1.15;
    }
    .awph-sub { font-size: 0.8125rem; color: var(--text-muted); margin-top: 6px; max-width: 720px; }

    .awph-actions { display: flex; gap: 8px; align-items: center; flex-shrink: 0; }

    .awph-tabs { display: flex; gap: 4px; margin-top: 18px; }
    .awph-tab {
      padding: 10px 14px 12px; position: relative; background: transparent; border: none;
      font-family: var(--font-body); font-size: 0.8125rem; font-weight: 500; color: var(--text-muted);
      cursor: pointer; display: inline-flex; align-items: center; gap: 6px;
    }
    .awph-tab.is-active { color: var(--text); font-weight: 600; }
    .awph-tab-count {
      font-family: var(--font-mono); font-size: 0.625rem; font-weight: 600; color: var(--text-muted);
      border: 1px solid var(--line); padding: 1px 5px; border-radius: 999px;
    }
    .awph-tab.is-active .awph-tab-count { color: var(--text); background: var(--surface-2); border: none; }
    .awph-tab-bar { position: absolute; left: 0; right: 0; bottom: -1px; height: 2px; background: var(--text); border-radius: 2px; }
  `],
})
export class BeautyAdminWebPageHeaderComponent {
  @Input() breadcrumb: string[] = [];
  @Input() title = '';
  @Input() sub = '';
  @Input() tabs: AdminWebTab[] | null = null;
  @Input() activeTab: string | null = null;
  @Output() tabSelect = new EventEmitter<string>();
}
