/**
 * BeautyAdminWebAuthLayoutComponent — shared desktop slate split-pane for the
 * 4 admin auth screens (signin / 2fa / magic / ip-warning). Per `web-admin-auth.jsx`
 * WebAuthLayout: left dark brand panel (Beauty wordmark + ADMIN-red badge,
 * eyebrow + Cormorant title + sub + 3 feature rows + mono build-stamp), right
 * #F2F2F2 form panel (max 440px) projecting the screen's form card.
 *
 * Desktop-only chrome; web is desktop, RN is the mobile shell. Collapses to a
 * single stacked column under 900px.
 */
import {
  ChangeDetectionStrategy,
  Component,
  Input,
} from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-admin-web-auth-layout',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="aw-auth">
      <!-- Brand panel -->
      <div class="aw-brandpane">
        <div class="aw-brandrow">
          <span class="aw-mark" aria-hidden="true">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
              <rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 7h2M14 7h2M8 11h2M14 11h2M8 15h2M14 15h2"/>
            </svg>
          </span>
          <span class="aw-word">Beauty</span>
          <span class="aw-badge">Admin</span>
        </div>

        <div class="aw-brandmid">
          <div class="aw-eyebrow">{{ eyebrow }}</div>
          <h1 class="aw-title">{{ title }}</h1>
          <p class="aw-sub" *ngIf="sub">{{ sub }}</p>

          <div class="aw-features">
            <div class="aw-feature" *ngFor="let f of features">
              <span class="aw-fcheck" aria-hidden="true">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#B23A2D" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l4 4L19 7"/></svg>
              </span>
              <div>
                <div class="aw-fh">{{ f[0] }}</div>
                <div class="aw-fb">{{ f[1] }}</div>
              </div>
            </div>
          </div>
        </div>

        <div class="aw-stamp">v2026.05.14 · beauty-admin · production · us-east-1</div>
      </div>

      <!-- Form panel -->
      <div class="aw-formpane">
        <div class="aw-formwrap">
          <ng-content></ng-content>
          <div class="aw-footnote" *ngIf="footerNote">{{ footerNote }}</div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      --slate: #0E1620; --slate-2: #19222E; --slate-line: rgba(255,255,255,0.08);
      --slate-muted: rgba(255,255,255,0.55); --admin-red: #B23A2D;
      --surface: #F2F2F2; --text: #0F1115; --text-muted: #6B6F77;
      --font-body: 'Inter', system-ui, -apple-system, sans-serif;
      --font-display: 'Cormorant Garamond', Georgia, serif;
      --font-mono: ui-monospace, 'SF Mono', Menlo, monospace;
      display: block; min-height: 100dvh;
    }
    * { box-sizing: border-box; }
    :host ::ng-deep *:focus-visible { outline: 2px solid var(--admin-red); outline-offset: 2px; border-radius: 6px; }

    .aw-auth {
      width: 100%; min-height: 100dvh; display: grid; grid-template-columns: 1fr 1fr;
      background: var(--slate); font-family: var(--font-body); color: #fff;
    }

    .aw-brandpane {
      background: var(--slate);
      background-image:
        radial-gradient(circle at 20% 30%, rgba(178,58,45,0.18), transparent 50%),
        radial-gradient(circle at 80% 80%, rgba(125,168,207,0.12), transparent 50%);
      padding: 48px 64px; display: flex; flex-direction: column;
      border-right: 1px solid var(--slate-line);
    }
    .aw-brandrow { display: flex; align-items: center; gap: 10px; }
    .aw-word { font-family: var(--font-display); font-size: 1.75rem; font-weight: 500; line-height: 1; }
    .aw-badge {
      margin-left: 4px; font-size: 0.625rem; font-weight: 700; letter-spacing: 1.6px;
      text-transform: uppercase; color: #fff; background: var(--admin-red);
      padding: 4px 10px; border-radius: 999px;
    }

    .aw-brandmid { flex: 1; display: flex; flex-direction: column; justify-content: center; max-width: 460px; }
    .aw-eyebrow {
      font-size: 0.6875rem; font-weight: 700; letter-spacing: 1.6px; text-transform: uppercase;
      color: var(--slate-muted); margin-bottom: 16px;
    }
    .aw-title {
      margin: 0; font-family: var(--font-display); font-size: 3.25rem; font-weight: 500;
      color: #fff; line-height: 1.05; letter-spacing: 0.1px;
    }
    .aw-sub { margin: 18px 0 0; font-size: 0.9375rem; color: var(--slate-muted); line-height: 1.55; max-width: 420px; }

    .aw-features { margin-top: 40px; display: flex; flex-direction: column; gap: 12px; }
    .aw-feature { display: flex; gap: 12px; }
    .aw-fcheck {
      width: 28px; height: 28px; border-radius: 8px; flex-shrink: 0;
      background: var(--slate-2); border: 1px solid var(--slate-line); display: grid; place-items: center;
    }
    .aw-fh { font-size: 0.8125rem; font-weight: 600; color: #fff; }
    .aw-fb { font-size: 0.75rem; color: var(--slate-muted); margin-top: 2px; }

    .aw-stamp { font-size: 0.6875rem; color: var(--slate-muted); font-family: var(--font-mono); }

    .aw-formpane {
      background: var(--surface); display: flex; align-items: center; justify-content: center;
      padding: 40px; overflow: auto;
    }
    .aw-formwrap { width: 100%; max-width: 440px; }
    .aw-footnote { margin-top: 28px; font-size: 0.6875rem; color: var(--text-muted); text-align: center; font-family: var(--font-mono); }

    @media screen and (max-width: 900px) {
      .aw-auth { grid-template-columns: 1fr; }
      .aw-brandpane { padding: 32px 28px; }
      .aw-title { font-size: 2.25rem; }
      .aw-features { display: none; }
    }
  `],
})
export class BeautyAdminWebAuthLayoutComponent {
  @Input() eyebrow = '';
  @Input() title = '';
  @Input() sub = '';
  @Input() footerNote = '';
  /** [heading, body] feature rows shown in the brand panel. */
  @Input() features: [string, string][] = [
    ['Invite-only', 'Admins are provisioned by other admins. No self-registration.'],
    ['2FA enforced', 'TOTP required on every sign-in. Magic-link backup available.'],
    ['IP allowlist', 'Sessions blocked from networks outside corporate ranges.'],
  ];
}
