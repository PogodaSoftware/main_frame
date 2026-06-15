/**
 * BeautyBusinessServiceFormComponent — desktop redesign per Business Provider
 * Portal · Web handoff (web-svc-add / web-svc-edit / web-svc-delete).
 *
 * Sidebar + topbar chrome, breadcrumb + Cormorant heading, two-column body
 * (form card + live storefront-preview / tips rail), header actions
 * (Delete · Cancel · Create/Save), and the shared confirm modal for delete.
 * BFF contract unchanged: data.form / data.is_edit / data.service_id,
 * links.cancel + the submit/delete action links.
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
import { BeautyProviderPriceInputComponent } from './provider/prov-price-input.component';
import { BeautyConfirmModalComponent } from './beauty-confirm-modal.component';
import { BeautyProvWebSidebarComponent } from './prov-web/prov-web-sidebar.component';
import { BeautyProvWebTopbarComponent } from './prov-web/prov-web-topbar.component';

interface FormField {
  name: string;
  type: string;
  label: string;
  required?: boolean;
  value?: string | number;
  options?: { value: string; label: string }[];
  min?: number;
  max?: number;
  pattern?: string;
  suffix?: string;
}

interface BusinessForm {
  title: string;
  submit_method: string;
  submit_href: string;
  success_screen: string;
  submit_label: string;
  fields: FormField[];
}

const CATEGORY_HUE: Record<string, string> = {
  facial: '#A88A7A',
  massage: '#7A8B6E',
  nails: '#C28A82',
  hair: '#5C4A3F',
};

@Component({
  selector: 'app-beauty-business-service-form',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    BeautyProviderPriceInputComponent,
    BeautyConfirmModalComponent,
    BeautyProvWebSidebarComponent,
    BeautyProvWebTopbarComponent,
  ],
  template: `
    <div class="pw-shell">
      <app-prov-web-sidebar
        active="services"
        [businessName]="business?.business_name || 'Your storefront'"
        [email]="business?.email || ''"
        [storefrontLive]="true"
        [badges]="navBadges"
        (follow)="emit($event)">
      </app-prov-web-sidebar>

      <div class="pw-main">
        <app-prov-web-topbar
          [businessName]="business?.business_name || 'Your storefront'"
          [email]="business?.email || ''"
          [notifCount]="0"
          (follow)="emit($event)">
        </app-prov-web-topbar>

        <main id="main" class="pw-content" *ngIf="form">
          <div class="pw-header">
            <div class="pw-header-text pw-header-centered">
              <div class="pw-crumb">
                <button type="button" class="crumb-link" (click)="emit(links['cancel'])">Services</button>
                <span class="crumb-sep">›</span> {{ breadcrumbTail }}
              </div>
              <h1 class="pw-title">{{ heading }}</h1>
              <div class="pw-sub">{{ subtitle }}</div>
            </div>
            <div class="pw-header-actions">
              <button type="button" class="wbtn wbtn-danger-outline" *ngIf="isEdit"
                      (click)="openDelete()" [disabled]="isSubmitting">Delete</button>
              <button type="button" class="wbtn wbtn-secondary"
                      (click)="emit(links['cancel'])" [disabled]="isSubmitting">Cancel</button>
              <button type="button" class="wbtn wbtn-success"
                      (click)="onSubmit()" [disabled]="isSubmitting">
                {{ isSubmitting ? 'Saving…' : submitLabel }}
              </button>
            </div>
          </div>

          <form class="pw-pad svc-grid" (ngSubmit)="onSubmit()" novalidate>
            <!-- Form card -->
            <div class="web-card form-card">
              <div class="field">
                <label class="field-label" for="svc-name">Service name<span class="req">*</span></label>
                <input id="svc-name" name="name" type="text" class="form-input"
                       [(ngModel)]="values['name']" placeholder="e.g. Signature Facial"
                       (blur)="touched['name'] = true" autocomplete="off" required/>
              </div>

              <div class="field-row">
                <div class="field">
                  <label class="field-label" for="svc-category">Category<span class="req">*</span></label>
                  <select id="svc-category" name="category" class="form-input select"
                          [(ngModel)]="values['category']" required autocomplete="off">
                    <option value="" disabled>Select…</option>
                    <option *ngFor="let o of categoryOptions" [value]="o.value">{{ o.label }}</option>
                  </select>
                </div>
                <div class="field">
                  <label class="field-label" for="svc-duration">Duration<span class="req">*</span></label>
                  <div class="num-wrap">
                    <input id="svc-duration" name="duration_minutes" type="text" inputmode="numeric"
                           class="num-input" [(ngModel)]="values['duration_minutes']"
                           (blur)="touched['duration_minutes'] = true" autocomplete="off" required/>
                    <span class="num-suffix">min</span>
                  </div>
                </div>
              </div>

              <div class="field">
                <label class="field-label" for="svc-price">
                  Price <span class="lbl-note">· US dollars, decimals OK</span><span class="req">*</span>
                </label>
                <app-prov-price-input inputId="svc-price" name="price_dollars"
                                      [hint]="priceHint"
                                      [(ngModel)]="values['price_dollars']"></app-prov-price-input>
              </div>

              <div class="field">
                <label class="field-label" for="svc-description">Description</label>
                <textarea id="svc-description" name="description" class="form-input textarea" rows="4"
                          [(ngModel)]="values['description']"
                          placeholder="Tell customers what to expect — what's included, what they can/can't wear, any prep."
                          autocomplete="off"></textarea>
              </div>

              <p *ngIf="serverError" class="server-error" role="alert" aria-live="assertive">{{ serverError }}</p>
            </div>

            <!-- Side rail: live preview + tips -->
            <aside class="side-rail">
              <div class="web-card rail-card">
                <div class="rail-eyebrow">Storefront preview</div>
                <div class="preview-row">
                  <span class="swatch sm" [style.background]="swatch"></span>
                  <div class="preview-text">
                    <div class="preview-name">{{ values['name'] || 'Service name' }}</div>
                    <div class="preview-meta">
                      <span class="cat-eyebrow">{{ previewCategoryLabel }}</span>
                      <span class="dot">·</span>
                      <span class="mono">{{ values['duration_minutes'] || '—' }} min</span>
                      <span class="dot">·</span>
                      <span class="mono price">{{ previewPrice }}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div class="web-card rail-card">
                <div class="rail-eyebrow">Tips</div>
                <ul class="tips-list">
                  <li>Use descriptive names — “60-min Signature Facial” books better than “Facial”.</li>
                  <li>If your service has a fixed prep (e.g. patch test), say so in the description.</li>
                  <li>You can change the price anytime. Existing bookings keep their original price.</li>
                </ul>
              </div>
            </aside>
          </form>
        </main>
      </div>

      <app-beauty-confirm-modal
        *ngIf="showDelete"
        [open]="showDelete"
        [title]="'Delete this service?'"
        [body]="deleteBody"
        [primaryLabel]="'Yes, delete'"
        [secondaryLabel]="'Keep service'"
        [primaryVariant]="'danger'"
        [busy]="isSubmitting"
        [busyLabel]="'Deleting…'"
        (confirmed)="onDelete()"
        (dismissed)="showDelete = false"
      />
    </div>
  `,
  styles: [`
    :host {
      --surface: #F2F2F2; --surface-2: #E9E9EB; --line: #DCDCDF; --text: #0F1115; --text-muted: #6B6F77;
      --accent-blue: #CFE3F5; --accent-blue-deep: #7DA8CF; --accent-blue-text: #1a3a52;
      --ink: #0A0A0B; --success: #2F7A47; --danger: #C0392B; --danger-soft: #FCE8E5;
      --font-body: 'Inter', system-ui, sans-serif;
      --font-display: 'Cormorant Garamond', Georgia, serif;
      --font-mono: ui-monospace, 'SF Mono', Menlo, monospace;
      display: block; background: var(--surface);
    }
    :host *:focus-visible { outline: 2px solid #1a3a52; outline-offset: 2px; border-radius: 6px; }

    /* Shell */
    .pw-shell { display: flex; min-height: 100dvh; background: var(--surface); }
    app-prov-web-sidebar { position: sticky; top: 0; height: 100dvh; }
    .pw-main { flex: 1; min-width: 0; display: flex; flex-direction: column; }
    app-prov-web-topbar { position: sticky; top: 0; z-index: 5; }
    .pw-content { flex: 1; padding: 0 0 40px; }
    .pw-pad { padding: 20px 28px 28px; }

    .pw-header { position: relative; display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; padding: 24px 28px 4px; }
    .pw-header-text { flex: 1; min-width: 0; }
    .pw-header-centered { text-align: center; }
    .pw-header-centered .pw-crumb { text-align: left; }
    .pw-crumb { font-size: 0.6875rem; color: var(--text-muted); font-weight: 600; margin-bottom: 6px; }
    .crumb-link { background: none; border: none; padding: 0; cursor: pointer; font: inherit; color: var(--text-muted); }
    .crumb-link:hover { color: var(--accent-blue-text); text-decoration: underline; }
    .crumb-sep { margin: 0 4px; }
    .pw-title { margin: 0; font-family: var(--font-display); font-size: 2rem; font-weight: 500; letter-spacing: 0.2px; line-height: 1.15; }
    .pw-sub { font-size: 0.8125rem; color: var(--text-muted); margin-top: 6px; }
    .pw-header-actions { position: absolute; top: 24px; right: 28px; display: flex; gap: 8px; align-items: center; flex-shrink: 0; }

    /* Buttons */
    .wbtn { height: 40px; padding: 0 16px; border-radius: 10px; cursor: pointer; font-family: var(--font-body); font-size: 0.8125rem; font-weight: 600; display: inline-flex; align-items: center; justify-content: center; gap: 6px; border: 1px solid transparent; white-space: nowrap; }
    .wbtn:disabled { opacity: 0.5; cursor: not-allowed; }
    .wbtn-success { background: var(--success); color: #fff; border-color: var(--success); }
    .wbtn-success:hover:not(:disabled) { background: #276539; }
    .wbtn-secondary { background: #fff; color: var(--text); border-color: var(--line); }
    .wbtn-secondary:hover:not(:disabled) { border-color: var(--accent-blue-deep); }
    .wbtn-danger-outline { background: #fff; color: var(--danger); border-color: rgba(192,57,43,0.4); }
    .wbtn-danger-outline:hover:not(:disabled) { background: var(--danger-soft); }

    .web-card { background: #fff; border: 1px solid var(--line); border-radius: 14px; }

    /* Two-column body */
    .svc-grid { display: grid; grid-template-columns: minmax(0, 1fr) 320px; gap: 20px; align-items: start; }
    .form-card { padding: 20px; }
    .side-rail { display: flex; flex-direction: column; gap: 16px; }

    /* Fields */
    .field { margin-bottom: 16px; }
    .field:last-child { margin-bottom: 0; }
    .field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    .field-label { display: block; font-size: 0.6875rem; font-weight: 700; letter-spacing: 0.6px; text-transform: uppercase; color: var(--text-muted); margin-bottom: 6px; }
    .lbl-note { font-weight: 500; text-transform: none; letter-spacing: 0; }
    .req { color: var(--danger); margin-left: 3px; }
    .field-hint { font-size: 0.6875rem; color: var(--text-muted); margin-top: 6px; }
    .form-input {
      width: 100%; box-sizing: border-box; height: 44px; padding: 0 12px;
      background: #fff; border: 1px solid var(--line); border-radius: 10px;
      font-family: var(--font-body); font-size: 0.875rem; color: var(--text); outline: none;
    }
    .form-input.textarea { height: auto; min-height: 90px; padding: 12px; resize: vertical; line-height: 1.5; }
    .form-input.select {
      appearance: none; cursor: pointer; padding-right: 32px;
      background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236B6F77' stroke-width='2'><path d='M6 9l6 6 6-6'/></svg>");
      background-repeat: no-repeat; background-position: right 12px center;
    }
    .num-wrap { display: flex; align-items: center; background: #fff; border: 1px solid var(--line); border-radius: 10px; height: 44px; padding: 0 12px; }
    .num-input { flex: 1; border: none; background: transparent; height: auto; padding: 0; font-family: var(--font-mono); font-size: 0.875rem; color: var(--text); outline: none; }
    .num-suffix { color: var(--text-muted); font-size: 0.75rem; margin-left: 8px; }

    /* Side rail cards */
    .rail-card { padding: 16px; }
    .rail-eyebrow { font-size: 0.625rem; font-weight: 700; letter-spacing: 1.2px; text-transform: uppercase; color: var(--text-muted); margin-bottom: 12px; }
    .preview-row { display: flex; align-items: center; gap: 12px; }
    .swatch { width: 48px; height: 48px; border-radius: 10px; flex-shrink: 0; border: 1px solid var(--line); }
    .swatch.sm { width: 44px; height: 44px; }
    .preview-text { min-width: 0; }
    .preview-name { font-family: var(--font-display); font-size: 1.0625rem; font-weight: 500; }
    .preview-meta { display: flex; align-items: center; gap: 5px; flex-wrap: wrap; margin-top: 3px; }
    .cat-eyebrow { font-size: 0.625rem; font-weight: 700; letter-spacing: 1.2px; text-transform: uppercase; color: var(--accent-blue-deep); }
    .dot { color: var(--text-muted); }
    .mono { font-family: var(--font-mono); font-size: 0.75rem; color: var(--text); }
    .mono.price { font-weight: 600; }
    .tips-list { margin: 0; padding-left: 18px; display: flex; flex-direction: column; gap: 8px; }
    .tips-list li { font-size: 0.75rem; color: var(--text-muted); line-height: 1.5; }

    .server-error { color: var(--danger); padding: 12px 0 0; font-size: 0.8125rem; }

    @media screen and (max-width: 900px) {
      .svc-grid { grid-template-columns: 1fr; }
      .side-rail { order: -1; }
    }
    @media screen and (max-width: 720px) {
      app-prov-web-sidebar { display: none; }
      .pw-header { flex-direction: column; padding: 16px; }
      .pw-pad { padding: 16px; }
      .field-row { grid-template-columns: 1fr; }
    }
  `],
})
export class BeautyBusinessServiceFormComponent implements OnChanges {
  @Input() data: Record<string, unknown> = {};
  @Input() links: Record<string, BffLink> = {};
  @Output() followLink = new EventEmitter<BffLink>();

  values: Record<string, string | number> = {};
  touched: Record<string, boolean> = {};
  isSubmitting = false;
  serverError = '';
  showDelete = false;

  constructor(private authService: BeautyAuthService) {}

  get form(): BusinessForm | null {
    return (this.data['form'] as BusinessForm) || null;
  }

  get isEdit(): boolean {
    return !!this.data['is_edit'];
  }

  get serviceId(): number | null {
    return (this.data['service_id'] as number | null) ?? null;
  }

  get business(): { email?: string; business_name?: string } | null {
    return (this.data['business'] as { email?: string; business_name?: string }) || null;
  }

  get navBadges(): { bookings?: number; messages?: number } {
    const b = (this.data['badges'] as { messages_unread?: number; bookings_unread?: number }) || {};
    return { bookings: b.bookings_unread || 0, messages: b.messages_unread || 0 };
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

  // --- Header copy ---
  get heading(): string { return this.isEdit ? 'Edit service' : 'Add a service'; }
  get subtitle(): string {
    return this.isEdit
      ? 'Update name, price, duration or description. Changes apply to new bookings only.'
      : 'Tell customers what you offer and what it costs.';
  }
  get breadcrumbTail(): string {
    if (this.isEdit) return (this.values['name'] as string) || 'Edit service';
    return 'Add service';
  }
  get submitLabel(): string {
    return this.isEdit ? 'Save' : (this.form?.submit_label || 'Create service');
  }
  readonly priceHint = "e.g. 50 or 49.99 — we'll format to 2 decimals on save";

  // --- Form options + live preview ---
  get categoryOptions(): { value: string; label: string }[] {
    return this.form?.fields.find(f => f.name === 'category')?.options || [];
  }
  get previewCategoryLabel(): string {
    const v = String(this.values['category'] || '');
    return this.categoryOptions.find(o => o.value === v)?.label || 'Category';
  }
  get previewPrice(): string {
    const p = String(this.values['price_dollars'] ?? '').trim();
    return p ? `$${p}` : '$—';
  }
  get swatch(): string {
    const hue = CATEGORY_HUE[String(this.values['category'] || '')] || '#7A8B6E';
    return `repeating-linear-gradient(135deg, ${hue}1a 0, ${hue}1a 6px, ${hue}26 6px, ${hue}26 12px), ${hue}33`;
  }

  // --- Delete confirm ---
  openDelete(): void {
    if (this.isSubmitting) return;
    this.showDelete = true;
  }
  get deleteBody(): string {
    const name = (this.values['name'] as string) || 'this service';
    return `Removing '${name}' won't refund existing bookings, but customers won't be able to book it going forward.`;
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
      screen: null, route: null, prompt: null,
    };

    this.authService.follow(submitLink, this.values).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.followLink.emit({
          rel: 'success', href: null, method: 'NAV',
          screen: this.form?.success_screen || 'beauty_business_services',
          route: null, prompt: null,
        });
      },
      error: (err) => {
        this.isSubmitting = false;
        this.serverError = err?.error?.detail || 'Could not save. Please try again.';
      },
    });
  }

  onDelete(): void {
    const id = this.serviceId;
    if (!id || this.isSubmitting) return;
    this.isSubmitting = true;
    this.serverError = '';
    const link: BffLink = this.links['delete'] || {
      rel: 'delete',
      href: `/api/beauty/protected/business/services/${id}/`,
      method: 'DELETE',
      screen: null, route: null, prompt: null,
    };
    this.authService.follow(link).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.showDelete = false;
        this.followLink.emit({
          rel: 'success', href: null, method: 'NAV',
          screen: 'beauty_business_services', route: null, prompt: null,
        });
      },
      error: (err) => {
        this.isSubmitting = false;
        this.showDelete = false;
        this.serverError = err?.error?.detail || 'Could not delete service.';
      },
    });
  }
}
