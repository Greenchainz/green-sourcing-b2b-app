/**
 * Carbon Report — shared types and pure computation.
 *
 * This file is imported by both server (carbon-report-generator service) and
 * client (CarbonComparisonChart, CarbonDashboard) so it must contain NO
 * server-only imports (no drizzle-orm, no pg, no Node built-ins).
 */

// ─── Minimal EPD row shape expected by the generator ─────────────────────────

export interface EpdMaterialRow {
  assemblyType?: string | null;
  coreOption?: number | null;
  /** Stored as a decimal string from the DB; the generator handles both */
  gwpPer1000sf?: string | number | null;
  productName: string;
}

// ─── Output types ─────────────────────────────────────────────────────────────

export interface AssemblyDataPoint {
  name: string;
  option1?: number | null;
  option2?: number | null;
  option3?: number | null;
}

export interface UnitizedDataPoint {
  name: string;
  gwp: number;
}

export interface CarbonReportMetadata {
  generatedAt: string;
  projectId?: string;
  totalAssemblies: number;
}

export interface CarbonReportData {
  /** Grouped bar data: assemblies that have core options 1/2/3 */
  multiOptionAssemblies: AssemblyDataPoint[];
  /** Horizontal bar data: fixed / unitized assemblies (no core options) */
  unitizedAssemblies: UnitizedDataPoint[];
  lowestCarbonAssembly: { name: string; value: number } | null;
  highestCarbonAssembly: { name: string; value: number } | null;
  metadata: CarbonReportMetadata;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toNumber(v: string | number | null | undefined): number | null {
  if (v == null) return null;
  const n = typeof v === "string" ? parseFloat(v) : v;
  return isNaN(n) ? null : n;
}

// ─── Generator ────────────────────────────────────────────────────────────────

/**
 * Build a CarbonReportData object from an array of EPD material rows.
 * Pure function — safe to call in both Node and browser environments.
 *
 * @param materials  EPD material records (already filtered / grouped by caller)
 * @param projectId  Optional project identifier added to metadata
 */
export function generateCarbonReport(
  materials: EpdMaterialRow[],
  projectId?: string
): CarbonReportData {
  // Group rows by assemblyType
  const byAssembly = new Map<string, EpdMaterialRow[]>();
  for (const m of materials) {
    const key = m.assemblyType ?? "Unknown";
    if (!byAssembly.has(key)) byAssembly.set(key, []);
    byAssembly.get(key)!.push(m);
  }

  const multiOptionAssemblies: AssemblyDataPoint[] = [];
  const unitizedAssemblies: UnitizedDataPoint[] = [];

  for (const [name, rows] of byAssembly.entries()) {
    const hasCoreOptions = rows.some((r) => r.coreOption != null);

    if (hasCoreOptions) {
      const point: AssemblyDataPoint = { name };
      for (const r of rows) {
        const gwp = toNumber(r.gwpPer1000sf);
        if (r.coreOption === 1) point.option1 = gwp;
        else if (r.coreOption === 2) point.option2 = gwp;
        else if (r.coreOption === 3) point.option3 = gwp;
      }
      multiOptionAssemblies.push(point);
    } else {
      // Use the average gwpPer1000sf for unitized assemblies
      const values = rows
        .map((r) => toNumber(r.gwpPer1000sf))
        .filter((v): v is number => v !== null);
      if (values.length > 0) {
        const avg = values.reduce((a, b) => a + b, 0) / values.length;
        unitizedAssemblies.push({ name, gwp: Math.round(avg) });
      }
    }
  }

  // Determine lowest / highest carbon assembly across all values
  const allValues: { name: string; value: number }[] = [];

  for (const p of multiOptionAssemblies) {
    const vals = [p.option1, p.option2, p.option3].filter(
      (v): v is number => v != null
    );
    if (vals.length > 0) {
      allValues.push({ name: p.name, value: Math.min(...vals) });
    }
  }
  for (const u of unitizedAssemblies) {
    allValues.push({ name: u.name, value: u.gwp });
  }

  const lowestCarbonAssembly =
    allValues.length > 0
      ? allValues.reduce((a, b) => (a.value < b.value ? a : b))
      : null;

  const highestCarbonAssembly =
    allValues.length > 0
      ? allValues.reduce((a, b) => (a.value > b.value ? a : b))
      : null;

  return {
    multiOptionAssemblies,
    unitizedAssemblies,
    lowestCarbonAssembly,
    highestCarbonAssembly,
    metadata: {
      generatedAt: new Date().toISOString(),
      projectId,
      totalAssemblies: byAssembly.size,
    },
  };
}
