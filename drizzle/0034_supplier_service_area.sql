-- Add service area & shipping capability columns to suppliers table
-- Used by matchSuppliers for distance-aware RFQ routing.

ALTER TABLE "suppliers"
  ADD COLUMN IF NOT EXISTS "serviceRadiusMiles" integer,
  ADD COLUMN IF NOT EXISTS "statesServed" json,
  ADD COLUMN IF NOT EXISTS "shipsNationwide" boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS "minOrderQuantity" numeric(12, 2),
  ADD COLUMN IF NOT EXISTS "maxOrderQuantity" numeric(12, 2);
