import { test, expect } from '@playwright/test';
import { signInAs, mockTrpc, USERS } from './support/harness';

/**
 * CRITICAL JOURNEY: Supplier onboarding (path to a verified supplier).
 *
 * Supplier onboarding is the demo path that turns a raw signup into a verified,
 * matchable supplier (the entity that can win RFQs). This spec asserts a signed
 * in supplier who hasn't completed onboarding lands on the onboarding form and
 * sees the first step, including the verified-supplier framing.
 *
 * Endpoints (client/src/pages/SupplierOnboarding.tsx):
 *   - supplierOnboarding.getMyProfile → profile | null (null = not onboarded)
 *   - materials.categories            → string[]
 */

test.describe('Supplier onboarding', () => {
    test('new supplier is guided into the onboarding form', async ({ page }) => {
        await signInAs(page, USERS.supplier);
        await mockTrpc(page, {
            // null profile = supplier has not completed onboarding yet.
            'supplierOnboarding.getMyProfile': null,
            'materials.categories': ['Concrete', 'Steel', 'Insulation'],
        });

        await page.goto('/supplier/onboarding');

        await expect(page.getByRole('heading', { name: 'Supplier Onboarding' })).toBeVisible();
        await expect(
            page.getByText('Join GreenChainz as a verified sustainable materials supplier.'),
        ).toBeVisible();
        // First step of the multi-step verification form is present.
        await expect(page.getByText('Company Information')).toBeVisible();
        await expect(page.getByText(/Step 1 of/)).toBeVisible();
    });

    test('an unauthenticated visitor cannot reach supplier onboarding', async ({ page }) => {
        // Onboarding is a protected supplier route — guests must sign in first.
        await page.goto('/supplier/onboarding');
        await expect(page).toHaveURL(/\/login/);
    });
});
