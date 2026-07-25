-- Migration: 0033_credit_score_cache
-- Pre-computed Material Credit Score cache.
-- Written by the ScoreComputer Azure Function on epd.ingested events.
-- Read by server/services/material-credit-score.ts (cache-first, live fallback).

CREATE TABLE IF NOT EXISTS "material_credit_score_cache" (
  "epdId"                    integer PRIMARY KEY REFERENCES epd_materials(id) ON DELETE CASCADE,
  "total"                    integer NOT NULL,
  "carbonEfficiency"         integer NOT NULL,
  "epdVerification"          integer NOT NULL,
  "manufacturerTransparency" integer NOT NULL,
  "assemblyOptionsCoverage"  integer NOT NULL,
  "computedAt"               timestamp NOT NULL DEFAULT now()
);
