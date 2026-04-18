/**
 * BeautyBookComponent (Presentational)
 * ------------------------------------
 * Booking screen for a single service. The BFF supplies a `form` block
 * with a `slot_at` select whose options are pre-computed time slots.
 * On confirm we POST { service_id, slot_at } to the supplied submit_href
 * via BeautyAuthService.follow(), then navigate to the success_screen
 * link the BFF returned.
 */

import {
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { BeautyAuthService } from './beauty-auth.service';
import { BffLink } from './beauty-bff.types';

interface BookField {
  name: string;
  type: string;
  label?: string;
  value?: string | number;
  options?: { value: string; label: string }[];
  required?: boolean;
}

interface BookForm {
  submit_method: string;
  submit_href: string;
  success_screen: string;
  /**
   * Route template the BFF supplies — `:bookingId` is substituted with
   * the new booking's id from the POST response so we navigate
   * deterministically to the success screen (no fallback retries).
   */
  success_route_template?: string;
  fields: BookField[];
  submit_label: string;
}

@Component({
  selector: 'app-beauty-book',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="beauty-app">
      <header class="beauty-header">
        <div class="header-brand">
          <span class="brand-icon">✨</span>
          <button class="brand-name-btn" (click)="emit(links['home'])">Beauty</button>
        </div>
      </header>

      <section class="book-section">
        <button class="back-btn" (click)="emit(links['provider'])" *ngIf="links['provider']">
          ← Back to provider
        </button>

        <h1 class="book-title">Book {{ serviceName }}</h1>
        <p class="book-meta" *ngIf="serviceMeta">{{ serviceMeta }}</p>
        <p class="book-prov" *ngIf="providerName">at {{ providerName }} · {{ providerLoc }}</p>

        <form class="book-form" (ngSubmit)="onSubmit()" novalidate>
          <ng-container *ngFor="let f of visibleFields">
            <label class="field-label" [for]="f.name">{{ f.label }}</label>
            <select
              [id]="f.name"
              [name]="f.name"
              class="form-input"
              [(ngModel)]="values[f.name]"
              [required]="f.required ?? false"
            >
              <option value="" disabled>Select…</option>
              <option *ngFor="let o of f.options" [value]="o.value">{{ o.label }}</option>
            </select>
          </ng-container>

          <p *ngIf="serverError" class="server-error">{{ serverError }}</p>

          <button
            type="submit"
            class="btn-confirm"
            [disabled]="!canSubmit() || isSubmitting"
          >
            {{ isSubmitting ? 'Booking…' : (form?.submit_label || 'Confirm booking') }}
          </button>
        </form>
      </section>
    </div>
  `,
  styles: [`
    .beauty-app { min-height: 100dvh; background: #fff; font-family: -apple-system, sans-serif; color: #212121; }
    .beauty-header { display: flex; align-items: center; padding: 16px 20px; border-bottom: 1px solid #eee; }
    .brand-icon { font-size: 1.4rem; margin-right: 6px; }
    .brand-name-btn { background: none; border: none; font-size: 1.1rem; font-weight: 600; cursor: pointer; }
    .book-section { padding: 24px 20px 64px; max-width: 520px; margin: 0 auto; }
    .back-btn { background: none; border: none; color: #555; cursor: pointer; padding: 0 0 16px; font-size: 0.9rem; }
    .book-title { font-size: 1.75rem; margin: 0 0 4px; }
    .book-meta { color: #666; margin: 0; }
    .book-prov { color: #888; margin: 4px 0 24px; }
    .book-form { display: flex; flex-direction: column; gap: 12px; }
    .field-label { font-size: 0.9rem; color: #444; }
    .form-input { padding: 12px; border: 1px solid #ddd; border-radius: 8px; font-size: 1rem; background: #fff; }
    .btn-confirm { background: #000; color: #fff; border: none; border-radius: 10px; padding: 14px; font-size: 1rem; cursor: pointer; margin-top: 12px; }
    .btn-confirm:disabled { background: #aaa; cursor: not-allowed; }
    .server-error { color: #c62828; font-size: 0.9rem; }
  `],
})
export class BeautyBookComponent {
  @Input() data: Record<string, unknown> = {};
  @Input() links: Record<string, BffLink> = {};
  @Output() followLink = new EventEmitter<BffLink>();

  values: Record<string, string | number> = {};
  isSubmitting = false;
  serverError = '';

  constructor(private authService: BeautyAuthService) {}

  get form(): BookForm | null {
    return (this.data['form'] as BookForm) || null;
  }

  get visibleFields(): BookField[] {
    return (this.form?.fields || []).filter((f) => f.type !== 'hidden');
  }

  get serviceName(): string {
    const svc = this.data['service'] as { name?: string } | undefined;
    return svc?.name || 'Service';
  }

  get serviceMeta(): string {
    const svc = this.data['service'] as
      | { duration_minutes?: number; price_cents?: number }
      | undefined;
    if (!svc) return '';
    const price = svc.price_cents != null ? `$${(svc.price_cents / 100).toFixed(2)}` : '';
    return [svc.duration_minutes ? `${svc.duration_minutes} min` : '', price]
      .filter(Boolean)
      .join(' · ');
  }

  get providerName(): string {
    const p = this.data['provider'] as { name?: string } | undefined;
    return p?.name || '';
  }

  get providerLoc(): string {
    const p = this.data['provider'] as { location_label?: string } | undefined;
    return p?.location_label || '';
  }

  canSubmit(): boolean {
    if (!this.form) return false;
    return this.visibleFields.every((f) => !f.required || !!this.values[f.name]);
  }

  onSubmit(): void {
    if (!this.form || this.isSubmitting || !this.canSubmit()) return;
    this.serverError = '';
    this.isSubmitting = true;

    // Hidden fields (e.g. service_id) carry their server-supplied value.
    const body: Record<string, unknown> = {};
    for (const f of this.form.fields) {
      body[f.name] = f.type === 'hidden' ? f.value : this.values[f.name];
    }

    const submitLink: BffLink = {
      rel: 'submit',
      href: this.form.submit_href,
      method: (this.form.submit_method as BffLink['method']) || 'POST',
      screen: null,
      route: null,
      prompt: null,
    };

    this.authService.follow(submitLink, body).subscribe({
      next: (resp: unknown) => {
        this.isSubmitting = false;
        // Build a real success link with a substituted route, using the
        // server-supplied template + the booking id from the POST response.
        const bookingId =
          (resp as { id?: number | string } | null)?.id ?? null;
        const template = this.form?.success_route_template;
        let route: string | null = null;
        if (template && bookingId != null) {
          route = template.replace(':bookingId', String(bookingId));
        }
        const target: BffLink = {
          rel: 'success',
          href: null,
          method: 'NAV',
          screen: this.form?.success_screen || 'beauty_bookings',
          route,
          prompt: null,
        };
        this.followLink.emit(target);
      },
      error: (err) => {
        this.isSubmitting = false;
        this.serverError =
          (err?.error?.detail as string) ||
          'Could not create that booking. Please try again.';
      },
    });
  }

  emit(link: BffLink | null | undefined): void {
    if (link) this.followLink.emit(link);
  }
}
