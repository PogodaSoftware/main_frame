/**
 * BeautyReviewWriteComponent
 * --------------------------
 * Standalone customer page at /pogoda/beauty/bookings/:bookingId/review.
 *
 * Reads the booking via the existing protected bookings endpoint, lets
 * the customer pick 1-5 stars + write a comment, then POSTs to
 * /api/beauty/protected/services/<serviceId>/reviews/. Bypasses the BFF
 * resolver because the page is a single short form — same approach as
 * the search page.
 */

import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Inject,
  OnInit,
  PLATFORM_ID,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';

import { environment } from '../../environments/environment';
import { BeautyAuthService } from './beauty-auth.service';
import { BffLink } from './beauty-bff.types';
import { CustTopNavComponent } from './cust-web/cust-top-nav.component';

interface MyBookingService {
  id: number;
  name: string;
  category?: string;
  price_cents?: number;
  duration_minutes?: number;
}

interface MyBooking {
  id: number;
  status: string;
  slot_at?: string;
  service: MyBookingService;
  provider?: { id: number; name: string };
}

@Component({
  selector: 'app-beauty-review-write',
  standalone: true,
  imports: [CommonModule, FormsModule, CustTopNavComponent],
  changeDetection: ChangeDetectionStrategy.Default,
  template: `
    <div class="beauty-app cust-desk" data-testid="review-write-root">
      <app-cust-top-nav active="bookings" [signedIn]="true" (follow)="onNav($event)"></app-cust-top-nav>

      <main id="main" class="rw-main">
      <div class="rw-inner">
        <h1 class="rw-h1">Leave a review</h1>
        <ng-container *ngIf="loading">
          <div class="status">Loading…</div>
        </ng-container>

        <ng-container *ngIf="!loading && booking as b">
          <section class="card">
            <div class="svc-name" data-testid="rw-service-name">{{ b.service?.name }}</div>
            <div class="svc-prov" *ngIf="b.provider?.name" data-testid="rw-provider-name">
              {{ b.provider?.name }}
            </div>
          </section>

          <section class="card">
            <label class="label" for="rw-rating">Your rating</label>
            <div
              class="stars"
              role="radiogroup"
              aria-label="Star rating"
              data-testid="rw-stars">
              <button
                *ngFor="let n of [1,2,3,4,5]"
                type="button"
                class="star-btn"
                role="radio"
                [attr.aria-checked]="rating === n"
                [attr.data-testid]="'rw-star-' + n"
                [class.is-on]="n <= rating"
                (click)="rating = n">
                <svg width="28" height="28" viewBox="0 0 24 24"
                  [attr.fill]="n <= rating ? '#F5C36B' : '#E5E5EA'"
                  [attr.stroke]="n <= rating ? '#F5C36B' : '#CFCFD3'"
                  stroke-width="1.2" stroke-linejoin="round">
                  <path d="M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1L12 2z"/>
                </svg>
              </button>
            </div>

            <label class="label" for="rw-body">Comment</label>
            <textarea
              id="rw-body"
              class="textarea"
              rows="5"
              placeholder="Share your experience..."
              data-testid="rw-body"
              [(ngModel)]="body"
              maxlength="4000"></textarea>

            <div class="error-toast" *ngIf="errorMessage" data-testid="rw-error" role="alert">
              {{ errorMessage }}
            </div>

            <div class="actions">
              <button
                type="button"
                class="btn-primary"
                data-testid="rw-submit"
                [disabled]="submitting || rating < 1"
                (click)="submit()">
                {{ submitting ? 'Submitting…' : 'Post review' }}
              </button>
            </div>
          </section>
        </ng-container>

        <div *ngIf="!loading && !booking" class="status" data-testid="rw-load-error">
          Could not load booking.
        </div>
      </div>
      </main>
    </div>
  `,
  styles: [`
    :host {
      --surface: #F2F2F2; --line: #DCDCDF; --text: #0F1115;
      --text-muted: #6B6F77; --baby-blue-deep: #7DA8CF;
      --ink: #0A0A0B; --danger: #C0392B;
      --font-body: 'Inter', system-ui, -apple-system, sans-serif;
      --font-display: 'Cormorant Garamond', Georgia, serif;
      --font-mono: ui-monospace, 'SF Mono', Menlo, monospace;
    }
    * { box-sizing: border-box; }
    .beauty-app {
      display: flex; flex-direction: column; min-height: 100dvh;
      background: var(--surface); color: var(--text); font-family: var(--font-body);
    }
    .sub-header {
      display: flex; align-items: center; height: 56px; padding: 0 12px;
      background: var(--surface); border-bottom: 1px solid var(--line);
    }
    .sub-header-title { font-family: var(--font-display); font-size: 20px; margin: 0 0 0 8px; }
    .sub-header-spacer-flex { flex: 1; }
    .back-btn {
      min-width: 44px; min-height: 44px; border-radius: 8px;
      background: transparent; border: none; color: var(--text);
      display: grid; place-items: center; cursor: pointer;
    }
    .status { padding: 28px 16px; text-align: center; color: var(--text-muted); }
    .card {
      background: #FFFFFF; border: 1px solid var(--line); border-radius: 14px;
      margin: 14px 16px; padding: 14px;
    }
    .svc-name { font-family: var(--font-display); font-size: 22px; font-weight: 500; line-height: 1.2; }
    .svc-prov { font-size: 11px; font-weight: 600; color: #1a3a52; text-transform: uppercase; letter-spacing: 1.2px; margin-top: 4px; }
    .label { display: block; font-size: 11px; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1.1px; margin: 4px 0 8px; }
    .stars { display: flex; gap: 6px; margin-bottom: 14px; }
    .star-btn { background: transparent; border: none; padding: 2px; cursor: pointer; }
    .star-btn:focus-visible { outline: 2px solid #1a3a52; border-radius: 4px; }
    .textarea {
      width: 100%; border: 1px solid var(--line); border-radius: 10px;
      padding: 10px 12px; font-family: var(--font-body); font-size: 14px; resize: vertical;
      min-height: 110px;
    }
    .textarea:focus { outline: 2px solid #1a3a52; outline-offset: 1px; }
    .actions { margin-top: 14px; display: flex; justify-content: flex-end; }
    .btn-primary {
      height: 40px; padding: 0 18px; border-radius: 10px;
      background: var(--ink); color: #fff; border: 1px solid var(--ink);
      font-family: var(--font-body); font-size: 13px; font-weight: 600;
      cursor: pointer;
    }
    .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
    .error-toast {
      margin-top: 10px; padding: 10px 12px; border-radius: 10px;
      background: #FCE8E6; color: #B3261E; border: 1px solid #F4C7C3;
      font-size: 13px;
    }
    /* Desktop (cust-top-nav chrome) — web is desktop-only; RN is mobile. */
    .rw-main { flex: 1; }
    .rw-inner { max-width: 640px; margin: 0 auto; padding: 28px 24px 48px; width: 100%; }
    .rw-h1 { font-family: var(--font-display); font-size: 38px; font-weight: 500; margin: 0 0 14px; }
    .rw-inner .card { margin: 0 0 14px; }
    @media screen and (max-width: 720px) {
      .rw-inner { padding: 16px 16px 32px; }
      .rw-h1 { font-size: 28px; }
    }
  `],
})
export class BeautyReviewWriteComponent implements OnInit {
  bookingId: number | null = null;
  booking: MyBooking | null = null;
  rating = 0;
  body = '';
  loading = true;
  submitting = false;
  errorMessage = '';

  constructor(
    private http: HttpClient,
    private auth: BeautyAuthService,
    private route: ActivatedRoute,
    private router: Router,
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) private platformId: object,
  ) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('bookingId'));
    if (!id) {
      this.loading = false;
      return;
    }
    this.bookingId = id;
    this.loadBooking();
  }

  goBack(): void {
    if (isPlatformBrowser(this.platformId)) window.history.back();
  }

  /** cust-top-nav emits NAV links; route directly (this page isn't SDUI). */
  onNav(link: BffLink): void {
    if (link?.route) this.router.navigateByUrl(link.route);
  }

  private loadBooking(): void {
    const url = `${environment.apiBaseUrl}/api/beauty/protected/bookings/`;
    this.http.get<{ upcoming?: MyBooking[]; past?: MyBooking[]; bookings?: MyBooking[]; items?: MyBooking[] }>(url, {
      withCredentials: true,
      headers: this.auth.getAuthHeaders(),
    }).subscribe({
      next: (resp) => {
        const all: MyBooking[] = [
          ...(resp?.upcoming || []),
          ...(resp?.past || []),
          ...(resp?.bookings || []),
          ...(resp?.items || []),
        ];
        const seen = new Set<number>();
        const dedup = all.filter((b) => {
          if (!b || seen.has(b.id)) return false;
          seen.add(b.id);
          return true;
        });
        this.booking = dedup.find((b) => b.id === this.bookingId) || null;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.loading = false;
        this.cdr.markForCheck();
      },
    });
  }

  submit(): void {
    if (this.submitting) return;
    if (!this.booking?.service?.id) return;
    if (this.rating < 1 || this.rating > 5) return;
    this.submitting = true;
    this.errorMessage = '';

    const url = `${environment.apiBaseUrl}/api/beauty/protected/services/${this.booking.service.id}/reviews/`;
    this.http.post(url, { rating: this.rating, body: this.body }, {
      withCredentials: true,
      headers: this.auth.getAuthHeaders(),
    }).subscribe({
      next: () => {
        this.submitting = false;
        const providerId = this.booking?.provider?.id;
        if (providerId) {
          this.router.navigateByUrl(`/providers/${providerId}`);
        } else {
          this.router.navigateByUrl('/bookings');
        }
      },
      error: (err: HttpErrorResponse) => {
        this.submitting = false;
        if (err.status === 409) {
          this.errorMessage = 'You have already reviewed this service.';
        } else if (err.status === 403) {
          this.errorMessage = 'You can only review a service after the appointment has finished.';
        } else {
          this.errorMessage = 'Could not post review. Please try again.';
        }
        this.cdr.markForCheck();
      },
    });
  }
}
