import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-prov-top-header',
  standalone: true,
  imports: [CommonModule],
  template: `
    <header class="prov-top-header" role="banner">
      <svg class="brand-mark" width="20" height="20" viewBox="0 0 24 24" fill="none"
           stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"
           aria-hidden="true">
        <rect x="4" y="3" width="16" height="18" rx="2"/>
        <path d="M8 7h2M14 7h2M8 11h2M14 11h2M8 15h2M14 15h2"/>
      </svg>
      <span class="brand-name">Beauty</span>
      <span class="business-badge">Business Portal</span>
      <span class="spacer"></span>
      <button type="button" class="bell-btn" (click)="bellClick.emit()"
              [attr.aria-label]="bellLabel">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/>
          <path d="M10 21a2 2 0 0 0 4 0"/>
        </svg>
        <span class="bell-badge" *ngIf="badge && badge > 0" aria-hidden="true">{{ badge }}</span>
      </button>
    </header>
  `,
  styles: [`
    :host {
      --surface: #F2F2F2; --line: #DCDCDF; --text: #0F1115; --text-muted: #6B6F77;
      --accent-blue: #CFE3F5; --accent-blue-deep: #7DA8CF;
      --font-body: 'Inter', system-ui, sans-serif;
      --font-display: 'Cormorant Garamond', Georgia, serif;
      display: block;
    }
    :host *:focus-visible { outline: 2px solid #1a3a52; outline-offset: 2px; border-radius: 6px; }
    .prov-top-header {
      background: var(--surface);
      height: 56px;
      padding: 0 16px;
      display: flex; align-items: center; gap: 10px;
      border-bottom: 1px solid var(--line);
      flex-shrink: 0;
      color: var(--text);
    }
    .brand-mark { color: var(--text); flex-shrink: 0; }
    .brand-name {
      font-family: var(--font-display);
      font-size: 22px; font-weight: 500;
      letter-spacing: 0.2px;
      color: var(--text); line-height: 1;
    }
    .business-badge {
      margin-left: 4px;
      font-family: var(--font-body);
      font-size: 9px; font-weight: 700;
      letter-spacing: 1.4px;
      text-transform: uppercase;
      color: #1a3a52;
      background: var(--accent-blue);
      padding: 4px 8px;
      border-radius: 999px;
      border: 1px solid rgba(125, 168, 207, 0.33);
    }
    .spacer { flex: 1; }
    .bell-btn {
      width: 44px; height: 44px;
      min-width: 44px; min-height: 44px;
      border-radius: 8px;
      background: transparent;
      border: none;
      cursor: pointer;
      display: grid; place-items: center;
      position: relative;
      color: var(--text);
    }
    .bell-badge {
      position: absolute;
      top: 6px; right: 6px;
      min-width: 16px; height: 16px;
      padding: 0 4px;
      border-radius: 999px;
      background: #C0392B; color: #fff;
      font-size: 10px; font-weight: 700; line-height: 16px;
      text-align: center;
      border: 1.5px solid #fff;
      font-family: var(--font-body);
    }
  `],
})
export class BeautyProviderTopHeaderComponent {
  @Input() badge: number | null = null;
  @Input() bellLabel = 'Notifications';
  @Output() bellClick = new EventEmitter<void>();
}
