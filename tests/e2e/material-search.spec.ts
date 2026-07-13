import { test, expect } from '@playwright/test';
import { mockTrpc, makeMaterial } from './support/harness';

/**
 * CRITICAL JOURNEY: Material / EPD discovery.
 *
 * Browsing and searching the verified-materials catalog is the top-of-funnel
 * demo path — a buyer finds a low-carbon product, then opens its detail/EPD
 * page. The catalog is public (no auth gate), so these tests only mock the
 * tRPC data layer.
 *
 * Real endpoints (client/src/pages/MaterialsCatalog.tsx):
 *   - materials.list       → { items, total }  (server-side search + filters)
 *   - materials.categories → string[]
 *   - materials.getById    → material (detail page)
 */

const STEEL = makeMaterial({ id: 101, name: 'GreenCore Recycled Steel Beam', category: 'Structural' });
const CONCRETE = makeMaterial({
    id: 202,
    name: 'EcoMix Low-Carbon Concrete',
    productName: 'EcoMix Low-Carbon Concrete',
    category: 'Concrete',
    subcategory: 'Ready-mix',
    manufacturerName: 'EcoMix Industries',
});

/** materials.list is server-filtered; mirror that so the search test is honest. */
function listHandler(input: unknown) {
    const search = ((input as { search?: string } | undefined)?.search ?? '').toLowerCase();
    const all = [STEEL, CONCRETE];
    const items = search ? all.filter((m) => String(m.name).toLowerCase().includes(search)) : all;
    return { items, total: items.length };
}

test.describe('Material discovery', () => {
    test('catalog lists verified materials', async ({ page }) => {
        await mockTrpc(page, {
            'materials.list': listHandler,
            'materials.categories': ['Structural', 'Concrete', 'Insulation'],
        });

        await page.goto('/materials');

        await expect(page.getByRole('heading', { name: 'Materials', exact: true })).toBeVisible();
        await expect(page.getByRole('link', { name: /GreenCore Recycled Steel Beam/i })).toBeVisible();
        await expect(page.getByRole('link', { name: /EcoMix Low-Carbon Concrete/i })).toBeVisible();
    });

    test('search narrows the catalog to matching materials', async ({ page }) => {
        await mockTrpc(page, {
            'materials.list': listHandler,
            'materials.categories': ['Structural', 'Concrete', 'Insulation'],
        });

        await page.goto('/materials');
        await expect(page.getByRole('link', { name: /EcoMix Low-Carbon Concrete/i })).toBeVisible();

        // Typing re-queries materials.list with the search term (debounced).
        await page.getByPlaceholder('Search by name, category, manufacturer…').fill('EcoMix');

        await expect(page.getByRole('link', { name: /EcoMix Low-Carbon Concrete/i })).toBeVisible();
        await expect(page.getByRole('link', { name: /GreenCore Recycled Steel Beam/i })).toHaveCount(0);
    });

    /**
     * REGRESSION: MaterialDetail must not white-screen on partial/wrong-typed API data.
     *
     * The detail page is a core paid-pilot demo path. Three latent crashes let a
     * drifting API response throw during render, which the ErrorBoundary catches
     * as a blank white page:
     *   (a) Object.keys(m.ccpsByPersona) called when ccpsByPersona is null,
     *   (b) CcpsScoreCard reading ccps.dataQuality.confidence when dataQuality is missing,
     *   (c) (alternatives ?? []).slice(...) when findAlternatives returns a NON-array.
     *
     * These assert the page still fully renders the material's core info and the
     * ErrorBoundary fallback ("An unexpected error occurred.") never appears.
     */
    const ERROR_BOUNDARY = /An unexpected error occurred/i;

    test('detail page survives null ccpsByPersona + non-array alternatives', async ({ page }) => {
        // ccpsByPersona: null  → exercises guard (a) [Object.keys] and CcpsScoreCard.
        // alternatives: a non-array error object → exercises guard (c) [.slice].
        const PARTIAL = makeMaterial({
            id: 303,
            name: 'PartialData EcoPanel',
            ccpsByPersona: null,
        });

        await mockTrpc(page, {
            'materials.getById': PARTIAL,
            'materialSwaps.getSavedSwaps': [],
            'materialSwap.findAlternatives': { error: 'boom' }, // deliberately NOT an array
        });

        await page.goto('/materials/303');

        // Core info renders...
        await expect(page.getByRole('heading', { name: 'PartialData EcoPanel' })).toBeVisible();
        // ...and the ErrorBoundary white-screen never appears.
        await expect(page.getByRole('heading', { name: ERROR_BOUNDARY })).toHaveCount(0);
    });

    test('detail page survives a CCPS persona missing dataQuality', async ({ page }) => {
        // The "Credit Score" tab is the DEFAULT tab, so CcpsScoreCard renders on
        // load. A persona breakdown with no `dataQuality` exercises guard (b).
        const NO_DQ = makeMaterial({
            id: 404,
            name: 'NoDataQuality Beam',
            ccpsByPersona: {
                default: {
                    carbonScore: 60,
                    complianceScore: 55,
                    certificationScore: 50,
                    costScore: 45,
                    supplyChainScore: 40,
                    healthScore: 35,
                    ccpsTotal: 58,
                    sourcingDifficulty: 3,
                    // dataQuality intentionally omitted (partial API response)
                },
            },
        });

        await mockTrpc(page, {
            'materials.getById': NO_DQ,
            'materialSwaps.getSavedSwaps': [],
            'materialSwap.findAlternatives': [],
        });

        await page.goto('/materials/404');

        await expect(page.getByRole('heading', { name: 'NoDataQuality Beam' })).toBeVisible();
        // The score card still renders its grade/breakdown instead of crashing.
        await expect(page.getByText('Score Breakdown')).toBeVisible();
        await expect(page.getByRole('heading', { name: ERROR_BOUNDARY })).toHaveCount(0);
    });

    test('opening a material shows its detail / EPD page', async ({ page }) => {
        await mockTrpc(page, {
            'materials.list': listHandler,
            'materials.categories': ['Structural', 'Concrete'],
            'materials.getById': STEEL,
            'materialSwaps.getSavedSwaps': [],
            // findAlternatives must resolve to an ARRAY — MaterialDetail does
            // (alternatives ?? []).slice(...) with no type guard.
            'materialSwap.findAlternatives': [],
        });

        await page.goto('/materials');
        await page.getByRole('link', { name: /GreenCore Recycled Steel Beam/i }).first().click();

        await expect(page).toHaveURL(/\/materials\/101/);
        await expect(
            page.getByRole('heading', { name: 'GreenCore Recycled Steel Beam' }),
        ).toBeVisible();
    });
});
