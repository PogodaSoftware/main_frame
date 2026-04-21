/**
 * BeautyBusinessServiceFormComponent (Presentational)
 * ---------------------------------------------------
 * Add or edit form for a single service. The BFF supplies the field set
 * (name, category, description, price_cents, duration_minutes) and tells
 * us which method to call and where to POST/PUT. On success we navigate
 * to the success_screen link via a synthetic NAV link.
 */

import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { BeautyAuthService } from './beauty-auth.service';
import { BffLink } from './beauty-bff.types';

interface FormField {
  name: string;
  type: string;
  label: string;
  required?: boolean;
  value?: string | number;
  options?: { value: string; label: string }[];
  min?: number;
  max?: number;
}

interface BusinessForm {
  title: string;
  submit_method: string;
  submit_href: string;
  success_screen: string;
  submit_label: string;
  fields: FormField[];
}

@Component({
  selector: 'app-beauty-business-service-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="biz-app">
      <header class="biz-header">
        <button class="back-btn" (click)="emit(links['cancel'])" *ngIf="links['cancel']">
          ← Cancel
        </button>
        <h1 class="biz-h1">{{ form?.title || 'Service' }}</h1>
      </header>

      <section class="biz-section">
        <form class="biz-form" (ngSubmit)="onSubmit()" novalidate *ngIf="form">
          <ng-container *ngFor="let f of form.fields">
            <label class="field-label" [for]="f.name">{{ f.label }}</label>

            <select
              *ngIf="f.type === 'select'"
              [id]="f.name"
              [name]="f.name"
              class="form-input"
              [(ngModel)]="values[f.name]"
              [required]="f.required ?? false"
            >
              <option *ngFor="let o of f.options" [value]="o.value">{{ o.label }}</option>
            </select>

            <input
              *ngIf="f.type === 'number'"
              type="number"
              [id]="f.name"
              [name]="f.name"
              class="form-input"
              [(ngModel)]="values[f.name]"
              [required]="f.required ?? false"
              [min]="f.min ?? null"
              [max]="f.max ?? null"
            />

            <input
              *ngIf="f.type === 'text'"
              type="text"
              [id]="f.name"
              [name]="f.name"
              class="form-input"
              [(ngModel)]="values[f.name]"
              [required]="f.required ?? false"
            />
          </ng-container>

          <p *ngIf="serverError" class="server-error">{{ serverError }}</p>

          <button type="submit" class="btn-primary" [disabled]="isSubmitting">
            {{ isSubmitting ? 'Saving…' : (form.submit_label || 'Save') }}
          </button>
        </form>
      </section>
    </div>
  `,
  styles: [`
    .biz-app { min-height: 100dvh; background: #fafafa; font-family: -apple-system, sans-serif; color: #212121; }
    .biz-header { display: flex; align-items: center; gap: 16px; padding: 16px 24px; background: #fff; border-bottom: 1px solid #eee; }
    .back-btn { background: none; border: none; color: #555; cursor: pointer; }
    .biz-h1 { font-size: 1.2rem; margin: 0; }
    .biz-section { padding: 24px; max-width: 540px; margin: 0 auto; }
    .biz-form { display: flex; flex-direction: column; gap: 8px; }
    .field-label { font-size: 0.9rem; color: #444; margin-top: 8px; }
    .form-input { padding: 12px; border: 1px solid #ddd; border-radius: 8px; font-size: 1rem; background: #fff; }
    .btn-primary { background: #1d4ed8; color: #fff; border: none; padding: 14px; border-radius: 10px; font-size: 1rem; cursor: pointer; margin-top: 16px; }
    .btn-primary:disabled { background: #aaa; cursor: not-allowed; }
    .server-error { color: #c62828; font-size: 0.9rem; }
  `],
})
export class BeautyBusinessServiceFormComponent implements OnChanges {
  @Input() data: Record<string, unknown> = {};
  @Input() links: Record<string, BffLink> = {};
  @Output() followLink = new EventEmitter<BffLink>();

  values: Record<string, string | number> = {};
  isSubmitting = false;
  serverError = '';

  constructor(private authService: BeautyAuthService) {}

  get form(): BusinessForm | null {
    return (this.data['form'] as BusinessForm) || null;
  }

  ngOnChanges(_: SimpleChanges): void {
    const f = this.form;
    if (!f) return;
    const v: Record<string, string | number> = {};
    for (const field of f.fields) {
      v[field.name] = field.value ?? '';
    }
    this.values = v;
  }

  emit(link: BffLink | null | undefined): void {
    if (link) this.followLink.emit(link);
  }

  onSubmit(): void {
    if (!this.form || this.isSubmitting) return;
    this.isSubmitting = true;
    this.serverError = '';

    const submitLink: BffLink = {
      rel: 'submit',
      href: this.form.submit_href,
      method: (this.form.submit_method as BffLink['method']) || 'POST',
      screen: null,
      route: null,
      prompt: null,
    };

    this.authService.follow(submitLink, this.values).subscribe({
      next: () => {
        this.isSubmitting = false;
        const target: BffLink = {
          rel: 'success',
          href: null,
          method: 'NAV',
          screen: this.form?.success_screen || 'beauty_business_services',
          route: null,
          prompt: null,
        };
        this.followLink.emit(target);
      },
      error: (err) => {
        this.isSubmitting = false;
        this.serverError = err?.error?.detail || 'Could not save. Please try again.';
      },
    });
  }
}
