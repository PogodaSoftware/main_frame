/**
 * BeautyBusinessSignupComponent
 * -----------------------------
 * Thin wrapper around the dynamic form for the business signup page.
 * Server emits the field list (business_name, email, password) and the
 * success link points at the first wizard step. Wrapped in the desktop
 * split-pane CustAuthLayout (same as customer signup) for desktop parity;
 * collapses to single-column on mobile. Projected form's page-frame is
 * neutralised globally via `.cust-auth .signup-page …` in styles.scss.
 */

import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

import { BeautyDynamicFormComponent } from './beauty-dynamic-form.component';
import { CustAuthLayoutComponent } from './cust-web/cust-auth-layout.component';
import { BffFormSchema, BffLink } from './beauty-bff.types';

@Component({
  selector: 'app-beauty-business-signup',
  standalone: true,
  imports: [CommonModule, BeautyDynamicFormComponent, CustAuthLayoutComponent],
  template: `
    <app-cust-auth-layout variant="business" badge="Business Portal">
      <app-beauty-dynamic-form
        [form]="form"
        [links]="links"
        (followLink)="followLink.emit($event)"
        (submitSuccess)="followLink.emit($event)"
      />
    </app-cust-auth-layout>
  `,
  styles: [`:host { display: block; min-height: 100dvh; }`],
})
export class BeautyBusinessSignupComponent {
  @Input() form: BffFormSchema | null = null;
  @Input() links: Record<string, BffLink> = {};
  @Output() followLink = new EventEmitter<BffLink>();
}
