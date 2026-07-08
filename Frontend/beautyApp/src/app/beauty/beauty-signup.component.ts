/**
 * BeautySignupComponent
 * ---------------------
 * Customer sign-up. Schema-driven fields/validation/submit from the BFF via
 * BeautyDynamicFormComponent, wrapped in the desktop split-pane CustAuthLayout
 * (brand hero left, form right; collapses to single-column on mobile). The
 * form's mobile page-chrome is neutralised globally via `.cust-auth .signup-page`
 * in styles.scss. Matches design `CustAuthSignUp`.
 */

import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

import { BeautyDynamicFormComponent } from './beauty-dynamic-form.component';
import { CustAuthLayoutComponent } from './cust-web/cust-auth-layout.component';
import { BffFormSchema, BffLink } from './beauty-bff.types';

@Component({
  selector: 'app-beauty-signup',
  standalone: true,
  imports: [CommonModule, BeautyDynamicFormComponent, CustAuthLayoutComponent],
  template: `
    <app-cust-auth-layout>
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
export class BeautySignupComponent {
  @Input() form: BffFormSchema | null = null;
  @Input() links: Record<string, BffLink> = {};
  @Output() followLink = new EventEmitter<BffLink>();
}
