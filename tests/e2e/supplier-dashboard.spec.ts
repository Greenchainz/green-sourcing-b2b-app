import { test, expect } from '@playwright/test';
import { signInAs, mockTrpc, USERS } from './support/harness';

/**
 * CRITICAL JOURNEY (MONEY FLOW) — SUPPLIER SIDE.
 *
 * This is the "money moment": an RFQ a buyer submitted must appear in the
 * matched supplier's dashboard so they can quote. This spec asserts a matched
 * RFQ surfaces in the supplier's RFQ Dashboard (supplierRfq.getMatchedRfqs)
 * and that a direct request appears in the Direct Requests inbox
 * (rfqRequests.listIncoming).
 *
 * `/supplier/rfqs` is behind the supplier onboarding guard, so we mock a
 * completed supplier profile to stay on the dashboard.
 */

// The same project the buyer raised in rfq-flow.spec.ts, now seen by the
// matched supplier.
const MATCHED_RFQ = {
    id: 9001,
    projectName: 'Riverside Office Retrofit',
    projectLocation: 'Austin, TX',
    materials: ['Low-carbon concrete', 'Recycled steel'],
    matchScore: 92,
    status: 'submitted',
    hasBid: false,
    createdAt: new Date('2026-01-15T10:00:00Z').toISOString(),
    dueDate: new Date('2026-02-15T10:00:00Z').toISOString(),
};

const DIRECT_REQUEST = {
    id: 7001,
    status: 'pending',
    materialType: 'Recycled denim insulation',
    createdAt: new Date('2026-01-16T10:00:00Z').toISOString(),
    architectName: 'Test Architect',
    quantity: '500 boards',
    unit: 'boards',
};

test.describe('RFQ money flow — supplier', () => {
    test('matched RFQ from a buyer appears in the supplier dashboard', async ({ page }) => {
        await signInAs(page, USERS.supplier);
        await mockTrpc(page, {
            'supplierOnboarding.getMyProfile': { id: 1, companyName: 'EcoMix Industries', onboardingCompleted: true },
            'supplierRfq.getMatchedRfqs': [MATCHED_RFQ],
            'rfqRequests.listIncoming': [],
        });

        await page.goto('/supplier/rfqs');

        await expect(page.getByRole('heading', { name: 'RFQ Dashboard' })).toBeVisible();
        // The buyer's project reached the intended supplier — the core of the
        // marketplace's value.
        await expect(page.getByRole('heading', { name: 'Riverside Office Retrofit' })).toBeVisible();
        await expect(page.getByText('Austin, TX')).toBeVisible();
        await expect(page.getByText('Low-carbon concrete').first()).toBeVisible();
    });

    test('direct RFQ request appears in the supplier Direct Requests inbox', async ({ page }) => {
        await signInAs(page, USERS.supplier);
        await mockTrpc(page, {
            'supplierOnboarding.getMyProfile': { id: 1, companyName: 'EcoMix Industries', onboardingCompleted: true },
            'supplierRfq.getMatchedRfqs': [],
            'rfqRequests.listIncoming': [DIRECT_REQUEST],
        });

        await page.goto('/supplier/rfqs');
        await expect(page.getByRole('heading', { name: 'RFQ Dashboard' })).toBeVisible();

        // Switch to the Direct Requests tab and confirm the incoming request is
        // visible to the supplier.
        await page.getByRole('tab', { name: /Direct Requests/i }).click();
        await expect(page.getByRole('heading', { name: 'Recycled denim insulation' })).toBeVisible();
        await expect(page.getByText('500 boards')).toBeVisible();
    });
});
