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
        <header *ngIf="!p.hide_top_header" class="login-header signup-header">
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

        <header *ngIf="p.show_back_bar" class="auth-back-bar">
          <button
            type="button"
            class="auth-back-btn"
            aria-label="Back"
            (click)="emitFollow(backLink())"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M15 18l-6-6 6-6"/>
            </svg>
          </button>
        </header>

        <main [class]="p.main_class">
          <div *ngIf="p.show_brand_block" class="auth-brand-block">
            <div class="auth-brand-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="#fff" aria-hidden="true">
                <path d="M12 2l2.4 6.6L21 11l-6.6 2.4L12 20l-2.4-6.6L3 11l6.6-2.4L12 2z" />
              </svg>
            </div>
            <div class="auth-brand-name">Beauty</div>
          </div>

          <h1 *ngIf="form.title" [class]="p.title_class">{{ form.title }}</h1>
          <p *ngIf="form.subtitle" [class]="p.subtitle_class">{{ form.subtitle }}</p>

          <form [class]="p.form_class" (ngSubmit)="onSubmit()" novalidate>
            <div class="field-group" *ngFor="let f of fields; trackBy: trackByName">
              <label
                [attr.for]="f.schema.name"
                [class]="p.show_field_labels !== false ? 'field-label' : 'field-label sr-only'"
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
                  [attr.aria-invalid]="hasError(f) && f.touched ? 'true' : null"
                  [attr.aria-describedby]="hasError(f) && f.touched ? f.schema.name + '-err' : null"
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
                    [attr.aria-invalid]="hasError(f) && f.touched ? 'true' : null"
                    [attr.aria-describedby]="hasError(f) && f.touched ? f.schema.name + '-err' : null"
                    class="form-input"
                    [class.error]="hasError(f) && f.touched"
                  />
                  <button
                    type="button"
                    class="password-toggle"
                    (click)="f.showSecret = !f.showSecret"
                    aria-label="Toggle password visibility"
                    [attr.aria-pressed]="f.showSecret"
                  >{{ f.showSecret ? 'Hide' : 'Show' }}</button>
                </div>
              </ng-container>

              <span
                *ngIf="f.touched && fieldError(f) as err"
                class="field-error"
                [id]="f.schema.name + '-err'"
              >{{ err }}</span>
            </div>

            <div *ngIf="p.show_forgot_link && links['forgot'] as forgotLink" class="forgot-row">
              <button type="button" class="forgot-link" (click)="emitFollow(forgotLink)">
                {{ forgotLink.prompt || 'Forgot password?' }}
              </button>
            </div>

            <label *ngIf="p.show_terms_checkbox" class="terms-row">
              <input
                type="checkbox"
                class="terms-input"
                [(ngModel)]="termsAgreed"
                [name]="'terms-agreed'"
                [ngModelOptions]="{ standalone: true }"
              />
              <span class="terms-checkbox" [class.checked]="termsAgreed" aria-hidden="true">
                <svg *ngIf="termsAgreed" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#0F1115" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M20 6L9 17l-5-5"/>
                </svg>
              </span>
              <span class="terms-text">
                I agree to the <button type="button" class="terms-link" (click)="$event.preventDefault()">Terms</button> and
                <button type="button" class="terms-link" (click)="$event.preventDefault()">Privacy Policy</button>.
              </span>
            </label>

            <div *ngIf="serverError" class="server-error" role="alert" aria-live="assertive">{{ serverError }}</div>

            <button
              type="submit"
              [class]="p.submit_class"
              [disabled]="!isValid() || isLoading || (p.show_terms_checkbox && !termsAgreed)"
            >
              <span *ngIf="isLoading" class="spinner"></span>
              <ng-container *ngIf="!isLoading">{{ form.submit.prompt }}</ng-container>
            </button>
          </form>

          <div *ngIf="p.show_or_divider" class="or-divider">
            <span></span><em>or</em><span></span>
          </div>

          <button
            *ngIf="p.show_social"
            type="button"
            class="btn-google"
            (click)="emitGoogle()"
          >
            <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
              <path fill="#4285F4" d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z"/>
              <path fill="#34A853" d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z"/>
              <path fill="#FBBC05" d="M11.69 28.18C11.25 26.86 11 25.45 11 24s.25-2.86.69-4.18v-5.7H4.34C2.85 17.09 2 20.45 2 24c0 3.55.85 6.91 2.34 9.88l7.35-5.7z"/>
              <path fill="#EA4335" d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.35 5.7C13.42 14.62 18.27 10.75 24 10.75z"/>
            </svg>
            <span>{{ p.social_button_label || 'Continue with Google' }}</span>
          </button>

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
  termsAgreed = false;

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
        route: '/',
        prompt: 'Home',
      }
    );
  }

  backLink(): BffLink {
    return (
      this.links['back'] || {
        rel: 'back',
        href: null,
        method: 'NAV',
        screen: 'beauty_welcome',
        route: '/welcome',
        prompt: 'Back',
      }
    );
  }

  emitGoogle(): void {
    const link: BffLink = this.links['google'] || {
      rel: 'google',
      href: null,
      method: 'NAV',
      screen: 'beauty_login',
      route: '/login',
      prompt: 'Continue with Google',
      params: { provider: 'google' },
    };
    this.emitFollow(link);
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
