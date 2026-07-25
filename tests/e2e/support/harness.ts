/**
 * E2E test support helpers — hermetic auth + tRPC mocking.
 *
 * WHY THIS EXISTS
 * ---------------
 * The real app authenticates via Microsoft OAuth (external, can't be driven in
 * headless CI) and reads all data through tRPC (`/api/trpc/*`, httpBatchLink +
 * superjson) backed by PostgreSQL. To keep the critical-journey specs reliable
 * and DB-free in CI, we:
 *   1. Mock `GET /api/auth/me` — the single source of truth AuthContext uses to
 *      decide who is signed in (see client/src/contexts/AuthContext.tsx).
 *   2. Mock `/api/trpc/*` responses so pages render deterministic data.
 *
 * This mirrors the repo's existing "mock the backend with page.route" approach,
 * but targets the endpoints the CURRENT app actually calls.
 */
import type { Page, Route } from '@playwright/test';

export type AppRole = 'architect' | 'supplier' | 'admin';

export interface MockUser {
    id: string;
    email: string;
    name: string;
    role: AppRole;
    avatarUrl?: string | null;
}

export const USERS: Record<'buyer' | 'supplier' | 'admin', MockUser> = {
    // 'buyer' maps to the client-side 'architect' role (see api-client.ts).
    buyer: { id: 'user-architect-1', email: 'architect@example.com', name: 'Test Architect', role: 'architect' },
    supplier: { id: 'user-supplier-1', email: 'supplier@example.com', name: 'Test Supplier', role: 'supplier' },
    admin: { id: 'user-admin-1', email: 'admin@greenchainz.com', name: 'Test Admin', role: 'admin' },
};

/**
 * Make the app treat the browser as signed in as `user`.
 *
 * Seeds AuthContext's synchronous sessionStorage cache (`gc_auth_user`) AND
 * mocks `GET /api/auth/me` so the background revalidation keeps the session.
 * Must be called BEFORE `page.goto`.
 */
export async function signInAs(page: Page, user: MockUser): Promise<void> {
    await page.addInitScript((u) => {
        try {
            sessionStorage.setItem(
                'gc_auth_user',
                JSON.stringify({
                    user: { id: u.id, email: u.email, name: u.name, avatarUrl: null, role: u.role },
                    expiresAt: Date.now() + 5 * 60 * 1000,
                }),
            );
        } catch {
            /* sessionStorage unavailable — the /api/auth/me mock still authenticates */
        }
    }, user);

    await page.route('**/api/auth/me', async (route: Route) => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                authenticated: true,
                user: {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    roles: [user.role === 'architect' ? 'buyer' : user.role],
                    isAdmin: user.role === 'admin',
                    isSupplier: user.role === 'supplier',
                    avatarUrl: user.avatarUrl ?? null,
                },
            }),
        });
    });
}

/**
 * A tRPC procedure handler: either a static value or a function of the input.
 * The value is what the client sees as the query/mutation result data.
 */
export type TrpcHandler = unknown | ((input: unknown) => unknown);

/**
 * Mock tRPC query/mutation responses.
 *
 * Intercepts `/api/trpc/*` (httpBatchLink batches procedures into one request,
 * comma-separated in the path) and replies with a superjson-shaped batch array
 * in the SAME order the client requested. Unmocked procedures resolve to `null`.
 *
 * Example:
 *   await mockTrpc(page, { 'materials.list': { items: [...], total: 1 } });
 */
export async function mockTrpc(page: Page, handlers: Record<string, TrpcHandler>): Promise<void> {
    await page.route('**/api/trpc/**', async (route: Route) => {
        const request = route.request();
        const url = new URL(request.url());
        // pathname → ".../api/trpc/materials.list,materials.categories"
        const rawPath = url.pathname.replace(/^.*\/api\/trpc\//, '');
        const procedures = rawPath.split(',').map((p) => decodeURIComponent(p));

        // Decode inputs (queries: ?input=... ; mutations: JSON body) so handlers
        // can be input-aware. Best-effort — never throw from the mock.
        let inputs: Record<string, unknown> = {};
        try {
            if (request.method() === 'GET') {
                const raw = url.searchParams.get('input');
                if (raw) inputs = JSON.parse(raw) as Record<string, unknown>;
            } else {
                const raw = request.postData();
                if (raw) inputs = JSON.parse(raw) as Record<string, unknown>;
            }
        } catch {
            inputs = {};
        }

        const body = procedures.map((proc, i) => {
            const handler = handlers[proc];
            const rawInput = (inputs[String(i)] as { json?: unknown } | undefined)?.json;
            const value = typeof handler === 'function' ? (handler as (input: unknown) => unknown)(rawInput) : handler;
            // superjson success envelope; omit `meta` (no special types in mocks).
            return { result: { data: { json: value === undefined ? null : value } } };
        });

        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(body),
        });
    });
}

/** A minimal, render-safe material for the catalog/detail pages (MaterialCardProps). */
export function makeMaterial(overrides: Partial<Record<string, unknown>> = {}): Record<string, unknown> {
    return {
        id: 101,
        name: 'GreenCore Recycled Steel Beam',
        productName: 'GreenCore Recycled Steel Beam',
        category: 'Structural',
        subcategory: 'Steel',
        manufacturerName: 'GreenCore Metals',
        manufacturerId: 5,
        gwpValue: '1.20',
        gwpUnit: 'kgCO2e',
        declaredUnit: 'kg',
        ec3IndustryMedian: '2.00',
        pricePerUnit: '1200.00',
        priceUnit: 'ton',
        leadTimeDays: 21,
        hasEpd: true,
        hasHpd: false,
        hasFsc: false,
        hasC2c: false,
        hasGreenguard: false,
        hasDeclare: false,
        usManufactured: true,
        recycledContentPct: '90',
        imageUrl: null,
        ccps: {
            ccpsTotal: 82,
            carbonScore: 85,
            certificationScore: 70,
            complianceScore: 80,
            costScore: 75,
            supplyChainScore: 78,
            healthScore: 72,
            sourcingDifficulty: 30,
        },
        // MaterialDetail reads ccpsByPersona.default.ccpsTotal and does
        // Object.keys(m.ccpsByPersona) unconditionally; CcpsScoreCard needs a
        // full CcpsBreakdown (incl. dataQuality) per persona or it crashes.
        ccpsByPersona: {
            default: {
                carbonScore: 85,
                complianceScore: 80,
                certificationScore: 70,
                costScore: 75,
                supplyChainScore: 78,
                healthScore: 72,
                ccpsTotal: 82,
                sourcingDifficulty: 30,
                dataQuality: {
                    confidence: 'HIGH',
                    disclaimer: '',
                    missingFields: [],
                    hasEpd: true,
                    hasVerifiedGwp: true,
                    hasBaselineData: true,
                    hasPriceData: true,
                },
            },
        },
        ...overrides,
    };
}
