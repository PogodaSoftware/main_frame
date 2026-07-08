import { test, expect } from '@playwright/test';
import { BIZ_EMAIL, BIZ_PASSWORD } from './helpers';

test.describe('Auth flow', () => {
  test('business login routes to /business/home', async ({ page }) => {
    await page.goto('/business-login');
    await expect(page.getByRole('heading', { name: 'Business Sign In' })).toBeVisible();
    await page.getByTestId('form-field-email').fill(BIZ_EMAIL);
    await page.getByTestId('form-field-password').fill(BIZ_PASSWORD);
    await page.getByTestId('form-submit').getByText('Sign in').click();
    await page.waitForURL(/\/business\/home/, { timeout: 15_000 });
    await expect(page.getByText(/Welcome, /)).toBeVisible();
  });

  test('admin signin page renders slate hero', async ({ page }) => {
    await page.goto('/admin/portal/signin');
    await expect(page.getByText('Sign in to admin')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Admin sign-in')).toBeVisible();
    await expect(page.getByText('Continue →')).toBeVisible();
  });

  test('admin 2FA page renders 6 digit cells', async ({ page }) => {
    await page.goto('/admin/portal/2fa');
    await expect(page.getByText("Verify it's you")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Step 2 of 2')).toBeVisible();
  });

  test('admin magic-link page renders', async ({ page }) => {
    await page.goto('/admin/portal/magic');
    await expect(page.getByText('Email me a sign-in link')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Send magic link →')).toBeVisible();
  });

  test('admin ip-warning page renders', async ({ page }) => {
    await page.goto('/admin/portal/ip-warning');
    await expect(page.getByText("This network isn't allowlisted")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Connect to VPN')).toBeVisible();
  });
});
