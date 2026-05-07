import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-prov-sub-header',
  standalone: true,
  imports: [CommonModule],
  template: `
    <header class="prov-sub-header" role="banner">
      <button type="button" class="back-btn" (click)="backClick.emit()"
              [attr.aria-label]="'Back to ' + back">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M15 18l-6-6 6-6"/>
        </svg>
        <span>{{ back }}</span>
      </button>
      <h1 class="title">{{ title }}</h1>
      <span class="spacer"></span>
      <ng-content select="[slot=right]"></ng-content>
    </header>
  `,
  styles: [`
    :host {
      --surface: #F2F2F2; --line: #DCDCDF; --text: #0F1115; --text-muted: #6B6F77;
      --font-body: 'Inter', system-ui, sans-serif;
      --font-display: 'Cormorant Garamond', Georgia, serif;
      display: block;
    }
    :host *:focus-visible { outline: 2px solid #1a3a52; outline-offset: 2px; border-radius: 6px; }
    .prov-sub-header {
      background: var(--surface);
      color: var(--text);
      min-height: 56px;
      padding: 8px 12px;
      display: flex; align-items: center; gap: 10px;
      border-bottom: 1px solid var(--line);
      flex-shrink: 0;
    }
    .back-btn {
      min-height: 44px;
      padding: 0 10px 0 6px;
      border-radius: 8px;
      background: transparent;
      border: none;
      color: var(--text-muted);
      display: inline-flex; align-items: center; gap: 4px;
      cursor: pointer;
      font-family: var(--font-body);
      font-size: 13px; font-weight: 500;
    }
    .title {
      margin: 0;
      font-family: var(--font-display);
      font-size: 22px; font-weight: 500;
      letter-spacing: 0.2px;
      color: var(--text); line-height: 1.1;
    }
    .spacer { flex: 1; }
  `],
})
export class BeautyProviderSubHeaderComponent {
  @Input() back = 'Dashboard';
  @Input() title = '';
  @Output() backClick = new EventEmitter<void>();
}
