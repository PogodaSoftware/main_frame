/**
 * BeautyGoogleAuthComponent — mock Google "Choose an account" chooser.
 *
 * Web-only presentational stub matching the design `CustAuthGoogle`. There is
 * no real Google OAuth backend yet, so selecting an account (or "Use another
 * account") routes to the email sign-in page rather than completing a real
 * OAuth exchange. Reached from the Welcome screen's "Continue with Google".
 */
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

interface GoogleAccount { initials: string; name: string; email: string; }

@Component({
  selector: 'app-beauty-google-auth',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="goog-wrap">
      <div class="goog-card" role="dialog" aria-label="Choose an account to continue to beauty.app">
        <div class="goog-logo" aria-hidden="true">
          <span class="g-b">G</span><span class="g-r">o</span><span class="g-y">o</span><span class="g-b">g</span><span class="g-g">l</span><span class="g-r">e</span>
        </div>
        <h1 class="goog-title">Choose an account</h1>
        <p class="goog-sub">to continue to <span class="goog-host">beauty.app</span></p>

        <div class="goog-list">
          <button type="button" class="goog-row" *ngFor="let a of accounts" (click)="pick()">
            <span class="goog-avatar">{{ a.initials }}</span>
            <span class="goog-acct">
              <span class="goog-name">{{ a.name }}</span>
              <span class="goog-email">{{ a.email }}</span>
            </span>
          </button>
          <button type="button" class="goog-row" (click)="another()">
            <span class="goog-avatar goog-avatar--add" aria-hidden="true">+</span>
            <span class="goog-another">Use another account</span>
          </button>
        </div>

        <p class="goog-foot">To continue, Google will share your name, email address, and profile picture with beauty.app.</p>
      </div>
    </div>
  `,
  styles: [`
    :host {
      --line: #DCDCDF; --text: #202124; --muted: #6B6F77; --google-blue: #1a73e8;
      --font-body: 'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
      display: block; min-height: 100dvh; background: #fff; font-family: var(--font-body);
    }
    * { box-sizing: border-box; }
    .goog-wrap { min-height: 100dvh; display: grid; place-items: center; padding: 24px; }
    .goog-card { width: 100%; max-width: 460px; padding: 36px; border: 1px solid var(--line); border-radius: 16px; }

    .goog-logo { font-size: 22px; font-weight: 500; letter-spacing: .2px; }
    .g-b { color: #4285F4; } .g-r { color: #EA4335; } .g-y { color: #FBBC05; } .g-g { color: #34A853; }

    .goog-title { font-size: 22px; font-weight: 500; color: var(--text); margin: 22px 0 4px; }
    .goog-sub { font-size: 13px; color: var(--muted); margin: 0; }
    .goog-host { color: var(--google-blue); }

    .goog-list { margin-top: 22px; border: 1px solid var(--line); border-radius: 8px; overflow: hidden; }
    .goog-row {
      width: 100%; display: flex; align-items: center; gap: 14px; padding: 14px;
      background: #fff; border: none; border-top: 1px solid #F2F2F2; cursor: pointer; text-align: left;
    }
    .goog-row:first-child { border-top: none; }
    .goog-row:hover { background: #F7F8FA; }
    .goog-avatar {
      width: 36px; height: 36px; border-radius: 50%; flex-shrink: 0;
      background: linear-gradient(135deg, #C8A57E, #6B4F3A); color: #fff;
      display: grid; place-items: center; font-size: 12px; font-weight: 700;
    }
    .goog-avatar--add { background: #F2F2F2; color: var(--muted); font-size: 20px; font-weight: 400; }
    .goog-acct { display: flex; flex-direction: column; line-height: 1.3; }
    .goog-name { font-size: 14px; color: var(--text); }
    .goog-email { font-size: 12px; color: var(--muted); }
    .goog-another { font-size: 14px; color: var(--google-blue); }

    .goog-foot { margin: 22px 0 0; font-size: 11px; color: var(--muted); line-height: 1.5; }

    :host *:focus-visible { outline: 2px solid #1a73e8; outline-offset: 2px; border-radius: 6px; }
  `],
})
export class BeautyGoogleAuthComponent {
  constructor(private router: Router) {}

  readonly accounts: GoogleAccount[] = [
    { initials: 'AB', name: 'Aisha Bell', email: 'aisha.bell@gmail.com' },
    { initials: 'HL', name: 'Hugo Lindqvist', email: 'hugo.l@startuplabs.io' },
  ];

  // No real Google OAuth backend yet — fall through to email sign-in.
  pick(): void { this.router.navigate(['/login']); }
  another(): void { this.router.navigate(['/login']); }
}
