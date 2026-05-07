import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

export type ProvBtnVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'dangerOutline';
export type ProvBtnSize = 'sm' | 'md' | 'lg';

@Component({
  selector: 'app-prov-btn',
  standalone: true,
  imports: [CommonModule],
  template: `
    <button [type]="type" class="prov-btn"
            [class.full]="full"
            [class.size-sm]="size === 'sm'"
            [class.size-md]="size === 'md'"
            [class.size-lg]="size === 'lg'"
            [class.var-primary]="variant === 'primary'"
            [class.var-secondary]="variant === 'secondary'"
            [class.var-ghost]="variant === 'ghost'"
            [class.var-danger]="variant === 'danger'"
            [class.var-dangerOutline]="variant === 'dangerOutline'"
            [disabled]="disabled"
            (click)="clicked.emit($event)">
      <ng-content></ng-content>
    </button>
  `,
  styles: [`
    :host {
      --font-body: 'Inter', system-ui, sans-serif;
      display: inline-block;
    }
    :host.full { display: block; width: 100%; }
    :host *:focus-visible { outline: 2px solid #1a3a52; outline-offset: 2px; border-radius: 6px; }

    .prov-btn {
      border-radius: 10px;
      font-family: var(--font-body);
      font-weight: 600;
      letter-spacing: 0.2px;
      cursor: pointer;
      display: inline-flex; align-items: center; justify-content: center;
      gap: 6px;
      white-space: nowrap;
      line-height: 1;
      min-width: 44px; min-height: 44px;
    }
    .prov-btn.full { width: 100%; }
    .prov-btn[disabled] { cursor: not-allowed; opacity: 0.5; }

    .size-sm { height: 44px; padding: 0 14px; font-size: 12px; }
    .size-md { height: 44px; padding: 0 16px; font-size: 13px; }
    .size-lg { height: 48px; padding: 0 20px; font-size: 14px; }

    .var-primary { background: #0F1115; color: #FFFFFF; border: 1px solid #0F1115; }
    .var-secondary { background: #FFFFFF; color: #0F1115; border: 1px solid #DCDCDF; }
    .var-ghost { background: transparent; color: #0F1115; border: 1px solid transparent; }
    .var-danger { background: #C0392B; color: #FFFFFF; border: 1px solid #C0392B; }
    .var-dangerOutline { background: #FFFFFF; color: #C0392B; border: 1px solid rgba(192, 57, 43, 0.33); }
  `],
})
export class BeautyProviderButtonComponent {
  @Input() variant: ProvBtnVariant = 'primary';
  @Input() size: ProvBtnSize = 'md';
  @Input() full = false;
  @Input() disabled = false;
  @Input() type: 'button' | 'submit' = 'button';
  @Output() clicked = new EventEmitter<MouseEvent>();
}
