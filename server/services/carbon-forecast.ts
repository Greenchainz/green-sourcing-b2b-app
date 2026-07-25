/**
 * Carbon Forecast Service
 *
 * Estimates total embodied carbon (kgCO2e) for an RFQ before purchase orders
 * are placed. Used on the RFQ review step so architects can see carbon impact
 * at the moment they're specifying materials — not after.
 *
 * Calculation order of preference:
 *   1. DB average GWP for EPD-verified materials in the matched category
 *   2. EC3 industry-average benchmark table (hardcoded, sourced from
 *      Building Transparency EC3 North America 2023 dataset)
 *
 * All output is A1–A3 embodied carbon (cradle-to-gate).
 */

import { getDb } from "../db";
import { materials } from "../../drizzle/schema";
import { eq, and, isNotNull, avg, like } from "drizzle-orm";

// ── EC3 industry-average benchmarks (kgCO2e per user-facing unit, A1-A3) ──────
// Source: Building Transparency EC3 North America 2023 dataset averages.
// These are conservative midpoints — actual EPD values can be 30–60% lower.
// Units: SF = square foot, LF = linear foot, CY = cubic yard, tons = short tons, EA = each

type QuantityUnit = "SF" | "LF" | "CY" | "tons" | "EA";

interface BenchmarkRow {
  SF: number;
  LF: number;
  CY: number;
  tons: number;
  EA: number;
  // industry average GWP in kgCO2e/kg for DB-lookup path
  kgCO2ePerKg: number;
  // LEED MR Credit 3 typical threshold comment
  leedThresholdNote: string;
}

const EC3_BENCHMARKS: Record<string, BenchmarkRow> = {
  "Concrete & Masonry": {
    SF: 13.5, LF: 45.0, CY: 280.0, tons: 85.0, EA: 600.0,
    kgCO2ePerKg: 0.095,
    leedThresholdNote: "Below 275 kgCO2e/m³ qualifies for LEED MR Credit 3 (concrete EPD path)",
  },
  "Steel & Metal": {
    SF: 8.2, LF: 32.0, CY: 7850.0, tons: 750.0, EA: 180.0,
    kgCO2ePerKg: 0.828,
    leedThresholdNote: "North American structural steel avg: 0.83 kgCO2e/kg. EAF mills average 0.45 kgCO2e/kg",
  },
  "Timber & Wood": {
    SF: 1.8, LF: 6.0, CY: 120.0, tons: 220.0, EA: 30.0,
    kgCO2ePerKg: 0.242,
    leedThresholdNote: "FSC-certified mass timber can be carbon-negative; counts toward LEED MR biobased credits",
  },
  "Insulation": {
    SF: 0.3, LF: 0.8, CY: 15.0, tons: 180.0, EA: 4.0,
    kgCO2ePerKg: 1.8,
    leedThresholdNote: "Mineral wool and cellulose typically 70–80% below blown polyiso benchmark",
  },
  "Roofing": {
    SF: 2.1, LF: 5.0, CY: 500.0, tons: 90.0, EA: 25.0,
    kgCO2ePerKg: 0.45,
    leedThresholdNote: "Cool roof + low-GWP membrane can contribute to EA Credit 2 energy modeling",
  },
  "Flooring": {
    SF: 1.9, LF: 4.5, CY: 400.0, tons: 100.0, EA: 20.0,
    kgCO2ePerKg: 0.38,
    leedThresholdNote: "Reclaimed wood and recycled-content tile are typical low-carbon spec paths",
  },
  "Glazing & Windows": {
    SF: 12.0, LF: 55.0, CY: 2500.0, tons: 680.0, EA: 85.0,
    kgCO2ePerKg: 0.86,
    leedThresholdNote: "Triple-pane IGUs offset GWP via HVAC energy reduction — document in energy model",
  },
  "Cladding & Facades": {
    SF: 9.5, LF: 38.0, CY: 1800.0, tons: 420.0, EA: 150.0,
    kgCO2ePerKg: 0.62,
    leedThresholdNote: "Reclaimed terracotta and fiber cement have 40–60% lower GWP than aluminum panel systems",
  },
  "HVAC Systems": {
    SF: 3.5, LF: 12.0, CY: 900.0, tons: 450.0, EA: 120.0,
    kgCO2ePerKg: 0.5,
    leedThresholdNote: "Low-GWP refrigerants (R-32, R-454B) are required for LEED v4.1 EA Credit 4",
  },
  "Plumbing": {
    SF: 1.2, LF: 8.5, CY: 600.0, tons: 380.0, EA: 45.0,
    kgCO2ePerKg: 0.42,
    leedThresholdNote: "Copper vs. PEX vs. cast iron vary 3–5× in embodied carbon per LF",
  },
  "Electrical": {
    SF: 0.9, LF: 4.0, CY: 400.0, tons: 320.0, EA: 35.0,
    kgCO2ePerKg: 0.35,
    leedThresholdNote: "Electrical systems are rarely the primary embodied carbon driver — focus on structure first",
  },
  "Interior Finishes": {
    SF: 1.4, LF: 3.2, CY: 300.0, tons: 150.0, EA: 18.0,
    kgCO2ePerKg: 0.3,
    leedThresholdNote: "Low-VOC + recycled-content specification frequently bundles with EQ Credit 2",
  },
  "Doors & Hardware": {
    SF: 4.5, LF: 18.0, CY: 1200.0, tons: 280.0, EA: 42.0,
    kgCO2ePerKg: 0.55,
    leedThresholdNote: "Steel fire doors have 3–4× the GWP of solid-wood equivalents; consider FSC-certified wood core",
  },
};

// Fallback for any unmapped category
const DEFAULT_BENCHMARK: BenchmarkRow = {
  SF: 5.0, LF: 15.0, CY: 500.0, tons: 300.0, EA: 80.0,
  kgCO2ePerKg: 0.4,
  leedThresholdNote: "Use an EPD to get a precise GWP value for LEED MR credit documentation",
};

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ForecastItem {
  category: string;
  quantity: number;
  unit: QuantityUnit;
  materialId?: number;
}

export interface ForecastBreakdownRow {
  category: string;
  quantity: number;
  unit: QuantityUnit;
  gwpPerUnit: number;        // kgCO2e per 1 [unit]
  totalKgCO2e: number;
  industryAvgPerUnit: number;
  percentVsIndustry: number; // negative = better than avg, positive = worse
  source: "epd_db" | "ec3_benchmark";
}

export interface CarbonForecastResult {
  totalKgCO2e: number;
  breakdown: ForecastBreakdownRow[];
  confidence: "high" | "medium" | "low";
  leedContext: string;
  epdCoverage: number;       // 0–1: fraction of line items backed by DB EPD data
}

// ── Main export ───────────────────────────────────────────────────────────────

export async function forecastRfqCarbon(
  items: ForecastItem[]
): Promise<CarbonForecastResult> {
  if (items.length === 0) {
    return { totalKgCO2e: 0, breakdown: [], confidence: "low", leedContext: "", epdCoverage: 0 };
  }

  const db = await getDb();
  const breakdown: ForecastBreakdownRow[] = [];
  let epdItems = 0;

  for (const item of items) {
    const benchmark = EC3_BENCHMARKS[item.category] ?? DEFAULT_BENCHMARK;
    let gwpPerUnit = benchmark[item.unit as QuantityUnit] ?? benchmark.SF;
    let source: "epd_db" | "ec3_benchmark" = "ec3_benchmark";

    // ── Try DB first: average GWP for EPD-verified materials in this category ─
    if (db) {
      try {
        const [row] = await db
          .select({ avgGwp: avg(materials.gwpValue) })
          .from(materials)
          .where(
            and(
              eq(materials.hasEpd, true),
              isNotNull(materials.gwpValue),
              like(materials.category, `%${item.category.split(" ")[0]}%`)
            )
          );

        const dbGwp = row?.avgGwp ? Number(row.avgGwp) : null;

        if (dbGwp !== null && dbGwp > 0) {
          // DB stores GWP in kgCO2e/kg — convert to the user's unit
          // using the category's kg-per-unit factor derived from benchmark table
          const kgPerUnit = benchmark[item.unit as QuantityUnit] / benchmark.kgCO2ePerKg;
          gwpPerUnit = dbGwp * kgPerUnit;
          source = "epd_db";
          epdItems++;
        }
      } catch {
        // DB lookup failed — fall through to benchmark
      }
    }

    const industryAvgPerUnit = benchmark[item.unit as QuantityUnit] ?? benchmark.SF;
    const totalKgCO2e = gwpPerUnit * item.quantity;
    const percentVsIndustry =
      industryAvgPerUnit > 0
        ? ((gwpPerUnit - industryAvgPerUnit) / industryAvgPerUnit) * 100
        : 0;

    breakdown.push({
      category: item.category,
      quantity: item.quantity,
      unit: item.unit,
      gwpPerUnit: Math.round(gwpPerUnit * 100) / 100,
      totalKgCO2e: Math.round(totalKgCO2e * 10) / 10,
      industryAvgPerUnit: Math.round(industryAvgPerUnit * 100) / 100,
      percentVsIndustry: Math.round(percentVsIndustry * 10) / 10,
      source,
    });
  }

  const totalKgCO2e = breakdown.reduce((sum, r) => sum + r.totalKgCO2e, 0);
  const epdCoverage = items.length > 0 ? epdItems / items.length : 0;

  // Confidence: high if majority of items have EPD DB data, low if all benchmark
  const confidence: "high" | "medium" | "low" =
    epdCoverage >= 0.66 ? "high" : epdCoverage >= 0.33 ? "medium" : "low";

  // LEED context: pull the note from the dominant category (highest GWP contributor)
  const topRow = [...breakdown].sort((a, b) => b.totalKgCO2e - a.totalKgCO2e)[0];
  const topBenchmark = EC3_BENCHMARKS[topRow?.category ?? ""] ?? DEFAULT_BENCHMARK;
  const leedContext = topBenchmark.leedThresholdNote;

  return {
    totalKgCO2e: Math.round(totalKgCO2e * 10) / 10,
    breakdown,
    confidence,
    leedContext,
    epdCoverage: Math.round(epdCoverage * 100) / 100,
  };
}
