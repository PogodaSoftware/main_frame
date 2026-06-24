/**
 * AdminPortalSuspendConfirmComponent — `/admin/portal/crm/suspend/:type/:id`
 *
 * Desktop redesign (web) per `web-admin-pages2.jsx` WebSuspendModal: a centered
 * dialog over a dimmed full-screen backdrop (the modal is its own BFF route, so
 * there is no live page behind it to blur — we dim instead). Resolver supplies
 * the account name + default reason + suspend/reinstate direction.
 *
 * Destructive-action contract (handoff §12):
 *   - The reason is REQUIRED + audited when suspending. An empty reason shows a
 *     validation error and does NOT call the BFF. (Reinstate's note is optional.)
 *   - Focus-trap + Escape-to-close + focus-restore on close.
 *
 * Confirm emits `(confirm)`; the shell POSTs the BFF `submit` link
 * (/api/beauty/admin/crm/suspend/ — invalidates sessions + writes an audit
 * event), then navigates back to CRM. The @Input/@Output contract is unchanged.
 */

import {
  AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef,
  EventEmitter, HostListener, Inject, Input, OnDestroy, Output, PLATFORM_ID, ViewChild,
} from '@angular/core';
import { CommonModule, Location, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { BffLink } from '../beauty-bff.types';

@Component({
  selector: 'app-admin-portal-suspend-confirm',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="aw-modal" (click)="onBackdrop($event)" (keydown)="onKeydown($event)">
      <div #dialog class="aw-dialog" role="dialog" aria-modal="true" aria-labelledby="suspend-title"
           (click)="$event.stopPropagation()">

        <span class="sr-only" aria-live="polite">{{ srAnnounce }}</span>

        <div class="aw-icon" [class.ok]="isCurrentlySuspended" aria-hidden="true">
          <svg *ngIf="!isCurrentlySuspended" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#C0392B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 2l10 18H2L12 2z"/><path d="M12 9v5M12 17h.01"/>
          </svg>
          <svg *ngIf="isCurrentlySuspended" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2F7A47" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/>
          </svg>
        </div>

        <h2 id="suspend-title" class="aw-title">
          {{ isCurrentlySuspended ? 'Reinstate this ' + kindLabel + '?' : 'Suspend this ' + kindLabel + '?' }}
        </h2>

        <p class="aw-body" *ngIf="!isCurrentlySuspended">
          <b>{{ accountName }}</b> will be signed out, hidden from search, and notified by email.
          Existing bookings remain valid until canceled. The account is preserved — you can reinstate at any time.
        </p>
        <p class="aw-body" *ngIf="isCurrentlySuspended">
          <b>{{ accountName }}</b> will regain access to sign in and appear in search again.
          A reinstatement email is sent automatically.
        </p>

        <label class="aw-eyebrow" for="suspend-reason">
          {{ isCurrentlySuspended ? 'Note (optional, sent to user)' : 'Reason (required, audited)' }}
        </label>
        <textarea id="suspend-reason" class="aw-reason" [rows]="isCurrentlySuspended ? 3 : 4"
                  [(ngModel)]="reason" name="reason"
                  [attr.aria-required]="!isCurrentlySuspended"
                  [attr.aria-invalid]="!!errorMessage"
                  (input)="errorMessage = null"
                  [placeholder]="isCurrentlySuspended ? 'Welcome back — your account has been reinstated.' : 'Explain why — this is audited and emailed to the user.'"></textarea>

        <div class="aw-notice" [class.ok]="isCurrentlySuspended" role="status">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" [attr.stroke]="isCurrentlySuspended ? '#2F7A47' : '#C0392B'" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M4 4h16v16H4z"/><path d="M22 6L12 13 2 6"/>
          </svg>
          <span>{{ isCurrentlySuspended
            ? 'An email will be sent confirming the account is active.'
            : 'An email will be sent to the user explaining the suspension.' }}</span>
        </div>

        <div class="aw-err" *ngIf="errorMessage" role="alert">{{ errorMessage }}</div>

        <div class="aw-actions">
          <button type="button" class="aw-btn aw-btn--sec" (click)="onClose()">
            {{ isCurrentlySuspended ? 'Cancel' : 'Keep active' }}
          </button>
          <button type="button" class="aw-btn" [class.aw-btn--danger]="!isCurrentlySuspended"
                  [class.aw-btn--pri]="isCurrentlySuspended" [disabled]="submitting" (click)="onConfirm()">
            {{ submitting ? 'Working…' : (isCurrentlySuspended ? 'Reinstate account' : 'Yes, suspend') }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      --line: #DCDCDF; --text: #0F1115; --text-muted: #6B6F77;
      --surface: #F2F2F2; --danger: #C0392B; --admin-red: #B23A2D; --ok: #2F7A47;
      --font-body: 'Inter', system-ui, -apple-system, sans-serif;
      --font-display: 'Cormorant Garamond', Georgia, serif;
      display: block; position: fixed; inset: 0; z-index: 1200;
    }
    * { box-sizing: border-box; }
    .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0; }

    .aw-modal { position: fixed; inset: 0; background: rgba(15,17,21,0.5); backdrop-filter: blur(2px); display: grid; place-items: center; padding: 40px; font-family: var(--font-body); }
    .aw-dialog { background: #fff; border-radius: 16px; width: 100%; max-width: 480px; padding: 28px; box-shadow: 0 20px 60px rgba(0,0,0,0.30); }

    .aw-icon { width: 44px; height: 44px; border-radius: 12px; background: #FCE8E5; display: grid; place-items: center; margin-bottom: 16px; }
    .aw-icon.ok { background: #E5F3EA; }

    .aw-title { margin: 0 0 8px; font-family: var(--font-display); font-size: 1.625rem; font-weight: 500; color: var(--text); line-height: 1.1; }
    .aw-body { margin: 0 0 18px; font-size: 0.8125rem; color: var(--text-muted); line-height: 1.55; }
    .aw-body b { color: var(--text); font-weight: 700; }

    .aw-eyebrow { display: block; font-size: 0.625rem; font-weight: 700; letter-spacing: 1.4px; text-transform: uppercase; color: var(--text-muted); margin-bottom: 6px; }
    .aw-reason { width: 100%; min-height: 70px; resize: vertical; background: var(--surface); border: 1px solid var(--line); border-radius: 10px; padding: 12px; font-family: var(--font-body); font-size: 0.8125rem; color: var(--text); outline: none; line-height: 1.5; }
    .aw-reason:focus { border-color: var(--text); }
    .aw-reason[aria-invalid="true"] { border-color: var(--danger); }

    .aw-notice { display: flex; align-items: center; gap: 8px; margin-top: 14px; padding: 8px 10px; background: #FCE8E5; border-radius: 8px; color: var(--danger); font-size: 0.6875rem; font-weight: 600; }
    .aw-notice.ok { background: #E5F3EA; color: var(--ok); }

    .aw-err { margin-top: 12px; background: rgba(192,57,43,0.10); border: 1px solid rgba(192,57,43,0.30); color: var(--danger); border-radius: 8px; padding: 8px 10px; font-size: 0.75rem; }

    .aw-actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 18px; }
    .aw-btn { height: 40px; padding: 0 16px; border-radius: 10px; font-family: var(--font-body); font-size: 0.8125rem; font-weight: 600; cursor: pointer; line-height: 1; border: 1px solid transparent; }
    .aw-btn--sec { background: #fff; color: var(--text); border-color: var(--line); }
    .aw-btn--pri { background: #0F1115; color: #fff; border-color: #0F1115; }
    .aw-btn--danger { background: var(--danger); color: #fff; border-color: var(--danger); }
    .aw-btn:disabled { opacity: 0.5; cursor: not-allowed; }

    :host *:focus-visible { outline: 2px solid var(--admin-red); outline-offset: 2px; border-radius: 6px; }
  `],
})
export class AdminPortalSuspendConfirmComponent implements AfterViewInit, OnDestroy {
  @Input() data: Record<string, unknown> = {};
  @Input() links: Record<string, BffLink> = {};
  @Output() followLink = new EventEmitter<BffLink>();
  @Output() confirm = new EventEmitter<{ type: 'customer' | 'business'; id: number; reason: string; suspended: boolean }>();

  @ViewChild('dialog') dialogRef?: ElementRef<HTMLElement>;

  errorMessage: string | null = null;
  submitting = false;
  srAnnounce = '';
  private prevFocus: HTMLElement | null = null;

  constructor(
    private location: Location,
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) private platformId: object,
  ) {}

  get kind(): 'customer' | 'business' {
    return ((this.data['kind'] as 'customer' | 'business') ?? 'customer');
  }
  get kindLabel(): string { return this.kind === 'business' ? 'business' : 'customer'; }
  get accountName(): string { return (this.data['name'] as string) ?? 'this account'; }
  get targetId(): number { return (this.data['id'] as number) ?? 0; }
  get isCurrentlySuspended(): boolean { return Boolean(this.data['is_currently_suspended']); }

  reason = '';
  private reasonInited = false;
  ngDoCheck(): void {
    if (this.reasonInited) return;
    const seed = (this.data['default_reason'] as string) ?? '';
    if (seed) { this.reason = seed; }
    if (Object.keys(this.data).length) { this.reasonInited = true; }
  }

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.prevFocus = (document.activeElement as HTMLElement) ?? null;
    this.srAnnounce = this.isCurrentlySuspended ? 'Reinstate confirmation dialog opened.' : 'Suspend confirmation dialog opened.';
    setTimeout(() => {
      const ta = this.dialogRef?.nativeElement.querySelector<HTMLElement>('textarea');
      (ta ?? this.focusables()[0])?.focus();
      this.cdr.markForCheck();
    });
  }

  ngOnDestroy(): void {
    if (this.prevFocus && typeof this.prevFocus.focus === 'function') {
      try { this.prevFocus.focus(); } catch { /* element gone */ }
    }
  }

  private focusables(): HTMLElement[] {
    const root = this.dialogRef?.nativeElement;
    if (!root) return [];
    return Array.from(
      root.querySelectorAll<HTMLElement>('button, textarea, [href], input, select, [tabindex]:not([tabindex="-1"])'),
    ).filter((el) => !el.hasAttribute('disabled'));
  }

  /** Trap Tab within the dialog. */
  onKeydown(ev: KeyboardEvent): void {
    if (ev.key !== 'Tab') return;
    const f = this.focusables();
    if (!f.length) return;
    const first = f[0];
    const last = f[f.length - 1];
    const active = document.activeElement as HTMLElement;
    if (ev.shiftKey && active === first) { ev.preventDefault(); last.focus(); }
    else if (!ev.shiftKey && active === last) { ev.preventDefault(); first.focus(); }
  }

  onBackdrop(_ev: MouseEvent): void { this.onClose(); }

  onClose(): void {
    if (isPlatformBrowser(this.platformId) && window.history.length > 1) {
      this.location.back();
      return;
    }
    const link = this.links['close'];
    if (link) this.followLink.emit(link);
  }

  onConfirm(): void {
    const reason = this.reason.trim();
    // Required, audited reason when suspending (handoff §12). Empty → validate, no BFF call.
    if (!this.isCurrentlySuspended && !reason) {
      this.errorMessage = 'A reason is required — it is audited and emailed to the user.';
      this.dialogRef?.nativeElement.querySelector<HTMLElement>('textarea')?.focus();
      return;
    }
    this.errorMessage = null;
    this.submitting = true;
    this.confirm.emit({
      type: this.kind,
      id: this.targetId,
      reason,
      suspended: !this.isCurrentlySuspended,
    });
  }

  @HostListener('document:keydown.escape')
  onEscape(): void { this.onClose(); }
}
