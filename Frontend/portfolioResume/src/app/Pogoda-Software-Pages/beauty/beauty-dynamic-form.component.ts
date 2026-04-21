/**
 * BeautyDynamicFormComponent
 * --------------------------
 * Schema-driven form renderer. Receives a BFF-supplied form schema and a
 * map of links, renders the form generically (fields, validators, submit
 * button, footer link buttons), and emits navigation/success events
 * carrying full link objects.
 *
 * The shell wires events back into the BFF re-resolve loop. This
 * component owns no domain logic — adding a field, changing a label,
 * relabeling the submit button, or hiding a footer link is all done by
 * editing the BFF resolver, with no Angular release.
 *
 * CSS classes come from the schema's `presentation` block so existing
 * page styles and Playwright selectors remain stable.
 */

import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { BeautyAuthService } from './beauty-auth.service';
import {
  BffFieldSchema,
  BffFooterLink,
  BffFormSchema,
  BffLink,
} from './beauty-bff.types';

interface FieldState {
  schema: BffFieldSchema;
  value: string;
  touched: boolean;
  showSecret: boolean;
}

@Component({
  selector: 'app-beauty-dynamic-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.Default,
  template: `
    <ng-container *ngIf="form && form.presentation as p">
      <div [class]="p.page_class">
        <header class="login-header signup-header">
          <div class="header-brand">
            <span class="brand-icon">{{ p.header_brand_icon }}</span>
            <button
              type="button"
              class="brand-name-btn"
              (click)="emitFollow(homeLink())"
            >{{ p.header_brand_label }}</button>
          </div>
          <span
            *ngIf="p.header_badge_text"
            [class]="p.header_badge_class || 'header-badge'"
          >{{ p.header_badge_text }}</span>
        </header>

        <main [class]="p.main_class">
          <h1 *ngIf="form.title" [class]="p.title_class">{{ form.title }}</h1>
          <p *ngIf="form.subtitle" [class]="p.subtitle_class">{{ form.subtitle }}</p>

          <form [class]="p.form_class" (ngSubmit)="onSubmit()" novalidate>
            <div class="field-group" *ngFor="let f of fields; trackBy: trackByName">
              <label
                *ngIf="p.show_field_labels !== false"
                [attr.for]="f.schema.name"
                class="field-label"
              >{{ f.schema.label }}</label>

              <ng-container *ngIf="!f.schema.secret_toggle">
                <input
                  [attr.id]="f.schema.name"
                  [attr.name]="f.schema.name"
                  [attr.data-field]="f.schema.name"
                  [attr.type]="f.schema.type"
                  [(ngModel)]="f.value"
                  (blur)="f.touched = true"
                  [name]="f.schema.name"
                  [placeholder]="f.schema.placeholder"
                  [attr.required]="f.schema.required ? '' : null"
                  [attr.minlength]="f.schema.min_length || null"
                  [attr.autocomplete]="f.schema.autocomplete || null"
                  [attr.inputmode]="f.schema.inputmode || null"
                  [attr.autocapitalize]="f.schema.autocapitalize || null"
                  class="form-input"
                  [class.error]="hasError(f) && f.touched"
                />
              </ng-container>

              <ng-container *ngIf="f.schema.secret_toggle">
                <div class="password-wrapper">
                  <input
                    [attr.id]="f.schema.name"
                    [attr.name]="f.schema.name"
                    [attr.data-field]="f.schema.name"
                    [attr.type]="f.showSecret ? 'text' : 'password'"
                    [(ngModel)]="f.value"
                    (blur)="f.touched = true"
                    [name]="f.schema.name"
                    [placeholder]="f.schema.placeholder"
                    [attr.required]="f.schema.required ? '' : null"
                    [attr.minlength]="f.schema.min_length || null"
                    [attr.autocomplete]="f.schema.autocomplete || null"
                    class="form-input"
                    [class.error]="hasError(f) && f.touched"
                  />
                  <button
                    type="button"
                    class="password-toggle"
                    (click)="f.showSecret = !f.showSecret"
                    aria-label="Toggle password visibility"
                  >{{ f.showSecret ? 'Hide' : 'Show' }}</button>
                </div>
              </ng-container>

              <span *ngIf="f.touched && fieldError(f) as err" class="field-error">{{ err }}</span>
            </div>

            <div *ngIf="serverError" class="server-error">{{ serverError }}</div>

            <button
              type="submit"
              [class]="p.submit_class"
              [disabled]="!isValid() || isLoading"
            >
              <span *ngIf="isLoading" class="spinner"></span>
              <ng-container *ngIf="!isLoading">{{ form.submit.prompt }}</ng-container>
            </button>
          </form>

          <ng-container *ngFor="let fl of form.footer_links">
            <div *ngIf="resolveFooterLink(fl) as link" [class]="fl.group_class">
              <span *ngIf="fl.label_prefix">{{ fl.label_prefix }}</span>
              <button
                type="button"
                [class]="fl.cta_class"
                (click)="emitFollow(link)"
              >{{ link.prompt }}</button>
            </div>
          </ng-container>
        </main>
      </div>
    </ng-container>
  `,
  styleUrls: ['./beauty-login.component.scss'],
})
export class BeautyDynamicFormComponent implements OnChanges {
  @Input() form: BffFormSchema | null = null;
  @Input() links: Record<string, BffLink> = {};
  @Output() submitSuccess = new EventEmitter<BffLink>();
  @Output() followLink = new EventEmitter<BffLink>();

  fields: FieldState[] = [];
  isLoading = false;
  serverError = '';

  constructor(private authService: BeautyAuthService) {}

  ngOnChanges(): void {
    this.fields = (this.form?.fields || []).map((schema) => ({
      schema,
      value: '',
      touched: false,
      showSecret: false,
    }));
    this.isLoading = false;
    this.serverError = '';
  }

  trackByName = (_: number, f: FieldState) => f.schema.name;

  homeLink(): BffLink {
    return (
      this.links['home'] || {
        rel: 'home',
        href: null,
        method: 'NAV',
        screen: 'beauty_home',
        route: '/pogoda/beauty',
        prompt: 'Home',
      }
    );
  }

  resolveFooterLink(fl: BffFooterLink): BffLink | null {
    return this.links[fl.rel] || null;
  }

  emitFollow(link: BffLink): void {
    this.followLink.emit(link);
  }

  hasError(f: FieldState): boolean {
    return Boolean(this.fieldError(f));
  }

  fieldError(f: FieldState): string | null {
    const v = f.value || '';
    const msgs = f.schema.error_messages || {};
    if (f.schema.required && !v.trim()) return msgs.required || 'This field is required.';
    if (f.schema.type === 'email' && v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) {
      return msgs.email || 'Please enter a valid email address.';
    }
    if (f.schema.min_length && v.length < f.schema.min_length) {
      return msgs.min_length || `Must be at least ${f.schema.min_length} characters.`;
    }
    if (f.schema.pattern && v) {
      try {
        if (!new RegExp(f.schema.pattern).test(v)) {
          return msgs.pattern || 'Please enter a valid value.';
        }
      } catch {
        // Bad pattern from server — fail open rather than block the user.
      }
    }
    return null;
  }

  isValid(): boolean {
    return this.fields.every((f) => !this.fieldError(f));
  }

  onSubmit(): void {
    if (!this.form || this.isLoading) return;
    // Show validation errors on submit attempt.
    for (const f of this.fields) f.touched = true;
    if (!this.isValid()) return;

    this.serverError = '';
    this.isLoading = true;

    const body: Record<string, unknown> = {};
    for (const f of this.fields) body[f.schema.name] = f.value;

    this.authService
      .follow<unknown>(this.form.submit, body, this.form.include_device_id)
      .subscribe({
        next: () => {
          this.isLoading = false;
          this.submitSuccess.emit(this.form!.success);
        },
        error: (err) => {
          this.isLoading = false;
          this.serverError = this.extractError(err);
        },
      });
  }

  private extractError(err: { status?: number; error?: unknown }): string {
    if (!this.form) return 'Something went wrong.';
    const status = String(err?.status ?? '');
    const mapped = this.form.error_status_map?.[status];
    if (mapped) return mapped;
    if (err?.status === 400 && err.error && typeof err.error === 'object') {
      const errObj = err.error as Record<string, unknown>;
      const firstKey = Object.keys(errObj)[0];
      if (firstKey) {
        const msg = errObj[firstKey];
        return Array.isArray(msg) ? String(msg[0]) : String(msg);
      }
    }
    return this.form.error_default || 'Something went wrong. Please try again.';
  }
}
