import { test, expect } from '../fixtures/auth';
import { TEST_RFQ } from '../fixtures/test-data';

test.describe('RFQ Creation Flow', () => {
    test.beforeEach(async ({ authenticatedPage }) => {
        // Authenticated as buyer
        await authenticatedPage.goto('/dashboard/buyer');
    });

    test('should create a new RFQ successfully', async ({ authenticatedPage }) => {
        await authenticatedPage.goto('/rfqs/create');

        // Fill form
        await authenticatedPage.getByLabel('Project Name').fill(TEST_RFQ.title);
        await authenticatedPage.getByLabel('Description / Message').fill('Need materials for new project');

        // Set deadline (tomorrow)
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const dateStr = tomorrow.toISOString().split('T')[0];
        await authenticatedPage.getByLabel('Deadline').fill(dateStr);

        // Material inputs
        await authenticatedPage.getByLabel('Material Name').fill(TEST_RFQ.material);

        // Use pressSequentially for number input to avoid validation issues
        const qtyInput = authenticatedPage.getByLabel('Qty');
        await qtyInput.click();
        await qtyInput.pressSequentially(TEST_RFQ.quantity);

        await authenticatedPage.getByLabel('Unit').fill('tons');

        // Mock RFQ submission API
        await authenticatedPage.route('**/api/v2/rfqs', async route => {
            await route.fulfill({ status: 200, json: { success: true, id: 'rfq-123' } });
        });

        // Submit
        await authenticatedPage.getByRole('button', { name: 'Create RFQ' }).click();

        // Check redirect to RFQ list
        await expect(authenticatedPage).toHaveURL(/\/rfqs/);
    });
});
