import { test, expect } from '@playwright/test';
import { signInAs, mockTrpc, USERS } from './support/harness';

/**
 * CRITICAL JOURNEY (MONEY FLOW) — BUYER SIDE.
 *
 * The single revenue-generating interaction on GreenChainz is: a buyer issues
 * an RFQ and it reaches the intended supplier. This spec covers the buyer half:
 *   - the RFQ list persists / shows a buyer's requests (rfqRequests.listMine)
 *   - the buyer can drive the manual wizard end-to-end: fill project + material
 *     details, select a supplier, submit, and land on the new RFQ detail page
 *     (rfqRequests.createMulti → redirect to /rfqs/:id)
 *
 * The AI-assisted intake path is flaky in headless CI, so we exercise the
 * deterministic "fill out manually" branch of the wizard.  The supplier-side
 * visibility assertion lives in supplier-dashboard.spec.ts.
 */

// One shared RFQ, told from the buyer's side. The supplier spec asserts the
// same project surfaces in the supplier inbox.
const BUYER_RFQ = {
    id: 9001,
    materialType: 'Low-carbon concrete',
    specs: JSON.stringify({ projectInfo: { projectName: 'Riverside Office Retrofit' } }),
    status: 'pending',
    supplierId: 42,
    supplierName: 'EcoMix Industries',
    createdAt: new Date('2026-01-15T10:00:00Z').toISOString(),
};

test.describe('RFQ money flow — buyer', () => {
    test('buyer sees their submitted RFQ in the RFQ list', async ({ page }) => {
        await signInAs(page, USERS.buyer);
        await mockTrpc(page, {
            'architect.getMyProfile': { id: 1, firmName: 'Test Firm', onboardingCompleted: true },
            'rfqRequests.listMine': [BUYER_RFQ],
        });

        await page.goto('/rfqs');

        await expect(page.getByRole('heading', { name: 'My RFQs' })).toBeVisible();
        // The RFQ is persisted + visible to its author — the project name is
        // resolved from the RFQ specs payload, and the row links to its detail.
        await expect(page.getByText('Riverside Office Retrofit')).toBeVisible();
        await expect(page.locator('a[href="/rfqs/9001"]')).toBeVisible();
    });

    test('buyer can submit an RFQ through the manual wizard', async ({ page }) => {
        // A supplier the matchSuppliers query will return; the component auto-selects
        // the top result so no manual checkbox interaction is needed.
        const WIZARD_SUPPLIER = {
            id: 42,
            companyName: 'EcoMix Industries',
            city: 'Austin',
            state: 'TX',
            isHighSustainability: true,
            isFallback: false,
            isLocalSupplier: true,
            certificationMatches: [],
            sustainabilityScore: '85',
            verifiedSupplierStatus: 'verified',
            verifiedSupplierReasons: [],
        };

        let createMultiCalled = false;
        await signInAs(page, USERS.buyer);
        await mockTrpc(page, {
            'architect.getMyProfile': { id: 1, firmName: 'Test Firm', onboardingCompleted: true },
            'rfqRequests.listMine': [BUYER_RFQ],
            'location.suppliersByState': [],
            'rfqRequests.matchSuppliers': [WIZARD_SUPPLIER],
            'rfqRequests.createMulti': (_input) => {
                createMultiCalled = true;
                return { primaryId: 9002, rfqIds: [9002] };
            },
        });

        await page.goto('/rfqs');
        await page.getByRole('link', { name: /New RFQ/i }).click();
        await expect(page).toHaveURL(/\/rfq\/new/);
        await expect(page.getByRole('heading', { name: /Submit RFQ/i })).toBeVisible();

        // Step 0 → bypass AI intake and open the manual form
        await page.getByRole('button', { name: /Fill out the form manually instead/i }).click();

        // Step 1 — project info
        await page.getByLabel('Project Name').fill('Riverside Office Retrofit');
        await page.getByText('Select project type').click();
        await page.getByRole('option', { name: 'Commercial Office' }).click();

        // Step 1 — material details
        await page.getByText('Select category').click();
        await page.getByRole('option', { name: 'Concrete & Masonry' }).click();
        await page.getByLabel('Material Description').fill('Low-carbon ready-mix, 4000 PSI, 40% fly-ash replacement');
        await page.getByLabel('Quantity').fill('2500');

        // Advance to step 2 — supplier selection
        await page.getByRole('button', { name: 'Next' }).click();

        // The matched supplier is auto-selected by the component effect. Its name
        // renders in BOTH the matched-list row and the selected-suppliers chip, so
        // scope the assertion to the chip to stay unambiguous under strict mode.
        await expect(
            page.getByTestId('rfq-selected-supplier').filter({ hasText: 'EcoMix Industries' }),
        ).toBeVisible();

        // Advance to step 3 — review
        await page.getByRole('button', { name: 'Next' }).click();

        // Submit — calls rfqRequests.createMulti
        await page.getByRole('button', { name: 'Send RFQ' }).click();

        // createMulti returned primaryId 9002 → wizard navigates to the detail page
        await expect(page).toHaveURL(/\/rfqs\/9002/, { timeout: 8_000 });
        expect(createMultiCalled).toBe(true);
    });
});
