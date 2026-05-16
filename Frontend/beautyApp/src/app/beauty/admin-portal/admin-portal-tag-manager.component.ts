/**
 * AdminPortalTagManagerComponent — `/admin/portal/crm/tags`
 *
 * Bottom-sheet overlay over a dimmed CRM list snapshot. Lists every custom
 * tag with count + edit button, plus a New-tag row with color swatches.
 */

import { ChangeDetectionStrategy, Component, EventEmitter, HostListener, Inject, Input, Output, PLATFORM_ID } from '@angular/core';
import { CommonModule, Location, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { BffLink } from '../beauty-bff.types';

interface CrmTag { id: string; label: string; color: string; tone: string; count: number; }

@Component({
  selector: 'app-admin-portal-tag-manager',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="overlay" role="dialog" aria-modal="true" aria-labelledby="tag-manager-title" (click)="onBackdrop($event)">
      <div class="sheet" (click)="$event.stopPropagation()">
        <div class="handle"></div>

        <div class="head">
          <h2 id="tag-manager-title" class="title adm-display">Manage tags</h2>
          <span class="adm-mono count">{{ tags.length }} tags</span>
          <button type="button" class="close-x" aria-label="Close" (click)="onClose()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        <p class="desc">Tags attached here show up as filters in CRM and on the account detail page. Tags are admin-only — users never see them.</p>

        <!-- Create row -->
        <div class="create">
          <div class="adm-eyebrow on-light">New tag</div>
          <div class="create-row">
            <span class="swatch" [style.background]="selectedColor"></span>
            <input class="name-in" type="text" [(ngModel)]="newTagName" placeholder="Tag name…" />
            <button type="button" class="create-btn" (click)="onCreate()">Create</button>
          </div>
          <div class="colors">
            <span *ngFor="let c of colorPalette" class="cell"
                  [style.background]="c"
                  [class.is-on]="c === selectedColor"
                  (click)="selectedColor = c"></span>
          </div>
          <div class="err" *ngIf="errorMessage" role="alert">{{ errorMessage }}</div>
        </div>

        <div class="list">
          <div *ngFor="let t of tags" class="tag-row">
            <span class="tchip"
                  [style.background]="t.tone"
                  [style.color]="t.color"
                  [style.borderColor]="t.color + '33'">
              <span class="dot" [style.background]="t.color"></span>
              {{ t.label }}
            </span>
            <span class="grow"></span>
            <span class="cnt adm-mono">{{ t.count.toLocaleString() }} accts</span>
            <button type="button" class="edit-btn" [attr.aria-label]="'Edit ' + t.label">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; position: fixed; inset: 0; z-index: 1200; }
    .overlay { position: fixed; inset: 0; background: rgba(15,17,21,0.5); display: flex; align-items: flex-end; }
    @media screen and (min-width: 768px) {
      .overlay { max-width: 430px; margin: 0 auto; left: 0; right: 0; }
    }
    .sheet { width: 100%; background: #fff; border-top-left-radius: 18px; border-top-right-radius: 18px; padding: 14px 0 22px; max-height: 85%; display: flex; flex-direction: column; }
    .handle { width: 36px; height: 4px; border-radius: 2px; background: var(--line); margin: 0 auto 12px; }

    .head { padding: 0 18px 12px; display: flex; align-items: center; gap: 10px; }
    .title { margin: 0; font-size: 22px; color: var(--text); flex: 1; }
    .count { font-size: 11px; color: var(--text-muted); }
    .close-x { width: 32px; height: 32px; border-radius: 8px; background: var(--surface); border: 1px solid var(--line); color: var(--text); display: grid; place-items: center; cursor: pointer; flex-shrink: 0; }

    .desc { padding: 0 18px 10px; font-size: 12px; color: var(--text-muted); line-height: 1.5; margin: 0; }

    .create { margin: 4px 14px 12px; padding: 10px 12px; background: var(--surface); border: 1px solid var(--line); border-radius: 12px; }
    .create .adm-eyebrow { margin-bottom: 6px; }
    .create-row { display: flex; gap: 6px; align-items: center; }
    .swatch { width: 26px; height: 26px; border-radius: 7px; flex-shrink: 0; border: 2px solid #fff; box-shadow: 0 0 0 1px var(--line); }
    .name-in { flex: 1; height: 30px; border: 1px solid var(--line); border-radius: 7px; background: #fff; padding: 0 10px; font-family: var(--adm-font-body); font-size: 12.5px; color: var(--text); outline: none; }
    .create-btn { height: 30px; padding: 0 12px; border-radius: 7px; border: none; background: #0F1115; color: #fff; font-weight: 700; font-size: 11.5px; cursor: pointer; }

    .colors { display: flex; gap: 5px; margin-top: 8px; }
    .colors .cell { width: 20px; height: 20px; border-radius: 5px; border: 1px solid rgba(15,17,21,0.10); cursor: pointer; }
    .colors .cell.is-on { border: 2px solid #0F1115; }
    .err { margin-top: 8px; font-size: 11px; color: var(--danger); }

    .list { overflow: auto; padding: 0 14px; }
    .tag-row { display: flex; align-items: center; gap: 10px; padding: 10px 4px; border-top: 1px solid #ECECEE; }
    .tag-row:first-child { border-top: none; }
    .tchip { display: inline-flex; align-items: center; gap: 5px; padding: 4px 9px; border-radius: 999px; border: 1px solid; font-family: var(--adm-font-body); font-size: 11px; font-weight: 600; line-height: 1.2; white-space: nowrap; flex-shrink: 0; }
    .tchip .dot { width: 6px; height: 6px; border-radius: 50%; }
    .grow { flex: 1; }
    .cnt { font-size: 10.5px; color: var(--text-muted); }
    .edit-btn { width: 26px; height: 26px; border: 1px solid var(--line); background: #fff; border-radius: 6px; cursor: pointer; display: grid; place-items: center; color: var(--text-muted); }
  `],
})
export class AdminPortalTagManagerComponent {
  @Input() data: Record<string, unknown> = {};
  @Input() links: Record<string, BffLink> = {};
  @Output() followLink = new EventEmitter<BffLink>();
  @Output() createTag = new EventEmitter<{ label: string; color: string; tone: string }>();

  constructor(
    private location: Location,
    @Inject(PLATFORM_ID) private platformId: object,
  ) {}

  newTagName = 'Photoshoot';
  selectedColor = '#7DA8CF';
  readonly colorPalette = ['#A06B2C', '#2F7A47', '#C0392B', '#7DA8CF', '#5C4A8A', '#8A6A1F', '#1F6E7A', '#0F1115'];
  errorMessage: string | null = null;

  // baby-blue tone fallback per palette color
  private readonly toneFor: Record<string, string> = {
    '#A06B2C': '#F4E7D6',
    '#2F7A47': '#E5F3EA',
    '#C0392B': '#FCE8E5',
    '#7DA8CF': '#E6F0FA',
    '#5C4A8A': '#ECE6F5',
    '#8A6A1F': '#F1E8DA',
    '#1F6E7A': '#DCEEF1',
    '#0F1115': '#E9E9EB',
  };

  get tags(): CrmTag[] {
    return (this.data['tags'] as CrmTag[]) ?? [
      { id: 'vip',        label: 'VIP',          color: '#A06B2C', tone: '#F4E7D6', count: 184  },
      { id: 'verified',   label: 'Verified',     color: '#2F7A47', tone: '#E5F3EA', count: 9620 },
      { id: 'at-risk',    label: 'At-risk',      color: '#C0392B', tone: '#FCE8E5', count: 38   },
      { id: 'press',      label: 'Press / PR',   color: '#0F1115', tone: '#E9E9EB', count: 12   },
      { id: 'investor',   label: 'Investor',     color: '#5C4A8A', tone: '#ECE6F5', count: 6    },
      { id: 'featured',   label: 'Featured',     color: '#7DA8CF', tone: '#E6F0FA', count: 24   },
      { id: 'beta',       label: 'Beta program', color: '#1F6E7A', tone: '#DCEEF1', count: 88   },
      { id: 'win-back',   label: 'Win-back',     color: '#8A6A1F', tone: '#F1E8DA', count: 410  },
      { id: 'chargeback', label: 'Chargeback',   color: '#C0392B', tone: '#FCE8E5', count: 17   },
    ];
  }

  onCreate(): void {
    const label = (this.newTagName || '').trim();
    if (!label) { this.errorMessage = 'Tag name required.'; return; }
    const color = this.selectedColor;
    const tone = this.toneFor[color] ?? color;
    this.errorMessage = null;
    this.createTag.emit({ label, color, tone });
  }

  onBackdrop(_ev: MouseEvent): void {
    this.onClose();
  }

  onClose(): void {
    // Prefer browser history so closing returns to wherever the user came
    // from (CRM with active filters, dashboard, deep link, etc). Fall back
    // to the BFF `close` link if there's no history entry to pop.
    if (isPlatformBrowser(this.platformId) && window.history.length > 1) {
      this.location.back();
      return;
    }
    const link = this.links['close'];
    if (link) this.followLink.emit(link);
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.onClose();
  }
}
