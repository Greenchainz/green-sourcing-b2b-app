import { EPD_TAGS, CarbonTier } from "@/lib/constants/epd-tags";

export function calculateCarbonTier(gwpPer1000sf: number): CarbonTier {
  if (gwpPer1000sf < 5000) return EPD_TAGS.carbonTier.LOW;
  if (gwpPer1000sf <= 15000) return EPD_TAGS.carbonTier.MID;
  return EPD_TAGS.carbonTier.HIGH;
}

export function calculateGwpPer1000sf(
  gwpA1A3: number,
  gwpMsfFactor: number
): number {
  return Math.round(gwpA1A3 * gwpMsfFactor * 100) / 100;
}
