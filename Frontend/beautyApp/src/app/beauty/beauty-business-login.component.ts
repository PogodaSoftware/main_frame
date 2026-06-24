/**
 * BeautyBusinessLoginComponent (thin wrapper)
 * --------------------------------------------
 * Presents the business provider login screen using the BFF-supplied
 * form schema. All fields, validators, submit URL, and footer links
 * come from the server. Wrapped in the desktop split-pane CustAuthLayout
 * (same as customer login) so desktop shows the brand hero + form instead
 * of the form's mobile narrow-column chrome; collapses to single-column on
 * mobile. The projected form's page-frame is neutralised globally via
 * `.cust-auth .login-page …` in styles.scss.
 */

import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

import { BeautyDynamicFormComponent } from './beauty-dynamic-form.component';
import { CustAuthLayoutComponent } from './cust-web/cust-auth-layout.component';
import { BffFormSchema, BffLink } from './beauty-bff.types';

@Component({
  selector: 'app-beauty-business-login',
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
export class BeautyBusinessLoginComponent {
  @Input() form: BffFormSchema | null = null;
  @Input() links: Record<string, BffLink> = {};
  @Output() followLink = new EventEmitter<BffLink>();
}
