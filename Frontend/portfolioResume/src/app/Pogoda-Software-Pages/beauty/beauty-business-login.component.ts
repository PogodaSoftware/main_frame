/**
 * BeautyBusinessLoginComponent (thin wrapper)
 * --------------------------------------------
 * Presents the business provider login screen using the BFF-supplied
 * form schema. All fields, validators, submit URL, and footer links
 * come from the server.
 */

import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

import { BeautyDynamicFormComponent } from './beauty-dynamic-form.component';
import { BffFormSchema, BffLink } from './beauty-bff.types';

@Component({
  selector: 'app-beauty-business-login',
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
export class BeautyBusinessLoginComponent {
  @Input() form: BffFormSchema | null = null;
  @Input() links: Record<string, BffLink> = {};
  @Output() followLink = new EventEmitter<BffLink>();
}
