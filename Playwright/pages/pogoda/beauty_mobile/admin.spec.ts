import { test, expect } from '@playwright/test';
import { adminGoto, bizLogin } from './helpers';

test.describe('Admin portal pages', () => {
  test.beforeEach(async ({ page }) => {
    await bizLogin(page);
  });

  test('dashboard renders KPI grid w/ real DB data', async ({ page }) => {
    await adminGoto(page, '/admin/portal/dashboard');
    await expect(page.getByText(/Good morning,/)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('CUSTOMERS')).toBeVisible();
    await expect(page.getByText('PROVIDERS')).toBeVisible();
    await expect(page.getByText('BOOKINGS (MO)')).toBeVisible();
    await expect(page.getByText('GMV (MO)')).toBeVisible();
    await expect(page.getByText('QUICK ADMIN')).toBeVisible();
  });

  test('dashboard v2 renders slate GMV hero', async ({ page }) => {
    await adminGoto(page, '/admin/portal/dashboard/v2');
    await expect(page.getByText('PLATFORM GMV · THIS MONTH')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('NEEDS ATTENTION')).toBeVisible();
  });

  test('CRM list renders segmented tabs + rows', async ({ page }) => {
    await adminGoto(page, '/admin/portal/crm');
    await expect(page.getByText('Customers').first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('Providers').first()).toBeVisible();
    await expect(page.getByPlaceholder(/Search name, email/)).toBeVisible();
    await expect(page.getByText(/results/)).toBeVisible();
  });

  test('CRM tags manager modal renders tag list', async ({ page }) => {
    await adminGoto(page, '/admin/portal/crm/tags');
    await expect(page.getByText('Manage tags')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/tags$/).first()).toBeVisible();
    await expect(page.getByPlaceholder('Tag name…')).toBeVisible();
    await expect(page.getByText('Create')).toBeVisible();
  });

  test('Bookings ledger renders header + rows', async ({ page }) => {
    await adminGoto(page, '/admin/portal/bookings');
    await expect(page.getByText('Bookings ledger')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/GMV/)).toBeVisible();
    await expect(page.getByText('All').first()).toBeVisible();
  });

  test('Tickets list renders rubric + buckets', async ({ page }) => {
    await adminGoto(page, '/admin/portal/tickets');
    await expect(page.getByText('Support tickets')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('RUBRIC · CATEGORY')).toBeVisible();
    await expect(page.getByText('RUBRIC · STATUS & SLA')).toBeVisible();
    await expect(page.getByText('+ New')).toBeVisible();
  });

  test('Team page renders admin roster + permissions matrix', async ({ page }) => {
    await adminGoto(page, '/admin/portal/team');
    await expect(page.getByText('Admin team')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('ROLE PERMISSIONS · MATRIX')).toBeVisible();
    await expect(page.getByText('View CRM')).toBeVisible();
  });

  test('Audit log page renders header', async ({ page }) => {
    await adminGoto(page, '/admin/portal/audit');
    await expect(page.getByText('Audit log')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/immutable/)).toBeVisible();
  });

  test('Feature flags page renders flag cards + toggles', async ({ page }) => {
    await adminGoto(page, '/admin/flags');
    await expect(page.getByText('Feature flags').first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('Runtime feature flags')).toBeVisible();
    await expect(page.getByText(/Business sign-in entry point|Customer sign-up/).first()).toBeVisible();
  });

  test('Customer detail loads real BeautyUser', async ({ page }) => {
    // Seeded audit-customer user (id=753).
    const id = process.env.E2E_CUSTOMER_ID ?? '753';
    await adminGoto(page, `/admin/portal/crm/customer/${id}`);
    await expect(page.getByText('Audit-Customer').first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('Lifetime stats')).toBeVisible();
    await expect(page.getByText('Risk signals')).toBeVisible();
  });

  test('Provider detail loads real BusinessProvider', async ({ page }) => {
    const id = process.env.E2E_PROVIDER_ID ?? '1';
    await adminGoto(page, `/admin/portal/crm/provider/${id}`);
    await expect(page.getByText('Performance')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('Service catalog')).toBeVisible();
    await expect(page.getByText('Weekly hours')).toBeVisible();
  });

  test('Suspend confirm renders for customer', async ({ page }) => {
    const id = process.env.E2E_CUSTOMER_ID ?? '753';
    await adminGoto(page, `/admin/portal/crm/suspend/customer/${id}`);
    await expect(page.getByText(/Suspend this customer|Reinstate this customer/).first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('Cancel', { exact: true })).toBeVisible();
  });
});
