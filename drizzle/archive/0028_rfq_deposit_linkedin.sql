-- Migration: Add LinkedIn verification columns to users and deposit columns to rfqs
-- Created: 2026-03-16
--
-- Adds:
--   users.linkedin_verified   - boolean flag set when user completes LinkedIn OAuth
--   users.linkedin_profile_url - LinkedIn public profile URL
--   users.linkedin_verified_at - timestamp of verification
--   rfqs.deposit_verified      - boolean set after Stripe deposit succeeds
--   rfqs.deposit_payment_intent_id - Stripe PaymentIntent id
--   rfqs.deposit_amount        - deposit amount charged (in dollars)

ALTER TABLE "users" ADD COLUMN "linkedin_verified" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "linkedin_profile_url" varchar(500);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "linkedin_verified_at" timestamp;--> statement-breakpoint
ALTER TABLE "rfqs" ADD COLUMN "deposit_verified" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "rfqs" ADD COLUMN "deposit_payment_intent_id" varchar(255);--> statement-breakpoint
ALTER TABLE "rfqs" ADD COLUMN "deposit_amount" decimal;
