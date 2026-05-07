/**
 * BeautyBusinessEmailContactComponent — per Business Provider Portal handoff (email-contact).
 * Edit sign-in email, public business email, contact phone, "Show phone publicly" toggle.
 * PATCHes to BFF-supplied submit_href.
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

interface ContactPayload {
  email?: string;
  public_email?: string;
  contact_phone?: string;
  show_phone_publicly?: boolean;
}

@Component({
  selector: 'app-beauty-business-email-contact',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    BeautyProviderSubHeaderComponent,
    BeautyProviderCardComponent,
    BeautyProviderButtonComponent,
  ],
  template: `
    <div class="beauty-app prov-shell">
      <app-prov-sub-header back="Settings" title="Email & contact"
                           (backClick)="emit(links['settings'])">
        <app-prov-btn slot="right" variant="primary" size="sm"
                      (clicked)="save()" [disabled]="busy">
          {{ busy ? 'Saving…' : 'Save' }}
        </app-prov-btn>
      </app-prov-sub-header>

      <main id="main" class="prov-body">
        <p class="hint">Customers see your contact info on bookings and receipts. Changes apply to new bookings only.</p>

        <div class="group-label">Email</div>
        <app-prov-card [padding]="16" class="card">
          <div class="field">
            <label class="lab" for="email">Sign-in email<span class="req">*</span></label>
            <input id="email" type="email" autocomplete="email"
                   class="form-input"
                   [(ngModel)]="contact.email"
                   name="email" required/>
            <div class="micro">Used to log in and receive booking notifications.</div>
          </div>
          <div class="field last">
            <label class="lab" for="public_email">Public business email</label>
            <input id="public_email" type="email" autocomplete="email"
                   class="form-input"
                   [(ngModel)]="contact.public_email"
                   name="public_email"/>
            <div class="micro">Shown on your storefront. Leave blank to hide.</div>
          </div>
        </app-prov-card>

        <div class="group-label">Phone</div>
        <app-prov-card [padding]="16" class="card">
          <div class="field">
            <label class="lab" for="contact_phone">Contact phone<span class="req">*</span></label>
            <input id="contact_phone" type="tel" autocomplete="tel"
                   class="form-input mono"
                   [(ngModel)]="contact.contact_phone"
                   name="contact_phone"/>
            <div class="micro">Customers can call this number to reach you about bookings.</div>
          </div>
          <div class="show-row">
            <div class="show-text">
              <div class="show-label">Show phone publicly</div>
              <div class="show-sub">Display on your storefront</div>
            </div>
            <button type="button"
                    role="switch"
                    [attr.aria-checked]="contact.show_phone_publicly"
                    class="switch"
                    [class.is-on]="contact.show_phone_publicly"
                    (click)="contact.show_phone_publicly = !contact.show_phone_publicly">
              <span class="thumb" aria-hidden="true"></span>
            </button>
          </div>
        </app-prov-card>

        <div class="info-banner">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 17v.01"/>
          </svg>
          <span>We'll send a verification link to confirm any change to your sign-in email.</span>
        </div>

        <p *ngIf="message" class="msg" [class.error]="isError"
           [attr.role]="isError ? 'alert' : 'status'" aria-live="polite">{{ message }}</p>
      </main>
    </div>
  `,
  styles: [`
    :host {
      --surface: #F2F2F2; --line: #DCDCDF; --text: #0F1115; --text-muted: #6B6F77;
      --accent-blue: #CFE3F5; --accent-blue-deep: #7DA8CF;
      --success: #2F7A47; --danger: #C0392B;
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
    .prov-body { flex: 1; padding: 20px 16px; overflow-y: auto; }
    .hint { font-size: 12px; color: var(--text-muted); line-height: 1.5; margin: 0 0 14px; }

    .group-label {
      font-size: 10px; font-weight: 700;
      letter-spacing: 1.2px; text-transform: uppercase;
      color: var(--text-muted);
      margin-bottom: 8px;
      padding-left: 4px;
    }
    .card { display: block; margin-bottom: 14px; }

    .field { margin-bottom: 14px; }
    .field.last { margin-bottom: 0; }
    .lab {
      display: block;
      font-size: 11px; font-weight: 600;
      letter-spacing: 0.6px; text-transform: uppercase;
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
    .form-input.mono { font-family: var(--font-mono); }
    .micro { font-size: 11px; color: var(--text-muted); margin-top: 6px; }

    .show-row {
      display: flex; align-items: center; justify-content: space-between;
      padding: 10px 12px;
      background: rgba(207,227,245,0.4);
      border: 1px solid rgba(125,168,207,0.33);
      border-radius: 10px;
    }
    .show-text { min-width: 0; }
    .show-label { font-size: 12px; font-weight: 600; color: var(--text); }
    .show-sub { font-size: 11px; color: var(--text-muted); margin-top: 2px; }

    .switch {
      width: 44px; height: 28px;
      min-width: 44px; min-height: 28px;
      border-radius: 999px;
      background: var(--line);
      border: none;
      cursor: pointer;
      position: relative;
      flex-shrink: 0;
      padding: 3px;
      transition: background 160ms;
    }
    .switch.is-on { background: var(--success); }
    .thumb {
      position: absolute;
      top: 3px; left: 3px;
      width: 22px; height: 22px;
      border-radius: 50%;
      background: #FFFFFF;
      transition: left 160ms;
    }
    .switch.is-on .thumb { left: 19px; }

    .info-banner {
      font-size: 11px;
      color: var(--text-muted);
      line-height: 1.5;
      background: #FFFFFF;
      border: 1px solid var(--line);
      border-radius: 10px;
      padding: 10px 12px;
      display: flex; gap: 8px; align-items: flex-start;
    }
    .info-banner svg { flex-shrink: 0; margin-top: 1px; }

    .msg { padding: 12px 0; color: #1a3a52; font-size: 13px; }
    .msg.error { color: var(--danger); }

    @media screen and (min-width: 768px) {
      .beauty-app { max-width: 430px; margin: 0 auto; box-shadow: 0 0 40px rgba(15,35,60,0.15); }
    }
  `],
})
export class BeautyBusinessEmailContactComponent implements OnChanges {
  @Input() data: Record<string, unknown> = {};
  @Input() links: Record<string, BffLink> = {};
  @Output() followLink = new EventEmitter<BffLink>();

  contact: ContactPayload = {
    email: '', public_email: '', contact_phone: '', show_phone_publicly: false,
  };
  busy = false;
  message = '';
  isError = false;

  constructor(private auth: BeautyAuthService) {}

  ngOnChanges(_: SimpleChanges): void {
    const c = (this.data['contact'] as ContactPayload) || {};
    this.contact = {
      email: c.email || '',
      public_email: c.public_email || '',
      contact_phone: c.contact_phone || '',
      show_phone_publicly: !!c.show_phone_publicly,
    };
  }

  emit(link: BffLink | null | undefined): void {
    if (link) this.followLink.emit(link);
  }

  save(): void {
    if (this.busy) return;
    this.busy = true;
    this.message = '';
    this.isError = false;

    const submit: BffLink = {
      rel: 'submit',
      href: (this.data['submit_href'] as string) || '/api/beauty/protected/business/account/contact/',
      method: ((this.data['submit_method'] as string) || 'PATCH') as BffLink['method'],
      screen: null, route: null, prompt: null,
    };

    this.auth.follow(submit, this.contact as unknown as Record<string, unknown>).subscribe({
      next: () => {
        this.busy = false;
        this.message = 'Saved.';
        const self = this.links['self'];
        if (self) this.followLink.emit(self);
      },
      error: (err) => {
        this.busy = false;
        this.isError = true;
        this.message = err?.error?.detail || 'Could not save. Please try again.';
      },
    });
  }
}
