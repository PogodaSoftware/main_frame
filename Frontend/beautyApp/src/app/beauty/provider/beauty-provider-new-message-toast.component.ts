/**
 * BeautyProviderNewMessageToastComponent — global in-app push banner.
 * Subscribes to BeautyProviderToastService.events$. Renders inside BeautyShellComponent
 * so any provider screen sees it without route-scoped wiring.
 */

import {
  ChangeDetectorRef,
  Component,
  EventEmitter,
  HostListener,
  OnDestroy,
  OnInit,
  Output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';

import { BeautyProviderToastService, ToastPayload } from './beauty-provider-toast.service';

@Component({
  selector: 'app-prov-new-message-toast',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div *ngIf="visible && payload" class="toast-frame" role="alert" aria-live="assertive"
         (touchstart)="onTouchStart($event)"
         (touchmove)="onTouchMove($event)"
         (touchend)="onTouchEnd()">
      <div class="drag-handle" aria-hidden="true"></div>

      <div class="toast">
        <div class="avatar-wrap" aria-hidden="true">
          <div class="avatar">{{ initial }}</div>
          <div class="badge">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF"
                 stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
          </div>
        </div>

        <div class="content">
          <div class="row1">
            <span class="eyebrow">New message</span>
            <span class="time">{{ payload.time || 'now' }}</span>
          </div>
          <div class="sender">{{ payload.sender }}</div>
          <div class="service">{{ payload.service }}</div>
          <div class="preview">{{ payload.preview }}</div>
          <div class="actions">
            <button type="button" class="btn-reply" (click)="onReply()">Reply</button>
            <button type="button" class="btn-mark" (click)="onMarkRead()">Mark as read</button>
            <button type="button" class="btn-dismiss" (click)="dismiss()" aria-label="Dismiss">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                   stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      --line: #DCDCDF; --text: #0F1115; --text-muted: #6B6F77;
      --accent-blue: #CFE3F5; --accent-blue-deep: #7DA8CF;
      --font-body: 'Inter', system-ui, sans-serif;
      --font-display: 'Cormorant Garamond', Georgia, serif;
      --font-mono: ui-monospace, 'SF Mono', Menlo, monospace;
      pointer-events: none;
      position: fixed; inset: 0;
      z-index: 9999;
    }
    :host *:focus-visible { outline: 2px solid #1a3a52; outline-offset: 2px; border-radius: 6px; }

    .toast-frame {
      position: absolute; top: 56px; left: 12px; right: 12px;
      pointer-events: auto;
      max-width: 406px;
      margin: 0 auto;
      animation: slideDown 240ms cubic-bezier(0.2, 0.8, 0.2, 1);
    }

    @keyframes slideDown {
      from { transform: translateY(-110%); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }

    @media (prefers-reduced-motion: reduce) {
      .toast-frame { animation: fadeIn 200ms linear; }
      @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    }

    .drag-handle {
      width: 36px; height: 4px;
      border-radius: 2px;
      background: rgba(15,17,21,0.18);
      position: absolute; top: -6px; left: 50%; transform: translateX(-50%);
    }

    .toast {
      background: #FFFFFF;
      border-radius: 18px;
      box-shadow: 0 18px 38px rgba(15, 35, 60, 0.22), 0 4px 10px rgba(15, 35, 60, 0.10);
      border: 1px solid var(--line);
      padding: 12px 14px;
      display: flex; gap: 12px; align-items: flex-start;
    }

    .avatar-wrap { position: relative; flex-shrink: 0; }
    .avatar {
      width: 40px; height: 40px;
      border-radius: 50%;
      background: linear-gradient(135deg, #BFD8EE, #7DA8CF);
      display: grid; place-items: center;
      font-family: var(--font-display);
      font-size: 18px; font-weight: 600;
      color: #1a3a52;
    }
    .badge {
      position: absolute; right: -3px; bottom: -3px;
      width: 20px; height: 20px;
      border-radius: 50%;
      background: var(--accent-blue-deep);
      border: 2px solid #FFFFFF;
      display: grid; place-items: center;
    }

    .content { flex: 1; min-width: 0; }
    .row1 { display: flex; align-items: baseline; gap: 8px; }
    .eyebrow {
      font-size: 9px; font-weight: 700;
      letter-spacing: 1.4px; text-transform: uppercase;
      color: var(--accent-blue-deep);
      flex: 1;
    }
    .time { font-family: var(--font-mono); font-size: 10px; color: var(--text-muted); }
    .sender {
      font-size: 14px; font-weight: 600;
      color: var(--text);
      margin-top: 2px;
      line-height: 1.25;
    }
    .service {
      font-family: var(--font-mono);
      font-size: 10px;
      color: var(--accent-blue-deep);
      margin-top: 1px;
    }
    .preview {
      font-size: 12px;
      color: var(--text);
      line-height: 1.4;
      margin-top: 6px;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .actions { display: flex; gap: 8px; margin-top: 10px; }
    .btn-reply, .btn-mark {
      flex: 1; height: 44px;
      min-height: 44px;
      border-radius: 8px;
      font-size: 12px; font-weight: 600;
      cursor: pointer;
      font-family: var(--font-body);
    }
    .btn-reply { background: var(--text); color: #FFFFFF; border: none; }
    .btn-mark { background: #FFFFFF; color: var(--text); border: 1px solid var(--line); }
    .btn-dismiss {
      width: 44px; height: 44px;
      min-width: 44px; min-height: 44px;
      border-radius: 8px;
      background: #FFFFFF; color: var(--text-muted);
      border: 1px solid var(--line);
      display: grid; place-items: center;
      cursor: pointer;
    }
  `],
})
export class BeautyProviderNewMessageToastComponent implements OnInit, OnDestroy {
  payload: ToastPayload | null = null;
  visible = false;
  private sub?: Subscription;
  private hideTimer: ReturnType<typeof setTimeout> | null = null;
  private touchStartY = 0;

  @Output() reply = new EventEmitter<ToastPayload>();
  @Output() markRead = new EventEmitter<ToastPayload>();

  constructor(
    private toast: BeautyProviderToastService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.sub = this.toast.events$.subscribe((p) => {
      if (p === null) {
        this.dismiss();
      } else {
        this.payload = p;
        this.visible = true;
        this.scheduleAutoHide();
        this.cdr.markForCheck();
      }
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    if (this.hideTimer) clearTimeout(this.hideTimer);
  }

  get initial(): string {
    return (this.payload?.sender || '·').trim()[0]?.toUpperCase() || '·';
  }

  dismiss(): void {
    this.visible = false;
    this.payload = null;
    if (this.hideTimer) { clearTimeout(this.hideTimer); this.hideTimer = null; }
    this.cdr.markForCheck();
  }

  onReply(): void {
    if (this.payload) this.reply.emit(this.payload);
    this.dismiss();
  }

  onMarkRead(): void {
    if (this.payload) this.markRead.emit(this.payload);
    this.dismiss();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.visible) this.dismiss();
  }

  onTouchStart(e: TouchEvent): void {
    this.touchStartY = e.touches[0]?.clientY || 0;
  }
  onTouchMove(_e: TouchEvent): void { /* visual feedback could go here */ }
  onTouchEnd(): void {
    // simple swipe-down dismiss disabled — kept hook in case Touch coords needed
  }

  private scheduleAutoHide(): void {
    if (this.hideTimer) clearTimeout(this.hideTimer);
    this.hideTimer = setTimeout(() => this.dismiss(), 8000);
  }
}
