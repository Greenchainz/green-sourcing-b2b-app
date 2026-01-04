import { test, expect } from '@playwright/test';

test.describe('Material Catalog', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/catalog');
    });

    test('should load catalog page successfully', async ({ page }) => {
        await expect(page).toHaveTitle(/Catalog/);
        await expect(page.getByRole('heading', { name: 'Sustainable Materials' })).toBeVisible();
    });

    test('should filter materials by category', async ({ page }) => {
        // Assuming a filter sidebar or dropdown exists
        await page.getByLabel('Category').selectOption('Steel');
        // Wait for list to update - utilizing network idle or specific element appearance
        await expect(page.getByText('Recycled Steel')).toBeVisible();
        await expect(page.getByText('Concrete')).not.toBeVisible();
    });

    test('should search for materials', async ({ page }) => {
        const searchBox = page.getByPlaceholder('Search materials...');
        await searchBox.fill('Insulation');
        await searchBox.press('Enter');

        await expect(page.getByText('Bio-based Insulation')).toBeVisible();
    });

    test('should view material details', async ({ page }) => {
        // Click on first product card
        await page.locator('.gc-card').first().click();

        // Verify detail page
        await expect(page).toHaveURL(/\/catalog\/material\/.*/);
        await expect(page.getByRole('button', { name: 'Add to Project' })).toBeVisible();
        await expect(page.getByText('Carbon Footprint')).toBeVisible();
    });

    test('should add items to compare tray', async ({ page }) => {
        // Hover over first card and click compare
        await page.locator('.gc-card').first().hover();
        await page.getByRole('button', { name: 'Compare' }).first().click();

        // Check comparison tray appears
        await expect(page.getByText('1 item selected')).toBeVisible();
    });
});
