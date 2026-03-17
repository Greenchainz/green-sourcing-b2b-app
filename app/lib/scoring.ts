import { type MaterialDetail } from "../catalog/data";

export interface GCSResult {
  gcs: number;
  sustainabilityScore: number;
  performanceScore: number;
  carbonSavingsPct: number;
  costDeltaPct: number;
  complianceStatus: boolean;
}

export function calculateGCS(material: MaterialDetail): GCSResult {
  const certificationSet = new Set(material.certifications);

  // ── Sustainability Score ───────────────────────────────────────────────────
  const carbonRatio =
    material.category_baseline_gwp > 0
      ? material.gwp_per_1000sf / material.category_baseline_gwp
      : 0;
  const rawCarbonScore = Math.max(0, Math.min(100, 100 - carbonRatio * 100));

  let certRaw = 0;
  if (certificationSet.has("epd")) certRaw += 40;
  if (certificationSet.has("declare")) certRaw += 15;
  if (certificationSet.has("cradle-to-cradle")) certRaw += 10;
  if (certificationSet.has("fsc")) certRaw += 5;
  if (certificationSet.has("greenguard")) certRaw += 5;
  if (material.hpd_available) certRaw += 25;
  const certScore = Math.min(100, certRaw);

  const recycledScore = Math.min(100, (material.recycledContent ?? 0) * 2);
  const regionalScore = material.regional_within_500mi ? 100 : 0;

  const sustainabilityScore =
    rawCarbonScore * 0.5 +
    certScore * 0.3 +
    recycledScore * 0.1 +
    regionalScore * 0.1;

  // ── Performance Score ──────────────────────────────────────────────────────
  let complianceRaw = 0;
  if (material.epd_number) complianceRaw += 30;
  if (material.astm_standards.length > 0) complianceRaw += 25;
  if (material.specifications?.["Fire Rating"]) complianceRaw += 10;
  if (material.voc_compliant) complianceRaw += 20;
  // IECC compliant — treat as true when EPD is present and fire rating documented
  if (material.epd_number && material.specifications?.["Fire Rating"]) complianceRaw += 15;
  const complianceScore = Math.min(100, complianceRaw);

  const costScore = 60;

  const availabilityScore = Math.max(0, Math.min(100, 100 - material.lead_time_days * 2));

  let healthRaw = 0;
  if (material.voc_compliant) healthRaw += 40;
  if (material.not_on_red_list) healthRaw += 30;
  if (material.hpd_available) healthRaw += 20;
  if (certificationSet.has("greenguard")) healthRaw += 10;
  const healthScore = Math.min(100, healthRaw);

  const performanceScore =
    complianceScore * 0.35 +
    costScore * 0.25 +
    availabilityScore * 0.25 +
    healthScore * 0.15;

  // ── GCS ───────────────────────────────────────────────────────────────────
  const gcs = Math.round(sustainabilityScore * 0.6 + performanceScore * 0.4);
  const carbonSavingsPct = Math.round((1 - carbonRatio) * 100 * 10) / 10;
  const complianceStatus =
    !!material.epd_number && material.astm_standards.length > 0;

  return {
    gcs,
    sustainabilityScore: Math.round(sustainabilityScore),
    performanceScore: Math.round(performanceScore),
    carbonSavingsPct,
    costDeltaPct: 0,
    complianceStatus,
  };
}
