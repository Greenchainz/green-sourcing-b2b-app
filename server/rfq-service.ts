import { getDb } from "./db";
import { rfqs, rfqItems, rfqBids, rfqThreads, rfqMessages, suppliers, supplierFilters, notifications, rfqAnalytics, materials } from "../drizzle/schema";
import { eq, and, or, gte, lte, desc, sql } from "drizzle-orm";
import { calculateCcps, personaToWeights } from "./ccps-engine";
import type { PersonaWeights } from "./ccps-engine";
import { geocodeAddress, calculateDistance, getDistanceScore, type Coordinates } from "./azure-maps-service";
import { findMatchingSuppliers } from "../lib/greenchainz/matching/rfq-supplier-match";

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

  // Send notifications and create conversations with matched suppliers
  const { sendInAppNotification } = await import("./notification-service");
  const { sendRfqNotificationEmail } = await import("./email-service");
  const { getOrCreateConversation } = await import("./messaging-service");
  
  for (const match of matchedSuppliers) {
    // Get supplier's userId and company name
    const [supplierRecord] = await db
      .select({ 
        userId: suppliers.userId, 
        companyName: suppliers.companyName,
        email: suppliers.email 
      })
      .from(suppliers)
      .where(eq(suppliers.id, match.supplierId))
      .execute();

    if (supplierRecord) {
      // Create conversation between buyer and supplier for this RFQ
      await getOrCreateConversation({
        rfqId: rfqId || null,
        buyerId: userId,
        supplierId: match.supplierId,
      });

      // Send in-app notification
      await sendInAppNotification({
        userId: supplierRecord.userId,
        type: "rfq_new",
        title: "New RFQ Available",
        content: `${input.projectName} - ${input.materials.length} material${input.materials.length > 1 ? 's' : ''} requested. Match score: ${match.matchScore}%`,
        relatedId: rfqId,
      });

      // Send email notification
      await sendRfqNotificationEmail({
        supplierEmail: supplierRecord.email,
        supplierName: supplierRecord.companyName,
        projectName: input.projectName,
        materialCount: input.materials.length,
        matchScore: match.matchScore,
        rfqId,
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

  // Notify owner of new RFQ submission
  const { notifyOwner } = await import("./_core/notification");
  const materialLabel = input.materials.length > 1 ? "materials" : "material";
  const supplierLabel = matchedSuppliers.length > 1 ? "suppliers" : "supplier";
  await notifyOwner({
    title: "New RFQ Submitted",
    content: `${input.projectName} - ${input.materials.length} ${materialLabel} requested. ${matchedSuppliers.length} ${supplierLabel} matched.`,
  }).catch((error: unknown) => {
    console.error("Failed to notify owner of RFQ submission:", error);
  });

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
  // Use the full geo-distance + certification + material preference matching engine
  const results = await findMatchingSuppliers(rfqId, projectLocation, 20);
  return results.map((r) => ({
    supplierId: r.supplierId,
    companyName: r.supplierName,
    email: "",
    isPremium: r.isPremium,
    sustainabilityScore: undefined,
    matchScore: r.matchScore,
    exclusiveWindowExpiresAt: r.isPremium ? new Date(Date.now() + 24 * 60 * 60 * 1000) : undefined,
  }));
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

  // Get buyer's userId from RFQ
  const [rfqRecord] = await db
    .select({ userId: rfqs.userId })
    .from(rfqs)
    .where(eq(rfqs.id, rfqId))
    .execute();

  if (rfqRecord && rfqRecord.userId) {
    const buyerId = rfqRecord.userId;
    
    // Create conversation between buyer and supplier (if not exists)
    const { getOrCreateConversation } = await import("./messaging-service");
    await getOrCreateConversation({
      rfqId: rfqId || null,
      buyerId,
      supplierId,
    });

    // Notify buyer of new bid
    const { sendInAppNotification } = await import("./notification-service");
    await sendInAppNotification({
      userId: buyerId,
      type: "rfq_bid_received",
      title: "New Bid Received",
      content: `You received a new bid of $${bidPrice.toFixed(2)} for your RFQ`,
      relatedId: rfqId,
    });

    // Send email notification to buyer
    const { sendBidReceivedEmail } = await import("./email-service");
    const { users } = await import("../drizzle/schema");
    
    const [buyerInfo] = await db
      .select({ email: users.email, name: users.name })
      .from(users)
      .where(eq(users.id, buyerId))
      .execute();
    
    const [rfqInfo] = await db
      .select({ projectName: rfqs.projectName })
      .from(rfqs)
      .where(eq(rfqs.id, rfqId))
      .execute();
    
    const [supplierInfo] = await db
      .select({ companyName: suppliers.companyName })
      .from(suppliers)
      .where(eq(suppliers.id, supplierId))
      .execute();

    if (buyerInfo && buyerInfo.email && rfqInfo && supplierInfo) {
      await sendBidReceivedEmail({
        buyerEmail: buyerInfo.email,
        buyerName: buyerInfo.name || "Buyer",
        supplierName: supplierInfo.companyName,
        projectName: rfqInfo.projectName,
        bidAmount: `$${bidPrice.toFixed(2)}`,
        rfqId,
      });
    }
  }

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

  // Broadcast bid status updates via WebPubSub
  try {
    const { broadcastNotification } = await import("./webpubsub-manager");
    const allBids = await db
      .select({ id: rfqBids.id, supplierId: rfqBids.supplierId, status: rfqBids.status })
      .from(rfqBids)
      .where(eq(rfqBids.rfqId, rfqId))
      .execute();
    
    for (const bid of allBids) {
      await broadcastNotification(bid.supplierId, {
        type: "bid_status_update",
        rfqId,
        bidId: bid.id,
        status: bid.status,
        message: bid.status === "accepted" ? "Your bid has been accepted!" : "Your bid has been rejected.",
      });
    }
  } catch (error) {
    console.error("Failed to broadcast bid status updates:", error);
  }

  // Update analytics
  await db
    .update(rfqAnalytics)
    .set({ winningBidId: bidId, purchasedAt: new Date() })
    .where(eq(rfqAnalytics.rfqId, rfqId))
    .execute();

  // Get bid and supplier info for accepted bid
  const [acceptedBid] = await db
    .select({ supplierId: rfqBids.supplierId, bidPrice: rfqBids.bidPrice })
    .from(rfqBids)
    .where(eq(rfqBids.id, bidId))
    .execute();

  const [rfqInfo] = await db
    .select({ projectName: rfqs.projectName, userId: rfqs.userId })
    .from(rfqs)
    .where(eq(rfqs.id, rfqId))
    .execute();

  if (acceptedBid && rfqInfo) {
    // Get supplier info
    const [supplierInfo] = await db
      .select({ email: suppliers.email, companyName: suppliers.companyName, userId: suppliers.userId })
      .from(suppliers)
      .where(eq(suppliers.id, acceptedBid.supplierId))
      .execute();

    // Get buyer info
    const { users } = await import("../drizzle/schema");
    const [buyerInfo] = await db
      .select({ name: users.name })
      .from(users)
      .where(eq(users.id, rfqInfo.userId!))
      .execute();

    // Send acceptance email to winning supplier
    if (supplierInfo && supplierInfo.email && buyerInfo) {
      const { sendBidAcceptedEmail } = await import("./email-service");
      await sendBidAcceptedEmail({
        supplierEmail: supplierInfo.email,
        supplierName: supplierInfo.companyName,
        buyerName: buyerInfo.name || "Buyer",
        projectName: rfqInfo.projectName,
        bidAmount: `$${parseFloat(acceptedBid.bidPrice || "0").toFixed(2)}`,
        rfqId,
      });
    }

    // Send rejection emails to other suppliers
    const rejectedBids = await db
      .select({ supplierId: rfqBids.supplierId })
      .from(rfqBids)
      .where(and(eq(rfqBids.rfqId, rfqId), sql`id != ${bidId}`))
      .execute();

    const { sendBidRejectedEmail } = await import("./email-service");
    for (const rejectedBid of rejectedBids) {
      const [rejectedSupplier] = await db
        .select({ email: suppliers.email, companyName: suppliers.companyName })
        .from(suppliers)
        .where(eq(suppliers.id, rejectedBid.supplierId))
        .execute();

      if (rejectedSupplier && rejectedSupplier.email && buyerInfo) {
        await sendBidRejectedEmail({
          supplierEmail: rejectedSupplier.email,
          supplierName: rejectedSupplier.companyName,
          buyerName: buyerInfo.name || "Buyer",
          projectName: rfqInfo.projectName,
        });
      }
    }
  }

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


/**
 * Get all RFQs matched to a supplier with match scores
 */
export async function getSupplierMatchedRfqs(supplierId: number) {
  const db = await getDb();
  if (!db) return [];

  // Get supplier data for certification matching
  const [supplier] = await db
    .select()
    .from(suppliers)
    .where(eq(suppliers.id, supplierId))
    .execute();

  if (!supplier) return [];

  // Get all open RFQs
  const openRfqs = await db
    .select({
      id: rfqs.id,
      projectName: rfqs.projectName,
      projectLocation: rfqs.projectLocation,
      projectType: rfqs.projectType,
      status: rfqs.status,
      notes: rfqs.notes,
      requiredCertifications: rfqs.requiredCertifications,
      dueDate: rfqs.dueDate,
      createdAt: rfqs.createdAt,
    })
    .from(rfqs)
    .execute();

  // Get supplier's existing bids
  const supplierBids = await db
    .select({ rfqId: rfqBids.rfqId })
    .from(rfqBids)
    .where(eq(rfqBids.supplierId, supplierId))
    .execute();

  const bidRfqIds = new Set(supplierBids.map((b) => b.rfqId));

  // Calculate match scores for each RFQ
  const matchedRfqs = [];
  for (const rfq of openRfqs) {
    // Get RFQ items
    const items = await db
      .select()
      .from(rfqItems)
      .where(eq(rfqItems.rfqId, rfq.id))
      .execute();

    // Calculate match score
    const matchScore = await calculateMatchScore(supplierId, rfq.id, rfq.projectLocation || "");

    // Calculate matched certifications
    const requiredCerts = (rfq.requiredCertifications as string[]) || [];
    const supplierCerts = (supplier.certifications as string[]) || [];
    const matchedCertifications = requiredCerts.filter((cert) =>
      supplierCerts.some((sc) => sc.toLowerCase() === cert.toLowerCase())
    );
    const missingCertifications = requiredCerts.filter(
      (cert) => !matchedCertifications.some((mc) => mc.toLowerCase() === cert.toLowerCase())
    );

    // Calculate distance and drive time if coordinates are available
    let distanceMiles: number | null = null;
    let driveTimeMinutes: number | null = null;
    const [rfqData] = await db.select().from(rfqs).where(eq(rfqs.id, rfq.id)).execute();
    if (supplier.latitude && supplier.longitude && rfqData?.latitude && rfqData?.longitude) {
      const supplierCoords: Coordinates = {
        latitude: Number(supplier.latitude),
        longitude: Number(supplier.longitude),
      };
      const rfqCoords: Coordinates = {
        latitude: Number(rfqData.latitude),
        longitude: Number(rfqData.longitude),
      };
      const distanceResult = await calculateDistance(supplierCoords, rfqCoords);
      if (distanceResult) {
        distanceMiles = distanceResult.distanceMiles;
        driveTimeMinutes = distanceResult.durationMinutes;
      }
    }

    matchedRfqs.push({
      ...rfq,
      materialCount: items.length,
      matchScore,
      hasBid: bidRfqIds.has(rfq.id),
      matchedCertifications,
      missingCertifications,
      requiredCertifications: requiredCerts,
      distanceMiles,
      driveTimeMinutes,
      latitude: rfqData?.latitude ? Number(rfqData.latitude) : null,
      longitude: rfqData?.longitude ? Number(rfqData.longitude) : null,
      supplierLatitude: supplier.latitude ? Number(supplier.latitude) : null,
      supplierLongitude: supplier.longitude ? Number(supplier.longitude) : null,
    });
  }

  // Sort by match score descending
  return matchedRfqs.sort((a, b) => b.matchScore - a.matchScore);
}

/**
 * Calculate match score between supplier and RFQ
 */
async function calculateMatchScore(
  supplierId: number,
  rfqId: number,
  projectLocation: string
): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  let score = 30; // Base score (reduced from 50 to make room for new factors)

  // Get supplier data
  const [supplier] = await db
    .select()
    .from(suppliers)
    .where(eq(suppliers.id, supplierId))
    .execute();

  if (!supplier) return score;

  // Get supplier filters
  const [supplierFilter] = await db
    .select()
    .from(supplierFilters)
    .where(eq(supplierFilters.supplierId, supplierId))
    .execute();

  // Get RFQ data
  const [rfq] = await db
    .select()
    .from(rfqs)
    .where(eq(rfqs.id, rfqId))
    .execute();

  if (!rfq) return score;

  // 1. Distance-based location match (+20 points)
  // Use cached coordinates or geocode if needed
  let rfqCoords: Coordinates | null = null;
  let supplierCoords: Coordinates | null = null;

  // Get RFQ coordinates (from cache or geocode)
  if (rfq.latitude && rfq.longitude) {
    rfqCoords = {
      latitude: Number(rfq.latitude),
      longitude: Number(rfq.longitude),
    };
  } else if (projectLocation) {
    rfqCoords = await geocodeAddress(projectLocation);
    // Cache coordinates for future use
    if (rfqCoords) {
      await db
        .update(rfqs)
        .set({
          latitude: String(rfqCoords.latitude),
          longitude: String(rfqCoords.longitude),
        })
        .where(eq(rfqs.id, rfqId))
        .execute();
    }
  }

  // Get supplier coordinates (from cache or geocode)
  if (supplier.latitude && supplier.longitude) {
    supplierCoords = {
      latitude: Number(supplier.latitude),
      longitude: Number(supplier.longitude),
    };
  } else if (supplier.address) {
    const fullAddress = `${supplier.address}, ${supplier.city || ""}, ${supplier.state || ""} ${supplier.zipCode || ""}`;
    supplierCoords = await geocodeAddress(fullAddress);
    // Cache coordinates for future use
    if (supplierCoords) {
      await db
        .update(suppliers)
        .set({
          latitude: String(supplierCoords.latitude),
          longitude: String(supplierCoords.longitude),
        })
        .where(eq(suppliers.id, supplierId))
        .execute();
    }
  }

  // Calculate distance and award points
  if (rfqCoords && supplierCoords) {
    const distanceResult = await calculateDistance(supplierCoords, rfqCoords);
    if (distanceResult) {
      score += getDistanceScore(distanceResult.distanceMiles);
    }
  } else {
    // Fallback to text-based location matching if geocoding fails
    if (supplierFilter?.acceptedLocations) {
      const locations = supplierFilter.acceptedLocations.split(",").map((l: string) => l.trim());
      if (locations.some((loc: string) => projectLocation.toLowerCase().includes(loc.toLowerCase()))) {
        score += 10; // Reduced score for text-based match
      }
    }
  }

  // 2. Certification matching (+15 points)
  if (rfq.requiredCertifications && supplier.certifications) {
    const requiredCerts = rfq.requiredCertifications as string[];
    const supplierCerts = supplier.certifications as string[];
    const matchedCerts = requiredCerts.filter((cert) =>
      supplierCerts.some((sc) => sc.toLowerCase() === cert.toLowerCase())
    );
    if (matchedCerts.length > 0) {
      // Award points based on percentage of required certs matched
      const certMatchPercentage = matchedCerts.length / requiredCerts.length;
      score += Math.round(15 * certMatchPercentage);
    }
  }

  // 3. Material type preference matching (+15 points)
  if (supplierFilter?.materialTypePreferences) {
    const rfqMaterials = await db
      .select({ materialId: rfqItems.materialId })
      .from(rfqItems)
      .where(eq(rfqItems.rfqId, rfqId))
      .execute();

    if (rfqMaterials.length > 0) {
      // Get material types for RFQ items
      const materialIds = rfqMaterials.map((m) => m.materialId).filter(Boolean);
      if (materialIds.length > 0) {
        const rfqMaterialTypes = await db
          .select({ category: materials.category })
          .from(materials)
          .where(eq(materials.id, materialIds[0]!))
          .execute();

        const preferences = supplierFilter.materialTypePreferences as string[];
        if (rfqMaterialTypes.length > 0 && rfqMaterialTypes[0].category) {
          const categoryMatch = preferences.some((pref) =>
            rfqMaterialTypes[0].category?.toLowerCase().includes(pref.toLowerCase())
          );
          if (categoryMatch) {
            score += 15;
          }
        }
      }
    }
  }

  // 4. Supplier capacity factor (+10 points)
  if (supplier.currentCapacity !== null && supplier.currentCapacity !== undefined) {
    // Award points based on available capacity (higher capacity = more points)
    if (supplier.currentCapacity >= 70) {
      score += 10; // High capacity
    } else if (supplier.currentCapacity >= 40) {
      score += 5; // Medium capacity
    } else if (supplier.currentCapacity >= 20) {
      score += 2; // Low capacity
    }
    // Below 20% capacity gets 0 points
  }

  // 5. Premium supplier bonus (+5 points)
  if (supplier.isPremium) {
    score += 5;
  }

  // 6. Verification bonus (+5 points)
  if (supplier.verified) {
    score += 5;
  }

  return Math.min(score, 100);
}
