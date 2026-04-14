/**
 * Viability profile CRUD — moved from lib/azure-db.ts during DB consolidation.
 * Uses lib/pg-pool for query execution.
 */
import { query as pgQuery } from './pg-pool';
import type { MaterialViabilityProfile } from '../types/schema';

export async function saveViabilityProfile(
  profile: MaterialViabilityProfile,
): Promise<number> {
  const sql = `
    INSERT INTO viability_profiles (
      product_id, product_name, manufacturer, sku,
      astm_standards, labor_units, otif_metrics,
      environmental_metrics, health_metrics, cost_metrics,
      viability_scores, data_quality, created_by
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
    ON CONFLICT (product_id) DO UPDATE SET
      product_name          = EXCLUDED.product_name,
      manufacturer          = EXCLUDED.manufacturer,
      sku                   = EXCLUDED.sku,
      astm_standards        = EXCLUDED.astm_standards,
      labor_units           = EXCLUDED.labor_units,
      otif_metrics          = EXCLUDED.otif_metrics,
      environmental_metrics = EXCLUDED.environmental_metrics,
      health_metrics        = EXCLUDED.health_metrics,
      cost_metrics          = EXCLUDED.cost_metrics,
      viability_scores      = EXCLUDED.viability_scores,
      data_quality          = EXCLUDED.data_quality,
      updated_at            = CURRENT_TIMESTAMP
    RETURNING id;
  `;

  const result = await pgQuery<{ id: number }>(sql, [
    profile.productId,
    profile.productName,
    profile.manufacturer,
    profile.sku,
    JSON.stringify(profile.astmStandards),
    JSON.stringify(profile.laborUnits),
    JSON.stringify(profile.otifMetrics),
    JSON.stringify(profile.environmentalMetrics),
    JSON.stringify(profile.healthMetrics),
    JSON.stringify(profile.costMetrics),
    JSON.stringify(profile.viabilityScores ?? {}),
    JSON.stringify(profile.dataQuality),
    profile.createdBy,
  ]);

  return result.rows[0].id;
}
