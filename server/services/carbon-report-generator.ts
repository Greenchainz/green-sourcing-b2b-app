/**
 * Carbon Report Generator Service
 *
 * Thin wrapper around the shared generateCarbonReport utility.
 * Accepts Drizzle EpdMaterial records (server side) and delegates to the
 * pure function in shared/carbon-report.ts.
 */

import type { EpdMaterial } from "../../drizzle/schema";
export type {
  CarbonReportData,
  AssemblyDataPoint,
  UnitizedDataPoint,
  CarbonReportMetadata,
} from "../../shared/carbon-report";
export { generateCarbonReport } from "../../shared/carbon-report";

// Re-export for convenience so callers can pass Drizzle rows directly.
export type { EpdMaterial };
