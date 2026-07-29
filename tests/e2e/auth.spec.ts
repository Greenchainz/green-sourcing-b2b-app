import { test, expect } from '@playwright/test';
import { signInAs, mockTrpc, USERS } from './support/harness';

/**
 * CRITICAL JOURNEY: Authentication & route protection.
 *
 * These are the highest-value guardrails for a live demo: if auth silently
 * breaks, nothing else matters. We cover the parts that are deterministic in
 * headless CI:
 *   - the sign-in page renders with its role picker + Microsoft button
 *   - unauthenticated users are redirected off protected routes to /login
 *   - an authenticated user can reach a protected route without bouncing
 *   - sign-out points at the real logout endpoint
 *
 * The actual Microsoft OAuth handshake is external and cannot run headless, so
 * the "click Continue with Microsoft and complete sign-in" leg is covered by
 * asserting the button targets the OAuth start URL, not by driving Microsoft.
 */

test.describe('Authentication', () => {
    test('sign-in page renders role picker and Microsoft sign-in', async ({ page }) => {
        await page.goto('/login');

        await expect(page.getByRole('heading', { name: 'Sign in to your account' })).toBeVisible();
        await expect(page.getByText('🏛 Sourcing materials')).toBeVisible();
        await expect(page.getByText('🏭 Selling materials')).toBeVisible();

        // The Microsoft button must point at the server OAuth start route, never
        // at a client-only stub. This is what actually initiates real sign-in.
        const microsoft = page.getByRole('link', { name: /Continue with Microsoft/i });
        await expect(microsoft).toBeVisible();
        const href = await microsoft.getAttribute('href');
        expect(href, 'Microsoft sign-in must link to a real /api/auth OAuth route').toMatch(/\/api\/auth\//);
    });

    test('unauthenticated user is redirected from a protected route to /login', async ({ page }) => {
        // No auth mock: the real server reports { authenticated:false } (no DB
        // needed), so AuthGuard should bounce us to the login page.
        await page.goto('/rfqs');

        await expect(page).toHaveURL(/\/login/);
        await expect(page.getByRole('heading', { name: 'Sign in to your account' })).toBeVisible();
    });

    test('unauthenticated user is redirected to /login preserving returnPath', async ({ page }) => {
        await page.goto('/supplier/rfqs');

        await expect(page).toHaveURL(/\/login/);
        // AuthGuard round-trips the intended destination so the user lands back
        // where they meant to go after signing in.
        await expect(page).toHaveURL(/returnPath=/);
    });

    test('authenticated buyer can reach the dashboard without redirect', async ({ page }) => {
        await signInAs(page, USERS.buyer);
        await mockTrpc(page, {
            // A non-null profile means onboarding is complete, so the
            // ArchitectOnboardingGuard leaves the user on the dashboard.
            'architect.getMyProfile': { id: 1, firmName: 'Test Firm', onboardingCompleted: true },
            'rfqRequests.listMine': [],
            'location.suppliersByState': [],
        });

        await page.goto('/dashboard');

        // Must stay on the protected route — no bounce back to /login.
        await expect(page).toHaveURL(/\/dashboard/);
        await expect(page.getByRole('heading', { name: 'Sign in to your account' })).toHaveCount(0);
    });

    test('sign-out link targets the real logout endpoint', async ({ page }) => {
        // The header account menu exposes sign-out. Rather than follow the real
        // OAuth logout (external), assert the app wires sign-out to the server
        // logout route — proving the flow is connected end-to-end.
        await signInAs(page, USERS.buyer);
        await mockTrpc(page, {
            'architect.getMyProfile': { id: 1, firmName: 'Test Firm', onboardingCompleted: true },
            'rfqRequests.listMine': [],
            'location.suppliersByState': [],
        });

        // Intercept the logout navigation so we can assert without leaving the app.
        let logoutHit = false;
        await page.route('**/api/auth/logout', async (route) => {
            logoutHit = true;
            await route.fulfill({ status: 200, contentType: 'text/html', body: '<html><body>logged out</body></html>' });
        });

        await page.goto('/dashboard');
        await expect(page).toHaveURL(/\/dashboard/);

        // Click the visible Sign out button in the header — exercises the real
        // AuthContext.logout wiring end-to-end, not just the redirect target.
        await page.getByRole('button', { name: 'Sign out' }).click();

        await expect.poll(() => logoutHit, { timeout: 5000 }).toBe(true);
    });
});
