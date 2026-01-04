import { test, expect } from '@playwright/test';
import { TEST_USERS } from '../fixtures/test-data';

test.describe('Supplier Dashboard', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/login');
        await page.getByLabel('Email').fill(TEST_USERS.supplier.email);
        await page.getByLabel('Password').fill(TEST_USERS.supplier.password);
        await page.getByRole('button', { name: 'Sign In' }).click();
        await expect(page).toHaveURL('/dashboard'); // Supplier redirect
    });

    test('should display relevant RFQs', async ({ page }) => {
        await page.goto('/dashboard/supplier/rfqs');
        await expect(page.getByRole('heading', { name: 'Open Requests' })).toBeVisible();
        // Check for at least one mock RFQ
        await expect(page.locator('.rfq-card').first()).toBeVisible();
    });

    test('should allow responding to an RFQ', async ({ page }) => {
        await page.goto('/dashboard/supplier/rfqs');
        await page.locator('.rfq-card').first().click();

        await page.getByRole('button', { name: 'Submit Quote' }).click();

        await page.getByLabel('Price').fill('15000');
        await page.getByLabel('Lead Time').fill('3 weeks');
        await page.getByRole('button', { name: 'Send' }).click();

        await expect(page.getByText('Quote Sent')).toBeVisible();
    });
});
