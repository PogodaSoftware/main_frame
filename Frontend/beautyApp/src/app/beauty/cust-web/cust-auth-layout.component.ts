/**
 * CustAuthLayoutComponent — shared customer-web auth split-pane (responsive).
 *
 * Desktop (≥920px): two-column grid — brand hero left (gradient, headline,
 * social proof), form right. Mobile (<920px): hero collapses to a compact
 * brand band on top, form fills the width. Mirrors the design handoff
 * `CustAuthLayout` in web-customer-pages.jsx.
 *
 * Projected content = the form/actions. Optional footer via
 * `<div cust-auth-footer>…</div>`.
 */
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-cust-auth-layout',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="cust-auth">
      <!-- Brand hero -->
      <aside class="hero" aria-hidden="true">
        <div class="brand">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#0F1115" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 7h2M14 7h2M8 11h2M14 11h2M8 15h2M14 15h2"/></svg>
          <span class="brand-name">Beauty</span>
          <span class="hero-badge auth-brand-badge" *ngIf="badge">{{ badge }}</span>
        </div>

        <div class="pitch" *ngIf="variant === 'business'; else customerPitch">
          <h2 class="pitch-title">Grow your<br/>beauty business.</h2>
          <p class="pitch-sub">Manage bookings, services, clients and payments in one portal. Real-time calendar, instant payouts, your storefront.</p>
        </div>
        <ng-template #customerPitch>
          <div class="pitch">
            <h2 class="pitch-title">Book a fresh look,<br/>in a few taps.</h2>
            <p class="pitch-sub">Discover hair, nails, skin, brows and lashes from independent studios near you. Real-time availability, instant booking.</p>
            <div class="proof">
              <div class="stack">
                <span class="ava">AB</span><span class="ava">MV</span><span class="ava">PA</span><span class="ava">HL</span>
              </div>
              <div>
                <div class="proof-1">4.86★ · 12,840 customers</div>
                <div class="proof-2">184 VIP · 9,620 verified</div>
              </div>
            </div>
          </div>
        </ng-template>

        <div class="hero-foot">beauty.app · Brooklyn · Manhattan · Queens</div>
      </aside>

      <!-- Form pane -->
      <main class="pane" role="main">
        <div class="pane-inner" [class.center]="center">
          <div class="brand brand--mobile">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0F1115" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 7h2M14 7h2M8 11h2M14 11h2M8 15h2M14 15h2"/></svg>
            <span class="brand-name">Beauty</span>
            <span class="hero-badge" *ngIf="badge">{{ badge }}</span>
          </div>
          <h1 class="title" *ngIf="title">{{ title }}</h1>
          <p class="sub" *ngIf="sub">{{ sub }}</p>
          <div class="body" [class.body--flush]="!title"><ng-content></ng-content></div>
          <div class="foot"><ng-content select="[cust-auth-footer]"></ng-content></div>
        </div>
      </main>
    </div>
  `,
  styles: [`
    :host {
      --surface: #F2F2F2; --surface-2: #E9E9EB; --line: #DCDCDF;
      --text: #0F1115; --text-muted: #6B6F77;
      --accent-blue: #CFE3F5; --accent-blue-deep: #7DA8CF; --accent-blue-text: #1a3a52;
      --ink: #0A0A0B;
      --font-body: 'Inter', system-ui, sans-serif;
      --font-display: 'Cormorant Garamond', Georgia, serif;
      --font-mono: ui-monospace, 'SF Mono', Menlo, monospace;
      display: block; min-height: 100dvh; background: #fff;
      font-family: var(--font-body); color: var(--text);
    }
    * { box-sizing: border-box; }

    .cust-auth { display: grid; grid-template-columns: 1.05fr 1fr; min-height: 100dvh; }

    /* Hero */
    .hero {
      position: relative; padding: 52px 56px;
      background: linear-gradient(135deg, #CFE3F5 0%, #F2F2F2 60%, #E9E9EB 100%);
      display: flex; flex-direction: column; justify-content: space-between;
    }
    .brand { display: flex; align-items: center; gap: 10px; }
    .brand-name { font-family: var(--font-display); font-size: 32px; font-weight: 500; color: var(--text); line-height: 1; }
    .hero-badge { font-family: var(--font-mono); font-size: 10px; font-weight: 700; letter-spacing: 0.6px; text-transform: uppercase; color: var(--accent-blue-text); background: rgba(255,255,255,0.6); border: 1px solid var(--accent-blue-deep); border-radius: 999px; padding: 4px 10px; }
    .pitch { max-width: 500px; }
    .pitch-title { margin: 0; font-family: var(--font-display); font-size: 60px; font-weight: 500; line-height: 1.05; letter-spacing: 0.2px; color: var(--text); }
    .pitch-sub { margin: 22px 0 0; font-size: 16px; color: var(--accent-blue-text); line-height: 1.6; }
    .proof { display: flex; align-items: center; gap: 20px; margin-top: 36px; }
    .stack { display: flex; }
    .ava { width: 36px; height: 36px; border-radius: 50%; border: 2px solid #fff; background: linear-gradient(135deg, #C8A57E, #6B4F3A); color: #fff; display: grid; place-items: center; font-size: 11px; font-weight: 700; }
    .ava + .ava { margin-left: -10px; }
    .proof-1 { font-size: 13px; font-weight: 600; }
    .proof-2 { font-family: var(--font-mono); font-size: 11px; color: var(--text-muted); margin-top: 2px; }
    .hero-foot { font-family: var(--font-mono); font-size: 16.5px; color: var(--accent-blue-text); }

    /* Form pane */
    .pane { background: #fff; display: flex; align-items: center; justify-content: center; padding: 40px; overflow: auto; }
    .pane-inner { width: 100%; max-width: 420px; }
    .brand--mobile { display: none; margin-bottom: 24px; }
    .brand--mobile .brand-name { font-size: 26px; }
    .title { margin: 0; font-family: var(--font-display); font-size: 38px; font-weight: 500; line-height: 1.1; color: var(--text); }
    .sub { margin: 10px 0 0; font-size: 14px; color: var(--text-muted); line-height: 1.55; }
    .body { margin-top: 32px; }
    .body--flush { margin-top: 0; }
    .pane-inner.center .title, .pane-inner.center .sub { text-align: center; }
    .foot { margin-top: 28px; font-size: 13px; color: var(--text-muted); text-align: center; }
    .foot:empty { display: none; }

    /* Responsive collapse */
    @media (max-width: 920px) {
      .cust-auth { grid-template-columns: 1fr; }
      .hero { display: none; }
      .brand--mobile { display: flex; align-items: center; gap: 10px; }
      .pane { align-items: flex-start; padding: 32px 20px; min-height: 100dvh; }
      /* margin:auto centers the form block vertically when it's shorter than
         the viewport (kills the blank lower-half void), and collapses to 0 to
         stay top-aligned + scrollable when a tall form overflows. */
      .pane-inner { max-width: 460px; margin: auto; }
      .title { font-size: 32px; }
    }

    :host *:focus-visible { outline: 2px solid #1a3a52; outline-offset: 2px; border-radius: 6px; }
  `],
})
export class CustAuthLayoutComponent {
  @Input() title = '';
  @Input() sub = '';
  @Input() center = false;
  @Input() variant: 'customer' | 'business' = 'customer';
  @Input() badge = '';
}
