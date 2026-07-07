-- Migration: 0039_arcade_scores
-- Global leaderboard for the GreenChainz Arcade.
--
-- Backs cross-user competition, company/team bragging rights, and future
-- tournaments/charity events (via the nullable "eventKey" - casual board rows
-- have eventKey IS NULL; a tournament is simply rows sharing one eventKey).
-- When an email is supplied on submit, the score also seeds a CRM lead
-- (handled in the arcade router, reusing the existing "leads" pipeline).
--
-- Idempotent + safe to re-run.

CREATE TABLE IF NOT EXISTS "arcade_scores" (
  "id"         serial PRIMARY KEY,
  "gameId"     varchar(64)  NOT NULL,
  "initials"   varchar(12)  NOT NULL,
  "score"      integer      NOT NULL,
  "playerName" varchar(120),
  "email"      varchar(320),
  "company"    varchar(160),
  "eventKey"   varchar(64),
  "createdAt"  timestamp    NOT NULL DEFAULT now()
);

-- Board reads are "top N by score for a game" - index the ordering columns.
CREATE INDEX IF NOT EXISTS "arcade_scores_board_idx"
  ON "arcade_scores" ("gameId", "score");

-- Tournament/event boards filter by eventKey first.
CREATE INDEX IF NOT EXISTS "arcade_scores_event_idx"
  ON "arcade_scores" ("eventKey");
