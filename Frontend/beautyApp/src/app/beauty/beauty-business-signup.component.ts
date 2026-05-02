/**
 * BeautyBusinessSignupComponent
 * -----------------------------
 * Thin wrapper around the dynamic form for the business signup page.
 * Server emits the field list (business_name, email, password) and the
 * success link points at the first wizard step.
 */

import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

import { BeautyDynamicFormComponent } from './beauty-dynamic-form.component';
import { BffFormSchema, BffLink } from './beauty-bff.types';

@Component({
  selector: 'app-beauty-business-signup',
  standalone: true,
  imports: [CommonModule, BeautyDynamicFormComponent],
  template: `
    <app-beauty-dynamic-form
      [form]="form"
      [links]="links"
      (followLink)="followLink.emit($event)"
      (submitSuccess)="followLink.emit($event)"
    />
  `,
  styleUrls: ['./beauty-login.component.scss'],
})
export class BeautyBusinessSignupComponent {
  @Input() form: BffFormSchema | null = null;
  @Input() links: Record<string, BffLink> = {};
  @Output() followLink = new EventEmitter<BffLink>();
}
