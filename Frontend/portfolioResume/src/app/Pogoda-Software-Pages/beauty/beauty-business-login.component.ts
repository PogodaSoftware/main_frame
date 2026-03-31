import { Component, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { BeautyAuthService } from './beauty-auth.service';

@Component({
  selector: 'app-beauty-business-login',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <div class="login-page business-login-page">
      <header class="login-header">
        <div class="header-brand">
          <span class="brand-icon">🏢</span>
          <a class="brand-name" routerLink="/pogoda/beauty">Beauty</a>
        </div>
        <span class="business-badge">Business Portal</span>
      </header>

      <main class="login-main">
        <h1 class="login-title">Business Sign In</h1>
        <p class="login-subtitle">Access your business provider account</p>

        <form class="login-form" (ngSubmit)="onSubmit()" #loginForm="ngForm">
          <div class="field-group">
            <label for="email" class="field-label">Business Email</label>
            <input
              type="email"
              id="email"
              name="email"
              [(ngModel)]="email"
              required
              email
              #emailInput="ngModel"
              placeholder="Enter your business email"
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
            <label for="password" class="field-label">Password</label>
            <div class="password-wrapper">
              <input
                [type]="showPassword ? 'text' : 'password'"
                id="password"
                name="password"
                [(ngModel)]="password"
                required
                #passwordInput="ngModel"
                placeholder="Enter your password"
                class="form-input"
                [class.error]="passwordInput.invalid && passwordInput.touched"
                autocomplete="current-password"
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
          </div>

          @if (serverError) {
            <div class="server-error">{{ serverError }}</div>
          }

          <button
            type="submit"
            class="btn-login btn-business"
            [disabled]="loginForm.invalid || isLoading"
          >
            @if (isLoading) {
              <span class="spinner"></span>
            } @else {
              Sign in
            }
          </button>
        </form>

        <div class="login-footer">
          <span>Not a business provider?</span>
          <a routerLink="/pogoda/beauty/login" class="link-signup">Customer sign in</a>
        </div>
      </main>
    </div>
  `,
  styleUrls: ['./beauty-login.component.scss'],
})
export class BeautyBusinessLoginComponent {
  email = '';
  password = '';
  showPassword = false;
  isLoading = false;
  serverError = '';

  constructor(
    private router: Router,
    private authService: BeautyAuthService,
    @Inject(PLATFORM_ID) private platformId: object,
  ) {}

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  onSubmit(): void {
    if (this.isLoading) return;
    this.serverError = '';
    this.isLoading = true;

    this.authService.businessLogin(this.email, this.password).subscribe({
      next: (response) => {
        this.isLoading = false;
        if (isPlatformBrowser(this.platformId)) {
          localStorage.setItem('beautyBusinessEmail', response.email);
          localStorage.setItem('beautyBusinessName', response.business_name);
        }
        this.router.navigate(['/pogoda/beauty']);
      },
      error: (err) => {
        this.isLoading = false;
        if (err.status === 401) {
          this.serverError = 'Invalid email or password.';
        } else if (err.status === 400 && err.error) {
          const errors = err.error;
          const firstKey = Object.keys(errors)[0];
          const msg = errors[firstKey];
          this.serverError = Array.isArray(msg) ? msg[0] : msg;
        } else {
          this.serverError = 'Something went wrong. Please try again.';
        }
      },
    });
  }
}
