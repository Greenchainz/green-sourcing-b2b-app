import { and, desc, eq, isNotNull, or } from "drizzle-orm";
import {
  rfqSupplierInvites,
  supplierMaterialEpds,
  supplierSubscriptions,
  suppliers,
} from "../../drizzle/schema";
import { getDb } from "../db";

export type VerifiedSupplierStatus = "VERIFIED" | "PARTIAL" | "UNVERIFIED";

export interface SupplierVerificationSnapshot {
  supplierId: number;
  status: VerifiedSupplierStatus;
  reasons: string[];
  computedAt: string;
  expiresAt: string;
  checks: {
    hasVerifiedEpd: boolean;
    onboardingComplete: boolean;
    responsivenessSlaMet: boolean;
    blocked: boolean;
    avgResponseHours: number | null;
    responseSlaHours: number;
  };
}

const DEFAULT_RESPONSE_SLA_HOURS = 48;
const DEFAULT_CACHE_TTL_HOURS = 12;
const RESPONSE_SAMPLE_LIMIT = 50;

function parsePositiveNumber(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function toDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function shouldUseCachedSnapshot(input: {
  status: VerifiedSupplierStatus | null | undefined;
  reasons: string[] | null | undefined;
  computedAt: Date | string | null | undefined;
  expiresAt: Date | string | null | undefined;
  now: Date;
}): boolean {
  const computedAt = toDate(input.computedAt);
  const expiresAt = toDate(input.expiresAt);
  return !!(input.status && computedAt && expiresAt && expiresAt > input.now && Array.isArray(input.reasons));
}

export async function getSupplierVerificationSnapshot(
  supplierId: number,
  options?: { forceRefresh?: boolean }
): Promise<SupplierVerificationSnapshot | null> {
  const db = await getDb();
  if (!db) return null;

  const [supplierRow] = await db
    .select({
      id: suppliers.id,
      companyName: suppliers.companyName,
      contactName: suppliers.contactName,
      email: suppliers.email,
      verificationStatus: suppliers.verificationStatus,
      verifiedSupplierStatus: suppliers.verifiedSupplierStatus,
      verifiedSupplierReasons: suppliers.verifiedSupplierReasons,
      verifiedSupplierComputedAt: suppliers.verifiedSupplierComputedAt,
      verifiedSupplierExpiresAt: suppliers.verifiedSupplierExpiresAt,
    })
    .from(suppliers)
    .where(eq(suppliers.id, supplierId))
    .limit(1);

  if (!supplierRow) return null;

  const now = new Date();
  if (
    !options?.forceRefresh &&
    shouldUseCachedSnapshot({
      status: supplierRow.verifiedSupplierStatus,
      reasons: supplierRow.verifiedSupplierReasons,
      computedAt: supplierRow.verifiedSupplierComputedAt,
      expiresAt: supplierRow.verifiedSupplierExpiresAt,
      now,
    })
  ) {
    return {
      supplierId: supplierRow.id,
      status: supplierRow.verifiedSupplierStatus,
      reasons: supplierRow.verifiedSupplierReasons ?? [],
      computedAt: (supplierRow.verifiedSupplierComputedAt as Date).toISOString(),
      expiresAt: (supplierRow.verifiedSupplierExpiresAt as Date).toISOString(),
      checks: {
        hasVerifiedEpd: !supplierRow.verifiedSupplierReasons?.includes("missing_verified_epd"),
        onboardingComplete: !supplierRow.verifiedSupplierReasons?.includes("onboarding_incomplete"),
        responsivenessSlaMet: !supplierRow.verifiedSupplierReasons?.includes("response_sla_unmet"),
        blocked: supplierRow.verifiedSupplierReasons?.includes("supplier_blocked") ?? false,
        avgResponseHours: null,
        responseSlaHours: parsePositiveNumber(
          process.env.SUPPLIER_RESPONSE_SLA_HOURS,
          DEFAULT_RESPONSE_SLA_HOURS
        ),
      },
    };
  }

  const responseSlaHours = parsePositiveNumber(
    process.env.SUPPLIER_RESPONSE_SLA_HOURS,
    DEFAULT_RESPONSE_SLA_HOURS
  );
  const cacheTtlHours = parsePositiveNumber(
    process.env.SUPPLIER_VERIFICATION_CACHE_TTL_HOURS,
    DEFAULT_CACHE_TTL_HOURS
  );

  const [verifiedEpd] = await db
    .select({ id: supplierMaterialEpds.id })
    .from(supplierMaterialEpds)
    .where(
      and(
        eq(supplierMaterialEpds.supplierId, supplierId),
        or(
          eq(supplierMaterialEpds.status, "approved"),
          eq(supplierMaterialEpds.externallyVerified, true),
          isNotNull(supplierMaterialEpds.verifiedAt)
        )
      )
    )
    .limit(1);

  const [anyProduct] = await db
    .select({ id: supplierMaterialEpds.id })
    .from(supplierMaterialEpds)
    .where(eq(supplierMaterialEpds.supplierId, supplierId))
    .limit(1);

  const inviteRows = await db
    .select({
      notifiedAt: rfqSupplierInvites.notifiedAt,
      respondedAt: rfqSupplierInvites.respondedAt,
    })
    .from(rfqSupplierInvites)
    .where(
      and(
        eq(rfqSupplierInvites.supplierId, supplierId),
        isNotNull(rfqSupplierInvites.notifiedAt),
        isNotNull(rfqSupplierInvites.respondedAt)
      )
    )
    .orderBy(desc(rfqSupplierInvites.notifiedAt))
    .limit(RESPONSE_SAMPLE_LIMIT);

  const [subscriptionRow] = await db
    .select({ status: supplierSubscriptions.status })
    .from(supplierSubscriptions)
    .where(eq(supplierSubscriptions.supplierId, supplierId))
    .orderBy(desc(supplierSubscriptions.updatedAt))
    .limit(1);

  const responseDurations = inviteRows
    .map((r) => {
      const notifiedAt = toDate(r.notifiedAt);
      const respondedAt = toDate(r.respondedAt);
      if (!notifiedAt || !respondedAt) return null;
      const ms = respondedAt.getTime() - notifiedAt.getTime();
      return ms >= 0 ? ms / 3_600_000 : null;
    })
    .filter((hours): hours is number => typeof hours === "number" && Number.isFinite(hours));

  const avgResponseHours =
    responseDurations.length > 0
      ? responseDurations.reduce((sum, value) => sum + value, 0) / responseDurations.length
      : null;

  const hasVerifiedEpd = !!verifiedEpd;
  const onboardingComplete = Boolean(
    supplierRow.companyName?.trim() &&
      supplierRow.contactName?.trim() &&
      supplierRow.email?.trim() &&
      anyProduct
  );
  const responsivenessSlaMet = avgResponseHours != null && avgResponseHours <= responseSlaHours;
  const blocked =
    supplierRow.verificationStatus === "rejected" ||
    subscriptionRow?.status === "suspended" ||
    subscriptionRow?.status === "canceled" ||
    subscriptionRow?.status === "past_due";

  const reasons: string[] = [];
  if (!hasVerifiedEpd) reasons.push("missing_verified_epd");
  if (!onboardingComplete) reasons.push("onboarding_incomplete");
  if (!responsivenessSlaMet) reasons.push("response_sla_unmet");
  if (blocked) reasons.push("supplier_blocked");

  const status: VerifiedSupplierStatus = blocked
    ? "UNVERIFIED"
    : hasVerifiedEpd && onboardingComplete && responsivenessSlaMet
    ? "VERIFIED"
    : hasVerifiedEpd || onboardingComplete || responsivenessSlaMet
    ? "PARTIAL"
    : "UNVERIFIED";

  const expiresAt = new Date(now.getTime() + cacheTtlHours * 60 * 60 * 1000);

  await db
    .update(suppliers)
    .set({
      verifiedSupplierStatus: status,
      verifiedSupplierReasons: reasons,
      verifiedSupplierComputedAt: now,
      verifiedSupplierExpiresAt: expiresAt,
    })
    .where(eq(suppliers.id, supplierId));

  return {
    supplierId,
    status,
    reasons,
    computedAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    checks: {
      hasVerifiedEpd,
      onboardingComplete,
      responsivenessSlaMet,
      blocked,
      avgResponseHours,
      responseSlaHours,
    },
  };
}

export async function getSupplierVerificationSnapshots(
  supplierIds: number[],
  options?: { forceRefresh?: boolean }
): Promise<Map<number, SupplierVerificationSnapshot>> {
  const uniqueIds = [...new Set(supplierIds.filter((id) => Number.isInteger(id) && id > 0))];
  const snapshots = await Promise.all(
    uniqueIds.map(async (supplierId) => getSupplierVerificationSnapshot(supplierId, options))
  );
  const byId = new Map<number, SupplierVerificationSnapshot>();
  for (const snapshot of snapshots) {
    if (snapshot) byId.set(snapshot.supplierId, snapshot);
  }
  return byId;
}
