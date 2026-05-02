-- One-shot DDL for founder video messaging.
-- Idempotent: safe to run multiple times.
-- Bypasses the broken drizzle migration state.

-- Enums (wrap in DO block since CREATE TYPE has no IF NOT EXISTS)
DO $$ BEGIN
  CREATE TYPE public.founder_video_status AS ENUM('draft', 'ready', 'deleted');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE public.founder_video_transcript_status AS ENUM('pending', 'done', 'failed');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Tables
CREATE TABLE IF NOT EXISTS public.founder_videos (
  "id" serial PRIMARY KEY NOT NULL,
  "ownerUserId" integer NOT NULL,
  "recipientEmail" varchar(320) NOT NULL,
  "recipientName" varchar(255) NOT NULL,
  "subject" varchar(255) NOT NULL,
  "note" text,
  "shareToken" varchar(32) NOT NULL,
  "blobKey" text NOT NULL,
  "blobUrl" text NOT NULL,
  "durationSec" integer DEFAULT 0 NOT NULL,
  "status" public.founder_video_status DEFAULT 'draft' NOT NULL,
  "transcript" text,
  "transcriptStatus" public.founder_video_transcript_status DEFAULT 'pending' NOT NULL,
  "watchedCount" integer DEFAULT 0 NOT NULL,
  "firstWatchedAt" timestamp,
  "lastWatchedAt" timestamp,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "expiresAt" timestamp,
  CONSTRAINT founder_videos_shareToken_unique UNIQUE("shareToken")
);

CREATE TABLE IF NOT EXISTS public.founder_video_views (
  "id" serial PRIMARY KEY NOT NULL,
  "videoId" integer NOT NULL,
  "viewedAt" timestamp DEFAULT now() NOT NULL,
  "viewerIp" varchar(64),
  "userAgent" text,
  "durationWatchedSec" integer
);

-- Helpful indexes
CREATE INDEX IF NOT EXISTS founder_videos_owner_idx ON public.founder_videos ("ownerUserId");
CREATE INDEX IF NOT EXISTS founder_video_views_video_idx ON public.founder_video_views ("videoId");
