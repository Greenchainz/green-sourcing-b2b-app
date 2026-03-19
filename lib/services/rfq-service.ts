// lib/services/rfq-service.ts
import { prisma } from '@/lib/prisma'
import { RfqStatus, BidStatus } from '@prisma/client'

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

export interface CreateRfqInput {
  buyerId: string
  projectName: string
  projectLocation: string
  projectType: string
  notes?: string
  requiredCertifications?: string[]
  items: {
    materialId: string
    quantity: number
    unit: string
    notes?: string
  }[]
}

export interface SubmitBidInput {
  rfqId: string
  supplierId: string
  totalPrice: number
  leadDays: number
  notes?: string
  lineItems?: {
    materialId: string
    unitPrice: number
    quantity: number
  }[]
}

export interface SupplierMatchResult {
  supplierId: string
  companyName: string
  email: string
  matchScore: number
  distanceMiles: number | null
  certifications: string[]
}

// ─────────────────────────────────────────────
// CREATE RFQ
// ─────────────────────────────────────────────

export async function createRfq(input: CreateRfqInput) {
  const rfq = await prisma.rfq.create({
    data: {
      buyerId: input.buyerId,
      projectName: input.projectName,
      projectLocation: input.projectLocation,
      projectType: input.projectType,
      notes: input.notes ?? null,
      requiredCertifications: input.requiredCertifications ?? [],
      status: RfqStatus.OPEN,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      items: {
        create: input.items.map((item) => ({
          materialId: item.materialId,
          quantity: item.quantity,
          unit: item.unit,
          notes: item.notes ?? null,
        })),
      },
    },
    include: {
      items: { include: { material: true } },
    },
  })

  return rfq
}

// ─────────────────────────────────────────────
// LIST RFQs (buyer view)
// ─────────────────────────────────────────────

export async function getUserRfqs(buyerId: string, status?: RfqStatus) {
  return prisma.rfq.findMany({
    where: {
      buyerId,
      ...(status ? { status } : {}),
    },
    include: {
      items: { include: { material: { select: { name: true, category: true } } } },
      bids: { select: { id: true, status: true, totalPrice: true, supplierId: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
}

// ─────────────────────────────────────────────
// GET RFQ DETAIL
// ─────────────────────────────────────────────

export async function getRfqDetail(rfqId: string, requesterId: string) {
  const rfq = await prisma.rfq.findUnique({
    where: { id: rfqId },
    include: {
      items: {
        include: {
          material: {
            select: {
              id: true,
              name: true,
              category: true,
              embodiedCarbon: true,
              price: true,
              certifications: true,
            },
          },
        },
      },
      bids: {
        include: {
          supplier: {
            select: { id: true, companyName: true, email: true, certifications: true },
          },
        },
        orderBy: { totalPrice: 'asc' },
      },
    },
  })

  if (!rfq) throw new Error('RFQ not found')

  const isOwner = rfq.buyerId === requesterId
  const isSupplier = rfq.bids.some((b) => b.supplierId === requesterId)
  if (!isOwner && !isSupplier) throw new Error('Access denied')

  return rfq
}

// ─────────────────────────────────────────────
// UPDATE STATUS
// ─────────────────────────────────────────────

export async function updateRfqStatus(rfqId: string, buyerId: string, status: RfqStatus) {
  const rfq = await prisma.rfq.findUnique({ where: { id: rfqId } })
  if (!rfq) throw new Error('RFQ not found')
  if (rfq.buyerId !== buyerId) throw new Error('Not authorized')

  return prisma.rfq.update({
    where: { id: rfqId },
    data: { status },
  })
}

// ─────────────────────────────────────────────
// SUPPLIER MATCHING
// ─────────────────────────────────────────────

export async function matchSuppliersToRfq(rfqId: string): Promise<SupplierMatchResult[]> {
  const rfq = await prisma.rfq.findUnique({
    where: { id: rfqId },
    include: {
      items: { include: { material: { select: { category: true } } } },
    },
  })

  if (!rfq) throw new Error('RFQ not found')

  const materialCategories = [
    ...new Set(rfq.items.map((i) => i.material?.category).filter(Boolean)),
  ] as string[]

  const suppliers = await prisma.supplier.findMany({
    where: {
      status: 'APPROVED',
      materialTypes: { hasSome: materialCategories },
    },
    select: {
      id: true,
      companyName: true,
      email: true,
      certifications: true,
      latitude: true,
      longitude: true,
      materialTypes: true,
      maxOrderValue: true,
    },
  })

  const rfqCerts: string[] = rfq.requiredCertifications ?? []

  const scored = suppliers.map((supplier) => {
    let score = 0

    // Material type match (40 pts)
    const matchedTypes = materialCategories.filter((c) =>
      supplier.materialTypes.includes(c)
    ).length
    score += Math.min((matchedTypes / Math.max(materialCategories.length, 1)) * 40, 40)

    // Certification match (30 pts)
    if (rfqCerts.length > 0) {
      const matchedCerts = rfqCerts.filter((c) =>
        supplier.certifications.includes(c)
      ).length
      score += Math.min((matchedCerts / rfqCerts.length) * 30, 30)
    } else {
      score += 30
    }

    // Capacity (10 pts)
    if (supplier.maxOrderValue && supplier.maxOrderValue > 50000) score += 10
    else if (supplier.maxOrderValue && supplier.maxOrderValue > 10000) score += 5

    // Location (20 pts) — flat until Azure Maps key is wired
    score += 20

    return {
      supplierId: supplier.id,
      companyName: supplier.companyName,
      email: supplier.email,
      matchScore: Math.round(score),
      distanceMiles: null,
      certifications: supplier.certifications,
    }
  })

  return scored.sort((a, b) => b.matchScore - a.matchScore).slice(0, 10)
}

// ─────────────────────────────────────────────
// SUBMIT BID (supplier)
// ─────────────────────────────────────────────

export async function submitBid(input: SubmitBidInput) {
  const rfq = await prisma.rfq.findUnique({ where: { id: input.rfqId } })
  if (!rfq) throw new Error('RFQ not found')
  if (rfq.status !== RfqStatus.OPEN && rfq.status !== RfqStatus.BIDDING) {
    throw new Error('RFQ is no longer accepting bids')
  }

  const existing = await prisma.rfqBid.findFirst({
    where: { rfqId: input.rfqId, supplierId: input.supplierId, status: BidStatus.PENDING },
  })
  if (existing) throw new Error('You have already submitted a bid for this RFQ')

  const bid = await prisma.rfqBid.create({
    data: {
      rfqId: input.rfqId,
      supplierId: input.supplierId,
      totalPrice: input.totalPrice,
      leadDays: input.leadDays,
      notes: input.notes ?? null,
      status: BidStatus.PENDING,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  })

  if (rfq.status === RfqStatus.OPEN) {
    await prisma.rfq.update({
      where: { id: input.rfqId },
      data: { status: RfqStatus.BIDDING },
    })
  }

  return bid
}

// ─────────────────────────────────────────────
// ACCEPT BID (buyer)
// ─────────────────────────────────────────────

export async function acceptBid(bidId: string, buyerId: string) {
  const bid = await prisma.rfqBid.findUnique({
    where: { id: bidId },
    include: { rfq: true },
  })

  if (!bid) throw new Error('Bid not found')
  if (bid.rfq.buyerId !== buyerId) throw new Error('Not authorized')
  if (bid.status !== BidStatus.PENDING) throw new Error('Bid is no longer pending')

  await prisma.rfqBid.update({
    where: { id: bidId },
    data: { status: BidStatus.ACCEPTED },
  })

  await prisma.rfqBid.updateMany({
    where: { rfqId: bid.rfqId, id: { not: bidId }, status: BidStatus.PENDING },
    data: { status: BidStatus.REJECTED },
  })

  await prisma.rfq.update({
    where: { id: bid.rfqId },
    data: { status: RfqStatus.AWARDED, awardedSupplierId: bid.supplierId },
  })

  return bid
}

// ─────────────────────────────────────────────
// REJECT BID (buyer)
// ─────────────────────────────────────────────

export async function rejectBid(bidId: string, buyerId: string) {
  const bid = await prisma.rfqBid.findUnique({
    where: { id: bidId },
    include: { rfq: true },
  })

  if (!bid) throw new Error('Bid not found')
  if (bid.rfq.buyerId !== buyerId) throw new Error('Not authorized')

  return prisma.rfqBid.update({
    where: { id: bidId },
    data: { status: BidStatus.REJECTED },
  })
}
