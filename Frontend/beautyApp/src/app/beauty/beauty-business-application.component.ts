/**
 * BeautyBusinessApplicationComponent
 * ----------------------------------
 * Single component that renders every wizard step (entity / services /
 * stripe / schedule / tools / review). The BFF returns ``data.step`` and
 * the matching template branch is shown.
 *
 * Each branch posts back to the same ``submit_href`` (PATCH) with the
 * step key — except the review screen, which calls the dedicated submit
 * endpoint to flip the application to ``accepted``.
 *
 * Visual / a11y parity with customer pages:
 *   - mobile-first, clamped to .business-shell phone frame on desktop
 *   - --surface / --accent-blue / --ink / --success / --danger tokens
 *   - keyboard-accessible inputs, aria-required / aria-invalid / aria-describedby
 *   - semantic <main>, <form>, <fieldset>; visible <legend>s
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
import {
  ApplicationDto,
  ApplicationStep,
  CategoryOption,
  ToolOption,
  WeeklyHourRow,
  WizardData,
} from './beauty-business-application.types';
import { BffLink } from './beauty-bff.types';

interface DayRow extends WeeklyHourRow {}

@Component({
  selector: 'app-beauty-business-application',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.Default,
  template: `
    <div class="business-shell" [attr.data-step]="step">
      <header class="biz-header">
        <button class="brand-name-btn" (click)="emitFollow(links['logout'])" type="button">
          <span class="brand-icon" aria-hidden="true">🏢</span>
          <span class="badge">Application</span>
        </button>
        <span class="step-counter" aria-live="polite">
          Step {{ data?.step_index }} of {{ data?.total_steps }}
        </span>
      </header>

      <nav class="step-progress" aria-label="Application progress">
        <ol class="step-list">
          <li *ngFor="let s of allSteps; let i = index"
              class="step-pill"
              [class.is-current]="data?.step === s.key"
              [class.is-done]="isStepDone(s.key)">
            <span class="step-num" aria-hidden="true">{{ i + 1 }}</span>
            <span class="step-name">{{ s.label }}</span>
          </li>
        </ol>
      </nav>

      <main id="main" class="biz-section">
        <h1 class="biz-title">{{ data?.step_title }}</h1>

        <!-- ─── ENTITY ───────────────────────────────────────────── -->
        <form *ngIf="step === 'entity'" class="biz-form" (ngSubmit)="submitEntity()" novalidate>
          <fieldset class="biz-fieldset">
            <legend>Are you applying as…</legend>
            <label class="radio-row">
              <input type="radio" name="entity_type" value="person" [(ngModel)]="entityForm.entity_type" />
              <span>An individual / sole practitioner</span>
            </label>
            <label class="radio-row">
              <input type="radio" name="entity_type" value="business" [(ngModel)]="entityForm.entity_type" />
              <span>A registered business</span>
            </label>
          </fieldset>

          <div class="biz-field" *ngIf="entityForm.entity_type === 'business'">
            <label for="itin">ITIN <span class="req">*</span></label>
            <input id="itin" name="itin" type="text" maxlength="11"
                   inputmode="numeric" autocomplete="off"
                   [(ngModel)]="entityForm.itin"
                   [attr.aria-required]="true"
                   [attr.aria-invalid]="entityFormError === 'itin' ? 'true' : null"
                   placeholder="9 digits" />
            <small>Required when applying as a business. We mask this on display.</small>
          </div>

          <div class="biz-row">
            <div class="biz-field">
              <label for="first">First name <span class="req">*</span></label>
              <input id="first" name="first" type="text" autocomplete="given-name"
                     [(ngModel)]="entityForm.applicant_first_name"
                     [attr.aria-required]="true" />
            </div>
            <div class="biz-field">
              <label for="last">Last name <span class="req">*</span></label>
              <input id="last" name="last" type="text" autocomplete="family-name"
                     [(ngModel)]="entityForm.applicant_last_name"
                     [attr.aria-required]="true" />
            </div>
          </div>

          <div class="biz-field">
            <label for="biz-name">Business name <span class="req">*</span></label>
            <input id="biz-name" name="biz-name" type="text" autocomplete="organization"
                   [(ngModel)]="entityForm.business_name"
                   [attr.aria-required]="true" />
          </div>

          <div class="biz-field">
            <label for="addr1">Address line 1</label>
            <input id="addr1" name="addr1" type="text" autocomplete="address-line1"
                   [(ngModel)]="entityForm.address_line1" />
          </div>
          <div class="biz-field">
            <label for="addr2">Address line 2</label>
            <input id="addr2" name="addr2" type="text" autocomplete="address-line2"
                   [(ngModel)]="entityForm.address_line2" />
          </div>
          <div class="biz-row">
            <div class="biz-field">
              <label for="city">City</label>
              <input id="city" name="city" type="text" autocomplete="address-level2"
                     [(ngModel)]="entityForm.city" />
            </div>
            <div class="biz-field">
              <label for="state">State</label>
              <input id="state" name="state" type="text" autocomplete="address-level1"
                     [(ngModel)]="entityForm.state" />
            </div>
            <div class="biz-field">
              <label for="zip">ZIP</label>
              <input id="zip" name="zip" type="text" autocomplete="postal-code" inputmode="numeric"
                     [(ngModel)]="entityForm.postal_code" />
            </div>
          </div>

          <p *ngIf="serverError" class="server-error" role="alert">{{ serverError }}</p>
          <button type="submit" class="btn btn-confirm" [class.is-loading]="isLoading"
                  [disabled]="isLoading">Save & continue</button>
        </form>

        <!-- ─── SERVICES ─────────────────────────────────────────── -->
        <form *ngIf="step === 'services'" class="biz-form" (ngSubmit)="submitServices()" novalidate>
          <fieldset class="biz-fieldset">
            <legend>Pick at least one</legend>
            <label *ngFor="let cat of categoryOptions" class="check-row" [attr.data-category]="cat.value">
              <input type="checkbox" [name]="'cat-' + cat.value"
                     [checked]="selectedCategories.has(cat.value)"
                     (change)="toggleCategory(cat.value, $event)" />
              <span>{{ cat.label }}</span>
            </label>
          </fieldset>
          <p *ngIf="serverError" class="server-error" role="alert">{{ serverError }}</p>
          <div class="form-actions">
            <button type="button" class="btn btn-outline"
                    (click)="emitFollow(links['prev'])"
                    *ngIf="links['prev']">Back</button>
            <button type="submit" class="btn btn-confirm" [class.is-loading]="isLoading"
                    [disabled]="isLoading || selectedCategories.size === 0">Save & continue</button>
          </div>
        </form>

        <!-- ─── STRIPE ───────────────────────────────────────────── -->
        <form *ngIf="step === 'stripe'" class="biz-form" (ngSubmit)="submitStripe()" novalidate>
          <p class="biz-copy">{{ data?.stripe_copy }}</p>
          <p *ngIf="serverError" class="server-error" role="alert">{{ serverError }}</p>
          <div class="form-actions">
            <button type="button" class="btn btn-outline"
                    (click)="emitFollow(links['prev'])"
                    *ngIf="links['prev']">Back</button>
            <button type="submit" class="btn btn-confirm" [class.is-loading]="isLoading"
                    [disabled]="isLoading">Connect Stripe (coming soon)</button>
          </div>
        </form>

        <!-- ─── SCHEDULE ─────────────────────────────────────────── -->
        <form *ngIf="step === 'schedule'" class="biz-form" (ngSubmit)="submitSchedule()" novalidate>
          <p class="biz-copy">When are you open? Customers can only book during these hours.</p>
          <ul class="day-list">
            <li *ngFor="let row of rows" class="day-row" [class.closed]="row.is_closed">
              <span class="day-name">{{ row.day_label }}</span>
              <label class="closed-toggle">
                <input type="checkbox" [(ngModel)]="row.is_closed"
                       [name]="'closed-' + row.day_of_week"
                       (ngModelChange)="onClosedChange(row)" />
                Closed
              </label>
              <label class="closed-toggle">
                <input type="checkbox" [(ngModel)]="row.is_24h"
                       [name]="'24h-' + row.day_of_week"
                       [disabled]="row.is_closed"
                       (ngModelChange)="onTwentyFourChange(row)" />
                Open 24h
              </label>
              <label class="sr-only" [attr.for]="'start-' + row.day_of_week">{{ row.day_label }} start</label>
              <input type="time" class="time-input"
                     [id]="'start-' + row.day_of_week"
                     [name]="'start-' + row.day_of_week"
                     [(ngModel)]="row.start_time"
                     [disabled]="row.is_closed || row.is_24h" />
              <span class="dash" aria-hidden="true">–</span>
              <label class="sr-only" [attr.for]="'end-' + row.day_of_week">{{ row.day_label }} end</label>
              <input type="time" class="time-input"
                     [id]="'end-' + row.day_of_week"
                     [name]="'end-' + row.day_of_week"
                     [(ngModel)]="row.end_time"
                     [disabled]="row.is_closed || row.is_24h" />
            </li>
          </ul>
          <p *ngIf="serverError" class="server-error" role="alert">{{ serverError }}</p>
          <div class="form-actions">
            <button type="button" class="btn btn-outline"
                    (click)="emitFollow(links['prev'])"
                    *ngIf="links['prev']">Back</button>
            <button type="submit" class="btn btn-confirm" [class.is-loading]="isLoading"
                    [disabled]="isLoading">Save & continue</button>
          </div>
        </form>

        <!-- ─── TOOLS ────────────────────────────────────────────── -->
        <form *ngIf="step === 'tools'" class="biz-form" (ngSubmit)="submitTools()" novalidate>
          <fieldset class="biz-fieldset">
            <legend>Optional integrations</legend>
            <label *ngFor="let tool of toolOptions" class="check-row" [attr.data-tool]="tool.value">
              <input type="checkbox" [name]="'tool-' + tool.value"
                     [checked]="selectedTools.has(tool.value)"
                     (change)="toggleTool(tool.value, $event)" />
              <span>{{ tool.label }}</span>
            </label>
          </fieldset>
          <p class="biz-copy">Selections are saved with your application — real syncing comes later.</p>
          <p *ngIf="serverError" class="server-error" role="alert">{{ serverError }}</p>
          <div class="form-actions">
            <button type="button" class="btn btn-outline"
                    (click)="emitFollow(links['prev'])"
                    *ngIf="links['prev']">Back</button>
            <button type="submit" class="btn btn-confirm" [class.is-loading]="isLoading"
                    [disabled]="isLoading">Save & continue</button>
          </div>
        </form>

        <!-- ─── REVIEW ───────────────────────────────────────────── -->
        <form *ngIf="step === 'review'" class="biz-form" (ngSubmit)="submitApplication()" novalidate>
          <section class="review-section" aria-labelledby="rv-applicant">
            <h2 id="rv-applicant">Applicant</h2>
            <dl>
              <dt>Name</dt><dd>{{ application?.applicant_first_name }} {{ application?.applicant_last_name }}</dd>
              <dt>Entity</dt><dd>{{ application?.entity_type | titlecase }}</dd>
              <dt *ngIf="application?.has_itin">ITIN</dt>
              <dd *ngIf="application?.has_itin">{{ application?.itin_masked }}</dd>
            </dl>
          </section>
          <section class="review-section" aria-labelledby="rv-business">
            <h2 id="rv-business">Business</h2>
            <dl>
              <dt>Name</dt><dd>{{ application?.business_name }}</dd>
              <dt>Address</dt>
              <dd>
                <span *ngIf="application?.address_line1">{{ application?.address_line1 }}<br /></span>
                <span *ngIf="application?.address_line2">{{ application?.address_line2 }}<br /></span>
                <span *ngIf="application?.city || application?.state || application?.postal_code">
                  {{ application?.city }}<span *ngIf="application?.city && application?.state">, </span>{{ application?.state }} {{ application?.postal_code }}
                </span>
              </dd>
            </dl>
          </section>
          <section class="review-section" aria-labelledby="rv-svc">
            <h2 id="rv-svc">Services</h2>
            <ul>
              <li *ngFor="let label of data?.category_labels || []">{{ label }}</li>
            </ul>
          </section>
          <section class="review-section" aria-labelledby="rv-hours">
            <h2 id="rv-hours">Weekly hours</h2>
            <ul>
              <li *ngFor="let row of data?.weekly_hours || []">
                <strong>{{ row.day_label }}:</strong>
                <span *ngIf="row.is_closed">Closed</span>
                <span *ngIf="row.is_24h && !row.is_closed">Open 24h</span>
                <span *ngIf="!row.is_closed && !row.is_24h">{{ row.start_time }} – {{ row.end_time }}</span>
              </li>
            </ul>
          </section>
          <section class="review-section" aria-labelledby="rv-tools" *ngIf="(data?.tool_labels || []).length">
            <h2 id="rv-tools">Third-party tools</h2>
            <ul>
              <li *ngFor="let label of data?.tool_labels || []">{{ label }}</li>
            </ul>
          </section>

          <section class="review-section tos-section" aria-labelledby="rv-tos">
            <h2 id="rv-tos">Terms of Service</h2>
            <p class="tos-text">{{ data?.tos_text }}</p>
            <label class="check-row tos-check">
              <input type="checkbox" name="accept_tos" [(ngModel)]="acceptTos" />
              <span>I have read and accept the Terms of Service.</span>
            </label>
          </section>

          <p *ngIf="serverError" class="server-error" role="alert">{{ serverError }}</p>
          <div class="form-actions">
            <button type="button" class="btn btn-outline"
                    (click)="emitFollow(links['prev'])"
                    *ngIf="links['prev']">Back</button>
            <button type="submit" class="btn btn-confirm submit-application"
                    [class.is-loading]="isLoading"
                    [disabled]="!acceptTos || isLoading">Submit application</button>
          </div>
        </form>
      </main>
    </div>
  `,
  styleUrls: ['./beauty-business-application.component.scss'],
})
export class BeautyBusinessApplicationComponent implements OnChanges {
  @Input() data: WizardData | null = null;
  @Input() links: Record<string, BffLink> = {};
  @Output() followLink = new EventEmitter<BffLink>();

  readonly allSteps: { key: ApplicationStep; label: string }[] = [
    { key: 'entity',   label: 'About' },
    { key: 'services', label: 'Services' },
    { key: 'stripe',   label: 'Payments' },
    { key: 'schedule', label: 'Hours' },
    { key: 'tools',    label: 'Tools' },
    { key: 'review',   label: 'Review' },
  ];

  step: ApplicationStep = 'entity';
  application: ApplicationDto | null = null;
  isLoading = false;
  serverError = '';
  entityFormError: string | null = null;

  // Step 1 — entity
  entityForm = {
    entity_type: 'person' as 'person' | 'business',
    itin: '',
    applicant_first_name: '',
    applicant_last_name: '',
    business_name: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    postal_code: '',
  };

  // Step 2 — services
  selectedCategories = new Set<string>();
  // Step 5 — tools
  selectedTools = new Set<string>();
  // Step 4 — schedule
  rows: DayRow[] = [];
  // Review
  acceptTos = false;

  constructor(private auth: BeautyAuthService) {}

  get categoryOptions(): CategoryOption[] {
    return this.data?.category_options || [];
  }
  get toolOptions(): ToolOption[] {
    return this.data?.tool_options || [];
  }

  isStepDone(key: ApplicationStep): boolean {
    if (!this.application) return false;
    if (key === 'review') return false;
    return (this.application.completed_steps || []).includes(key);
  }

  ngOnChanges(_: SimpleChanges): void {
    if (!this.data) return;
    this.step = this.data.step;
    this.application = this.data.application;
    this.serverError = '';
    this.isLoading = false;

    // Pre-populate from existing application state.
    const a = this.application;
    if (a) {
      this.entityForm = {
        entity_type: (a.entity_type || 'person') as 'person' | 'business',
        itin: '',
        applicant_first_name: a.applicant_first_name || '',
        applicant_last_name: a.applicant_last_name || '',
        business_name: a.business_name || this.data.business?.business_name || '',
        address_line1: a.address_line1 || '',
        address_line2: a.address_line2 || '',
        city: a.city || '',
        state: a.state || '',
        postal_code: a.postal_code || '',
      };
      this.selectedCategories = new Set(a.selected_categories || []);
      this.selectedTools = new Set(a.third_party_tools || []);
      this.acceptTos = !!a.tos_accepted;
    }

    if (this.step === 'schedule' && this.data.weekly_hours) {
      this.rows = this.data.weekly_hours.map((r) => ({ ...r, is_24h: !!r.is_24h }));
    }
  }

  emitFollow(link: BffLink | null | undefined): void {
    if (link) this.followLink.emit(link);
  }

  toggleCategory(value: string, e: Event): void {
    const checked = (e.target as HTMLInputElement).checked;
    if (checked) this.selectedCategories.add(value);
    else this.selectedCategories.delete(value);
  }

  toggleTool(value: string, e: Event): void {
    const checked = (e.target as HTMLInputElement).checked;
    if (checked) this.selectedTools.add(value);
    else this.selectedTools.delete(value);
  }

  onClosedChange(row: DayRow): void {
    if (row.is_closed) row.is_24h = false;
  }
  onTwentyFourChange(row: DayRow): void {
    if (row.is_24h) row.is_closed = false;
  }

  // ─── submitters ─────────────────────────────────────────────────
  private patch(body: Record<string, unknown>): void {
    if (!this.data || this.isLoading) return;
    this.serverError = '';
    this.isLoading = true;
    const link: BffLink = {
      rel: 'submit',
      href: this.data.submit_href,
      method: 'PATCH',
      screen: null,
      route: null,
      prompt: null,
    };
    this.auth.follow(link, body).subscribe({
      next: () => {
        this.isLoading = false;
        const next = this.links['next'];
        if (next) this.followLink.emit(next);
      },
      error: (err) => {
        this.isLoading = false;
        this.serverError = err?.error?.detail || 'Could not save. Please review the form.';
      },
    });
  }

  submitEntity(): void {
    this.entityFormError = null;
    if (this.entityForm.entity_type === 'business') {
      const digits = (this.entityForm.itin || '').replace(/\D/g, '');
      if (digits.length !== 9) {
        this.entityFormError = 'itin';
        this.serverError = 'ITIN must be 9 digits.';
        return;
      }
    }
    if (!this.entityForm.applicant_first_name.trim() || !this.entityForm.applicant_last_name.trim()) {
      this.serverError = 'First and last name are required.';
      return;
    }
    if (!this.entityForm.business_name.trim()) {
      this.serverError = 'Business name is required.';
      return;
    }
    this.patch({ step: 'entity', ...this.entityForm });
  }

  submitServices(): void {
    if (this.selectedCategories.size === 0) {
      this.serverError = 'Pick at least one service category.';
      return;
    }
    this.patch({ step: 'services', selected_categories: Array.from(this.selectedCategories) });
  }

  submitStripe(): void {
    this.patch({ step: 'stripe' });
  }

  submitSchedule(): void {
    if (!this.data?.availability_href || this.isLoading) return;
    this.serverError = '';
    this.isLoading = true;
    // First save weekly_hours via the availability endpoint, then mark
    // the schedule step complete on the application.
    const availLink: BffLink = {
      rel: 'submit-availability',
      href: this.data.availability_href,
      method: (this.data.availability_method || 'PUT') as BffLink['method'],
      screen: null,
      route: null,
      prompt: null,
    };
    this.auth.follow(availLink, { weekly_hours: this.rows }).subscribe({
      next: () => {
        // Reset isLoading so `patch()` proceeds — patch() bails if
        // isLoading is already true (so its own caller can't double-fire).
        this.isLoading = false;
        this.patch({ step: 'schedule' });
      },
      error: (err) => {
        this.isLoading = false;
        this.serverError = err?.error?.detail || 'Could not save weekly hours.';
      },
    });
  }

  submitTools(): void {
    this.patch({
      step: 'tools',
      third_party_tools: Array.from(this.selectedTools),
    });
  }

  submitApplication(): void {
    if (!this.data?.submit_application_href || this.isLoading) return;
    this.serverError = '';
    this.isLoading = true;
    const link: BffLink = {
      rel: 'submit-application',
      href: this.data.submit_application_href,
      method: (this.data.submit_application_method || 'POST') as BffLink['method'],
      screen: 'beauty_business_home',
      route: '/business',
      prompt: 'Submit',
    };
    this.auth.follow(link, { accept_tos: this.acceptTos }).subscribe({
      next: () => {
        this.isLoading = false;
        this.followLink.emit({
          rel: 'success',
          href: null,
          method: 'NAV',
          screen: 'beauty_business_home',
          route: '/business',
          prompt: 'Open dashboard',
        });
      },
      error: (err) => {
        this.isLoading = false;
        this.serverError = err?.error?.detail || 'Could not submit application.';
      },
    });
  }
}
