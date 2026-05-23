/**
 * Match Run Logger
 * ─────────────────
 * Fire-and-forget audit writer for every SWAP Engine invocation.
 * Writes to rfq_match_runs (append-only). Never throws — callers use
 * `void logMatchRun(...).catch(err => console.error(...))`.
 */

import { getDb } from "../db";
import { rfqMatchRuns } from "../../drizzle/schema";
import type { ScoreBreakdown } from "../domain/scoring/composite-score";

export interface MatchRunPayload {
  draftId: number | null;
  userId: number;
  personaKey: string;
  agentAvailable: boolean;
  matchSource: "agent" | "fallback";
  candidateCount: number;
  shortlistCount: number;
  scoreBreakdowns: ScoreBreakdown[];
  reasoningTrace: string[];
  durationMs: number;
}

export async function logMatchRun(payload: MatchRunPayload): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db.insert(rfqMatchRuns).values({
    draftId:        payload.draftId,
    userId:         payload.userId,
    personaKey:     payload.personaKey,
    agentAvailable: payload.agentAvailable,
    matchSource:    payload.matchSource,
    candidateCount: payload.candidateCount,
    shortlistCount: payload.shortlistCount,
    scoreBreakdowns: payload.scoreBreakdowns as unknown[],
    reasoningTrace:  payload.reasoningTrace,
    durationMs:      payload.durationMs,
  });
}
