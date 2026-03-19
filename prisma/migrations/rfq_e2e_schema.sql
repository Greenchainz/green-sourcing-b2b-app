-- ============================================================
-- RFQ E2E SCHEMA ADDITIONS
-- Run: npx prisma migrate dev --name rfq-e2e
-- Or apply manually to Azure PostgreSQL
-- ============================================================

-- Enums
DO $$ BEGIN
  CREATE TYPE "RfqStatus" AS ENUM ('OPEN', 'BIDDING', 'AWARDED', 'CLOSED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "BidStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'EXPIRED');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Supplier table (if not exists)
CREATE TABLE IF NOT EXISTS "Supplier" (
  "id"             TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "companyName"    TEXT NOT NULL,
  "email"          TEXT NOT NULL UNIQUE,
  "status"         TEXT NOT NULL DEFAULT 'PENDING',
  "certifications" TEXT[] NOT NULL DEFAULT '{}',
  "materialTypes"  TEXT[] NOT NULL DEFAULT '{}',
  "maxOrderValue"  DECIMAL(12,2),
  "latitude"       DECIMAL(9,6),
  "longitude"      DECIMAL(9,6),
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);

-- RFQ table
CREATE TABLE IF NOT EXISTS "Rfq" (
  "id"                      TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "buyerId"                 TEXT NOT NULL,
  "projectName"             TEXT NOT NULL,
  "projectLocation"         TEXT NOT NULL,
  "projectType"             TEXT NOT NULL,
  "notes"                   TEXT,
  "requiredCertifications"  TEXT[] NOT NULL DEFAULT '{}',
  "status"                  "RfqStatus" NOT NULL DEFAULT 'OPEN',
  "expiresAt"               TIMESTAMP(3) NOT NULL,
  "awardedSupplierId"       TEXT,
  "createdAt"               TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"               TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Rfq_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "idx_rfq_buyer" ON "Rfq"("buyerId");
CREATE INDEX IF NOT EXISTS "idx_rfq_status" ON "Rfq"("status");

-- RFQ Items table
CREATE TABLE IF NOT EXISTS "RfqItem" (
  "id"         TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "rfqId"      TEXT NOT NULL,
  "materialId" TEXT NOT NULL,
  "quantity"   DECIMAL(10,2) NOT NULL,
  "unit"       TEXT NOT NULL,
  "notes"      TEXT,
  CONSTRAINT "RfqItem_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "RfqItem_rfqId_fkey" FOREIGN KEY ("rfqId") REFERENCES "Rfq"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "idx_rfq_item_rfq" ON "RfqItem"("rfqId");

-- RFQ Bids table
CREATE TABLE IF NOT EXISTS "RfqBid" (
  "id"          TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "rfqId"       TEXT NOT NULL,
  "supplierId"  TEXT NOT NULL,
  "totalPrice"  DECIMAL(12,2) NOT NULL,
  "leadDays"    INT NOT NULL,
  "notes"       TEXT,
  "status"      "BidStatus" NOT NULL DEFAULT 'PENDING',
  "expiresAt"   TIMESTAMP(3) NOT NULL,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RfqBid_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "RfqBid_rfqId_fkey" FOREIGN KEY ("rfqId") REFERENCES "Rfq"("id") ON DELETE CASCADE,
  CONSTRAINT "RfqBid_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id")
);

CREATE INDEX IF NOT EXISTS "idx_rfq_bid_rfq" ON "RfqBid"("rfqId");
CREATE INDEX IF NOT EXISTS "idx_rfq_bid_supplier" ON "RfqBid"("supplierId");
