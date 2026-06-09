/**
 * BeautyLoginComponent
 * --------------------
 * Customer sign-in. Schema-driven fields/validation/submit still come from
 * the BFF via BeautyDynamicFormComponent — but the presentation is wrapped in
 * the desktop split-pane CustAuthLayout (brand hero left, form right) and the
 * form's own mobile page-chrome is neutralised via scoped overrides. Responsive:
 * collapses to single-column on mobile. Matches design `CustAuthSignIn`.
 */

import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

import { BeautyDynamicFormComponent } from './beauty-dynamic-form.component';
import { CustAuthLayoutComponent } from './cust-web/cust-auth-layout.component';
import { BffFormSchema, BffLink } from './beauty-bff.types';

@Component({
  selector: 'app-beauty-login',
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
  styles: [`
    :host { display: block; min-height: 100dvh; }
    /* The dynamic form's mobile page-frame is neutralised globally via
       \`.cust-auth .login-page …\` in styles.scss (global rules pierce child
       component encapsulation; component-scoped ::ng-deep did not). */
  `],
})
export class BeautyLoginComponent {
  @Input() form: BffFormSchema | null = null;
  @Input() links: Record<string, BffLink> = {};
  @Output() followLink = new EventEmitter<BffLink>();
}
