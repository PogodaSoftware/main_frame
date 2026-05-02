/**
 * BeautyBusinessSignupComponent (Container)
 * -----------------------------------------
 * Thin wrapper around BeautyDynamicFormComponent. Receives the BFF form
 * schema for the business sign-up page, forwards events to the shell.
 *
 * The BFF owns the visible fields, validation, error messages, and where
 * the submit POSTs to — this component just renders whatever schema arrives.
 */

import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import { CommonModule } from '@angular/common';

import { BeautyDynamicFormComponent } from './beauty-dynamic-form.component';
import { BffFormSchema, BffLink } from './beauty-bff.types';

@Component({
  selector: 'app-beauty-business-signup',
  standalone: true,
  imports: [CommonModule, BeautyDynamicFormComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-beauty-dynamic-form
      [form]="form"
      [links]="links"
      (submitSuccess)="onSubmitSuccess($event)"
      (followLink)="followLink.emit($event)"
    />
  `,
})
export class BeautyBusinessSignupComponent {
  @Input() form: BffFormSchema | null = null;
  @Input() links: Record<string, BffLink> = {};
  @Output() followLink = new EventEmitter<BffLink>();

  onSubmitSuccess(success: BffLink): void {
    // After signup, the BFF tells us to land on the business login screen.
    this.followLink.emit(success);
  }
}
