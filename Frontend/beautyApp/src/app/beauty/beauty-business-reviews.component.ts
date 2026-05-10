/**
 * BeautyBusinessReviewsComponent
 * ------------------------------
 * Standalone business-portal page at /pogoda/beauty/business/reviews.
 * Lists every review left on services owned by the logged-in business
 * provider and lets them post / edit a single reply per review. The
 * customer's review itself is read-only (cannot be edited or deleted
 * from this surface).
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
import { Router } from '@angular/router';

import { environment } from '../../environments/environment';
import { BeautyAuthService } from './beauty-auth.service';

interface BusinessReview {
  id: number;
  rating: number;
  body: string;
  business_reply: string;
  business_reply_at: string | null;
  created_at: string;
  service: { id: number; name: string; provider_id: number | null };
  customer: { id: number; initial: string };
  // local form state
  draftReply?: string;
  editing?: boolean;
  saving?: boolean;
}

interface BusinessReviewsResponse {
  items: BusinessReview[];
  has_more: boolean;
  next_offset: number | null;
}

@Component({
  selector: 'app-beauty-business-reviews',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.Default,
  template: `
    <div class="prov-shell" data-testid="business-reviews-root">
      <header class="sub-header">
        <button type="button" class="back-btn" aria-label="Back" (click)="goBack()">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M15 18l-6-6 6-6"/>
          </svg>
        </button>
        <h1 class="sub-header-title">Customer reviews</h1>
        <span class="sub-header-spacer-flex"></span>
      </header>

      <main class="prov-body">
        <div class="head-row">
          <span class="count-pill" data-testid="business-reviews-count">
            {{ reviews.length }} review{{ reviews.length === 1 ? '' : 's' }}
          </span>
        </div>

        <div *ngIf="loading" class="status">Loading…</div>

        <div *ngIf="!loading && !reviews.length" class="empty" data-testid="business-reviews-empty">
          No reviews on your services yet.
        </div>

        <ul class="reviews-list" *ngIf="!loading && reviews.length" role="list">
          <li
            *ngFor="let r of reviews"
            class="review-card"
            data-testid="business-review-card"
            [attr.data-review-id]="r.id">
            <div class="review-head">
              <span class="avatar" aria-hidden="true">{{ r.customer.initial }}</span>
              <span class="stars" [attr.data-rating]="r.rating">
                <ng-container *ngFor="let i of [1,2,3,4,5]">
                  <svg
                    width="14" height="14" viewBox="0 0 24 24"
                    [attr.fill]="i <= r.rating ? '#F5C36B' : '#E5E5EA'"
                    [attr.stroke]="i <= r.rating ? '#F5C36B' : '#E5E5EA'"
                    stroke-width="1" stroke-linejoin="round">
                    <path d="M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1L12 2z"/>
                  </svg>
                </ng-container>
              </span>
              <span class="svc">{{ r.service.name }}</span>
              <span class="when">{{ formatDate(r.created_at) }}</span>
            </div>
            <p class="body" *ngIf="r.body" data-testid="business-review-body">{{ r.body }}</p>

            <div class="reply-block" *ngIf="r.business_reply && !r.editing" data-testid="business-review-reply">
              <div class="reply-head">Your reply</div>
              <p class="reply-body">{{ r.business_reply }}</p>
              <button
                type="button"
                class="reply-edit-btn"
                data-testid="business-review-edit-reply"
                (click)="startEdit(r)">Edit reply</button>
            </div>

            <div class="reply-form" *ngIf="r.editing || !r.business_reply">
              <label class="label">{{ r.business_reply ? 'Edit reply' : 'Reply to this review' }}</label>
              <textarea
                class="textarea"
                rows="3"
                placeholder="Write a reply..."
                data-testid="business-review-reply-input"
                [attr.data-review-id]="r.id"
                [(ngModel)]="r.draftReply"
                maxlength="4000"></textarea>
              <div class="reply-actions">
                <button
                  type="button"
                  class="btn-secondary"
                  *ngIf="r.editing"
                  (click)="cancelEdit(r)">Cancel</button>
                <button
                  type="button"
                  class="btn-primary"
                  data-testid="business-review-reply-submit"
                  [attr.data-review-id]="r.id"
                  [disabled]="r.saving || !(r.draftReply || '').trim()"
                  (click)="postReply(r)">
                  {{ r.saving ? 'Saving…' : (r.business_reply ? 'Save reply' : 'Post reply') }}
                </button>
              </div>
            </div>
          </li>
        </ul>

        <div class="error-toast" *ngIf="errorMessage" data-testid="business-reviews-error" role="alert">
          {{ errorMessage }}
        </div>
      </main>
    </div>
  `,
  styles: [`
    :host {
      --surface: #F2F2F2; --surface-2: #E9E9EB; --line: #DCDCDF;
      --text: #0F1115; --text-muted: #6B6F77;
      --baby-blue: #CFE3F5; --baby-blue-deep: #7DA8CF;
      --ink: #0A0A0B;
      --font-body: 'Inter', system-ui, -apple-system, sans-serif;
      --font-display: 'Cormorant Garamond', Georgia, serif;
      --font-mono: ui-monospace, 'SF Mono', Menlo, monospace;
    }
    * { box-sizing: border-box; }
    .prov-shell {
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
    .prov-body { padding: 14px 16px; }
    .head-row { margin-bottom: 8px; }
    .count-pill {
      display: inline-flex; align-items: center; padding: 4px 10px;
      border-radius: 999px; background: #fff; border: 1px solid var(--line);
      font-family: var(--font-mono); font-size: 11px; color: var(--text-muted);
    }
    .status, .empty {
      margin-top: 18px; padding: 16px; text-align: center;
      color: var(--text-muted); font-size: 13px;
      background: #fff; border: 1px dashed var(--line); border-radius: 12px;
    }
    .reviews-list { list-style: none; margin: 12px 0; padding: 0; display: flex; flex-direction: column; gap: 10px; }
    .review-card {
      background: #FFFFFF; border: 1px solid var(--line); border-radius: 14px;
      padding: 12px 14px;
    }
    .review-head { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 6px; }
    .avatar {
      width: 26px; height: 26px; border-radius: 50%;
      background: var(--baby-blue); color: #1a3a52;
      font-weight: 600; font-size: 12px;
      display: grid; place-items: center;
    }
    .stars { display: inline-flex; gap: 1px; align-items: center; }
    .svc { font-family: var(--font-mono); font-size: 10px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1.1px; }
    .when { margin-left: auto; font-family: var(--font-mono); font-size: 10px; color: var(--text-muted); }
    .body { margin: 4px 0 0; font-size: 13px; line-height: 1.5; color: var(--text); }
    .reply-block {
      margin-top: 10px; padding: 10px 12px;
      background: var(--surface-2); border-radius: 10px;
      border-left: 3px solid var(--baby-blue-deep);
    }
    .reply-head { font-size: 10px; font-weight: 600; color: #1a3a52; text-transform: uppercase; letter-spacing: 1.1px; margin-bottom: 4px; }
    .reply-body { margin: 0 0 6px; font-size: 12px; color: var(--text); line-height: 1.5; }
    .reply-edit-btn {
      background: transparent; border: 1px solid var(--line); color: var(--text);
      font-family: var(--font-body); font-size: 11px; font-weight: 600;
      padding: 4px 8px; border-radius: 8px; cursor: pointer;
    }
    .reply-form { margin-top: 10px; }
    .label { display: block; font-size: 11px; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1.1px; margin-bottom: 6px; }
    .textarea {
      width: 100%; border: 1px solid var(--line); border-radius: 10px;
      padding: 10px 12px; font-family: var(--font-body); font-size: 13px; resize: vertical;
      min-height: 70px;
    }
    .textarea:focus { outline: 2px solid #1a3a52; outline-offset: 1px; }
    .reply-actions { margin-top: 8px; display: flex; gap: 8px; justify-content: flex-end; }
    .btn-primary {
      height: 36px; padding: 0 14px; border-radius: 10px;
      background: var(--ink); color: #fff; border: 1px solid var(--ink);
      font-family: var(--font-body); font-size: 12px; font-weight: 600;
      cursor: pointer;
    }
    .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-secondary {
      height: 36px; padding: 0 14px; border-radius: 10px;
      background: transparent; color: var(--text); border: 1px solid var(--line);
      font-family: var(--font-body); font-size: 12px; font-weight: 600;
      cursor: pointer;
    }
    .error-toast {
      margin-top: 12px; padding: 10px 12px; border-radius: 10px;
      background: #FCE8E6; color: #B3261E; border: 1px solid #F4C7C3;
      font-size: 13px;
    }
  `],
})
export class BeautyBusinessReviewsComponent implements OnInit {
  reviews: BusinessReview[] = [];
  loading = true;
  errorMessage = '';

  constructor(
    private http: HttpClient,
    private auth: BeautyAuthService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) private platformId: object,
  ) {}

  ngOnInit(): void {
    this.load();
  }

  goBack(): void {
    if (isPlatformBrowser(this.platformId)) window.history.back();
  }

  formatDate(iso: string): string {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }

  startEdit(r: BusinessReview): void {
    r.editing = true;
    r.draftReply = r.business_reply;
  }

  cancelEdit(r: BusinessReview): void {
    r.editing = false;
    r.draftReply = '';
  }

  postReply(r: BusinessReview): void {
    const reply = (r.draftReply || '').trim();
    if (!reply || r.saving) return;
    r.saving = true;
    this.errorMessage = '';

    const url = `${environment.apiBaseUrl}/api/beauty/protected/business/reviews/${r.id}/reply/`;
    this.http.post<BusinessReview>(url, { reply }, {
      withCredentials: true,
      headers: this.auth.getAuthHeaders(),
    }).subscribe({
      next: (updated) => {
        r.business_reply = updated.business_reply;
        r.business_reply_at = updated.business_reply_at;
        r.editing = false;
        r.saving = false;
        r.draftReply = '';
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        r.saving = false;
        if (err.status === 403) {
          this.errorMessage = 'You can only reply to reviews on your own services.';
        } else if (err.status === 401) {
          this.errorMessage = 'Your session has expired. Please sign in again.';
        } else {
          this.errorMessage = 'Could not save reply. Please try again.';
        }
        this.cdr.markForCheck();
      },
    });
  }

  private load(): void {
    const url = `${environment.apiBaseUrl}/api/beauty/protected/business/reviews/`;
    this.http.get<BusinessReviewsResponse>(url, {
      withCredentials: true,
      headers: this.auth.getAuthHeaders(),
    }).subscribe({
      next: (resp) => {
        this.reviews = (resp?.items || []).map((r) => ({
          ...r,
          draftReply: r.business_reply || '',
          editing: false,
          saving: false,
        }));
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        this.loading = false;
        if (err.status === 403) {
          this.errorMessage = 'Business sign-in required.';
        } else {
          this.errorMessage = 'Could not load reviews. Please try again.';
        }
        this.cdr.markForCheck();
      },
    });
  }
}
