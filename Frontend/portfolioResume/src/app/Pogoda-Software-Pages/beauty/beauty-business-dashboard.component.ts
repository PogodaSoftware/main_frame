/**
 * BeautyBusinessDashboardComponent (Presentational)
 * --------------------------------------------------
 * Landing page of the business provider portal. Shows storefront name,
 * headline counts, and HATEOAS links to the manage-services, weekly-
 * availability, and incoming-bookings sub-screens. Logout is a POST link
 * the shell handles.
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
  selector: 'app-beauty-business-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="biz-app">
      <header class="biz-header">
        <div class="header-brand">
          <span class="brand-icon">🏢</span>
          <button class="brand-name-btn" (click)="emit(links['home'])">Beauty</button>
          <span class="badge">Business Portal</span>
        </div>
        <button class="btn-logout" (click)="logout()" [disabled]="loggingOut">
          {{ loggingOut ? 'Signing out…' : 'Sign out' }}
        </button>
      </header>

      <section class="biz-section">
        <h1 class="biz-title">{{ storefront?.name || 'Your storefront' }}</h1>
        <p class="biz-sub">{{ business?.email }}</p>

        <div class="stat-grid">
          <div class="stat-card">
            <span class="stat-num">{{ stats.services_count }}</span>
            <span class="stat-label">Services offered</span>
          </div>
          <div class="stat-card">
            <span class="stat-num">{{ stats.upcoming_bookings }}</span>
            <span class="stat-label">Upcoming bookings</span>
          </div>
          <div class="stat-card">
            <span class="stat-num">{{ stats.total_bookings }}</span>
            <span class="stat-label">Total bookings</span>
          </div>
        </div>

        <div class="action-grid">
          <button class="action" (click)="emit(links['services'])" *ngIf="links['services']">
            <strong>Manage services</strong>
            <span>Add, edit, or remove services on your storefront.</span>
          </button>
          <button class="action" (click)="emit(links['availability'])" *ngIf="links['availability']">
            <strong>Weekly hours</strong>
            <span>Set when your business is open each day of the week.</span>
          </button>
          <button class="action" (click)="emit(links['bookings'])" *ngIf="links['bookings']">
            <strong>Incoming bookings</strong>
            <span>See every booking your customers have placed.</span>
          </button>
        </div>
      </section>
    </div>
  `,
  styles: [`
    .biz-app { min-height: 100dvh; background: #fafafa; font-family: -apple-system, sans-serif; color: #212121; }
    .biz-header { display: flex; align-items: center; justify-content: space-between; padding: 16px 24px; background: #fff; border-bottom: 1px solid #eee; }
    .header-brand { display: flex; align-items: center; gap: 10px; }
    .brand-icon { font-size: 1.4rem; }
    .brand-name-btn { background: none; border: none; font-size: 1.1rem; font-weight: 600; cursor: pointer; }
    .badge { background: #1d4ed8; color: #fff; font-size: 0.75rem; padding: 3px 8px; border-radius: 999px; }
    .btn-logout { background: #000; color: #fff; border: none; padding: 8px 16px; border-radius: 8px; cursor: pointer; }
    .btn-logout:disabled { background: #aaa; cursor: not-allowed; }
    .biz-section { padding: 32px 24px 64px; max-width: 960px; margin: 0 auto; }
    .biz-title { font-size: 2rem; margin: 0 0 4px; }
    .biz-sub { color: #666; margin: 0 0 24px; }
    .stat-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; margin-bottom: 32px; }
    .stat-card { background: #fff; border: 1px solid #eee; border-radius: 12px; padding: 20px; display: flex; flex-direction: column; gap: 4px; }
    .stat-num { font-size: 2rem; font-weight: 700; }
    .stat-label { color: #666; font-size: 0.9rem; }
    .action-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; }
    .action { background: #fff; border: 1px solid #ddd; border-radius: 12px; padding: 20px; text-align: left; cursor: pointer; display: flex; flex-direction: column; gap: 6px; transition: border-color .15s; }
    .action:hover { border-color: #1d4ed8; }
    .action strong { font-size: 1.05rem; }
    .action span { color: #666; font-size: 0.9rem; }
  `],
})
export class BeautyBusinessDashboardComponent {
  @Input() data: Record<string, unknown> = {};
  @Input() links: Record<string, BffLink> = {};
  @Output() followLink = new EventEmitter<BffLink>();

  loggingOut = false;

  constructor(private authService: BeautyAuthService) {}

  get business(): { email?: string; business_name?: string } | null {
    return (this.data['business'] as { email?: string; business_name?: string }) || null;
  }
  get storefront(): { name?: string; location_label?: string } | null {
    return (this.data['storefront'] as { name?: string; location_label?: string }) || null;
  }
  get stats(): { services_count: number; upcoming_bookings: number; total_bookings: number } {
    return (
      (this.data['stats'] as { services_count: number; upcoming_bookings: number; total_bookings: number }) ||
      { services_count: 0, upcoming_bookings: 0, total_bookings: 0 }
    );
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
