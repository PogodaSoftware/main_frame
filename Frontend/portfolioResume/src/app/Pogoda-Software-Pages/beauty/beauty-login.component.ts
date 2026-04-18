/**
 * BeautyLoginComponent (thin wrapper)
 * -----------------------------------
 * Presents the customer login screen by delegating to the schema-driven
 * BeautyDynamicFormComponent. All fields, validators, submit URL, and
 * footer links come from the BFF — the BFF can change any of them
 * without an Angular release. On successful submit the shell follows
 * the schema's `success` link.
 */

import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

import { BeautyDynamicFormComponent } from './beauty-dynamic-form.component';
import { BffFormSchema, BffLink } from './beauty-bff.types';

@Component({
  selector: 'app-beauty-login',
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
export class BeautyLoginComponent {
  @Input() form: BffFormSchema | null = null;
  @Input() links: Record<string, BffLink> = {};
  @Output() followLink = new EventEmitter<BffLink>();
}
