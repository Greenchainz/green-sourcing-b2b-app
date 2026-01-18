import { test, expect, type Page } from '@playwright/test';

test.describe('Material Catalog', () => {
    test.beforeEach(async ({ page }: { page: Page }) => {
        await page.goto('/catalog');
        await page.waitForLoadState('networkidle');
    });

    test('should load catalog page successfully', async ({ page }: { page: Page }) => {
        // Check URL to confirm we're on catalog
        await expect(page).toHaveURL(/.*catalog/);

        // Check for H1. The text might be "Material Catalog" or similar.
        // Using toContainText is safer than exact match if there are spans/gradients.
        await expect(page.locator('h1')).toContainText('Catalog');
    });

    test('should filter materials by category', async ({ page }: { page: Page }) => {
        // Expand Structural category
        const structuralRow = page.locator('.gc-filter-category-row', { hasText: 'Structural' });
        await structuralRow.locator('button[aria-label="Expand subcategories"]').click();

        // Select "Steel" subcategory
        await page.locator('label[for="subcat-steel"]').click();

        // Wait for list to update
        await expect(page.getByText('GreenCore Recycled Steel Beams')).toBeVisible();
        await expect(page.getByText('EcoTimber Premium Hardwood Flooring')).not.toBeVisible();
    });

    test('should search for materials', async ({ page }: { page: Page }) => {
        const searchBox = page.locator('input[type="search"]');
        await searchBox.fill('Insulation');

        // Wait for results
        await expect(page.getByText('BioFiber Insulation Panels')).toBeVisible();
        await expect(page.getByText('GreenCore Recycled Steel Beams')).not.toBeVisible();
    });

    test('should view material details', async ({ page }: { page: Page }) => {
        const firstCard = page.locator('.gc-card').first();
        // Click the image or the card itself. If something intercepts, force it or find a better target.
        await firstCard.locator('.gc-material-image').click();

        // Verify detail page
        await expect(page).toHaveURL(/\/catalog\/mat-.*/);
        await expect(page.locator('h1')).toBeVisible();
    });

    test('should add items to compare tray', async ({ page }: { page: Page }) => {
        const firstCard = page.locator('.gc-card').first();
        await firstCard.hover();

        // Use force: true to bypass any intercepting elements (like SVGs or overlays)
        const compareCheckbox = firstCard.locator('input[type="checkbox"]');
        if (await compareCheckbox.count() > 0) {
             await compareCheckbox.check({ force: true });
        } else {
            // Fallback: try clicking a button if checkbox not found
            const compareBtn = firstCard.locator('button.gc-compare-btn, button[aria-label="Compare"]');
            if (await compareBtn.count() > 0) {
                await compareBtn.first().click({ force: true });
            } else {
                 // Fallback to clicking the icon wrapper
                 await firstCard.locator('.gc-compare-icon').first().click({ force: true });
            }
        }

        // Check comparison tray appears
        await expect(page.locator('.gc-compare-tray')).toBeVisible();
        // The text is "{count} of {max} selected" e.g., "1 of 5 selected"
        await expect(page.getByText('1 of 5 selected')).toBeVisible();
    });
});
