/**
 * Public Materials API — unauthenticated REST endpoints for the Forma Extension.
 *
 * Mounted at /api/public by the Express server.
 * These routes are intentionally unauthenticated — the Forma Extension runs
 * in an iframe and has no access to the user's GreenChainz session cookie.
 *
 * Routes:
 *   GET /api/public/materials/search   — keyword + category search
 *   GET /api/public/materials/:id/swaps — greener alternatives (SWAP engine)
 */

import { Router, type Request, type Response } from 'express';
import { getDb } from './db';
import { materials, manufacturers } from '../drizzle/schema';
import { eq, like, and, lte, or } from 'drizzle-orm';

export const publicMaterialsRouter = Router();

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

    // Look up the source material
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

    // Find lower-carbon alternatives in the same category
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
          // Only return materials with lower GWP than the source
          source.gwpValue
            ? lte(materials.gwpValue, source.gwpValue)
            : undefined
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
