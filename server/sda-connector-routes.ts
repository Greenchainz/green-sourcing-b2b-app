/**
 * server/sda-connector-routes.ts
 *
 * SDA Data Provider routes merged from the standalone greenchainz-sda-connector.
 * Provides:
 *   - SDA-format EPD category tree & filtered category details
 *   - Carbon audit endpoint (credit-gated)
 *   - Material swap (EC3 spec-constrained search)
 *   - EC3 material search
 *   - Price trends lookup
 *
 * All endpoints use Bearer token auth via the `api_keys` table.
 */

import express, { Request, Response, NextFunction, Router } from 'express';
import { query } from '../lib/pg-pool';
import { runCarbonAudit } from '../lib/greenchainz/carbon-audit';
import { canRunAudit, consumeAuditCredit } from '../lib/greenchainz/audit-credits';
import ec3SearchClient from '../lib/greenchainz/ec3-search-client';

// ── Types (SDA format) ──────────────────────────────────────────────────

interface Amount {
  qty: number;
  unit: string;
}

interface StatisticsMeasurement {
  mean: Amount;
  min: Amount;
  max: Amount;
  sd: number;
  byPercentile: Record<string, Amount>;
}

interface EpdCategoryTree {
  id: string;
  displayName: string;
  masterformat: string;
  shortName: string;
  subcategories: EpdCategoryTree[];
}

interface EpdCategory {
  id: string;
  displayName: string;
  masterformat: string;
  shortName: string;
  epdCount: number;
  industryEpdCount: number;
  genericEstimateCount: number;
  declaredUnit: Amount;
  impactStatistics: Record<string, StatisticsMeasurement>;
}

interface PartnerError {
  title: string;
  detail: string;
  type: string;
}

// ── Auth middleware ──────────────────────────────────────────────────────

declare global {
  namespace Express {
    interface Request {
      sdaLicense?: {
        key: string;
        userId: string;
        jurisdictions: string[];
        active: boolean;
      };
    }
  }
}

async function sdaBearerAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      res.status(401).json({
        title: 'Unauthorized',
        detail: 'License token is missing.',
        type: 'NO_LICENSE',
      });
      return;
    }

    const match = authHeader.match(/^Bearer\s+(.+)$/);
    if (!match || !match[1]) {
      res.status(401).json({
        title: 'Unauthorized',
        detail: 'Invalid Authorization header format. Use: Bearer <token>',
        type: 'INVALID_PARAMS',
      });
      return;
    }

    const token = match[1].trim();

    const result = await query('SELECT * FROM api_keys WHERE key = $1', [token]);
    const apiKey = result.rows[0];

    if (!apiKey) {
      res.status(403).json({
        title: 'License expired',
        detail: 'License token is invalid or expired.',
        type: 'INVALID_LICENSE',
      });
      return;
    }

    if (!apiKey.active) {
      res.status(403).json({
        title: 'License expired',
        detail: 'License token has been deactivated.',
        type: 'INVALID_LICENSE',
      });
      return;
    }

    if (apiKey.expires_at && new Date(apiKey.expires_at) < new Date()) {
      res.status(403).json({
        title: 'License expired',
        detail: 'License token has expired.',
        type: 'INVALID_LICENSE',
      });
      return;
    }

    // Update last_used_at (fire-and-forget)
    void query('UPDATE api_keys SET last_used_at = $1 WHERE id = $2', [
      new Date().toISOString(),
      apiKey.id,
    ]).catch((err) => console.error('[sda-auth] Failed to update last_used_at:', err));

    req.sdaLicense = {
      key: apiKey.key,
      userId: apiKey.user_id,
      jurisdictions: apiKey.jurisdictions || [],
      active: apiKey.active,
    };

    next();
  } catch (err) {
    console.error('[sda-auth] Auth middleware error:', err);
    res.status(500).json({
      title: 'Internal Server Error',
      detail: 'An error occurred during authentication.',
      type: 'INTERNAL_ERROR',
    });
  }
}

function validateJurisdictions(
  licenseJurisdictions: string[],
  requestedJurisdictions: string[]
): boolean {
  if (!requestedJurisdictions || requestedJurisdictions.length === 0) return true;
  return requestedJurisdictions.every((j) =>
    licenseJurisdictions.some((lj) => lj === j || lj === '*')
  );
}

// ── Router ──────────────────────────────────────────────────────────────

export const sdaConnectorRouter = Router();

// --- Status ---

sdaConnectorRouter.get('/sda/status', (_req: Request, res: Response) => {
  res.json({
    service: 'GreenChainz SDA Connector',
    version: '1.0.0',
    status: 'active',
    timestamp: new Date().toISOString(),
  });
});

// --- SDA Category Endpoints (Autodesk SDA Data Provider format) ---

sdaConnectorRouter.get('/sda/categories', sdaBearerAuth, async (_req: Request, res: Response) => {
  try {
    const { rows: categories } = await query(
      'SELECT * FROM categories ORDER BY display_name'
    );

    const buildTree = (parentId: string | null): EpdCategoryTree[] =>
      categories
        .filter((c: any) => c.parent_id === parentId)
        .map((cat: any) => ({
          id: cat.id,
          displayName: cat.display_name,
          masterformat: cat.masterformat || '00 00 00',
          shortName: cat.short_name,
          subcategories: buildTree(cat.id),
        }));

    res.json({ results: buildTree(null) });
  } catch (err) {
    console.error('GET /api/sda/categories error:', err);
    res.status(500).json({
      title: 'Internal Server Error',
      detail: 'Failed to fetch categories.',
      type: 'INTERNAL_ERROR',
    } as PartnerError);
  }
});

sdaConnectorRouter.post(
  '/sda/categories/:categoryId/details:filter',
  sdaBearerAuth,
  async (req: Request, res: Response) => {
    try {
      const { categoryId } = req.params;
      const filters = req.body || [];

      if (!categoryId) {
        res.status(400).json({
          title: 'Invalid parameters',
          detail: 'categoryId is required.',
          type: 'INVALID_PARAMS',
        } as PartnerError);
        return;
      }

      const catResult = await query(
        'SELECT * FROM categories WHERE id = $1 LIMIT 1',
        [categoryId]
      );
      const category = catResult.rows[0];

      if (!category) {
        res.status(404).json({
          title: 'Not Found',
          detail: `Category ${categoryId} not found.`,
          type: 'NOT_FOUND',
        } as PartnerError);
        return;
      }

      let jurisdictionsFilter: string[] | null = null;
      for (const filter of filters) {
        if (filter.type === 'jurisdictions' && filter.jurisdictions) {
          jurisdictionsFilter = filter.jurisdictions;
        }
      }

      if (
        jurisdictionsFilter &&
        !validateJurisdictions(req.sdaLicense?.jurisdictions || [], jurisdictionsFilter)
      ) {
        res.status(403).json({
          title: 'Access Denied',
          detail: 'Your license does not cover the requested jurisdictions.',
          type: 'INVALID_LICENSE',
        } as PartnerError);
        return;
      }

      let matQuery: string;
      let matParams: any[];

      if (jurisdictionsFilter && jurisdictionsFilter.length > 0) {
        matQuery = 'SELECT * FROM materials WHERE category_id = $1 AND jurisdictions && $2';
        matParams = [categoryId, jurisdictionsFilter];
      } else {
        matQuery = 'SELECT * FROM materials WHERE category_id = $1';
        matParams = [categoryId];
      }

      const { rows: materials } = await query(matQuery, matParams);
      const stats = calculateAggregateStatistics(materials || []);

      const response: EpdCategory = {
        id: category.id,
        displayName: category.display_name,
        masterformat: category.masterformat || '00 00 00',
        shortName: category.short_name,
        epdCount: stats.epdCount,
        industryEpdCount: stats.industryEpdCount,
        genericEstimateCount: stats.genericEstimateCount,
        declaredUnit: { qty: 1, unit: 'kg' },
        impactStatistics: stats.impactStatistics,
      };

      res.json({ category: response });
    } catch (err) {
      console.error('POST /api/sda/categories/:categoryId/details:filter error:', err);
      res.status(500).json({
        title: 'Internal Server Error',
        detail: 'Failed to fetch category details.',
        type: 'INTERNAL_ERROR',
      } as PartnerError);
    }
  }
);

// --- Carbon Audit ---

sdaConnectorRouter.post('/sda/carbon-audit', sdaBearerAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.sdaLicense?.userId;
    if (!userId) {
      res.status(401).json({ error: 'User unauthorized' });
      return;
    }

    const hasCredits = await canRunAudit(userId);
    if (!hasCredits) {
      res.status(402).json({
        title: 'Payment Required',
        detail: 'No audit credits remaining. Purchase more at /billing.',
        type: 'NO_CREDITS',
        billingUrl: 'https://greenchainz.com/billing/purchase-audits?return_to=sda-connector',
      });
      return;
    }

    const { modelUrn } = req.body || {};
    if (!modelUrn || typeof modelUrn !== 'string') {
      res.status(400).json({
        title: 'Invalid parameters',
        detail: 'modelUrn is required and must be a string.',
        type: 'INVALID_PARAMS',
      } as PartnerError);
      return;
    }

    const audit = await runCarbonAudit(modelUrn);

    const consumed = await consumeAuditCredit(userId);
    if (!consumed) {
      res.status(500).json({
        title: 'Internal Server Error',
        detail: 'Failed to process audit credit transaction.',
        type: 'INTERNAL_ERROR',
      } as PartnerError);
      return;
    }

    res.json(audit);
  } catch (error: any) {
    console.error('POST /api/sda/carbon-audit error:', error);
    res.status(500).json({
      title: 'Internal Server Error',
      detail: error.message || 'Failed to run carbon audit.',
      type: 'INTERNAL_ERROR',
    } as PartnerError);
  }
});

// --- Material Swap (EC3 spec-constrained search for lower-GWP alternatives) ---

sdaConnectorRouter.post('/sda/materials/swap', sdaBearerAuth, async (req: Request, res: Response) => {
  try {
    const { materialName, category, strength, fireRating, currentGwp } = req.body || {};

    if (!materialName || !category) {
      res.status(400).json({
        title: 'Invalid parameters',
        detail: 'materialName and category are required.',
        type: 'INVALID_PARAMS',
      } as PartnerError);
      return;
    }

    const baseStrength = typeof strength === 'number' ? strength : 0;
    const minStrength = baseStrength > 0 ? baseStrength * 0.8 : 0;
    const maxGwp = typeof currentGwp === 'number' ? currentGwp : 9999;

    const alternatives = await ec3SearchClient.searchWithSpecs(
      category,
      minStrength,
      maxGwp,
      fireRating || undefined
    );

    res.json({
      originalMaterial: materialName,
      category,
      constraintsApplied: {
        minStrength: round2(minStrength),
        maxStrength: baseStrength > 0 ? round2(baseStrength * 1.2) : null,
        fireRating: fireRating || null,
        maxGwp,
      },
      alternatives,
      count: alternatives.length,
    });
  } catch (error: any) {
    console.error('POST /api/sda/materials/swap error:', error);
    res.status(500).json({
      title: 'Internal Server Error',
      detail: error.message || 'Failed to find material alternatives.',
      type: 'INTERNAL_ERROR',
    } as PartnerError);
  }
});

// --- Material Search (EC3) ---

sdaConnectorRouter.get('/sda/materials/search', sdaBearerAuth, async (req: Request, res: Response) => {
  try {
    const q = req.query.q as string | undefined;
    const category = req.query.category as string | undefined;
    const maxGwpRaw = req.query.maxGwp as string | undefined;
    const pageRaw = req.query.page as string | undefined;
    const pageSizeRaw = req.query.pageSize as string | undefined;

    const maxGwp = maxGwpRaw ? parseFloat(maxGwpRaw) : undefined;
    const page = pageRaw ? parseInt(pageRaw, 10) : 1;
    const pageSize = pageSizeRaw ? Math.min(parseInt(pageSizeRaw, 10), 100) : 25;

    if (maxGwp !== undefined && isNaN(maxGwp)) {
      res.status(400).json({
        title: 'Invalid parameters',
        detail: 'maxGwp must be a valid number.',
        type: 'INVALID_PARAMS',
      } as PartnerError);
      return;
    }

    const result = await ec3SearchClient.searchMaterials(q, category, maxGwp, page, pageSize);

    res.json({
      materials: result.materials,
      total: result.total,
      page,
      pageSize,
    });
  } catch (error: any) {
    console.error('GET /api/sda/materials/search error:', error);
    res.status(500).json({
      title: 'Internal Server Error',
      detail: error.message || 'Failed to search materials.',
      type: 'INTERNAL_ERROR',
    } as PartnerError);
  }
});

// --- Price Trends ---

sdaConnectorRouter.get('/sda/price-trends/:category', sdaBearerAuth, async (req: Request, res: Response) => {
  try {
    const { category } = req.params;

    if (!category) {
      res.status(400).json({
        title: 'Invalid parameters',
        detail: 'category is required.',
        type: 'INVALID_PARAMS',
      } as PartnerError);
      return;
    }

    const { rows } = await query(
      `SELECT category, period, avg_price_per_unit, unit, region, sample_size, source
       FROM price_trends
       WHERE LOWER(category) = LOWER($1)
       ORDER BY period DESC
       LIMIT 36`,
      [category]
    );

    if (!rows || rows.length === 0) {
      res.status(404).json({
        title: 'Not Found',
        detail: `No price trend data found for category: ${category}`,
        type: 'NOT_FOUND',
      } as PartnerError);
      return;
    }

    res.json({ category, trends: rows, count: rows.length });
  } catch (error: any) {
    console.error('GET /api/sda/price-trends/:category error:', error);
    res.status(500).json({
      title: 'Internal Server Error',
      detail: error.message || 'Failed to fetch price trends.',
      type: 'INTERNAL_ERROR',
    } as PartnerError);
  }
});

// ── Statistics helpers ───────────────────────────────────────────────────

function calculateAggregateStatistics(materials: any[]) {
  const stages = [
    'a1a2a3', 'a1', 'a2', 'a3', 'a4', 'a5',
    'b1', 'b2', 'b3', 'b4', 'b5', 'b6', 'b7',
    'c1', 'c2', 'c3', 'c4', 'd',
  ];

  const impactStatistics: Record<string, StatisticsMeasurement> = {};

  for (const stage of stages) {
    const means = materials
      .map((m) => m[`${stage}_mean`])
      .filter((v) => v !== null && v !== undefined)
      .map(Number);

    if (means.length === 0) continue;

    const mean = means.reduce((a, b) => a + b, 0) / means.length;
    const min = Math.min(...means);
    const max = Math.max(...means);
    const sd = Math.sqrt(
      means.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) / means.length
    );

    const sorted = [...means].sort((a, b) => a - b);
    const byPercentile: Record<string, Amount> = {};
    for (const p of [10, 20, 30, 40, 50, 60, 70, 80, 90]) {
      const index = Math.ceil((p / 100) * sorted.length) - 1;
      byPercentile[String(p)] = { qty: sorted[Math.max(0, index)], unit: 'kgCO2e' };
    }

    impactStatistics[stage.toUpperCase()] = {
      mean: { qty: mean, unit: 'kgCO2e' },
      min: { qty: min, unit: 'kgCO2e' },
      max: { qty: max, unit: 'kgCO2e' },
      sd,
      byPercentile,
    };
  }

  return {
    epdCount: materials.reduce((sum, m) => sum + (m.epd_count || 0), 0),
    industryEpdCount: materials.reduce((sum, m) => sum + (m.industry_epd_count || 0), 0),
    genericEstimateCount: materials.reduce((sum, m) => sum + (m.generic_estimate_count || 0), 0),
    impactStatistics,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
