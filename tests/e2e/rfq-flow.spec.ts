import { test, expect } from '@playwright/test';
import { TEST_USERS, TEST_RFQ } from '../fixtures/test-data';

test.describe('RFQ Creation Flow', () => {
    test.beforeEach(async ({ page }) => {
        // Mock login state or actually login
        // For this test, we assume a simple login helper or flow
        await page.goto('/login');
        await page.getByLabel('Email').fill(TEST_USERS.buyer.email);
        await page.getByLabel('Password').fill(TEST_USERS.buyer.password);
        await page.getByRole('button', { name: 'Sign In' }).click();
        await expect(page).toHaveURL('/dashboard');
    });

    test('should create a new RFQ successfully', async ({ page }) => {
        await page.goto('/dashboard/buyer/rfqs/new');

        // Fill form
        await page.getByLabel('Project Title').fill(TEST_RFQ.title);
        await page.getByLabel('Material Category').selectOption(TEST_RFQ.material);
        await page.getByLabel('Quantity').fill(TEST_RFQ.quantity);
        await page.getByLabel('Location').fill(TEST_RFQ.location);

        // Submit mock
        await page.getByRole('button', { name: 'Next' }).click();

        // Verify LinkedIn Gate (if visible)
        if (await page.getByText('Connect LinkedIn').isVisible()) {
            await page.getByRole('button', { name: 'Skip for now' }).click();
        }

        // Submit final
        await page.getByRole('button', { name: 'Submit Request' }).click();

        // Check redirect
        await expect(page).toHaveURL(/\/dashboard\/buyer\/rfqs\/.*/);
        await expect(page.getByText('RFQ Created Successfully')).toBeVisible();
    });

    test('should enforce deposit for unverified buyers', async ({ page }) => {
        // Mock user as unverified
        // ... setup mock ...

        await page.goto('/dashboard/buyer/rfqs/new');
        // ... fill form ...
        await page.getByLabel('Project Title').fill(TEST_RFQ.title + ' Deposit Test');
        await page.getByRole('button', { name: 'Submit Request' }).click();

        // Expect Deposit Modal/Redirect
        await expect(page.getByText('Security Deposit Required')).toBeVisible();
        await expect(page.getByText('$25.00')).toBeVisible();
    });
});
