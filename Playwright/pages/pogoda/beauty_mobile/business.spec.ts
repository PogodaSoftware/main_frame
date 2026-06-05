import { test, expect } from '@playwright/test';
import { bizLogin } from './helpers';

test.describe('Business portal pages', () => {
  test.beforeEach(async ({ page }) => {
    await bizLogin(page);
  });

  test('business home renders dashboard', async ({ page }) => {
    await page.goto('/business/home');
    await expect(page.getByText(/Welcome, /)).toBeVisible({ timeout: 15_000 });
  });

  test('business services page renders', async ({ page }) => {
    await page.goto('/business/services');
    await expect(page.getByText(/Services|No services yet|Add service/).first()).toBeVisible({ timeout: 15_000 });
  });

  test('business availability page renders', async ({ page }) => {
    await page.goto('/business/availability');
    await expect(page).toHaveURL(/\/business\/availability/, { timeout: 15_000 });
  });

  test('business bookings page renders', async ({ page }) => {
    await page.goto('/business/bookings');
    await expect(page.getByText(/Bookings/).first()).toBeVisible({ timeout: 15_000 });
  });

  test('business settings page renders', async ({ page }) => {
    await page.goto('/business/settings');
    await expect(page.getByText('Settings')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('Change password')).toBeVisible();
  });

  test('business profile page renders', async ({ page }) => {
    await page.goto('/business/profile');
    await expect(page).toHaveURL(/\/business\/profile/, { timeout: 15_000 });
  });

  test('business reviews page renders', async ({ page }) => {
    await page.goto('/business/reviews');
    await expect(page.getByText(/Customer reviews|No reviews/).first()).toBeVisible({ timeout: 15_000 });
  });
});
