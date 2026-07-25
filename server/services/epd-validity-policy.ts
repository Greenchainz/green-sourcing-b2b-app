export const SCORE_POLICY = {
  rulesVersion: "ccps-policy-v1",
  cacheTtlHours: Number(process.env.MATERIAL_SCORE_CACHE_TTL_HOURS ?? 24),
  epdWarningDays: Number(process.env.EPD_EXPIRY_WARNING_DAYS ?? 90),
  snapshotRetentionDays: Number(process.env.MATERIAL_SCORE_SNAPSHOT_RETENTION_DAYS ?? 180),
} as const;

export type EpdValidityStatus = "valid" | "expiring_soon" | "expired" | "missing";

export interface EpdValidityEvaluation {
  status: EpdValidityStatus;
  isUsableForScoring: boolean;
  expiresAt: Date | null;
  daysUntilExpiry: number | null;
}

export function evaluateEpdValidity(
  epdExpiry: Date | string | null | undefined,
  now: Date = new Date()
): EpdValidityEvaluation {
  if (!epdExpiry) {
    return {
      status: "missing",
      isUsableForScoring: false,
      expiresAt: null,
      daysUntilExpiry: null,
    };
  }

  const expiresAt = epdExpiry instanceof Date ? epdExpiry : new Date(epdExpiry);
  const daysUntilExpiry = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (daysUntilExpiry < 0) {
    return {
      status: "expired",
      isUsableForScoring: false,
      expiresAt,
      daysUntilExpiry,
    };
  }

  if (daysUntilExpiry < SCORE_POLICY.epdWarningDays) {
    return {
      status: "expiring_soon",
      isUsableForScoring: true,
      expiresAt,
      daysUntilExpiry,
    };
  }

  return {
    status: "valid",
    isUsableForScoring: true,
    expiresAt,
    daysUntilExpiry,
  };
}

