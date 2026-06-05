import { Page, expect } from '@playwright/test';

export const BIZ_EMAIL = process.env.E2E_BIZ_EMAIL ?? 'audit-biz@example.com';
export const BIZ_PASSWORD = process.env.E2E_BIZ_PASSWORD ?? 'AuditBiz!1234';

export async function bizLogin(page: Page) {
  await page.goto('/business-login');
  await page.getByTestId('form-field-email').fill(BIZ_EMAIL);
  await page.getByTestId('form-field-password').fill(BIZ_PASSWORD);
  await page.getByTestId('form-submit').getByText('Sign in').click();
  await page.waitForURL(/\/business\/home/, { timeout: 15_000 });
}

export async function adminGoto(page: Page, path: string) {
  await page.goto(path);
  // Resolver gates may redirect to /login when session lapses. Re-login on hit.
  if (page.url().includes('/login') || page.url().includes('/business-login')) {
    await bizLogin(page);
    await page.goto(path);
  }
  await expect(page).toHaveURL(new RegExp(path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
}
