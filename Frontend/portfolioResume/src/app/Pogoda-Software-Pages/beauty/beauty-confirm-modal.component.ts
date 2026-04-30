/**
 * BeautyConfirmModalComponent (Presentational)
 * --------------------------------------------
 * Shared "Are you sure?" confirmation dialog used for every destructive
 * action in the Beauty app (regular cancel, in-grace cancel, business-
 * issued cancel-with-refund, etc.). Standalone so any feature component
 * can drop it in without going through a barrel module.
 *
 * Usage
 *   ```html
 *   <app-beauty-confirm-modal
 *     *ngIf="showCancelConfirm"
 *     [open]="showCancelConfirm"
 *     [title]="'Cancel this booking?'"
 *     [body]="'You may be charged a late fee.'"
 *     [primaryLabel]="'Yes, cancel'"
 *     [primaryVariant]="'danger'"
 *     (confirmed)="onCancelConfirmed()"
 *     (dismissed)="showCancelConfirm = false"
 *   />
 *   ```
 *
 * Variants: `'danger'` (default — filled red) and `'neutral'` (ink).
 * The dialog only emits `confirmed` on accept and `dismissed` on close;
 * it does not perform the destructive action itself — the caller does.
 *
 * Accessibility (WCAG 2.1.1, 2.1.2, 2.4.3, 4.1.2):
 *   - Focus is moved to the primary action when the dialog opens.
 *   - Focus is restored to the previously-active element when closed.
 *   - Tab cycles inside the dialog; Shift+Tab cycles backwards.
 *   - Escape closes the dialog (same as the secondary button).
 */

import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Inject,
  Input,
  OnChanges,
  Output,
  PLATFORM_ID,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';

@Component({
  selector: 'app-beauty-confirm-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      *ngIf="open"
      #backdrop
      class="beauty-modal-backdrop"
      role="dialog"
      aria-modal="true"
      [attr.aria-labelledby]="modalTitleId"
      (click)="onBackdropClick($event)"
    >
      <div class="beauty-modal" (click)="$event.stopPropagation()">
        <h2 [id]="modalTitleId" class="beauty-modal-title">{{ title }}</h2>
        <p *ngIf="body" class="beauty-modal-body">{{ body }}</p>
        <div class="beauty-modal-actions">
          <button
            #secondaryBtn
            type="button"
            class="beauty-modal-btn secondary"
            (click)="onDismiss()"
            [disabled]="busy"
          >{{ secondaryLabel }}</button>
          <button
            #primaryBtn
            type="button"
            class="beauty-modal-btn primary"
            [class.is-danger]="primaryVariant === 'danger'"
            [class.is-neutral]="primaryVariant !== 'danger'"
            (click)="onConfirm()"
            [disabled]="busy"
          >
            <span *ngIf="busy" class="spinner" aria-hidden="true"></span>
            {{ busy ? (busyLabel || 'Working…') : primaryLabel }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host { --danger: #C0392B; --ink: #0A0A0B; --line: #DCDCDF; --text: #0F1115; --text-muted: #6B6F77; }

    /* a11y: shared focus ring (WCAG 2.4.7) */
    :host *:focus-visible {
      outline: 2px solid #1a3a52;
      outline-offset: 2px;
      border-radius: 6px;
    }

    .beauty-modal-backdrop {
      position: fixed; inset: 0; z-index: 9999;
      background: rgba(15, 17, 21, 0.55);
      display: grid; place-items: center; padding: 16px;
      animation: bm-fade .15s ease-out;
    }
    .beauty-modal {
      width: 100%; max-width: 360px;
      background: #FFFFFF; border-radius: 14px;
      padding: 20px 18px 14px;
      box-shadow: 0 12px 40px rgba(15,35,60,0.30);
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
      color: var(--text);
    }
    .beauty-modal-title {
      font-family: 'Cormorant Garamond', Georgia, serif;
      font-size: 1.4rem; font-weight: 500;
      margin: 0 0 8px; line-height: 1.2;
    }
    .beauty-modal-body {
      font-size: 0.85rem; color: var(--text-muted);
      line-height: 1.45; margin: 0 0 16px;
    }
    .beauty-modal-actions {
      display: flex; gap: 8px; justify-content: flex-end;
      flex-wrap: wrap-reverse;
    }
    .beauty-modal-btn {
      flex: 1 1 auto; min-width: 130px;
      min-height: 44px; height: 44px; border-radius: 10px;
      font-size: 0.85rem; font-weight: 600; letter-spacing: 0.2px;
      font-family: inherit; cursor: pointer;
      display: inline-flex; align-items: center; justify-content: center; gap: 6px;
      transition: background-color .15s ease, border-color .15s ease;
    }
    .beauty-modal-btn.secondary {
      background: #FFFFFF; color: var(--text);
      border: 1px solid var(--line);
    }
    .beauty-modal-btn.secondary:hover:not(:disabled) { border-color: var(--text); }
    .beauty-modal-btn.primary.is-danger {
      background: var(--danger); color: #FFFFFF;
      border: 1px solid var(--danger);
      box-shadow: 0 2px 8px rgba(192,57,43,0.25);
    }
    .beauty-modal-btn.primary.is-danger:hover:not(:disabled) { background: #9F2E22; border-color: #9F2E22; }
    .beauty-modal-btn.primary.is-neutral {
      background: var(--ink); color: #FFFFFF; border: 1px solid var(--ink);
    }
    .beauty-modal-btn.primary.is-neutral:hover:not(:disabled) { background: #1F1F22; }
    .beauty-modal-btn:disabled { opacity: 0.6; cursor: not-allowed; }
    .spinner {
      width: 14px; height: 14px;
      border: 2px solid rgba(255,255,255,0.4); border-top-color: #fff;
      border-radius: 50%; animation: bm-spin .7s linear infinite;
    }
    @keyframes bm-fade { from { opacity: 0; } to { opacity: 1; } }
    @keyframes bm-spin { to { transform: rotate(360deg); } }
    @media (prefers-reduced-motion: reduce) {
      .beauty-modal-backdrop { animation: none; }
      .spinner { animation: none; }
    }
  `],
})
export class BeautyConfirmModalComponent implements OnChanges, AfterViewInit {
  /** Whether the modal is visible. The component renders nothing when false. */
  @Input() open = false;
  @Input() title = 'Are you sure?';
  @Input() body = '';
  @Input() primaryLabel = 'Confirm';
  @Input() secondaryLabel = 'Keep booking';
  @Input() primaryVariant: 'danger' | 'neutral' = 'danger';
  /** When true, both buttons disable and the primary shows a spinner. */
  @Input() busy = false;
  @Input() busyLabel: string | null = null;
  /** Optional ID — defaults to a stable string so SSR + CSR match. */
  @Input() modalTitleId = 'beauty-confirm-modal-title';

  @Output() confirmed = new EventEmitter<void>();
  @Output() dismissed = new EventEmitter<void>();

  @ViewChild('primaryBtn', { static: false }) primaryBtnRef?: ElementRef<HTMLButtonElement>;
  @ViewChild('backdrop', { static: false }) backdropRef?: ElementRef<HTMLElement>;

  /** Element the user was focused on when the modal opened. */
  private previouslyFocused: HTMLElement | null = null;
  private isBrowser = false;

  constructor(@Inject(PLATFORM_ID) platformId: object, private host: ElementRef<HTMLElement>) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!('open' in changes) || !this.isBrowser) return;
    const ch = changes['open'];
    const becameOpen = ch.currentValue === true && ch.previousValue !== true;
    const becameClosed = ch.currentValue === false && ch.previousValue === true;

    if (becameOpen) {
      this.previouslyFocused = (document.activeElement as HTMLElement | null) || null;
      // Focus the primary button after Angular has finished rendering.
      // queueMicrotask waits for *ngIf to materialise the ViewChild.
      queueMicrotask(() => {
        // Fall back to setTimeout in case microtask runs before view init.
        setTimeout(() => this.primaryBtnRef?.nativeElement?.focus(), 0);
      });
    } else if (becameClosed) {
      const prev = this.previouslyFocused;
      this.previouslyFocused = null;
      if (prev && typeof prev.focus === 'function') {
        // Defer to allow the ngIf-driven detach to complete first.
        setTimeout(() => prev.focus(), 0);
      }
    }
  }

  ngAfterViewInit(): void {
    // Catch case where modal renders open immediately after init.
    if (this.open && this.isBrowser) {
      this.previouslyFocused = (document.activeElement as HTMLElement | null) || null;
      setTimeout(() => this.primaryBtnRef?.nativeElement?.focus(), 0);
    }
  }

  @HostListener('document:keydown.escape', ['$event'])
  onEscape(e: KeyboardEvent): void {
    if (!this.open || this.busy) return;
    e.preventDefault();
    e.stopPropagation();
    this.dismissed.emit();
  }

  @HostListener('document:keydown.tab', ['$event'])
  onTab(e: KeyboardEvent): void {
    this.handleFocusTrap(e, false);
  }

  @HostListener('document:keydown.shift.tab', ['$event'])
  onShiftTab(e: KeyboardEvent): void {
    this.handleFocusTrap(e, true);
  }

  private handleFocusTrap(e: KeyboardEvent, isShift: boolean): void {
    if (!this.open) return;
    const root = this.backdropRef?.nativeElement;
    if (!root) return;
    const focusable = this.collectFocusable(root);
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement as HTMLElement | null;

    // If focus has escaped the dialog, pull it back.
    if (!active || !root.contains(active)) {
      e.preventDefault();
      first.focus();
      return;
    }

    if (isShift && active === first) {
      e.preventDefault();
      last.focus();
    } else if (!isShift && active === last) {
      e.preventDefault();
      first.focus();
    }
  }

  private collectFocusable(root: HTMLElement): HTMLElement[] {
    const sel = [
      'button:not([disabled])',
      '[href]',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
    ].join(',');
    return Array.from(root.querySelectorAll<HTMLElement>(sel))
      .filter((el) => el.offsetParent !== null || el === document.activeElement);
  }

  onConfirm(): void {
    if (this.busy) return;
    this.confirmed.emit();
  }

  onDismiss(): void {
    if (this.busy) return;
    this.dismissed.emit();
  }

  onBackdropClick(_e: MouseEvent): void {
    if (this.busy) return;
    this.dismissed.emit();
  }
}
