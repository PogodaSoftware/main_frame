import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BeautyProviderCardComponent } from './prov-card.component';

@Component({
  selector: 'app-prov-empty-hint',
  standalone: true,
  imports: [CommonModule, BeautyProviderCardComponent],
  template: `
    <app-prov-card [padding]="20">
      <div class="empty-wrap">
        <div class="bubble">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M12 2v4M12 18v4M2 12h4M18 12h4M4.9 4.9l2.8 2.8M16.3 16.3l2.8 2.8M4.9 19.1l2.8-2.8M16.3 7.7l2.8-2.8"/>
          </svg>
        </div>
        <div class="title">{{ title }}</div>
        <div class="body" *ngIf="body">{{ body }}</div>
        <ng-content></ng-content>
      </div>
    </app-prov-card>
  `,
  styles: [`
    :host {
      --accent-blue: #CFE3F5; --accent-blue-deep: #7DA8CF;
      --text: #0F1115; --text-muted: #6B6F77;
      --font-body: 'Inter', system-ui, sans-serif;
      --font-display: 'Cormorant Garamond', Georgia, serif;
      display: block;
    }
    .empty-wrap { text-align: center; }
    .bubble {
      width: 48px; height: 48px;
      border-radius: 50%;
      margin: 0 auto 10px;
      background: var(--accent-blue);
      color: var(--accent-blue-deep);
      display: grid; place-items: center;
    }
    .title {
      font-family: var(--font-display);
      font-size: 20px; font-weight: 500;
      color: var(--text);
      margin-bottom: 4px;
    }
    .body {
      font-size: 12px;
      color: var(--text-muted);
      margin-bottom: 14px;
      line-height: 1.5;
      font-family: var(--font-body);
    }
  `],
})
export class BeautyProviderEmptyHintComponent {
  @Input() title = '';
  @Input() body = '';
}
