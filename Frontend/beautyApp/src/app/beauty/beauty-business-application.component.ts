/**
 * BeautyBusinessApplicationComponent
 * ----------------------------------
 * Multi-step business onboarding wizard. Each render shows one of five
 * steps; the BFF decides which step via `data.step`. The component:
 *   - Saves the current step's payload to /protected/business/application/.
 *   - On success, navigates to the BFF-provided `step_next` link (or, on
 *     step 5, posts to `submit_application` and then follows `success`).
 *   - Lets the user go back via the BFF-provided `step_prev` link.
 *
 * The component owns presentation only; field semantics and validation
 * messages come from the resolver / server response.
 */

import {
  ChangeDetectionStrategy,
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

interface ServiceCatalogEntry {
  slug: string;
  label: string;
}

interface ScheduleRow {
  day_of_week: number;
  is_closed: boolean;
  is_24h: boolean;
  start_time: string;
  end_time: string;
}

interface ApplicationDraft {
  applicant_kind: 'person' | 'business';
  first_name: string;
  last_name: string;
  business_name: string;
  itin: string;
  legal_business_name: string;
  address_line1: string;
  address_line2: string;
  address_city: string;
  address_state: string;
  address_postal_code: string;
  services_offered: string[];
  stripe_connected: boolean;
  stripe_placeholder_account: string;
  schedule_template: ScheduleRow[];
  third_party_tools: string[];
  tos_accepted: boolean;
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

@Component({
  selector: 'app-beauty-business-application',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.Default,
  template: `
    <div class="signup-page business-application-page" data-screen="beauty_business_application">
      <header class="auth-back-bar">
        <button
          *ngIf="links['step_prev']"
          type="button"
          class="auth-back-btn"
          aria-label="Previous step"
          data-action="step-prev"
          (click)="onPrev()"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M15 18l-6-6 6-6"/>
          </svg>
        </button>
        <button
          type="button"
          class="auth-logout-btn"
          data-action="signout"
          (click)="onLogout()"
          [disabled]="loggingOut"
        >{{ loggingOut ? 'Signing out…' : 'Sign out' }}</button>
      </header>

      <main class="signup-main" id="main">
        <div class="auth-brand-block">
          <div class="auth-brand-icon" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="#fff">
              <path d="M12 2l2.4 6.6L21 11l-6.6 2.4L12 20l-2.4-6.6L3 11l6.6-2.4L12 2z" />
            </svg>
          </div>
          <div class="auth-brand-name">Beauty</div>
        </div>

        <div class="app-progress" aria-label="Application progress">
          <span
            *ngFor="let n of stepDots; let i = index"
            class="app-dot"
            [class.complete]="i + 1 < step"
            [class.current]="i + 1 === step"
          ></span>
          <span class="sr-only">Step {{ step }} of {{ totalSteps }}</span>
        </div>

        <h1 class="signup-title" data-field="step-title">{{ title }}</h1>
        <p class="signup-subtitle" data-field="step-subtitle">{{ subtitle }}</p>

        <form class="signup-form" (ngSubmit)="onSave()" novalidate>
          <!-- Step 1 — identity & business -->
          <ng-container *ngIf="step === 1">
            <fieldset class="app-fieldset">
              <legend class="sr-only">Applicant type</legend>
              <div class="radio-row">
                <label class="radio-pill">
                  <input
                    type="radio"
                    name="applicant_kind"
                    value="person"
                    [(ngModel)]="draft.applicant_kind"
                  />
                  <span>Individual</span>
                </label>
                <label class="radio-pill">
                  <input
                    type="radio"
                    name="applicant_kind"
                    value="business"
                    [(ngModel)]="draft.applicant_kind"
                  />
                  <span>Registered business</span>
                </label>
              </div>
            </fieldset>

            <div class="row-2">
              <div class="field-group">
                <label class="field-label" for="first_name">First name</label>
                <input
                  id="first_name"
                  name="first_name"
                  type="text"
                  data-field="first_name"
                  class="form-input"
                  autocomplete="given-name"
                  [(ngModel)]="draft.first_name"
                  required
                />
              </div>
              <div class="field-group">
                <label class="field-label" for="last_name">Last name</label>
                <input
                  id="last_name"
                  name="last_name"
                  type="text"
                  data-field="last_name"
                  class="form-input"
                  autocomplete="family-name"
                  [(ngModel)]="draft.last_name"
                  required
                />
              </div>
            </div>

            <div class="field-group">
              <label class="field-label" for="business_name">Business name</label>
              <input
                id="business_name"
                name="business_name"
                type="text"
                data-field="business_name"
                class="form-input"
                autocomplete="organization"
                [(ngModel)]="draft.business_name"
                required
              />
            </div>

            <div class="field-group">
              <label class="field-label" for="itin">ITIN / SSN</label>
              <input
                id="itin"
                name="itin"
                type="text"
                inputmode="numeric"
                data-field="itin"
                class="form-input"
                placeholder="123-45-6789"
                [(ngModel)]="draft.itin"
                required
                aria-describedby="itin-hint"
              />
              <span id="itin-hint" class="field-hint">9 digits, used for tax reporting only.</span>
            </div>

            <div class="field-group">
              <label class="field-label" for="address_line1">Street address</label>
              <input
                id="address_line1"
                name="address_line1"
                type="text"
                data-field="address_line1"
                class="form-input"
                autocomplete="address-line1"
                [(ngModel)]="draft.address_line1"
                required
              />
            </div>

            <div class="field-group">
              <label class="field-label" for="address_line2">Apt, suite, etc. (optional)</label>
              <input
                id="address_line2"
                name="address_line2"
                type="text"
                data-field="address_line2"
                class="form-input"
                autocomplete="address-line2"
                [(ngModel)]="draft.address_line2"
              />
            </div>

            <div class="row-3">
              <div class="field-group">
                <label class="field-label" for="address_city">City</label>
                <input
                  id="address_city"
                  name="address_city"
                  type="text"
                  data-field="address_city"
                  class="form-input"
                  autocomplete="address-level2"
                  [(ngModel)]="draft.address_city"
                  required
                />
              </div>
              <div class="field-group">
                <label class="field-label" for="address_state">State</label>
                <input
                  id="address_state"
                  name="address_state"
                  type="text"
                  data-field="address_state"
                  class="form-input"
                  autocomplete="address-level1"
                  [(ngModel)]="draft.address_state"
                  required
                />
              </div>
              <div class="field-group">
                <label class="field-label" for="address_postal_code">ZIP</label>
                <input
                  id="address_postal_code"
                  name="address_postal_code"
                  type="text"
                  inputmode="numeric"
                  data-field="address_postal_code"
                  class="form-input"
                  autocomplete="postal-code"
                  [(ngModel)]="draft.address_postal_code"
                  required
                />
              </div>
            </div>
          </ng-container>

          <!-- Step 2 — services offered -->
          <ng-container *ngIf="step === 2">
            <fieldset class="app-fieldset" data-field="services">
              <legend class="field-label">Pick everything you offer</legend>
              <div class="check-grid">
                <label
                  *ngFor="let s of serviceCatalog"
                  class="check-tile"
                  [class.checked]="isServiceChecked(s.slug)"
                  [attr.data-service]="s.slug"
                >
                  <input
                    type="checkbox"
                    [checked]="isServiceChecked(s.slug)"
                    (change)="toggleService(s.slug)"
                  />
                  <span class="check-tile-label">{{ s.label }}</span>
                </label>
              </div>
            </fieldset>
          </ng-container>

          <!-- Step 3 — Stripe placeholder -->
          <ng-container *ngIf="step === 3">
            <p class="step-blurb">
              We'll connect Stripe so customers can pay you securely. For now
              this is a placeholder — you'll finish payouts in your dashboard
              once your application is approved.
            </p>
            <button
              type="button"
              class="stripe-connect-btn"
              data-action="connect-stripe"
              [class.connected]="draft.stripe_connected"
              (click)="toggleStripe()"
            >
              <span class="stripe-icon" aria-hidden="true">S</span>
              <span class="stripe-label">
                {{ draft.stripe_connected ? 'Stripe connected (placeholder)' : 'Connect Stripe (placeholder)' }}
              </span>
            </button>
            <p *ngIf="draft.stripe_connected" class="stripe-status" role="status">
              Placeholder account: <strong>{{ draft.stripe_placeholder_account || 'pending' }}</strong>
            </p>
          </ng-container>

          <!-- Step 4 — weekly schedule -->
          <ng-container *ngIf="step === 4">
            <p class="step-blurb">
              Set the hours you'd like to be open. You can fine-tune this any
              time from your dashboard.
            </p>
            <div class="schedule-list">
              <div
                *ngFor="let row of draft.schedule_template; let i = index"
                class="schedule-row"
                [attr.data-day]="row.day_of_week"
              >
                <span class="schedule-day">{{ dayLabel(row.day_of_week) }}</span>
                <label class="schedule-closed">
                  <input
                    type="checkbox"
                    [(ngModel)]="row.is_closed"
                    [name]="'closed_' + i"
                  />
                  <span>Closed</span>
                </label>
                <input
                  type="time"
                  class="schedule-time"
                  [(ngModel)]="row.start_time"
                  [name]="'start_' + i"
                  [disabled]="row.is_closed"
                  data-field="start_time"
                />
                <span class="schedule-sep" aria-hidden="true">–</span>
                <input
                  type="time"
                  class="schedule-time"
                  [(ngModel)]="row.end_time"
                  [name]="'end_' + i"
                  [disabled]="row.is_closed"
                  data-field="end_time"
                />
              </div>
            </div>
          </ng-container>

          <!-- Step 5 — tools + ToS -->
          <ng-container *ngIf="step === 5">
            <fieldset class="app-fieldset" data-field="tools">
              <legend class="field-label">Connect any tools you already use (optional)</legend>
              <div class="check-grid">
                <label
                  *ngFor="let t of toolsCatalog"
                  class="check-tile"
                  [class.checked]="isToolChecked(t.slug)"
                  [attr.data-tool]="t.slug"
                >
                  <input
                    type="checkbox"
                    [checked]="isToolChecked(t.slug)"
                    (change)="toggleTool(t.slug)"
                  />
                  <span class="check-tile-label">{{ t.label }}</span>
                </label>
              </div>
            </fieldset>

            <div class="tos-card">
              <h2 class="tos-title">Terms of Service</h2>
              <div class="tos-body" tabindex="0">
                <p *ngFor="let para of tosParagraphs">{{ para }}</p>
              </div>
              <label class="terms-row">
                <input
                  type="checkbox"
                  class="terms-input"
                  data-field="tos_accepted"
                  [(ngModel)]="draft.tos_accepted"
                  [name]="'tos_accepted'"
                />
                <span class="terms-checkbox" [class.checked]="draft.tos_accepted" aria-hidden="true">
                  <svg *ngIf="draft.tos_accepted" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#0F1115" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M20 6L9 17l-5-5"/>
                  </svg>
                </span>
                <span class="terms-text">I have read and accept the Terms of Service.</span>
              </label>
            </div>
          </ng-container>

          <div *ngIf="serverError" class="server-error" role="alert" aria-live="assertive">
            {{ serverError }}
          </div>

          <button
            type="submit"
            class="btn-continue btn-business"
            data-action="step-continue"
            [disabled]="loading"
          >
            <span *ngIf="loading" class="spinner"></span>
            <ng-container *ngIf="!loading">
              {{ step < totalSteps ? 'Continue' : 'Submit application' }}
            </ng-container>
          </button>
        </form>
      </main>
    </div>
  `,
  styleUrls: ['./beauty-login.component.scss', './beauty-business-application.component.scss'],
})
export class BeautyBusinessApplicationComponent implements OnChanges {
  @Input() data: Record<string, unknown> = {};
  @Input() links: Record<string, BffLink> = {};
  @Output() followLink = new EventEmitter<BffLink>();

  step = 1;
  totalSteps = 5;
  title = '';
  subtitle = '';
  serviceCatalog: ServiceCatalogEntry[] = [];
  toolsCatalog: ServiceCatalogEntry[] = [];
  tosParagraphs: string[] = [];
  draft: ApplicationDraft = this._emptyDraft();
  loading = false;
  loggingOut = false;
  serverError = '';

  constructor(private authService: BeautyAuthService) {}

  ngOnChanges(_: SimpleChanges): void {
    const d = this.data || {};
    this.step = Number(d['step'] || 1);
    this.totalSteps = Number(d['total_steps'] || 5);
    this.title = String(d['title'] || '');
    this.subtitle = String(d['subtitle'] || '');
    this.serviceCatalog = (d['service_catalog'] as ServiceCatalogEntry[]) || [];
    this.toolsCatalog = (d['third_party_tools_catalog'] as ServiceCatalogEntry[]) || [];
    const tos = String(d['tos_text'] || '');
    this.tosParagraphs = tos.split(/\n+/).filter((p) => p.trim().length > 0);
    const draftRaw = (d['draft'] as Partial<ApplicationDraft>) || {};
    const defaultSchedule = (d['default_schedule'] as ScheduleRow[]) || [];
    this.draft = {
      ...this._emptyDraft(),
      ...draftRaw,
      services_offered: [...(draftRaw.services_offered || [])],
      third_party_tools: [...(draftRaw.third_party_tools || [])],
      schedule_template: this._cloneSchedule(
        draftRaw.schedule_template?.length ? draftRaw.schedule_template : defaultSchedule,
      ),
    } as ApplicationDraft;
    this.serverError = '';
    this.loading = false;
  }

  get stepDots(): number[] {
    return Array.from({ length: this.totalSteps }, (_, i) => i + 1);
  }

  dayLabel(dow: number): string {
    return DAY_LABELS[dow] ?? '';
  }

  isServiceChecked(slug: string): boolean {
    return this.draft.services_offered.includes(slug);
  }

  toggleService(slug: string): void {
    const set = new Set(this.draft.services_offered);
    if (set.has(slug)) set.delete(slug);
    else set.add(slug);
    this.draft.services_offered = Array.from(set);
  }

  isToolChecked(slug: string): boolean {
    return this.draft.third_party_tools.includes(slug);
  }

  toggleTool(slug: string): void {
    const set = new Set(this.draft.third_party_tools);
    if (set.has(slug)) set.delete(slug);
    else set.add(slug);
    this.draft.third_party_tools = Array.from(set);
  }

  toggleStripe(): void {
    this.draft.stripe_connected = !this.draft.stripe_connected;
    if (this.draft.stripe_connected && !this.draft.stripe_placeholder_account) {
      this.draft.stripe_placeholder_account = 'acct_pending';
    }
  }

  onPrev(): void {
    const link = this.links['step_prev'];
    if (link) this.followLink.emit(link);
  }

  onLogout(): void {
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

  onSave(): void {
    if (this.loading) return;
    this.serverError = '';
    const saveLink = this.links['save_step'];
    if (!saveLink) return;
    this.loading = true;
    const body = this._stepPayload();
    this.authService.follow(saveLink, body).subscribe({
      next: () => {
        this.loading = false;
        if (this.step < this.totalSteps) {
          const next = this.links['step_next'];
          if (next) this.followLink.emit(next);
        } else {
          this._submitFinal();
        }
      },
      error: (err: { error?: { detail?: string } }) => {
        this.loading = false;
        this.serverError = err?.error?.detail || 'Please check your entries and try again.';
      },
    });
  }

  private _submitFinal(): void {
    const submit = this.links['submit_application'];
    const success = this.links['success'];
    if (!submit) return;
    this.loading = true;
    this.authService.follow(submit).subscribe({
      next: () => {
        this.loading = false;
        if (success) this.followLink.emit(success);
      },
      error: (err: { error?: { detail?: string } }) => {
        this.loading = false;
        this.serverError = err?.error?.detail || 'We could not submit your application. Please try again.';
      },
    });
  }

  private _stepPayload(): Record<string, unknown> {
    const base: Record<string, unknown> = { step: this.step };
    switch (this.step) {
      case 1:
        return {
          ...base,
          applicant_kind: this.draft.applicant_kind,
          first_name: this.draft.first_name,
          last_name: this.draft.last_name,
          business_name: this.draft.business_name,
          itin: this.draft.itin,
          legal_business_name: this.draft.legal_business_name || this.draft.business_name,
          address_line1: this.draft.address_line1,
          address_line2: this.draft.address_line2,
          address_city: this.draft.address_city,
          address_state: this.draft.address_state,
          address_postal_code: this.draft.address_postal_code,
        };
      case 2:
        return { ...base, services_offered: this.draft.services_offered };
      case 3:
        return {
          ...base,
          stripe_connected: this.draft.stripe_connected,
          stripe_placeholder_account: this.draft.stripe_placeholder_account,
        };
      case 4:
        return { ...base, schedule_template: this.draft.schedule_template };
      case 5:
        return {
          ...base,
          third_party_tools: this.draft.third_party_tools,
          tos_accepted: this.draft.tos_accepted,
        };
      default:
        return base;
    }
  }

  private _emptyDraft(): ApplicationDraft {
    return {
      applicant_kind: 'person',
      first_name: '',
      last_name: '',
      business_name: '',
      itin: '',
      legal_business_name: '',
      address_line1: '',
      address_line2: '',
      address_city: '',
      address_state: '',
      address_postal_code: '',
      services_offered: [],
      stripe_connected: false,
      stripe_placeholder_account: '',
      schedule_template: [],
      third_party_tools: [],
      tos_accepted: false,
    };
  }

  private _cloneSchedule(rows: ScheduleRow[]): ScheduleRow[] {
    return (rows || []).map((row) => ({
      day_of_week: Number(row.day_of_week),
      is_closed: Boolean(row.is_closed),
      is_24h: Boolean(row.is_24h),
      start_time: String(row.start_time || '10:00'),
      end_time: String(row.end_time || '18:00'),
    }));
  }
}
