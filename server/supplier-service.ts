import { getDb } from "./db";
import { suppliers, supplierSubscriptions, users } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";

/**
 * Supplier Registration & Profile Management Service
 * Handles supplier onboarding, profile management, and subscription tier selection
 */

export interface SupplierRegistrationInput {
  userId: number;
  companyName: string;
  email: string;
  phone?: string;
  address?: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  website?: string;
}

export interface SupplierProfile {
  id: number;
  userId: number;
  companyName: string;
  email: string;
  phone?: string;
  address?: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  website?: string;
  logoUrl?: string;
  isPremium: boolean;
  premiumExpiresAt?: Date;
  sustainabilityScore?: number;
  verified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Register a new supplier
 */
export async function registerSupplier(input: SupplierRegistrationInput): Promise<SupplierProfile> {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  // Check if supplier already exists for this user
  const existing = await db
    .select()
    .from(suppliers)
    .where(eq(suppliers.userId, input.userId))
    .limit(1);

  if (existing.length > 0) {
    throw new Error("Supplier profile already exists for this user");
  }

  // Create supplier profile
  const result = await db.insert(suppliers).values({
    userId: input.userId,
    companyName: input.companyName,
    email: input.email,
    phone: input.phone,
    address: input.address,
    city: input.city,
    state: input.state,
    zipCode: input.zipCode,
    country: input.country,
    website: input.website,
    isPremium: 0,
    verified: 0,
  });

  const supplierId = (result[0] as any)?.insertId || 1;

  // Create free subscription by default
  await db.insert(supplierSubscriptions).values({
    supplierId: supplierId,
    tier: "free",
    status: "active",
  });

  // Fetch and return the created profile
  const profile = await db
    .select()
    .from(suppliers)
    .where(eq(suppliers.id, supplierId))
    .limit(1);

  if (!profile.length) throw new Error("Failed to create supplier profile");

  return {
    id: profile[0].id,
    userId: profile[0].userId,
    companyName: profile[0].companyName,
    email: profile[0].email,
    phone: profile[0].phone || undefined,
    address: profile[0].address || undefined,
    city: profile[0].city || "",
    state: profile[0].state || "",
    zipCode: profile[0].zipCode || "",
    country: profile[0].country || "",
    website: profile[0].website || undefined,
    logoUrl: profile[0].logoUrl || undefined,
    isPremium: profile[0].isPremium === 1,
    premiumExpiresAt: profile[0].premiumExpiresAt || undefined,
    sustainabilityScore: profile[0].sustainabilityScore ? Number(profile[0].sustainabilityScore) : undefined,
    verified: profile[0].verified === 1,
    createdAt: profile[0].createdAt,
    updatedAt: profile[0].updatedAt,
  };
}

/**
 * Get supplier profile by user ID
 */
export async function getSupplierProfile(userId: number): Promise<SupplierProfile | null> {
  const db = await getDb();
  if (!db) return null;

  const profile = await db
    .select()
    .from(suppliers)
    .where(eq(suppliers.userId, userId))
    .limit(1);

  if (!profile.length) return null;

  return {
    id: profile[0].id,
    userId: profile[0].userId,
    companyName: profile[0].companyName,
    email: profile[0].email,
    phone: profile[0].phone || undefined,
    address: profile[0].address || undefined,
    city: profile[0].city || "",
    state: profile[0].state || "",
    zipCode: profile[0].zipCode || "",
    country: profile[0].country || "",
    website: profile[0].website || undefined,
    logoUrl: profile[0].logoUrl || undefined,
    isPremium: profile[0].isPremium === 1,
    premiumExpiresAt: profile[0].premiumExpiresAt || undefined,
    sustainabilityScore: profile[0].sustainabilityScore ? Number(profile[0].sustainabilityScore) : undefined,
    verified: profile[0].verified === 1,
    createdAt: profile[0].createdAt,
    updatedAt: profile[0].updatedAt,
  };
}

/**
 * Update supplier profile
 */
export async function updateSupplierProfile(
  userId: number,
  updates: Partial<SupplierRegistrationInput>
): Promise<SupplierProfile> {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  // Find supplier by user ID
  const existing = await db
    .select()
    .from(suppliers)
    .where(eq(suppliers.userId, userId))
    .limit(1);

  if (!existing.length) {
    throw new Error("Supplier profile not found");
  }

  const supplierId = existing[0].id;

  // Update supplier profile
  await db
    .update(suppliers)
    .set({
      companyName: updates.companyName || existing[0].companyName,
      email: updates.email || existing[0].email,
      phone: updates.phone !== undefined ? updates.phone : existing[0].phone,
      address: updates.address !== undefined ? updates.address : existing[0].address,
      city: updates.city || existing[0].city || "",
      state: updates.state || existing[0].state || "",
      zipCode: updates.zipCode || existing[0].zipCode || "",
      country: updates.country || existing[0].country || "",
      website: updates.website !== undefined ? updates.website : existing[0].website,
      updatedAt: new Date(),
    })
    .where(eq(suppliers.id, supplierId));

  // Fetch and return updated profile
  const updated = await db
    .select()
    .from(suppliers)
    .where(eq(suppliers.id, supplierId))
    .limit(1);

  if (!updated.length) throw new Error("Failed to update supplier profile");

  return {
    id: updated[0].id,
    userId: updated[0].userId,
    companyName: updated[0].companyName,
    email: updated[0].email,
    phone: updated[0].phone || undefined,
    address: updated[0].address || undefined,
    city: updated[0].city || "",
    state: updated[0].state || "",
    zipCode: updated[0].zipCode || "",
    country: updated[0].country || "",
    website: updated[0].website || undefined,
    logoUrl: updated[0].logoUrl || undefined,
    isPremium: updated[0].isPremium === 1,
    premiumExpiresAt: updated[0].premiumExpiresAt || undefined,
    sustainabilityScore: updated[0].sustainabilityScore ? Number(updated[0].sustainabilityScore) : undefined,
    verified: updated[0].verified === 1,
    createdAt: updated[0].createdAt,
    updatedAt: updated[0].updatedAt,
  };
}

/**
 * Get subscription tier for supplier
 */
export async function getSubscriptionTier(supplierId: number): Promise<"free" | "premium"> {
  const db = await getDb();
  if (!db) return "free";

  const subscription = await db
    .select()
    .from(supplierSubscriptions)
    .where(eq(supplierSubscriptions.supplierId, supplierId))
    .limit(1);

  if (!subscription.length) return "free";

  // Check if premium subscription is still active
  if (subscription[0].tier === "premium" && subscription[0].renewalDate) {
    if (new Date(subscription[0].renewalDate) > new Date()) {
      return "premium";
    }
  }

  return subscription[0].tier === "premium" ? "premium" : "free";
}

/**
 * Upgrade supplier to premium tier
 */
export async function upgradeToPremium(
  supplierId: number,
  msSubscriptionId: string,
  msPlanId: string,
  renewalDate: Date
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  // Update supplier to premium
  await db
    .update(suppliers)
    .set({
      isPremium: 1,
      premiumExpiresAt: renewalDate,
      updatedAt: new Date(),
    })
    .where(eq(suppliers.id, supplierId));

  // Update or create subscription
  const existing = await db
    .select()
    .from(supplierSubscriptions)
    .where(eq(supplierSubscriptions.supplierId, supplierId))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(supplierSubscriptions)
      .set({
        tier: "premium",
        msSubscriptionId,
        msPlanId,
        status: "active",
        renewalDate,
        updatedAt: new Date(),
      })
      .where(eq(supplierSubscriptions.supplierId, supplierId));
  } else {
    await db.insert(supplierSubscriptions).values({
      supplierId,
      tier: "premium",
      msSubscriptionId,
      msPlanId,
      status: "active",
      renewalDate,
    });
  }
}

/**
 * Downgrade supplier to free tier
 */
export async function downgradeToFree(supplierId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  // Update supplier to free
  await db
    .update(suppliers)
    .set({
      isPremium: 0,
      premiumExpiresAt: null,
      updatedAt: new Date(),
    })
    .where(eq(suppliers.id, supplierId));

  // Update subscription
  await db
    .update(supplierSubscriptions)
    .set({
      tier: "free",
      status: "active",
      msSubscriptionId: undefined,
      msPlanId: undefined,
      renewalDate: undefined,
      updatedAt: new Date(),
    })
    .where(eq(supplierSubscriptions.supplierId, supplierId));
}
