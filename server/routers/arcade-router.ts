import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq, isNull, or, sql } from "drizzle-orm";
import { publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { arcadeScores, leads } from "../../drizzle/schema";
import {
  ARCADE_GAME_IDS,
  isValidArcadeScore,
  normalizeInitials,
} from "@shared/arcadeScoring";

/**
 * GreenChainz Arcade - global leaderboard API.
 *
 * `topScores` is the public board (casual play = eventKey IS NULL; a tournament
 * or charity event is the same query scoped to one eventKey). `submitScore`
 * validates a run against the shared plausibility caps, records it, and - when a
 * player claims their rank with an email - seeds the existing CRM lead pipeline.
 * Both are public procedures: the board must be visible to anonymous visitors
 * (that is the whole cold-start play), and submitting is intentionally low
 * friction. Scores are anti-vandalism validated, not fully anti-cheat.
 */

const gameId = z.enum(ARCADE_GAME_IDS);

/** One row as shown on the board. */
export interface BoardEntry {
  rank: number;
  initials: string;
  score: number;
  company: string | null;
  createdAt: Date;
}

export const arcadeRouter = router({
  topScores: publicProcedure
    .input(
      z.object({
        gameId,
        limit: z.number().int().min(1).max(25).default(10),
        // Omit for the casual all-time board; pass to view a tournament/event board.
        eventKey: z.string().trim().min(1).max(64).optional(),
      }),
    )
    .query(async ({ input }): Promise<{ scores: BoardEntry[] }> => {
      const db = await getDb();
      if (!db) return { scores: [] };

      const scope = input.eventKey
        ? and(
            eq(arcadeScores.gameId, input.gameId),
            eq(arcadeScores.eventKey, input.eventKey),
          )
        : and(
            eq(arcadeScores.gameId, input.gameId),
            isNull(arcadeScores.eventKey),
          );

      const rows = await db
        .select({
          initials: arcadeScores.initials,
          score: arcadeScores.score,
          company: arcadeScores.company,
          createdAt: arcadeScores.createdAt,
        })
        .from(arcadeScores)
        .where(scope)
        // Tie-break by earliest: first to reach a score ranks higher.
        .orderBy(desc(arcadeScores.score), asc(arcadeScores.createdAt))
        .limit(input.limit);

      return {
        scores: rows.map((r, i) => ({
          rank: i + 1,
          initials: r.initials,
          score: r.score,
          company: r.company,
          createdAt: r.createdAt,
        })),
      };
    }),

  submitScore: publicProcedure
    .input(
      z.object({
        gameId,
        score: z.number().int().nonnegative(),
        initials: z.string().max(16),
        // Optional "claim your rank" identity - also feeds the CRM as a lead.
        playerName: z.string().trim().max(120).optional(),
        email: z.string().trim().email().max(320).optional(),
        company: z.string().trim().max(160).optional(),
        eventKey: z.string().trim().min(1).max(64).optional(),
      }),
    )
    .mutation(async ({ input }) => {
      if (!isValidArcadeScore(input.gameId, input.score)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Score failed plausibility validation.",
        });
      }

      const db = await getDb();
      if (!db) {
        // No backend/DB in this environment - the client keeps its local board.
        return { persisted: false, rank: null as number | null, leadCaptured: false };
      }

      const initials = normalizeInitials(input.initials);
      const createdAt = new Date();

      await db.insert(arcadeScores).values({
        gameId: input.gameId,
        initials,
        score: input.score,
        playerName: input.playerName || null,
        email: input.email || null,
        company: input.company || null,
        eventKey: input.eventKey || null,
        createdAt,
      });

      // Feed the existing CRM lead pipeline - deduped by email so replaying the
      // game doesn't flood the leads table with the same person.
      let leadCaptured = false;
      if (input.email) {
        const existing = await db
          .select({ id: leads.id })
          .from(leads)
          .where(eq(leads.email, input.email))
          .limit(1);
        if (existing.length === 0) {
          await db.insert(leads).values({
            email: input.email,
            name: input.playerName || null,
            company: input.company || null,
            source: `arcade:${input.gameId}`,
          });
          leadCaptured = true;
        }
      }

      // Rank = number of scores that outrank this submission on this board, + 1.
      const scope = input.eventKey
        ? and(
            eq(arcadeScores.gameId, input.gameId),
            eq(arcadeScores.eventKey, input.eventKey),
          )
        : and(
            eq(arcadeScores.gameId, input.gameId),
            isNull(arcadeScores.eventKey),
          );

      const betterRows = await db
        .select({ better: sql<number>`count(*)::int` })
        .from(arcadeScores)
        .where(
          and(
            scope,
            or(
              sql`${arcadeScores.score} > ${input.score}`,
              and(
                eq(arcadeScores.score, input.score),
                sql`${arcadeScores.createdAt} < ${createdAt}`,
              ),
            ),
          ),
        );

      const better = betterRows[0]?.better ?? 0;

      return { persisted: true, rank: better + 1, leadCaptured };
    }),
});
