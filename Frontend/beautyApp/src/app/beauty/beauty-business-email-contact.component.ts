/**
 * BeautyBusinessEmailContactComponent — desktop redesign per Business Provider
 * Portal · Web handoff (web-email-contact). Sidebar/topbar chrome, breadcrumb +
 * centered title, two columns: form card (sign-in email / public email /
 * contact phone / show-phone toggle + Cancel/Save) and a "Heads up"
 * verification note rail. PATCHes the BFF-supplied action-link.
 */

import {
  Component, EventEmitter, Input, OnChanges, Output, SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { BeautyAuthService } from './beauty-auth.service';
import { BffLink } from './beauty-bff.types';
import { BeautyProvWebSidebarComponent, ProvWebNav } from './prov-web/prov-web-sidebar.component';
import { BeautyProvWebTopbarComponent } from './prov-web/prov-web-topbar.component';

interface ContactPayload {
  email?: string; public_email?: string; contact_phone?: string; show_phone_publicly?: boolean;
}

@Component({
  selector: 'app-beauty-business-email-contact',
  standalone: true,
  imports: [CommonModule, FormsModule, BeautyProvWebSidebarComponent, BeautyProvWebTopbarComponent],
  template: `
    <div class="pw-shell">
      <app-prov-web-sidebar
        active="settings"
        [businessName]="business?.business_name || 'Your storefront'"
        [email]="business?.email || ''"
        [storefrontLive]="true" [badges]="navBadges" (follow)="emit($event)">
      </app-prov-web-sidebar>

      <div class="pw-main">
        <app-prov-web-topbar
          [businessName]="business?.business_name || 'Your storefront'"
          [email]="business?.email || ''" [notifCount]="0" (follow)="emit($event)">
        </app-prov-web-topbar>

        <main id="main" class="pw-content">
          <div class="pw-header">
            <div class="pw-header-text pw-header-centered">
              <div class="pw-crumb">
                <button type="button" class="crumb-link" (click)="emit(links['settings'])">Settings</button>
                <span class="crumb-sep">›</span> Email &amp; contact
              </div>
              <h1 class="pw-title">Email &amp; contact</h1>
              <div class="pw-sub">What customers see and how we reach you.</div>
            </div>
          </div>

          <div class="pw-pad set-grid">
            <div class="web-card form-card">
              <div class="field">
                <label class="lab" for="email">Sign-in email<span class="req">*</span></label>
                <input id="email" type="email" autocomplete="email" class="form-input"
                       [(ngModel)]="contact.email" name="email" required/>
                <div class="micro">You'll need to verify a new email if you change this.</div>
              </div>
              <div class="field">
                <label class="lab" for="public_email">Public business email</label>
                <input id="public_email" type="email" autocomplete="email" class="form-input"
                       [(ngModel)]="contact.public_email" name="public_email"/>
              </div>
              <div class="field">
                <label class="lab" for="contact_phone">Contact phone</label>
                <input id="contact_phone" type="tel" autocomplete="tel" class="form-input mono"
                       [(ngModel)]="contact.contact_phone" name="contact_phone"/>
              </div>
              <label class="check-row">
                <input type="checkbox" [(ngModel)]="contact.show_phone_publicly" name="show_phone"/>
                <span>Show phone publicly on storefront</span>
              </label>

              <div class="form-actions">
                <button type="button" class="wbtn wbtn-secondary" (click)="emit(links['settings'])" [disabled]="busy">Cancel</button>
                <button type="button" class="wbtn wbtn-success" (click)="save()" [disabled]="busy">
                  {{ busy ? 'Saving…' : 'Save changes' }}
                </button>
              </div>
              <p *ngIf="message" class="msg" [class.error]="isError"
                 [attr.role]="isError ? 'alert' : 'status'" aria-live="polite">{{ message }}</p>
            </div>

            <aside class="rail-note">
              <strong>Heads up:</strong> changing your sign-in email triggers a verification stop. You won't be able to sign in until you click the verification link.
            </aside>
          </div>
        </main>
      </div>
    </div>
  `,
  styles: [`
    :host {
      --surface: #F2F2F2; --line: #DCDCDF; --text: #0F1115; --text-muted: #6B6F77;
      --accent-blue: #CFE3F5; --accent-blue-deep: #7DA8CF; --accent-blue-text: #1a3a52;
      --success: #2F7A47; --danger: #C0392B;
      --font-body: 'Inter', system-ui, sans-serif; --font-display: 'Cormorant Garamond', Georgia, serif;
      --font-mono: ui-monospace, 'SF Mono', Menlo, monospace;
      display: block; background: var(--surface);
    }
    :host *:focus-visible { outline: 2px solid #1a3a52; outline-offset: 2px; border-radius: 6px; }
    .pw-shell { display: flex; min-height: 100dvh; background: var(--surface); }
    app-prov-web-sidebar { position: sticky; top: 0; height: 100dvh; }
    .pw-main { flex: 1; min-width: 0; display: flex; flex-direction: column; }
    app-prov-web-topbar { position: sticky; top: 0; z-index: 5; }
    .pw-content { flex: 1; padding: 0 0 40px; }
    .pw-pad { padding: 20px 28px 28px; }
    .pw-header { padding: 24px 28px 4px; }
    .pw-header-centered { text-align: center; }
    .pw-crumb { font-size: 0.6875rem; color: var(--text-muted); font-weight: 600; margin-bottom: 6px; text-align: left; }
    .crumb-link { background: none; border: none; padding: 0; cursor: pointer; font: inherit; color: var(--text-muted); }
    .crumb-link:hover { color: var(--accent-blue-text); text-decoration: underline; }
    .crumb-sep { margin: 0 4px; }
    .pw-title { margin: 0; font-family: var(--font-display); font-size: 2rem; font-weight: 500; line-height: 1.15; }
    .pw-sub { font-size: 0.8125rem; color: var(--text-muted); margin-top: 6px; }

    .web-card { background: #fff; border: 1px solid var(--line); border-radius: 14px; }
    .set-grid { display: grid; grid-template-columns: minmax(0, 1fr) 300px; gap: 20px; align-items: start; }
    .form-card { padding: 20px; max-width: 560px; }

    .field { margin-bottom: 16px; }
    .lab { display: block; font-size: 0.6875rem; font-weight: 700; letter-spacing: 0.6px; text-transform: uppercase; color: var(--text-muted); margin-bottom: 6px; }
    .req { color: var(--danger); margin-left: 3px; }
    .form-input { width: 100%; box-sizing: border-box; height: 44px; padding: 0 12px; background: #fff; border: 1px solid var(--line); border-radius: 10px; font-family: var(--font-body); font-size: 0.875rem; color: var(--text); outline: none; }
    .form-input.mono { font-family: var(--font-mono); }
    .micro { font-size: 0.6875rem; color: var(--text-muted); margin-top: 6px; }
    .check-row { display: flex; align-items: center; gap: 8px; font-size: 0.8125rem; color: var(--text); cursor: pointer; }
    .check-row input { width: 16px; height: 16px; accent-color: var(--success); }

    .form-actions { display: flex; gap: 8px; margin-top: 18px; }
    .wbtn { height: 44px; padding: 0 18px; border-radius: 10px; cursor: pointer; font-family: var(--font-body); font-size: 0.875rem; font-weight: 600; border: 1px solid transparent; }
    .wbtn:disabled { opacity: 0.5; cursor: not-allowed; }
    .wbtn-secondary { background: #fff; color: var(--text); border-color: var(--line); }
    .wbtn-secondary:hover:not(:disabled) { border-color: var(--accent-blue-deep); }
    .wbtn-success { background: var(--success); color: #fff; border-color: var(--success); }
    .wbtn-success:hover:not(:disabled) { background: #276539; }

    .rail-note { font-size: 0.75rem; line-height: 1.55; color: var(--accent-blue-text); background: rgba(207,227,245,0.55); border: 1px solid rgba(125,168,207,0.33); border-radius: 12px; padding: 14px 16px; }

    .msg { padding: 12px 0 0; color: var(--accent-blue-text); font-size: 0.8125rem; }
    .msg.error { color: var(--danger); }

    @media screen and (max-width: 900px) { .set-grid { grid-template-columns: 1fr; } .rail-note { order: -1; } }
    @media screen and (max-width: 720px) { app-prov-web-sidebar { display: none; } .pw-header { padding: 16px; } .pw-pad { padding: 16px; } }
  `],
})
export class BeautyBusinessEmailContactComponent implements OnChanges {
  @Input() data: Record<string, unknown> = {};
  @Input() links: Record<string, BffLink> = {};
  @Output() followLink = new EventEmitter<BffLink>();

  contact: ContactPayload = { email: '', public_email: '', contact_phone: '', show_phone_publicly: false };
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

  get business(): { email?: string; business_name?: string } | null {
    return (this.data['business'] as { email?: string; business_name?: string })
      || (this.contact.email ? { email: this.contact.email } : null);
  }
  get navBadges(): Partial<Record<ProvWebNav, number>> {
    const b = (this.data['badges'] as { messages_unread?: number; bookings_unread?: number }) || {};
    return { bookings: b.bookings_unread || 0, messages: b.messages_unread || 0 };
  }

  emit(link: BffLink | null | undefined): void { if (link) this.followLink.emit(link); }

  save(): void {
    if (this.busy) return;
    this.busy = true; this.message = ''; this.isError = false;

    const submit: BffLink = {
      rel: 'submit',
      href: (this.data['submit_href'] as string) || '/api/beauty/protected/business/account/contact/',
      method: ((this.data['submit_method'] as string) || 'PATCH') as BffLink['method'],
      screen: null, route: null, prompt: null,
    };

    this.auth.follow(submit, this.contact as unknown as Record<string, unknown>).subscribe({
      next: () => {
        this.busy = false; this.message = 'Saved.';
        const self = this.links['self'];
        if (self) this.followLink.emit(self);
      },
      error: (err) => {
        this.busy = false; this.isError = true;
        this.message = err?.error?.detail || 'Could not save. Please try again.';
      },
    });
  }
}
