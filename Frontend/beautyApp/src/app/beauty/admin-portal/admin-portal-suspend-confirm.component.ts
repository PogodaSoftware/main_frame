/**
 * AdminPortalSuspendConfirmComponent — `/admin/portal/crm/suspend/:type/:id`
 *
 * Destructive-action confirm sheet. Resolver supplies the account name +
 * default reason. Confirm POSTs to the existing
 * /api/beauty/admin/crm/suspend/ endpoint, then routes back to CRM.
 */

import { ChangeDetectionStrategy, Component, EventEmitter, HostListener, Inject, Input, Output, PLATFORM_ID } from '@angular/core';
import { CommonModule, Location, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { BffLink } from '../beauty-bff.types';
import { AdmBtnComponent } from './atoms';

@Component({
  selector: 'app-admin-portal-suspend-confirm',
  standalone: true,
  imports: [CommonModule, FormsModule, AdmBtnComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="overlay" role="dialog" aria-modal="true" aria-labelledby="suspend-title" (click)="onBackdrop($event)">
      <div class="sheet" (click)="$event.stopPropagation()">
        <div class="handle"></div>

        <ng-container *ngIf="!isCurrentlySuspended">
          <div class="danger-icon" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#C0392B" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"/><path d="M4.93 4.93l14.14 14.14"/>
            </svg>
          </div>

          <h2 id="suspend-title" class="title adm-display">Suspend this {{ kindLabel }}?</h2>
          <p class="body">
            <b>{{ accountName }}</b> will be signed out, hidden from search, and
            notified by email. Existing bookings remain valid until canceled.
          </p>

          <div class="adm-eyebrow on-light reason-head">Reason (sent to user)</div>
          <textarea class="reason" rows="4" [(ngModel)]="reason" aria-label="Suspension reason"></textarea>

          <div class="notice" role="status">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#C0392B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M4 4h16v16H4z"/><path d="M22 6L12 13 2 6"/>
            </svg>
            <span>An email will be sent to the user explaining the suspension.</span>
          </div>
        </ng-container>

        <ng-container *ngIf="isCurrentlySuspended">
          <div class="restore-icon" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2F7A47" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/>
            </svg>
          </div>

          <h2 id="suspend-title" class="title adm-display">Reinstate this {{ kindLabel }}?</h2>
          <p class="body">
            <b>{{ accountName }}</b> will regain access to sign in and appear in
            search again. A reinstatement email is sent automatically.
          </p>

          <div class="adm-eyebrow on-light reason-head">Note (optional, sent to user)</div>
          <textarea class="reason" rows="3" [(ngModel)]="reason" aria-label="Reinstatement note"
                    placeholder="Welcome back — your account has been reinstated."></textarea>

          <div class="notice ok" role="status">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#2F7A47" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/>
            </svg>
            <span>An email will be sent confirming the account is active.</span>
          </div>
        </ng-container>

        <div class="err" *ngIf="errorMessage" role="alert">{{ errorMessage }}</div>

        <div class="actions">
          <adm-btn variant="secondary" size="lg" (press)="onClose()">Cancel</adm-btn>
          <adm-btn *ngIf="!isCurrentlySuspended" variant="danger" size="lg" (press)="onConfirm()">Suspend account</adm-btn>
          <adm-btn *ngIf="isCurrentlySuspended" variant="primary" size="lg" (press)="onConfirm()">Reinstate account</adm-btn>
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
    .sheet { width: 100%; background: #fff; border-top-left-radius: 18px; border-top-right-radius: 18px; padding: 18px 18px 28px; }
    .handle { width: 36px; height: 4px; border-radius: 2px; background: var(--line); margin: 0 auto 14px; }

    .danger-icon { width: 44px; height: 44px; border-radius: 12px; background: #FCE8E5; display: grid; place-items: center; margin-bottom: 12px; }
    .restore-icon { width: 44px; height: 44px; border-radius: 12px; background: #E5F3EA; display: grid; place-items: center; margin-bottom: 12px; }

    .title { margin: 0 0 6px; font-size: 22px; color: var(--text); }
    .body { margin: 0 0 14px; font-size: 13px; color: var(--text-muted); line-height: 1.5; }
    .body b { color: var(--text); }

    .reason-head { margin-bottom: 6px; }
    .reason { width: 100%; background: var(--surface); border: 1px solid var(--line); border-radius: 10px; padding: 10px 12px; min-height: 84px; font-size: 13px; color: var(--text); line-height: 1.5; resize: vertical; font-family: var(--adm-font-body); outline: none; margin-bottom: 10px; }

    .notice { display: flex; align-items: center; gap: 8px; margin-bottom: 14px; padding: 8px 10px; background: #FCE8E5; border-radius: 8px; color: #C0392B; font-size: 11px; font-weight: 600; }
    .notice.ok { background: #E5F3EA; color: #2F7A47; }

    .err { background: rgba(192,57,43,0.10); border: 1px solid rgba(192,57,43,0.30); color: var(--danger); border-radius: 8px; padding: 8px 10px; font-size: 12px; margin-bottom: 12px; }

    .actions { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
    .actions adm-btn { display: block; }
  `],
})
export class AdminPortalSuspendConfirmComponent {
  @Input() data: Record<string, unknown> = {};
  @Input() links: Record<string, BffLink> = {};
  @Output() followLink = new EventEmitter<BffLink>();
  @Output() confirm = new EventEmitter<{ type: 'customer' | 'business'; id: number; reason: string; suspended: boolean }>();

  errorMessage: string | null = null;

  constructor(
    private location: Location,
    @Inject(PLATFORM_ID) private platformId: object,
  ) {}

  get kind(): 'customer' | 'business' {
    return ((this.data['kind'] as 'customer' | 'business') ?? 'customer');
  }
  get kindLabel(): string {
    return this.kind === 'business' ? 'business' : 'customer';
  }
  get accountName(): string {
    return (this.data['name'] as string) ?? 'this account';
  }
  get targetId(): number {
    return (this.data['id'] as number) ?? 0;
  }
  get isCurrentlySuspended(): boolean {
    return Boolean(this.data['is_currently_suspended']);
  }

  reason = '';
  private reasonInited = false;
  ngDoCheck(): void {
    if (this.reasonInited) return;
    const seed = (this.data['default_reason'] as string) ?? '';
    if (seed) { this.reason = seed; this.reasonInited = true; }
  }

  onBackdrop(_ev: MouseEvent): void {
    this.onClose();
  }

  onClose(): void {
    if (isPlatformBrowser(this.platformId) && window.history.length > 1) {
      this.location.back();
      return;
    }
    const link = this.links['close'];
    if (link) this.followLink.emit(link);
  }

  onConfirm(): void {
    this.errorMessage = null;
    this.confirm.emit({
      type: this.kind,
      id: this.targetId,
      reason: this.reason.trim(),
      suspended: !this.isCurrentlySuspended,
    });
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.onClose();
  }
}
