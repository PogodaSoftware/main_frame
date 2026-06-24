/**
 * BeautyAdminWebSessionBarComponent — shared amber session strip for the Admin
 * Portal (web). Per `web-admin-pages.jsx` AdminWebShell session strip: amber
 * (#FFF4DA, border rgba(165,122,31,0.18)) bar with a clock + "Session ends in
 * MM:SS" (aria-live polite) + "all actions are audited" + an "Extend session"
 * action.
 *
 * Renders the server `sessionRemaining` label and runs a cheap client 1s tick
 * so the countdown feels live (cosmetic only — the real session lifetime is
 * server-owned). "Extend session" emits a synthetic POST refresh BffLink that
 * the shell follows then re-resolves the page (see the design-handoff skill's
 * "synthetic followLink for chrome actions" note).
 */
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  NgZone,
  OnChanges,
  OnDestroy,
  Output,
} from '@angular/core';
import { CommonModule } from '@angular/common';

import { BffLink } from '../beauty-bff.types';

@Component({
  selector: 'app-admin-web-session-bar',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="aws-session" role="status">
      <span class="aws-left">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#8A6A1F" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="10"/><path d="M12 7v5l3 2"/>
        </svg>
        <span>Session ends in <span class="aws-clock" aria-live="polite">{{ display }}</span> · all actions are audited</span>
      </span>
      <a href="#" class="aws-extend" (click)="onExtend($event)">Extend session</a>
    </div>
  `,
  styles: [`
    :host {
      --amber-bg: #FFF4DA; --amber-line: rgba(165,122,31,0.18); --amber-fg: #8A6A1F;
      --admin-red: #B23A2D;
      --font-body: 'Inter', system-ui, -apple-system, sans-serif;
      --font-mono: ui-monospace, 'SF Mono', Menlo, monospace;
      display: block;
    }
    :host *:focus-visible { outline: 2px solid var(--admin-red); outline-offset: 2px; border-radius: 6px; }
    .aws-session {
      background: var(--amber-bg); border-bottom: 1px solid var(--amber-line);
      padding: 6px 28px; font-size: 0.6875rem; color: var(--amber-fg);
      display: flex; align-items: center; justify-content: space-between;
      font-family: var(--font-body); flex-shrink: 0;
    }
    .aws-left { display: inline-flex; align-items: center; gap: 6px; }
    .aws-clock { font-family: var(--font-mono); font-weight: 700; }
    .aws-extend { color: var(--amber-fg); text-decoration: underline; text-underline-offset: 2px; font-weight: 600; cursor: pointer; }
  `],
})
export class BeautyAdminWebSessionBarComponent implements OnChanges, OnDestroy {
  /** Server-provided remaining-time label, e.g. "14:32" or "02:41:26". */
  @Input() sessionRemaining = '14:32';
  @Output() follow = new EventEmitter<BffLink>();

  display = '14:32';
  private remainingSecs: number | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(private zone: NgZone) {}

  ngOnChanges(): void {
    this.display = this.sessionRemaining || '—';
    this.remainingSecs = this.parse(this.sessionRemaining);
    this.startTick();
  }

  private parse(label: string): number | null {
    const parts = (label || '').trim().split(':').map((p) => parseInt(p, 10));
    if (!parts.length || parts.some((n) => Number.isNaN(n))) return null;
    return parts.reduce((acc, n) => acc * 60 + n, 0);
  }

  private fmt(total: number): string {
    const s = Math.max(0, total);
    const hh = Math.floor(s / 3600);
    const mm = Math.floor((s % 3600) / 60);
    const ss = s % 60;
    const pad = (n: number) => String(n).padStart(2, '0');
    return hh > 0 ? `${pad(hh)}:${pad(mm)}:${pad(ss)}` : `${pad(mm)}:${pad(ss)}`;
  }

  private startTick(): void {
    this.stopTick();
    if (this.remainingSecs == null) return;
    // Run outside Angular so the 1s tick doesn't thrash change detection app-wide.
    this.zone.runOutsideAngular(() => {
      this.timer = setInterval(() => {
        if (this.remainingSecs == null) return;
        this.remainingSecs = Math.max(0, this.remainingSecs - 1);
        const next = this.fmt(this.remainingSecs);
        this.zone.run(() => { this.display = next; });
        if (this.remainingSecs <= 0) this.stopTick();
      }, 1000);
    });
  }

  private stopTick(): void {
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
  }

  ngOnDestroy(): void {
    this.stopTick();
  }

  onExtend(ev: Event): void {
    ev.preventDefault();
    this.follow.emit({
      rel: 'extend_session', method: 'POST',
      href: '/api/beauty/session/refresh/',
      screen: null, route: null, prompt: 'Extend session',
    });
  }
}
