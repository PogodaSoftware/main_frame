/**
 * BeautySignupComponent (Presentational)
 * ----------------------------------------
 * Renders the sign-up form using data from [data] @Input().
 * On successful account creation emits (signupSuccess) — the shell
 * re-resolves via BFF.  No routing or localStorage here.
 */

import { Component, Input, Output, EventEmitter } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-beauty-signup',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="signup-page">
      <header class="signup-header">
        <div class="header-brand">
          <span class="brand-icon">✨</span>
          <button class="brand-name-btn" (click)="navigate.emit('beauty_home')">Beauty</button>
        </div>
      </header>

      <main class="signup-main">
        <h1 class="signup-title">What's your email?</h1>

        <form class="signup-form" (ngSubmit)="onSubmit()" #signupForm="ngForm">
          <div class="field-group">
            <input
              type="email"
              id="email"
              name="email"
              [(ngModel)]="email"
              required
              email
              #emailInput="ngModel"
              placeholder="Enter your email"
              class="form-input"
              [class.error]="emailInput.invalid && emailInput.touched"
              autocomplete="email"
              autocapitalize="none"
              inputmode="email"
            />
            @if (emailInput.touched && emailInput.errors?.['required']) {
              <span class="field-error">Email is required.</span>
            }
            @if (emailInput.touched && emailInput.errors?.['email']) {
              <span class="field-error">Please enter a valid email address.</span>
            }
          </div>

          <div class="field-group">
            <div class="password-wrapper">
              <input
                [type]="showPassword ? 'text' : 'password'"
                id="password"
                name="password"
                [(ngModel)]="password"
                required
                minlength="8"
                #passwordInput="ngModel"
                placeholder="Create a password"
                class="form-input"
                [class.error]="passwordInput.invalid && passwordInput.touched"
                autocomplete="new-password"
              />
              <button
                type="button"
                class="password-toggle"
                (click)="showPassword = !showPassword"
                aria-label="Toggle password visibility"
              >{{ showPassword ? 'Hide' : 'Show' }}</button>
            </div>
            @if (passwordInput.touched && passwordInput.errors?.['required']) {
              <span class="field-error">Password is required.</span>
            }
            @if (passwordInput.touched && passwordInput.errors?.['minlength']) {
              <span class="field-error">Password must be at least 8 characters.</span>
            }
          </div>

          @if (serverError) {
            <div class="server-error">{{ serverError }}</div>
          }

          <button
            type="submit"
            class="btn-continue"
            [disabled]="signupForm.invalid || isLoading"
          >
            @if (isLoading) { <span class="spinner"></span> } @else { Continue }
          </button>
        </form>

        <div class="signup-footer">
          <span>Already have an account?</span>
          <button class="link-btn" (click)="navigate.emit('beauty_login')">Sign in</button>
        </div>
      </main>
    </div>
  `,
  styleUrls: ['./beauty-signup.component.scss'],
})
export class BeautySignupComponent {
  @Input() data: Record<string, unknown> = {};
  @Output() signupSuccess = new EventEmitter<void>();
  @Output() navigate = new EventEmitter<string>();

  email = '';
  password = '';
  showPassword = false;
  isLoading = false;
  serverError = '';

  constructor(private http: HttpClient) {}

  onSubmit(): void {
    if (this.isLoading) return;
    this.serverError = '';
    this.isLoading = true;

    this.http
      .post<{ message: string; email: string }>(
        `${environment.apiBaseUrl}/api/beauty/signup/`,
        { email: this.email, password: this.password },
      )
      .subscribe({
        next: () => {
          this.isLoading = false;
          this.signupSuccess.emit();
        },
        error: (err) => {
          this.isLoading = false;
          if (err.status === 400 && err.error) {
            const errors = err.error;
            if (errors.email) {
              this.serverError = Array.isArray(errors.email) ? errors.email[0] : errors.email;
            } else if (errors.password) {
              this.serverError = Array.isArray(errors.password) ? errors.password[0] : errors.password;
            } else {
              this.serverError = 'Please check your details and try again.';
            }
          } else {
            this.serverError = 'Something went wrong. Please try again.';
          }
        },
      });
  }
}
