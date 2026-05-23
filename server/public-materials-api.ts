/**
 * Public Materials API — unauthenticated REST endpoints for the Forma Extension.
 *
 * Mounted at /api/public by the Express server.
 * These routes are intentionally unauthenticated — the Forma Extension runs
 * in an iframe and has no access to the user's GreenChainz session cookie.
 *
 * Routes:
 *   GET  /api/public/materials/search    — keyword + category search
 *   GET  /api/public/materials/:id/swaps — greener alternatives (SWAP engine)
 *   GET  /api/public/auth/verify         — validate a Forma extension Bearer token
 *   POST /api/public/rfq/add-item        — create an RFQ from the Forma extension
 */

import { Router, type Request, type Response } from 'express';
import { getDb } from './db';
import { materials, manufacturers, rfqRequests, suppliers, users } from '../drizzle/schema';
import { eq, like, and, lte, or, desc, sql } from 'drizzle-orm';
import { sdk } from './_core/sdk';

export const publicMaterialsRouter = Router();

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Extract and verify a Forma extension Bearer token from the Authorization header.
 * Returns the decoded openId on success, or null if invalid/missing.
 *
 * Extension tokens are standard GreenChainz JWTs (signed with JWT_SECRET) with
 * an extra `ext: "forma"` claim so they can't be confused with session cookies.
 */
async function verifyExtensionToken(req: Request): Promise<string | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);
  try {
    const payload = await sdk.verifySession(token);
    if (!payload) return null;
    if ((payload as Record<string, unknown>).ext !== 'forma') return null;
    return payload.openId;
  } catch {
    return null;
  }
}

// ── GET /api/public/materials/search ─────────────────────────────────────────

publicMaterialsRouter.get('/materials/search', async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    if (!db) return res.status(503).json({ error: 'Database unavailable' });

    const q        = typeof req.query.q        === 'string' ? req.query.q        : undefined;
    const category = typeof req.query.category === 'string' ? req.query.category : undefined;
    const maxGwp   = req.query.maxGwp   ? Number(req.query.maxGwp)   : undefined;
    const minMcs   = req.query.minMcs   ? Number(req.query.minMcs)   : undefined;
    const limit    = Math.min(Number(req.query.limit ?? 20), 50);

    const conditions = [];

    if (q) {
      conditions.push(
        or(
          like(materials.name, `%${q}%`),
          like(materials.category, `%${q}%`)
        )
      );
    }
    if (category) {
      conditions.push(like(materials.category, `%${category}%`));
    }
    if (maxGwp !== undefined && !isNaN(maxGwp)) {
      conditions.push(lte(materials.gwpValue, String(maxGwp)));
    }
    if (minMcs !== undefined && !isNaN(minMcs)) {
      conditions.push(lte(materials.ccpsScore, 100 - minMcs));
    }

    // Only return verified / EPD-backed materials to the public API
    conditions.push(eq(materials.hasEpd, true));

    const rows = await db
      .select({
        id:                  materials.id,
        name:                materials.name,
        category:            materials.category,
        gwpPerUnit:          materials.gwpValue,
        gwpUnit:             materials.gwpUnit,
        materialCreditScore: materials.ccpsScore,
        epdUrl:              materials.epdUrl,
        ec3Id:               materials.ec3Id,
        isVerified:          materials.hasEpd,
        manufacturerName:    manufacturers.companyName,
      })
      .from(materials)
      .leftJoin(manufacturers, eq(materials.manufacturerId, manufacturers.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .limit(limit);

    const shaped = rows.map((r) => ({
      id:                  String(r.id),
      name:                r.name,
      category:            r.category,
      manufacturer:        r.manufacturerName ?? undefined,
      gwpPerUnit:          r.gwpPerUnit ? Number(r.gwpPerUnit) : undefined,
      gwpUnit:             r.gwpUnit ?? 'kg',
      materialCreditScore: r.materialCreditScore ? Number(r.materialCreditScore) : undefined,
      epdUrl:              r.epdUrl ?? undefined,
      ec3Id:               r.ec3Id ?? undefined,
      isVerified:          r.isVerified ?? false,
      certifications:      [] as string[],
    }));

    return res.json({ materials: shaped });
  } catch (err) {
    console.error('[public-api] materials/search error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ── GET /api/public/materials/:id/swaps ──────────────────────────────────────

publicMaterialsRouter.get('/materials/:id/swaps', async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    if (!db) return res.status(503).json({ error: 'Database unavailable' });

    const materialId = Number(req.params.id);
    if (isNaN(materialId)) return res.status(400).json({ error: 'Invalid material ID' });

    const [source] = await db
      .select({
        id:       materials.id,
        name:     materials.name,
        category: materials.category,
        gwpValue: materials.gwpValue,
      })
      .from(materials)
      .where(eq(materials.id, materialId))
      .limit(1);

    if (!source) return res.status(404).json({ error: 'Material not found' });

    const alternatives = await db
      .select({
        id:                  materials.id,
        name:                materials.name,
        category:            materials.category,
        gwpPerUnit:          materials.gwpValue,
        gwpUnit:             materials.gwpUnit,
        materialCreditScore: materials.ccpsScore,
        epdUrl:              materials.epdUrl,
        ec3Id:               materials.ec3Id,
        isVerified:          materials.hasEpd,
        manufacturerName:    manufacturers.companyName,
      })
      .from(materials)
      .leftJoin(manufacturers, eq(materials.manufacturerId, manufacturers.id))
      .where(
        and(
          like(materials.category, `%${source.category}%`),
          eq(materials.hasEpd, true),
          source.gwpValue ? lte(materials.gwpValue, source.gwpValue) : undefined
        )
      )
      .limit(5);

    const shaped = alternatives
      .filter((r) => r.id !== materialId)
      .slice(0, 3)
      .map((r) => ({
        id:                  String(r.id),
        name:                r.name,
        category:            r.category,
        manufacturer:        r.manufacturerName ?? undefined,
        gwpPerUnit:          r.gwpPerUnit ? Number(r.gwpPerUnit) : undefined,
        gwpUnit:             r.gwpUnit ?? 'kg',
        materialCreditScore: r.materialCreditScore ? Number(r.materialCreditScore) : undefined,
        epdUrl:              r.epdUrl ?? undefined,
        ec3Id:               r.ec3Id ?? undefined,
        isVerified:          r.isVerified ?? false,
        certifications:      [] as string[],
      }));

    return res.json({ alternatives: shaped });
  } catch (err) {
    console.error('[public-api] materials/swaps error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ── GET /api/public/auth/verify ───────────────────────────────────────────────
//
// Called by the Forma extension on startup to confirm the stored token is valid.
// Returns 200 + { ok, user } or 401.

publicMaterialsRouter.get('/auth/verify', async (req: Request, res: Response) => {
  const openId = await verifyExtensionToken(req);
  if (!openId) return res.status(401).json({ error: 'Invalid or expired token' });

  try {
    const db = await getDb();
    if (!db) return res.status(503).json({ error: 'Database unavailable' });

    const [user] = await db
      .select({ id: users.id, name: users.name, email: users.email, role: users.role })
      .from(users)
      .where(eq(users.openId, openId))
      .limit(1);

    if (!user) return res.status(401).json({ error: 'User not found' });

    return res.json({ ok: true, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    console.error('[public-api] auth/verify error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ── GET /api/public/suppliers ─────────────────────────────────────────────────
//
// Returns verified suppliers for the Revit plugin and other external consumers.
// Unauthenticated — returns only non-sensitive fields (no email, no user IDs).
// Optional query params: ?category=concrete  ?region=California

publicMaterialsRouter.get('/suppliers', async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    if (!db) return res.status(503).json({ error: 'Database unavailable' });

    const { category, region } = req.query as { category?: string; region?: string };

    const rows = await db
      .select({
        id:                   suppliers.id,
        companyName:          suppliers.companyName,
        website:              suppliers.website,
        description:          suppliers.description,
        materialCategories:   suppliers.materialCategories,
        certifications:       suppliers.certifications,
        city:                 suppliers.city,
        state:                suppliers.state,
        country:              suppliers.country,
        sustainabilityScore:  suppliers.sustainabilityScore,
        isPremium:            suppliers.isPremium,
        logoUrl:              suppliers.logoUrl,
        otifPercentage:       suppliers.otifPercentage,
        avgLeadTimeDays:      suppliers.avgLeadTimeDays,
        leadTimeVarianceDays: suppliers.leadTimeVarianceDays,
        supplierZScore:       suppliers.supplierZScore,
        inventoryVisibility:  suppliers.inventoryVisibility,
      })
      .from(suppliers)
      .where(eq(suppliers.verified, true))
      .orderBy(desc(suppliers.isPremium), desc(suppliers.weightedRankScore));

    let filtered = rows;

    if (category) {
      filtered = filtered.filter(s =>
        s.materialCategories?.some(c => c.toLowerCase().includes(category.toLowerCase()))
      );
    }

    if (region) {
      filtered = filtered.filter(s =>
        [s.city, s.state, s.country].some(f => f?.toLowerCase().includes(region.toLowerCase()))
      );
    }

    return res.json({ count: filtered.length, suppliers: filtered });
  } catch (err) {
    console.error('[public-api] suppliers error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ── POST /api/public/rfq/add-item ────────────────────────────────────────────
//
// Creates an RFQ from the Forma extension. Requires a valid extension Bearer token.
// Finds the best-match verified supplier for the material's category and fires a
// notification email to them.
//
// Body: { materialId: string, quantity: number, unit: string, projectName?: string }

publicMaterialsRouter.post('/rfq/add-item', async (req: Request, res: Response) => {
  const openId = await verifyExtensionToken(req);
  if (!openId) {
    return res.status(401).json({ error: 'Invalid or expired token — re-link your GreenChainz account' });
  }

  const { materialId, quantity, unit, projectName } = req.body as {
    materialId?: unknown;
    quantity?: unknown;
    unit?: unknown;
    projectName?: unknown;
  };

  if (!materialId || typeof materialId !== 'string') {
    return res.status(400).json({ error: 'materialId is required' });
  }
  const qty = Number(quantity);
  if (isNaN(qty) || qty <= 0) {
    return res.status(400).json({ error: 'quantity must be a positive number' });
  }
  const unitStr  = typeof unit        === 'string' && unit.trim()        ? unit.trim()        : 'unit';
  const project  = typeof projectName === 'string' && projectName.trim() ? projectName.trim() : 'Forma Project';

  try {
    const db = await getDb();
    if (!db) return res.status(503).json({ error: 'Database unavailable' });

    // 1. Resolve architect user
    const [architect] = await db
      .select({ id: users.id, name: users.name, email: users.email })
      .from(users)
      .where(eq(users.openId, openId))
      .limit(1);

    if (!architect) return res.status(401).json({ error: 'User not found' });

    // 2. Resolve material → get category for supplier matching
    const [material] = await db
      .select({ id: materials.id, name: materials.name, category: materials.category })
      .from(materials)
      .where(eq(materials.id, Number(materialId)))
      .limit(1);

    if (!material) return res.status(404).json({ error: 'Material not found' });

    // 3. Find best-match verified supplier (category match, premium first)
    const [matchedSupplier] = await db
      .select({ id: suppliers.id, companyName: suppliers.companyName, email: suppliers.email })
      .from(suppliers)
      .where(
        and(
          eq(suppliers.verified, true),
          sql`EXISTS (
            SELECT 1
            FROM jsonb_array_elements_text(${suppliers.materialCategories}::jsonb) AS category
            WHERE category ILIKE ${material.category}
          )`
        )
      )
      .orderBy(desc(suppliers.isPremium), desc(suppliers.weightedRankScore))
      .limit(1);

    // Fall back to any verified supplier if no category match
    const fallbackRows = matchedSupplier ? [] : await db
      .select({ id: suppliers.id, companyName: suppliers.companyName, email: suppliers.email })
      .from(suppliers)
      .where(eq(suppliers.verified, true))
      .orderBy(desc(suppliers.isPremium), desc(suppliers.weightedRankScore))
      .limit(1);

    const supplier = matchedSupplier ?? fallbackRows[0];
    if (!supplier) {
      return res.status(503).json({
        error: 'No verified suppliers available for this material category. Try again later.',
      });
    }

    // 4. Insert RFQ record
    const [inserted] = await db
      .insert(rfqRequests)
      .values({
        architectId:  architect.id,
        supplierId:   supplier.id,
        materialId:   material.id,
        materialType: material.name,
        quantity:     String(qty),
        specs:        `${unitStr} — submitted via Autodesk Forma`,
        message:      `Project: ${project}\nMaterial: ${material.name} (${material.category})\nQuantity: ${qty} ${unitStr}\nSource: Autodesk Forma Extension`,
        status:       'pending',
      })
      .returning({ id: rfqRequests.id });

    if (!inserted) return res.status(500).json({ error: 'Failed to create RFQ' });

    // 5. Notify supplier (fire-and-forget)
    void import('./email-service')
      .then(({ sendRfqNotificationEmail }) =>
        sendRfqNotificationEmail({
          supplierEmail: supplier.email,
          supplierName:  supplier.companyName,
          projectName:   project,
          materialCount: 1,
          matchScore:    matchedSupplier ? 90 : 60,
          rfqId:         inserted.id,
        })
      )
      .catch((err: unknown) => console.error('[public-api] RFQ email failed (non-critical):', err));

    return res.status(201).json({
      rfqId:        inserted.id,
      supplierName: supplier.companyName,
      message:      `RFQ sent to ${supplier.companyName}. They'll respond within 48 hours.`,
    });

  } catch (err) {
    console.error('[public-api] rfq/add-item error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});
