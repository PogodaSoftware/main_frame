import { Component, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-beauty-signup',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <div class="signup-page">
      <header class="signup-header">
        <div class="header-brand">
          <span class="brand-icon">✨</span>
          <a class="brand-name" routerLink="/pogoda/beauty">Beauty</a>
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
                (click)="togglePassword()"
                aria-label="Toggle password visibility"
              >
                {{ showPassword ? 'Hide' : 'Show' }}
              </button>
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
            @if (isLoading) {
              <span class="spinner"></span>
            } @else {
              Continue
            }
          </button>
        </form>
      </main>
    </div>
  `,
  styleUrls: ['./beauty-signup.component.scss'],
})
export class BeautySignupComponent {
  email = '';
  password = '';
  showPassword = false;
  isLoading = false;
  serverError = '';

  constructor(
    private router: Router,
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: object
  ) {}

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  onSubmit(): void {
    if (this.isLoading) return;
    this.serverError = '';
    this.isLoading = true;

    const apiUrl = `${environment.apiBaseUrl}/api/beauty/signup/`;

    this.http.post<{ message: string; email: string }>(apiUrl, {
      email: this.email,
      password: this.password,
    }).subscribe({
      next: (response) => {
        this.isLoading = false;
        if (isPlatformBrowser(this.platformId)) {
          localStorage.setItem('beautyUserEmail', response.email);
        }
        this.router.navigate(['/pogoda/beauty']);
      },
      error: (err) => {
        this.isLoading = false;
        if (err.status === 400 && err.error) {
          const errors = err.error;
          if (errors.email) {
            this.serverError = Array.isArray(errors.email)
              ? errors.email[0]
              : errors.email;
          } else if (errors.password) {
            this.serverError = Array.isArray(errors.password)
              ? errors.password[0]
              : errors.password;
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
