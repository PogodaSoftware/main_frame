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
import { BeautyWeeklyHoursEditorComponent } from './beauty-weekly-hours-editor.component';

interface DayRow extends WeeklyHourRow {}

@Component({
  selector: 'app-beauty-business-application',
  standalone: true,
  imports: [CommonModule, FormsModule, BeautyWeeklyHoursEditorComponent],
  changeDetection: ChangeDetectionStrategy.Default,
  template: `
    <div class="wiz" [attr.data-step]="step">
      <header class="wiz-top">
        <button class="wiz-brandbtn" (click)="emitFollow(exitLink)" type="button" aria-label="Beauty">
          <span class="wiz-brand-icon" aria-hidden="true">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="#fff" aria-hidden="true">
              <path d="M12 2l2.4 6.6L21 11l-6.6 2.4L12 20l-2.4-6.6L3 11l6.6-2.4L12 2z"/>
            </svg>
          </span>
          <span class="wiz-brand">Beauty</span>
        </button>
        <span class="wiz-badge">Application</span>
        <span class="wiz-spacer"></span>
        <span class="wiz-step-counter" aria-live="polite">Step {{ data?.step_index }} of {{ data?.total_steps }}</span>
        <button *ngIf="exitLink" type="button" class="wiz-exit" (click)="emitFollow(exitLink)">Save &amp; exit</button>
      </header>

      <nav class="wiz-stepper" aria-label="Application progress">
        <ol class="ws-list">
          <li *ngFor="let s of allSteps; let i = index" class="ws-item">
            <span class="ws-node"
                  [class.is-current]="data?.step === s.key"
                  [class.is-done]="isStepDone(s.key)" aria-hidden="true">
              <ng-container *ngIf="isStepDone(s.key); else stepNum">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l4 4L19 7"/></svg>
              </ng-container>
              <ng-template #stepNum>{{ i + 1 }}</ng-template>
            </span>
            <span class="ws-label"
                  [class.is-current]="data?.step === s.key"
                  [class.is-done]="isStepDone(s.key)">{{ s.label }}</span>
            <span class="ws-line" *ngIf="i < allSteps.length - 1" [class.is-done]="isStepDone(s.key)" aria-hidden="true"></span>
          </li>
        </ol>
      </nav>

      <main id="main" class="wiz-main">
        <div class="wiz-inner">
          <h1 class="wiz-title" [class.center]="centerTitle">{{ data?.step_title }}</h1>
          <p class="wiz-subtitle" *ngIf="stepSubtitle" [class.center]="centerTitle">{{ stepSubtitle }}</p>

        <!-- ─── ENTITY ───────────────────────────────────────────── -->
        <form *ngIf="step === 'entity'" class="wiz-form" (ngSubmit)="submitEntity()"
              (input)="scheduleAutosave()" (change)="scheduleAutosave()" novalidate>
          <section class="web-card">
            <div class="wc-field">
              <label class="wc-label">Legal structure <span class="req">*</span></label>
              <div class="legal-grid">
                <label class="legal-opt" [class.sel]="entityForm.entity_type === 'person'">
                  <input type="radio" name="entity_type" value="person" [(ngModel)]="entityForm.entity_type" class="sr-only" />
                  <span class="legal-radio" aria-hidden="true"></span>
                  <span class="legal-text">
                    <span class="lt-title">Individual</span>
                    <span class="lt-sub">Sole proprietor or freelancer</span>
                  </span>
                </label>
                <label class="legal-opt" [class.sel]="entityForm.entity_type === 'business'">
                  <input type="radio" name="entity_type" value="business" [(ngModel)]="entityForm.entity_type" class="sr-only" />
                  <span class="legal-radio" aria-hidden="true"></span>
                  <span class="legal-text">
                    <span class="lt-title">Registered business</span>
                    <span class="lt-sub">LLC, S-Corp, etc.</span>
                  </span>
                </label>
              </div>
            </div>

            <div class="wc-row">
              <div class="wc-field">
                <label for="first" class="wc-label">First name <span class="req">*</span></label>
                <input id="first" name="first" type="text" autocomplete="given-name"
                       [(ngModel)]="entityForm.applicant_first_name"
                       placeholder="Maya" [attr.aria-required]="true" />
              </div>
              <div class="wc-field">
                <label for="last" class="wc-label">Last name <span class="req">*</span></label>
                <input id="last" name="last" type="text" autocomplete="family-name"
                       [(ngModel)]="entityForm.applicant_last_name"
                       placeholder="Rivera" [attr.aria-required]="true" />
              </div>
            </div>

            <div class="wc-row" *ngIf="entityForm.entity_type === 'business'">
              <div class="wc-field">
                <label for="biz-name" class="wc-label">Business name <span class="req">*</span></label>
                <input id="biz-name" name="biz-name" type="text" autocomplete="organization"
                       [(ngModel)]="entityForm.business_name"
                       placeholder="Public name" [attr.aria-required]="true" />
              </div>
              <div class="wc-field">
                <label for="itin" class="wc-label">EIN / ITIN <span class="req">*</span></label>
                <input id="itin" name="itin" type="text" maxlength="11"
                       inputmode="numeric" autocomplete="off" class="mono-input"
                       [(ngModel)]="entityForm.itin"
                       [attr.aria-required]="true"
                       [attr.aria-invalid]="entityFormError === 'itin' ? 'true' : null"
                       placeholder="9 digits" />
              </div>
            </div>
            <p class="wc-hint" *ngIf="entityForm.entity_type === 'business'">We mask the EIN/ITIN on display and store it encrypted.</p>

            <div class="wc-field">
              <label for="addr1" class="wc-label">Address line 1</label>
              <input id="addr1" name="addr1" type="text" autocomplete="address-line1"
                     [(ngModel)]="entityForm.address_line1" placeholder="Street address" />
            </div>
            <div class="wc-field">
              <label for="addr2" class="wc-label">Address line 2</label>
              <input id="addr2" name="addr2" type="text" autocomplete="address-line2"
                     [(ngModel)]="entityForm.address_line2" placeholder="Suite, floor (optional)" />
            </div>
            <div class="wc-row wc-row-321">
              <div class="wc-field">
                <label for="city" class="wc-label">City</label>
                <input id="city" name="city" type="text" autocomplete="address-level2"
                       [(ngModel)]="entityForm.city" placeholder="Brooklyn" />
              </div>
              <div class="wc-field">
                <label for="state" class="wc-label">State</label>
                <input id="state" name="state" type="text" autocomplete="address-level1"
                       [(ngModel)]="entityForm.state" placeholder="NY" />
              </div>
              <div class="wc-field">
                <label for="zip" class="wc-label">ZIP</label>
                <input id="zip" name="zip" type="text" autocomplete="postal-code" inputmode="numeric"
                       class="mono-input" [(ngModel)]="entityForm.postal_code" placeholder="11215" />
              </div>
            </div>
          </section>

          <p *ngIf="serverError" class="server-error" role="alert">{{ serverError }}</p>
        </form>

        <!-- ─── SERVICES ─────────────────────────────────────────── -->
        <form *ngIf="step === 'services'" class="wiz-form" (ngSubmit)="submitServices()" novalidate>
          <section class="web-card">
            <div class="wc-cardhead">Pick at least one category</div>
            <div class="cat-grid" role="group" aria-label="Service categories">
              <button *ngFor="let cat of categoryOptions" type="button"
                      class="cat-btn" [class.sel]="selectedCategories.has(cat.value)"
                      [attr.data-category]="cat.value"
                      [attr.aria-pressed]="selectedCategories.has(cat.value)"
                      (click)="toggleCategoryValue(cat.value)">
                {{ cat.label }}
              </button>
            </div>
          </section>

          <div class="info-strip">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 17v.01"/></svg>
            <span>You can list specific services with pricing in the next stages of onboarding.</span>
          </div>

          <p *ngIf="serverError" class="server-error" role="alert">{{ serverError }}</p>
        </form>

        <!-- ─── STRIPE ───────────────────────────────────────────── -->
        <form *ngIf="step === 'stripe'" class="biz-form" (ngSubmit)="submitStripe()" novalidate>
          <section class="stripe-card">
            <div class="stripe-head">
              <span class="stripe-logo" aria-hidden="true">S</span>
              <div class="stripe-title">
                <span class="stripe-name">Stripe Connect</span>
                <span class="stripe-sub">Direct payouts to your bank account</span>
              </div>
              <span class="coming-soon">Coming soon</span>
            </div>
            <div class="stripe-body">
              {{ data?.stripe_copy || 'Stripe Connect lets us send payouts straight to your bank account when customers pay for bookings. The full flow is coming soon — for now, mark this step complete and continue your application.' }}
            </div>
          </section>

          <div class="info-strip">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 17v.01"/></svg>
            <span>No fees during the application phase. We'll prompt you to connect Stripe before your storefront goes live.</span>
          </div>

          <p *ngIf="serverError" class="server-error" role="alert">{{ serverError }}</p>
        </form>

        <!-- ─── SCHEDULE ─────────────────────────────────────────── -->
        <form *ngIf="step === 'schedule'" class="biz-form" (ngSubmit)="submitSchedule()" novalidate>
          <app-beauty-weekly-hours-editor [rows]="rows"></app-beauty-weekly-hours-editor>

          <p *ngIf="serverError" class="server-error" role="alert">{{ serverError }}</p>
        </form>

        <!-- ─── TOOLS ────────────────────────────────────────────── -->
        <form *ngIf="step === 'tools'" class="biz-form" (ngSubmit)="submitTools()"
              (change)="scheduleAutosave()" novalidate>
          <section class="prov-headed-card">
            <div class="ph-head">Optional integrations</div>
            <div class="ph-body">
              <label *ngFor="let tool of toolOptions" class="check-row" [attr.data-tool]="tool.value">
                <input type="checkbox" [name]="'tool-' + tool.value"
                       [checked]="selectedTools.has(tool.value)"
                       (change)="toggleTool(tool.value, $event)" />
                <span class="row-text">
                  <span class="row-label">{{ tool.label }}</span>
                  <span class="row-sub" *ngIf="tool.description">{{ tool.description }}</span>
                </span>
              </label>
            </div>
          </section>

          <div class="info-strip">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 17v.01"/></svg>
            <span>Selections are saved with your application — real syncing comes later.</span>
          </div>

          <p *ngIf="serverError" class="server-error" role="alert">{{ serverError }}</p>
        </form>

        <!-- ─── REVIEW ───────────────────────────────────────────── -->
        <form *ngIf="step === 'review'" class="wiz-form" novalidate>
          <div class="review-grid">
            <section class="review-card">
              <div class="rc-body">
                <div class="rc-label">About</div>
                <div class="rc-value">{{ reviewAbout }}</div>
              </div>
              <button type="button" class="rc-edit" (click)="editStep('entity')">Edit</button>
            </section>
            <section class="review-card">
              <div class="rc-body">
                <div class="rc-label">Services</div>
                <div class="rc-value">{{ reviewServices }}</div>
              </div>
              <button type="button" class="rc-edit" (click)="editStep('services')">Edit</button>
            </section>
            <section class="review-card">
              <div class="rc-body">
                <div class="rc-label">Payments</div>
                <div class="rc-value">Stripe Connect · set up after approval</div>
              </div>
              <button type="button" class="rc-edit" (click)="editStep('stripe')">Edit</button>
            </section>
            <section class="review-card">
              <div class="rc-body">
                <div class="rc-label">Hours</div>
                <div class="rc-value">{{ reviewHours }}</div>
              </div>
              <button type="button" class="rc-edit" (click)="editStep('schedule')">Edit</button>
            </section>
            <section class="review-card">
              <div class="rc-body">
                <div class="rc-label">Third-party</div>
                <div class="rc-value">{{ reviewTools }}</div>
              </div>
              <button type="button" class="rc-edit" (click)="editStep('tools')">Edit</button>
            </section>
          </div>

          <section class="web-card tos-card">
            <label class="tos-agree">
              <input type="checkbox" name="accept_tos" [(ngModel)]="acceptTos" class="sr-only" />
              <span class="tos-cb" [class.checked]="acceptTos" aria-hidden="true">
                <svg *ngIf="acceptTos" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l4 4L19 7"/></svg>
              </span>
              <span class="tos-text">I agree to the <span class="tos-link">Provider Terms</span>, the <span class="tos-link">Booking Cancellation Policy</span>, and consent to identity verification.</span>
            </label>
          </section>

          <p *ngIf="serverError" class="server-error" role="alert">{{ serverError }}</p>
        </form>
        </div>
      </main>

      <footer class="wiz-footer">
        <button type="button" class="wbtn wbtn-secondary"
                (click)="emitFollow(links['prev'])" [disabled]="!links['prev']">← Back</button>
        <span class="wiz-footer-spacer"></span>
        <span class="wiz-autosave"
              *ngIf="autosaveLabel"
              [class.is-saving]="saveState === 'saving'"
              [class.is-error]="saveState === 'error'"
              aria-live="polite">{{ autosaveLabel }}</span>
        <button type="button" class="wbtn wbtn-green"
                (click)="submitCurrentStep()"
                [class.is-loading]="isLoading"
                [disabled]="continueDisabled">{{ continueLabel }}</button>
      </footer>
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
  quickSetSelected: string | null = null;

  readonly quickSets: { key: string; label: string; open: string; close: string; days: number[] }[] = [
    { key: 'wd-10-6', label: 'Weekdays 10–6', open: '10:00', close: '18:00', days: [1,2,3,4,5] },
    { key: 'mf-9-5',  label: 'Mon–Fri 9–5',   open: '09:00', close: '17:00', days: [1,2,3,4,5] },
    { key: '7day',    label: '7 days 10–8',    open: '10:00', close: '20:00', days: [0,1,2,3,4,5,6] },
    { key: 'wknd',    label: 'Weekends only',  open: '10:00', close: '18:00', days: [0,6] },
    { key: 'closed',  label: 'Closed all week',open: '',      close: '',      days: [] },
  ];

  readonly stepSubtitles: Record<ApplicationStep, string> = {
    entity:   'A few details so customers can find and trust your business.',
    services: 'What categories will you offer? You can add specific services later.',
    stripe:   'Where customer payments land when bookings are paid.',
    schedule: 'When are you open? Customers can only book during these hours.',
    tools:    'Connect calendars or point-of-sale tools you already use.',
    review:   'Double-check the details — you can edit any section before submitting.',
  };

  get stepSubtitle(): string {
    return this.stepSubtitles[this.step] || '';
  }

  /** Steps whose title + subtitle are centered (per design / user tweaks). */
  get centerTitle(): boolean {
    return this.step === 'services' || this.step === 'stripe'
      || this.step === 'schedule' || this.step === 'tools';
  }

  /** "Save & exit" / brand → dashboard once the business is onboarded. */
  get exitLink(): BffLink | undefined {
    return this.links['dashboard'] || this.links['home'] || this.links['business_home'];
  }

  get continueLabel(): string {
    return this.step === 'review' ? 'Submit application' : 'Continue';
  }

  get continueDisabled(): boolean {
    if (this.isLoading) return true;
    if (this.step === 'services') return this.selectedCategories.size === 0;
    if (this.step === 'review') return !this.acceptTos;
    return false;
  }

  /** Shared desktop footer drives the active step's submitter. */
  submitCurrentStep(): void {
    switch (this.step) {
      case 'entity':   this.submitEntity(); break;
      case 'services': this.submitServices(); break;
      case 'stripe':   this.submitStripe(); break;
      case 'schedule': this.submitSchedule(); break;
      case 'tools':    this.submitTools(); break;
      case 'review':   this.submitApplication(); break;
    }
  }

  // ─── Review summaries (web-wiz-6) ───────────────────────────────
  get reviewAbout(): string {
    const a = this.application;
    if (!a) return '—';
    const name = `${a.applicant_first_name || ''} ${a.applicant_last_name || ''}`.trim();
    const label = a.business_name || name || '—';
    const entity = a.entity_type === 'business' ? 'Registered business' : 'Individual';
    const loc = [a.city, a.state].filter(Boolean).join(', ');
    return [label, loc, entity].filter(Boolean).join(' · ');
  }
  get reviewServices(): string {
    const l = this.data?.category_labels || [];
    return l.length ? l.join(', ') : 'No categories yet';
  }
  get reviewHours(): string {
    const rows = this.data?.weekly_hours || [];
    const open = rows.filter((r) => !r.is_closed).length;
    return open ? `${open} day${open === 1 ? '' : 's'} open per week` : 'No hours set';
  }
  get reviewTools(): string {
    const l = this.data?.tool_labels || [];
    return l.length ? l.join(', ') : 'None selected';
  }

  /** "Edit" on a review card jumps back to that wizard step. */
  editStep(path: string): void {
    this.followLink.emit({
      rel: 'edit', href: null, method: 'NAV',
      screen: null, route: `/pogoda/beauty/business/apply/${path}`, prompt: 'Edit',
    });
  }

  // ─── Autosave ───────────────────────────────────────────────────
  // Debounced PATCH on any field change/click — mirrors the mobile
  // wizard. The footer indicator reflects live state instead of a
  // hardcoded "Autosaved" string.
  saveState: 'idle' | 'saving' | 'saved' | 'error' = 'idle';
  private autosaveTimer: ReturnType<typeof setTimeout> | null = null;

  get autosaveLabel(): string {
    switch (this.saveState) {
      case 'saving': return 'Saving…';
      case 'saved':  return 'Saved';
      case 'error':  return "Couldn't save";
      default:       return '';
    }
  }

  /** Called from (input)/(change) on the step forms + toggle handlers. */
  scheduleAutosave(): void {
    if (this.autosaveTimer) clearTimeout(this.autosaveTimer);
    this.autosaveTimer = setTimeout(() => this.autosave(), 800);
  }

  /** Build the PATCH body for the current step's autosave (no validation,
   *  no advance). Returns null for steps with nothing to persist on change. */
  private buildAutosaveBody(): Record<string, unknown> | null {
    switch (this.step) {
      case 'entity': {
        const f = { ...this.entityForm };
        if (f.entity_type === 'person') {
          const name = `${(f.applicant_first_name || '').trim()} ${(f.applicant_last_name || '').trim()}`.trim();
          if (name) f.business_name = name;
        }
        return { step: 'entity', ...f };
      }
      case 'services':
        return { step: 'services', selected_categories: Array.from(this.selectedCategories) };
      case 'tools':
        return { step: 'tools', third_party_tools: Array.from(this.selectedTools) };
      default:
        return null; // stripe / schedule / review: nothing to autosave on change
    }
  }

  private autosave(): void {
    const body = this.buildAutosaveBody();
    if (!this.data?.submit_href || !body) return;
    this.saveState = 'saving';
    const link: BffLink = {
      rel: 'autosave', href: this.data.submit_href, method: 'PATCH',
      screen: null, route: null, prompt: null,
    };
    this.auth.follow(link, body).subscribe({
      next: () => { this.saveState = 'saved'; },
      error: () => { this.saveState = 'error'; },
    });
  }

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
    // Reset autosave indicator when the step changes.
    this.saveState = 'idle';
    if (this.autosaveTimer) { clearTimeout(this.autosaveTimer); this.autosaveTimer = null; }

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

  /** Toggle from the desktop category-button grid (web-wiz-2). */
  toggleCategoryValue(value: string): void {
    if (this.selectedCategories.has(value)) this.selectedCategories.delete(value);
    else this.selectedCategories.add(value);
    this.scheduleAutosave();
  }

  toggleTool(value: string, e: Event): void {
    const checked = (e.target as HTMLInputElement).checked;
    if (checked) this.selectedTools.add(value);
    else this.selectedTools.delete(value);
    this.scheduleAutosave();
  }

  applyQuickSet(key: string): void {
    const preset = this.quickSets.find(q => q.key === key);
    if (!preset) return;
    this.quickSetSelected = key;
    this.rows = this.rows.map((r) => {
      const open = preset.days.includes(r.day_of_week);
      return {
        ...r,
        is_closed: !open,
        is_24h: false,
        start_time: open ? preset.open : r.start_time,
        end_time: open ? preset.close : r.end_time,
      };
    });
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
    if (this.entityForm.entity_type === 'person') {
      // Sole practitioners work under their own name — derive business_name.
      const first = this.entityForm.applicant_first_name.trim();
      const last = this.entityForm.applicant_last_name.trim();
      this.entityForm.business_name = `${first} ${last}`.trim();
    } else if (!this.entityForm.business_name.trim()) {
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
