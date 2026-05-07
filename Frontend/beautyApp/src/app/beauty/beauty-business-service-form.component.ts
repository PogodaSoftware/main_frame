/**
 * BeautyBusinessServiceFormComponent — redesigned per Business Provider Portal handoff (svc-add / svc-edit).
 * Inline form inside a card. Price uses $-prefix decimal input; duration uses number with "min" suffix.
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
import { BeautyProviderSubHeaderComponent } from './provider/prov-sub-header.component';
import { BeautyProviderCardComponent } from './provider/prov-card.component';
import { BeautyProviderButtonComponent } from './provider/prov-btn.component';
import { BeautyProviderPriceInputComponent } from './provider/prov-price-input.component';

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

@Component({
  selector: 'app-beauty-business-service-form',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    BeautyProviderSubHeaderComponent,
    BeautyProviderCardComponent,
    BeautyProviderButtonComponent,
    BeautyProviderPriceInputComponent,
  ],
  template: `
    <div class="beauty-app prov-shell">
      <app-prov-sub-header back="Cancel" [title]="form?.title || 'Service'"
                           (backClick)="emit(links['cancel'])"></app-prov-sub-header>

      <main id="main" class="prov-body">
        <form class="biz-form" (ngSubmit)="onSubmit()" novalidate *ngIf="form">
          <app-prov-card [padding]="16" class="form-card">
            <ng-container *ngFor="let f of form.fields">
              <div class="field" [class.field-grid]="f.name === 'price_dollars' || f.name === 'duration_minutes'">
                <label class="field-label" [for]="f.name">
                  {{ f.label }}<span class="req" *ngIf="f.required">*</span>
                </label>

                <select
                  *ngIf="f.type === 'select'"
                  [id]="f.name" [name]="f.name"
                  class="form-input select"
                  [(ngModel)]="values[f.name]"
                  [required]="f.required ?? false"
                  autocomplete="off">
                  <option *ngFor="let o of f.options" [value]="o.value">{{ o.label }}</option>
                </select>

                <input
                  *ngIf="f.type === 'text' && f.name !== 'description'"
                  type="text"
                  [id]="f.name" [name]="f.name"
                  class="form-input"
                  [(ngModel)]="values[f.name]"
                  [required]="f.required ?? false"
                  (blur)="touched[f.name] = true"
                  [placeholder]="placeholderFor(f)"
                  autocomplete="off"/>

                <textarea
                  *ngIf="f.type === 'text' && f.name === 'description'"
                  [id]="f.name" [name]="f.name"
                  class="form-input textarea"
                  [(ngModel)]="values[f.name]"
                  rows="3"
                  [placeholder]="placeholderFor(f)"
                  autocomplete="off"></textarea>

                <app-prov-price-input
                  *ngIf="f.type === 'price_dollars'"
                  [inputId]="f.name"
                  [(ngModel)]="values[f.name]"
                  [name]="f.name"></app-prov-price-input>

                <div *ngIf="f.type === 'number'" class="num-wrap">
                  <input
                    type="text"
                    inputmode="numeric"
                    [id]="f.name" [name]="f.name"
                    class="form-input num-input"
                    [(ngModel)]="values[f.name]"
                    [required]="f.required ?? false"
                    (blur)="touched[f.name] = true"
                    autocomplete="off"/>
                  <span class="num-suffix" *ngIf="f.suffix">{{ f.suffix }}</span>
                </div>
              </div>
            </ng-container>
          </app-prov-card>

          <p *ngIf="serverError" class="server-error" role="alert" aria-live="assertive">{{ serverError }}</p>

          <div class="footer-actions">
            <app-prov-btn *ngIf="isEdit" variant="dangerOutline" [full]="true"
                          (clicked)="onDelete()" [disabled]="isSubmitting">
              Delete
            </app-prov-btn>
            <app-prov-btn variant="primary" type="submit" [full]="true" [disabled]="isSubmitting">
              {{ isSubmitting ? 'Saving…' : (form.submit_label || 'Save') }}
            </app-prov-btn>
          </div>

          <div class="footnote">Customers will see this on your storefront.</div>
        </form>
      </main>
    </div>
  `,
  styles: [`
    :host {
      --surface: #F2F2F2; --line: #DCDCDF; --text: #0F1115; --text-muted: #6B6F77;
      --danger: #C0392B;
      --font-body: 'Inter', system-ui, sans-serif;
      --font-display: 'Cormorant Garamond', Georgia, serif;
      --font-mono: ui-monospace, 'SF Mono', Menlo, monospace;
      display: block;
      background: var(--surface);
    }
    :host *:focus-visible { outline: 2px solid #1a3a52; outline-offset: 2px; border-radius: 6px; }
    .prov-shell {
      display: flex; flex-direction: column;
      min-height: 100vh;
      background: var(--surface); color: var(--text);
      font-family: var(--font-body);
    }
    .prov-body { flex: 1; padding: 14px 16px 12px; overflow-y: auto; }
    .biz-form { display: flex; flex-direction: column; }
    .form-card { display: block; margin-bottom: 12px; }
    .field { margin-bottom: 14px; }
    .field:last-child { margin-bottom: 0; }
    .field-label {
      display: block;
      font-family: var(--font-body);
      font-size: 11px; font-weight: 600;
      letter-spacing: 0.6px;
      text-transform: uppercase;
      color: var(--text-muted);
      margin-bottom: 6px;
    }
    .req { color: var(--danger); margin-left: 3px; }
    .form-input {
      width: 100%; box-sizing: border-box;
      height: 44px; padding: 0 12px;
      background: #FFFFFF;
      border: 1px solid var(--line);
      border-radius: 10px;
      font-family: var(--font-body);
      font-size: 14px;
      color: var(--text);
      outline: none;
    }
    .form-input.textarea { height: auto; min-height: 80px; padding: 12px; resize: vertical; }
    .form-input.select {
      appearance: none;
      background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236B6F77' stroke-width='2'><path d='M6 9l6 6 6-6'/></svg>");
      background-repeat: no-repeat;
      background-position: right 12px center;
      padding-right: 32px;
    }

    /* Two-up grid for Price + Duration */
    .biz-form { position: relative; }
    .form-card { /* stacks all fields by default */ }
    .field.field-grid { display: inline-block; width: calc(50% - 6px); vertical-align: top; }
    .field.field-grid:nth-of-type(odd-grid) { margin-right: 12px; }
    .field.field-grid + .field.field-grid { margin-left: 12px; }

    /* Number with suffix */
    .num-wrap {
      position: relative;
      display: flex; align-items: center;
      background: #FFFFFF;
      border: 1px solid var(--line);
      border-radius: 10px;
      height: 44px;
      padding: 0 12px;
      font-family: var(--font-mono);
    }
    .num-input {
      flex: 1; border: none; background: transparent; height: auto; padding: 0;
      font-family: var(--font-mono); font-size: 14px;
    }
    .num-suffix {
      color: var(--text-muted);
      font-size: 12px;
      margin-left: 8px;
    }

    .footer-actions {
      display: flex; gap: 8px;
    }
    .footnote {
      font-size: 11px;
      color: var(--text-muted);
      text-align: center;
      margin-top: 10px;
    }
    .server-error {
      color: var(--danger);
      font-size: 13px;
      padding: 8px 0;
    }
    @media screen and (min-width: 768px) {
      .beauty-app { max-width: 430px; margin: 0 auto; box-shadow: 0 0 40px rgba(15,35,60,0.15); }
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

  ngOnChanges(_: SimpleChanges): void {
    const f = this.form;
    if (!f) return;
    const v: Record<string, string | number> = {};
    for (const field of f.fields) {
      v[field.name] = field.value ?? '';
    }
    this.values = v;
  }

  placeholderFor(f: FormField): string {
    if (f.name === 'name') return 'e.g. Brightening Peel';
    if (f.name === 'description') return 'What\'s included? Any prep needed?';
    return '';
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
        const target: BffLink = {
          rel: 'success', href: null, method: 'NAV',
          screen: this.form?.success_screen || 'beauty_business_services',
          route: null, prompt: null,
        };
        this.followLink.emit(target);
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
    if (!confirm('Delete this service? This cannot be undone.')) return;
    this.isSubmitting = true;
    const link: BffLink = {
      rel: 'delete',
      href: `/api/beauty/protected/business/services/${id}/`,
      method: 'DELETE',
      screen: null, route: null, prompt: null,
    };
    this.authService.follow(link).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.followLink.emit({
          rel: 'success', href: null, method: 'NAV',
          screen: 'beauty_business_services', route: null, prompt: null,
        });
      },
      error: (err) => {
        this.isSubmitting = false;
        this.serverError = err?.error?.detail || 'Could not delete service.';
      },
    });
  }
}
