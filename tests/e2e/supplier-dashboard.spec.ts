import { testSupplier as test, expect } from '../fixtures/auth';

test.describe('Supplier Dashboard', () => {
    test.beforeEach(async ({ authenticatedPage }) => {
        // Mock API BEFORE navigating
        await authenticatedPage.route('**/api/v2/suppliers/supplier-123/inbox', async route => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    inbox: [
                        {
                            id: 'rfq-1',
                            project_name: 'Test Project',
                            category: 'Steel',
                            message: 'Need urgent quote',
                            status: 'pending',
                            created_at: new Date().toISOString()
                        }
                    ]
                })
            });
        });
    });

    test('should display relevant RFQs', async ({ authenticatedPage }) => {
        await authenticatedPage.goto('/dashboard/supplier/rfqs');
        await authenticatedPage.waitForLoadState('networkidle');

        // Heading is "RFQ Inbox"
        await expect(authenticatedPage.getByRole('heading', { name: 'RFQ Inbox' })).toBeVisible();

        // Wait for the list to render (rfq map)
        // It renders: <h3 ...>{rfq.project_name}</h3>
        // We can wait for the text to appear
        await expect(authenticatedPage.getByText('Test Project')).toBeVisible();
        await expect(authenticatedPage.getByText('RFQ ID')).toBeVisible();
    });

    test('should have quote button visible', async ({ authenticatedPage }) => {
        await authenticatedPage.goto('/dashboard/supplier/rfqs');
        await authenticatedPage.waitForLoadState('networkidle');

        // Check for project name first to ensure data loaded
        await expect(authenticatedPage.getByText('Test Project')).toBeVisible();

        // Check for the button. It has text "Send Quote".
        // Use a more generic selector if getByRole is strict on invisible elements or something
        // But visibility check should handle it.
        // Maybe wait for it explicitly.
        const sendQuoteBtn = authenticatedPage.getByRole('button', { name: 'Send Quote' }).first();
        await expect(sendQuoteBtn).toBeVisible();
    });
});
