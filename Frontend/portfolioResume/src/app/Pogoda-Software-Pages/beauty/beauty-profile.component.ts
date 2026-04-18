/**
 * BeautyProfileComponent (Presentational)
 * ---------------------------------------
 * Shows the signed-in customer's profile (email + member-since), a
 * shortcut to My Bookings, and a HATEOAS logout button.
 */

import {
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import { CommonModule } from '@angular/common';

import { BeautyAuthService } from './beauty-auth.service';
import { BffLink } from './beauty-bff.types';

@Component({
  selector: 'app-beauty-profile',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="beauty-app">
      <header class="beauty-header">
        <div class="header-brand">
          <span class="brand-icon">✨</span>
          <button class="brand-name-btn" (click)="emit(links['home'])">Beauty</button>
        </div>
      </header>

      <section class="profile-section">
        <h1 class="profile-title">Profile</h1>

        <div class="profile-card">
          <p class="profile-row"><span>Email</span><strong>{{ user?.email || '—' }}</strong></p>
          <p class="profile-row" *ngIf="memberSince">
            <span>Member since</span><strong>{{ memberSince | date: 'mediumDate' }}</strong>
          </p>
          <p class="profile-row">
            <span>Bookings</span><strong>{{ bookingCount }}</strong>
          </p>
        </div>

        <button class="btn-secondary" (click)="emit(links['bookings'])" *ngIf="links['bookings']">
          My Bookings
        </button>

        <button class="btn-logout" (click)="logout()" [disabled]="loggingOut">
          {{ loggingOut ? 'Signing out…' : 'Sign out' }}
        </button>
      </section>
    </div>
  `,
  styles: [`
    .beauty-app { min-height: 100dvh; background: #fff; font-family: -apple-system, sans-serif; color: #212121; }
    .beauty-header { display: flex; align-items: center; padding: 16px 20px; border-bottom: 1px solid #eee; }
    .brand-icon { font-size: 1.4rem; margin-right: 6px; }
    .brand-name-btn { background: none; border: none; font-size: 1.1rem; font-weight: 600; cursor: pointer; }
    .profile-section { padding: 24px 20px 64px; max-width: 480px; margin: 0 auto; display: flex; flex-direction: column; gap: 16px; }
    .profile-title { font-size: 2rem; margin: 0; }
    .profile-card { border: 1px solid #eee; border-radius: 12px; padding: 16px; }
    .profile-row { display: flex; justify-content: space-between; margin: 6px 0; color: #444; }
    .btn-secondary { background: #fff; border: 1px solid #000; color: #000; padding: 12px; border-radius: 10px; cursor: pointer; font-size: 1rem; }
    .btn-logout { background: #000; color: #fff; border: none; padding: 12px; border-radius: 10px; cursor: pointer; font-size: 1rem; }
    .btn-logout:disabled { background: #aaa; cursor: not-allowed; }
  `],
})
export class BeautyProfileComponent {
  @Input() data: Record<string, unknown> = {};
  @Input() links: Record<string, BffLink> = {};
  @Output() followLink = new EventEmitter<BffLink>();

  loggingOut = false;

  constructor(private authService: BeautyAuthService) {}

  get user(): { email?: string } | null {
    return (this.data['user'] as { email?: string }) || null;
  }
  get memberSince(): string | null {
    const u = this.data['user'] as { member_since?: string } | undefined;
    return u?.member_since || null;
  }
  get bookingCount(): number {
    const s = this.data['stats'] as { booking_count?: number } | undefined;
    return s?.booking_count ?? 0;
  }

  emit(link: BffLink | null | undefined): void {
    if (link) this.followLink.emit(link);
  }

  logout(): void {
    const link = this.links['logout'];
    if (!link || this.loggingOut) return;
    this.loggingOut = true;
    this.authService.follow(link).subscribe({
      next: () => {
        this.loggingOut = false;
        const home = this.links['home'];
        if (home) this.followLink.emit(home);
      },
      error: () => {
        this.loggingOut = false;
        const home = this.links['home'];
        if (home) this.followLink.emit(home);
      },
    });
  }
}
