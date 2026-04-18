/**
 * BeautyRescheduleComponent (Presentational)
 * ------------------------------------------
 * Slot picker for moving an existing upcoming booking to a different
 * time. The BFF supplies a `form` block with a single `slot_at` select
 * whose options come from the same availability service the initial
 * booking flow uses (with this booking's own slot excluded so the
 * picker doesn't rule out the current slot artificially).
 *
 * On confirm we POST { slot_at } to the supplied submit_href and then
 * emit a NAV link back to the booking-detail screen so the customer
 * sees the new time immediately.
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
import { formatSlotLocal } from './beauty-time.util';

interface ReField {
  name: string;
  type: string;
  label?: string;
  value?: string | number;
  options?: { value: string; label: string }[];
  required?: boolean;
}

interface ReForm {
  submit_method: string;
  submit_href: string;
  success_screen: string;
  success_route_template?: string;
  fields: ReField[];
  submit_label: string;
}

@Component({
  selector: 'app-beauty-reschedule',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="beauty-app">
      <header class="beauty-header">
        <span class="brand-icon">✨</span>
        <button class="brand-name-btn" (click)="emit(links['home'])">Beauty</button>
      </header>

      <section class="re-section">
        <button
          class="back-btn"
          (click)="emit(links['booking'])"
          *ngIf="links['booking']"
        >← {{ links['booking'].prompt || 'Back to booking' }}</button>

        <h1 class="title">Reschedule {{ serviceName }}</h1>
        <p class="meta" *ngIf="providerName">at {{ providerName }} · {{ providerLoc }}</p>

        <div class="current-card">
          <p class="current-label">Currently booked for</p>
          <p class="current-time">{{ currentSlotLabel }}</p>
        </div>

        <form class="re-form" (ngSubmit)="onSubmit()" novalidate>
          <ng-container *ngFor="let f of visibleFields">
            <label class="field-label" [for]="f.name">{{ f.label }}</label>
            <select
              [id]="f.name"
              [name]="f.name"
              class="form-input"
              [(ngModel)]="values[f.name]"
              [required]="f.required ?? false"
            >
              <option value="" disabled>Select a new time…</option>
              <option *ngFor="let o of f.options" [value]="o.value">{{ slotLabel(o) }}</option>
            </select>
          </ng-container>

          <p *ngIf="serverError" class="server-error">{{ serverError }}</p>

          <button
            type="submit"
            class="btn-confirm"
            [disabled]="!canSubmit() || isSubmitting"
          >
            {{ isSubmitting ? 'Rescheduling…' : (form?.submit_label || 'Confirm new time') }}
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
    .re-section { padding: 24px 20px 64px; max-width: 520px; margin: 0 auto; }
    .back-btn { background: none; border: none; color: #555; cursor: pointer; padding: 0 0 16px; font-size: 0.9rem; }
    .title { font-size: 1.6rem; margin: 0 0 4px; }
    .meta { color: #888; margin: 4px 0 20px; }
    .current-card { background: #f6f6f6; border-radius: 10px; padding: 12px 14px; margin-bottom: 20px; }
    .current-label { margin: 0 0 4px; font-size: 0.85rem; color: #777; }
    .current-time { margin: 0; font-weight: 600; }
    .re-form { display: flex; flex-direction: column; gap: 12px; }
    .field-label { font-size: 0.9rem; color: #444; }
    .form-input { padding: 12px; border: 1px solid #ddd; border-radius: 8px; font-size: 1rem; background: #fff; }
    .btn-confirm { background: #000; color: #fff; border: none; border-radius: 10px; padding: 14px; font-size: 1rem; cursor: pointer; margin-top: 12px; }
    .btn-confirm:disabled { background: #aaa; cursor: not-allowed; }
    .server-error { color: #c62828; font-size: 0.9rem; }
  `],
})
export class BeautyRescheduleComponent {
  @Input() data: Record<string, unknown> = {};
  @Input() links: Record<string, BffLink> = {};
  @Output() followLink = new EventEmitter<BffLink>();

  values: Record<string, string | number> = {};
  isSubmitting = false;
  serverError = '';

  constructor(private authService: BeautyAuthService) {}

  get form(): ReForm | null {
    return (this.data['form'] as ReForm) || null;
  }

  get visibleFields(): ReField[] {
    return (this.form?.fields || []).filter((f) => f.type !== 'hidden');
  }

  get serviceName(): string {
    const svc = this.data['service'] as { name?: string } | undefined;
    return svc?.name || 'service';
  }

  get providerName(): string {
    const p = this.data['provider'] as { name?: string } | undefined;
    return p?.name || '';
  }

  get providerLoc(): string {
    const p = this.data['provider'] as { location_label?: string } | undefined;
    return p?.location_label || '';
  }

  get currentSlotLabel(): string {
    const b = this.data['booking'] as {
      current_slot_at?: string;
      current_slot_label?: string;
    } | undefined;
    if (b?.current_slot_at) {
      const local = formatSlotLocal(b.current_slot_at);
      if (local) return local;
    }
    return b?.current_slot_label || '';
  }

  /** Format a slot option in the customer's local timezone. */
  slotLabel(o: { value: string; label: string }): string {
    return formatSlotLocal(o.value) || o.label;
  }

  canSubmit(): boolean {
    if (!this.form) return false;
    return this.visibleFields.every((f) => !f.required || !!this.values[f.name]);
  }

  onSubmit(): void {
    if (!this.form || this.isSubmitting || !this.canSubmit()) return;
    this.serverError = '';
    this.isSubmitting = true;

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
      next: () => {
        this.isSubmitting = false;
        // Navigate back to the booking-detail screen — the BFF will
        // re-resolve and show the new slot.
        const target: BffLink =
          this.links['booking'] || {
            rel: 'success',
            href: null,
            method: 'NAV',
            screen: this.form?.success_screen || 'beauty_booking_detail',
            route: this.form?.success_route_template ?? null,
            prompt: null,
          };
        this.followLink.emit(target);
      },
      error: (err) => {
        this.isSubmitting = false;
        this.serverError =
          (err?.error?.detail as string) ||
          'Could not reschedule. Please try a different time.';
      },
    });
  }

  emit(link: BffLink | null | undefined): void {
    if (link) this.followLink.emit(link);
  }
}
