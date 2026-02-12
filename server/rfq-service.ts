import { getDb } from "./db";
import { rfqs, rfqItems, rfqBids, rfqThreads, rfqMessages, suppliers, supplierFilters, notifications, rfqAnalytics, materials } from "../drizzle/schema";
import { eq, and, or, gte, lte, desc, sql } from "drizzle-orm";
import { calculateCcps, personaToWeights } from "./ccps-engine";
import type { PersonaWeights } from "./ccps-engine";

/**
 * RFQ Service — Handles RFQ lifecycle, supplier matching, bidding, and messaging
 */

export interface RfqSubmissionInput {
  projectName: string;
  projectLocation: string;
  projectType?: string;
  materials: Array<{ materialId: number; quantity: number; quantityUnit: string }>;
  notes?: string;
  dueDate?: Date;
  buyerPersona?: string;
}

export interface SupplierMatch {
  supplierId: number;
  companyName: string;
  email: string;
  phone?: string;
  isPremium: boolean;
  sustainabilityScore?: number;
  matchScore: number; // 0-100, based on filters + location + premium status
  exclusiveWindowExpiresAt?: Date;
}

export interface RfqWithBids {
  rfq: typeof rfqs.$inferSelect;
  items: (typeof rfqItems.$inferSelect)[];
  bids: Array<typeof rfqBids.$inferSelect & { supplierName: string; supplierEmail: string }>;
  analytics?: typeof rfqAnalytics.$inferSelect;
}

/**
 * Submit an RFQ and automatically match to suppliers
 */
export async function submitRfq(userId: number, input: RfqSubmissionInput): Promise<{ rfqId: number; matchedSuppliers: SupplierMatch[] }> {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  // Create RFQ
  const [rfqResult] = await db
    .insert(rfqs)
    .values({
      userId,
      projectName: input.projectName,
      projectLocation: input.projectLocation,
      projectType: input.projectType,
      status: "submitted",
      notes: input.notes,
      dueDate: input.dueDate,
    })
    .execute();

  const rfqId = (rfqResult as any).insertId;

  // Add RFQ items
  for (const item of input.materials) {
    await db
      .insert(rfqItems)
      .values({
        rfqId,
        materialId: item.materialId,
        quantity: item.quantity.toString(),
        quantityUnit: item.quantityUnit,
      })
      .execute();
  }

  // Match to suppliers (premium first, then others)
  const matchedSuppliers = await matchSuppliersToRfq(rfqId, input.projectLocation, input.materials);

  // Send notifications to matched suppliers
  const { sendInAppNotification } = await import("./notification-service");
  for (const match of matchedSuppliers) {
    // Get supplier's userId
    const [supplierRecord] = await db
      .select({ userId: suppliers.userId, companyName: suppliers.companyName })
      .from(suppliers)
      .where(eq(suppliers.id, match.supplierId))
      .execute();

    if (supplierRecord) {
      await sendInAppNotification({
        userId: supplierRecord.userId,
        type: "rfq_new",
        title: "New RFQ Available",
        content: `${input.projectName} - ${input.materials.length} material${input.materials.length > 1 ? 's' : ''} requested`,
        metadata: JSON.stringify({ rfqId, matchScore: match.matchScore }),
      });
    }
  }

  // Create RFQ analytics entry
  await db
    .insert(rfqAnalytics)
    .values({
      rfqId,
      totalBidsReceived: 0,
    })
    .execute();

  return { rfqId, matchedSuppliers };
}

/**
 * Match suppliers to an RFQ based on location, filters, and premium status
 */
async function matchSuppliersToRfq(
  rfqId: number,
  projectLocation: string,
  materials: Array<{ materialId: number; quantity: number; quantityUnit: string }>
): Promise<SupplierMatch[]> {
  const db = await getDb();
  if (!db) return [];

  // Get all active suppliers
  const allSuppliers = await db.select().from(suppliers).where(eq(suppliers.verified, 1)).execute();

  const matches: SupplierMatch[] = [];

  for (const supplier of allSuppliers) {
    // Get supplier filters
    const filters = await db
      .select()
      .from(supplierFilters)
      .where(eq(supplierFilters.supplierId, supplier.id))
      .execute();

    // Check if supplier accepts this location
    const acceptsLocation = filters.some((f) => {
      if (!f.acceptedLocations) return true; // No location filter = accepts all
      const locations = JSON.parse(f.acceptedLocations || "[]");
      return locations.includes(projectLocation) || locations.length === 0;
    });

    if (!acceptsLocation) continue;

    // Calculate match score (0-100)
    let matchScore = 50; // Base score

    // Premium bonus
    if (supplier.isPremium) matchScore += 20;

    // Sustainability score bonus
    if (supplier.sustainabilityScore) {
      const scoreNum = typeof supplier.sustainabilityScore === 'string' ? parseFloat(supplier.sustainabilityScore) : supplier.sustainabilityScore;
      matchScore += Math.min(scoreNum / 100, 1) * 20;
    }

    // Location proximity bonus (simplified)
    if (supplier.state === projectLocation) matchScore += 10;

    matches.push({
      supplierId: supplier.id,
      companyName: supplier.companyName,
      email: supplier.email,
      phone: supplier.phone || undefined,
      isPremium: supplier.isPremium === 1,
      sustainabilityScore: supplier.sustainabilityScore ? parseFloat(supplier.sustainabilityScore.toString()) : undefined,
      matchScore: Math.min(matchScore, 100),
      exclusiveWindowExpiresAt: supplier.isPremium ? new Date(Date.now() + 24 * 60 * 60 * 1000) : undefined,
    });
  }

  // Sort by match score (premium first, then by score)
  return matches.sort((a, b) => {
    if (a.isPremium && !b.isPremium) return -1;
    if (!a.isPremium && b.isPremium) return 1;
    return b.matchScore - a.matchScore;
  });
}

/**
 * Get RFQ details with bids and analytics
 */
export async function getRfqWithBids(rfqId: number): Promise<RfqWithBids | null> {
  const db = await getDb();
  if (!db) return null;

  const rfq = await db.select().from(rfqs).where(eq(rfqs.id, rfqId)).execute();
  if (!rfq || rfq.length === 0) return null;

  const items = await db.select().from(rfqItems).where(eq(rfqItems.rfqId, rfqId)).execute();

  const bidsWithSuppliers = await db
    .select({
      bid: rfqBids,
      supplierName: suppliers.companyName,
      supplierEmail: suppliers.email,
    })
    .from(rfqBids)
    .leftJoin(suppliers, eq(rfqBids.supplierId, suppliers.id))
    .where(eq(rfqBids.rfqId, rfqId))
    .execute();

  const analytics = await db.select().from(rfqAnalytics).where(eq(rfqAnalytics.rfqId, rfqId)).execute();

  return {
    rfq: rfq[0],
    items,
    bids: bidsWithSuppliers.map((b) => ({
      ...b.bid,
      supplierName: b.supplierName || "Unknown",
      supplierEmail: b.supplierEmail || "",
    })),
    analytics: analytics[0],
  };
}

/**
 * Submit a bid for an RFQ
 */
export async function submitBid(
  rfqId: number,
  supplierId: number,
  bidPrice: number,
  leadDays: number,
  notes?: string
): Promise<{ bidId: number }> {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  const [bidResult] = await db
    .insert(rfqBids)
    .values({
      rfqId,
      supplierId,
      status: "submitted",
      bidPrice: bidPrice.toString(),
      leadDays,
      notes,
      expiresAt,
    })
    .execute();

  const bidId = (bidResult as any).insertId;

  // Update RFQ analytics
  const analytics = await db.select().from(rfqAnalytics).where(eq(rfqAnalytics.rfqId, rfqId)).execute();
  if (analytics.length > 0) {
    const currentBids = analytics[0].totalBidsReceived || 0;
    const newAvgPrice = analytics[0].avgBidPrice ? (parseFloat(analytics[0].avgBidPrice.toString()) * currentBids + bidPrice) / (currentBids + 1) : bidPrice;
    const newLowest = analytics[0].lowestBidPrice ? Math.min(parseFloat(analytics[0].lowestBidPrice.toString()), bidPrice) : bidPrice;
    const newHighest = analytics[0].highestBidPrice ? Math.max(parseFloat(analytics[0].highestBidPrice.toString()), bidPrice) : bidPrice;

    await db
      .update(rfqAnalytics)
      .set({
        totalBidsReceived: currentBids + 1,
        avgBidPrice: newAvgPrice.toString(),
        lowestBidPrice: newLowest.toString(),
        highestBidPrice: newHighest.toString(),
      })
      .where(eq(rfqAnalytics.rfqId, rfqId))
      .execute();
  }

  // Notify buyer of new bid (skip for now - userId mapping needed)
  // TODO: Send notification to buyer when bid is submitted

  return { bidId };
}

/**
 * Create or get a message thread between buyer and supplier for an RFQ
 */
export async function getOrCreateThread(rfqId: number, supplierId: number, buyerId: number): Promise<{ threadId: number }> {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  // Check if thread already exists
  const existing = await db
    .select()
    .from(rfqThreads)
    .where(and(eq(rfqThreads.rfqId, rfqId), eq(rfqThreads.supplierId, supplierId), eq(rfqThreads.buyerId, buyerId)))
    .execute();

  if (existing.length > 0) {
    return { threadId: existing[0].id };
  }

  // Create new thread
  const [threadResult] = await db
    .insert(rfqThreads)
    .values({
      rfqId,
      supplierId,
      buyerId,
      status: "active",
    })
    .execute();

  return { threadId: (threadResult as any).insertId };
}

/**
 * Send a message in an RFQ thread
 */
export async function sendMessage(threadId: number, senderId: number, senderType: "buyer" | "supplier", content: string): Promise<{ messageId: number }> {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  // Validate message length (encourage short messages)
  if (content.length > 1000) {
    throw new Error("Message too long (max 1000 characters)");
  }

  const [msgResult] = await db
    .insert(rfqMessages)
    .values({
      threadId,
      senderId,
      senderType,
      content,
      isRead: 0,
    })
    .execute();

  const messageId = (msgResult as any).insertId;

  // Update thread's lastMessageAt
  await db.update(rfqThreads).set({ lastMessageAt: new Date() }).where(eq(rfqThreads.id, threadId)).execute();

  // Notify the other party (skip for now - userId mapping needed)
  // TODO: Send notification when message is received

  return { messageId };
}

/**
 * Get all messages in a thread
 */
export async function getThreadMessages(threadId: number, limit: number = 50): Promise<(typeof rfqMessages.$inferSelect)[]> {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(rfqMessages)
    .where(eq(rfqMessages.threadId, threadId))
    .orderBy(desc(rfqMessages.createdAt))
    .limit(limit)
    .execute();
}

/**
 * Accept a bid and close RFQ
 */
export async function acceptBid(rfqId: number, bidId: number): Promise<{ success: boolean }> {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  // Update bid status
  await db.update(rfqBids).set({ status: "accepted" }).where(eq(rfqBids.id, bidId)).execute();

  // Update RFQ status
  await db.update(rfqs).set({ status: "awarded" }).where(eq(rfqs.id, rfqId)).execute();

  // Reject all other bids
  await db
    .update(rfqBids)
    .set({ status: "rejected" })
    .where(and(eq(rfqBids.rfqId, rfqId), sql`id != ${bidId}`))
    .execute();

  // Update analytics
  await db
    .update(rfqAnalytics)
    .set({ winningBidId: bidId, purchasedAt: new Date() })
    .where(eq(rfqAnalytics.rfqId, rfqId))
    .execute();

  // Notify all suppliers (skip for now - userId mapping needed)
  // TODO: Send notifications to all suppliers whose bids were rejected

  return { success: true };
}

/**
 * Enrich RFQ with CCPS data and sustainability insights (for agent)
 */
export async function enrichRfqWithCcps(rfqId: number, buyerPersona: string = "default"): Promise<{ enrichedData: any }> {
  // Type assertion to fix persona type mismatch
  const personaKey = buyerPersona as any;
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  const rfq = await getRfqWithBids(rfqId);
  if (!rfq) throw new Error("RFQ not found");

  const weights = personaToWeights(personaKey);

  // Calculate CCPS for each material in the RFQ
  const enrichedItems = [];
  for (const item of rfq.items) {
    if (!item.materialId) continue;

    // Get material data from materials table
    const material = await db
      .select()
      .from(materials)
      .where(eq(materials.id, item.materialId))
      .execute();

    if (material.length > 0) {
      // Get baseline for this material
      const baseline = await db
        .select()
        .from(sql`ccps_baselines`)
        .where(sql`materialId = ${item.materialId}`)
        .execute();
      
      const ccps = calculateCcps(material[0] as any, baseline[0] as any, weights as any);
      enrichedItems.push({
        ...item,
        material: material[0] as any,
        ccps,
      });
    }
  }

  return {
    enrichedData: {
      rfq: rfq.rfq as any,
      items: enrichedItems,
      totalBids: rfq.bids.length,
      analytics: rfq.analytics as any,
    },
  };
}
