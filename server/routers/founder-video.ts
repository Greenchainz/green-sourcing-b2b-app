import { router, adminProcedure, publicProcedure } from "../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq, desc, and, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { getDb } from "../db";
import { founderVideos, founderVideoViews } from "../../drizzle/schema";
import {
  ensureFounderVideosContainer,
  generateUploadSasUrl,
  generateReadSasUrl,
  buildBlobUrl,
  blobKeyForVideo,
} from "../../lib/founder-video-storage";
import { transcribeFounderVideo } from "../services/founder-video-transcribe";
import { sendFounderVideoEmail } from "../email-service";

/**
 * Founder Video Messaging
 *
 * Async 60-second videos from the founder to suppliers / architects.
 * Browser records → uploads to Azure Blob via SAS → recipient gets a
 * personalized share link → AI auto-transcribes → owner sees view stats.
 */

const SHARE_TOKEN_LENGTH = 16;
const DEFAULT_RETENTION_DAYS = 90;
const MAX_DURATION_SEC = 90;

export const founderVideoRouter = router({
  create: adminProcedure
    .input(
      z.object({
        recipientEmail: z.string().email("Valid email required"),
        recipientName: z.string().min(1, "Recipient name required").max(255),
        subject: z.string().min(1).max(255),
        note: z.string().max(2000).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database connection failed" });
      }

      await ensureFounderVideosContainer().catch((err) => {
        console.error("[founderVideo.create] container check failed:", err);
      });

      const shareToken = nanoid(SHARE_TOKEN_LENGTH);
      const expiresAt = new Date(Date.now() + DEFAULT_RETENTION_DAYS * 24 * 60 * 60 * 1000);

      const [inserted] = await db
        .insert(founderVideos)
        .values({
          ownerUserId: ctx.user.id,
          recipientEmail: input.recipientEmail,
          recipientName: input.recipientName,
          subject: input.subject,
          note: input.note ?? null,
          shareToken,
          blobKey: "",
          blobUrl: "",
          durationSec: 0,
          transcriptStatus: "pending",
          status: "draft",
          expiresAt,
        })
        .returning({ id: founderVideos.id });

      if (!inserted) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create video draft" });
      }

      const blobKey = blobKeyForVideo(inserted.id);
      const blobUrl = buildBlobUrl(blobKey);
      const uploadUrl = generateUploadSasUrl(blobKey);

      await db
        .update(founderVideos)
        .set({ blobKey, blobUrl })
        .where(eq(founderVideos.id, inserted.id));

      return {
        videoId: inserted.id,
        shareToken,
        uploadUrl,
        blobKey,
      };
    }),

  finalize: adminProcedure
    .input(
      z.object({
        videoId: z.number().int().positive(),
        durationSec: z.number().int().min(1).max(MAX_DURATION_SEC),
        sendEmail: z.boolean().default(true),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database connection failed" });
      }

      const [video] = await db
        .select()
        .from(founderVideos)
        .where(and(eq(founderVideos.id, input.videoId), eq(founderVideos.ownerUserId, ctx.user.id)))
        .limit(1);

      if (!video) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Video not found" });
      }

      if (video.status !== "draft") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Video already finalized" });
      }

      await db
        .update(founderVideos)
        .set({
          durationSec: input.durationSec,
          status: "ready",
        })
        .where(eq(founderVideos.id, input.videoId));

      const shareUrl = `${process.env.FRONTEND_URL ?? "https://greenchainz.com"}/v/${video.shareToken}`;

      void transcribeFounderVideo(input.videoId).catch((err) =>
        console.error(`[founderVideo.finalize] transcribe failed:`, err),
      );

      if (input.sendEmail) {
        void sendFounderVideoEmail({
          recipientEmail: video.recipientEmail,
          recipientName: video.recipientName,
          subject: video.subject,
          shareUrl,
          founderName: ctx.user.name ?? "Jerit Norville",
        }).catch((err) => console.error(`[founderVideo.finalize] email failed:`, err));
      }

      return {
        videoId: input.videoId,
        shareUrl,
        shareToken: video.shareToken,
      };
    }),

  list: adminProcedure
    .input(
      z.object({
        limit: z.number().int().min(1).max(100).default(50),
      }).optional(),
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database connection failed" });
      }

      const limit = input?.limit ?? 50;

      const rows = await db
        .select({
          id: founderVideos.id,
          recipientEmail: founderVideos.recipientEmail,
          recipientName: founderVideos.recipientName,
          subject: founderVideos.subject,
          shareToken: founderVideos.shareToken,
          durationSec: founderVideos.durationSec,
          status: founderVideos.status,
          transcriptStatus: founderVideos.transcriptStatus,
          watchedCount: founderVideos.watchedCount,
          firstWatchedAt: founderVideos.firstWatchedAt,
          lastWatchedAt: founderVideos.lastWatchedAt,
          createdAt: founderVideos.createdAt,
        })
        .from(founderVideos)
        .where(eq(founderVideos.ownerUserId, ctx.user.id))
        .orderBy(desc(founderVideos.createdAt))
        .limit(limit);

      return rows.map((r) => ({
        ...r,
        shareUrl: `${process.env.FRONTEND_URL ?? "https://greenchainz.com"}/v/${r.shareToken}`,
      }));
    }),

  delete: adminProcedure
    .input(z.object({ videoId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database connection failed" });
      }

      const result = await db
        .delete(founderVideos)
        .where(and(eq(founderVideos.id, input.videoId), eq(founderVideos.ownerUserId, ctx.user.id)))
        .returning({ id: founderVideos.id });

      if (result.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Video not found" });
      }

      return { ok: true };
    }),

  publicGet: publicProcedure
    .input(z.object({ token: z.string().min(8).max(32) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database connection failed" });
      }

      const [video] = await db
        .select({
          id: founderVideos.id,
          recipientName: founderVideos.recipientName,
          subject: founderVideos.subject,
          note: founderVideos.note,
          blobKey: founderVideos.blobKey,
          durationSec: founderVideos.durationSec,
          status: founderVideos.status,
          transcript: founderVideos.transcript,
          createdAt: founderVideos.createdAt,
          expiresAt: founderVideos.expiresAt,
        })
        .from(founderVideos)
        .where(eq(founderVideos.shareToken, input.token))
        .limit(1);

      if (!video || video.status !== "ready") {
        throw new TRPCError({ code: "NOT_FOUND", message: "Video not found" });
      }

      if (video.expiresAt && video.expiresAt < new Date()) {
        throw new TRPCError({ code: "GONE", message: "This video has expired" });
      }

      return {
        id: video.id,
        recipientName: video.recipientName,
        subject: video.subject,
        note: video.note,
        durationSec: video.durationSec,
        transcript: video.transcript,
        createdAt: video.createdAt,
        videoUrl: generateReadSasUrl(video.blobKey),
      };
    }),

  analytics: adminProcedure
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const videos = await db
        .select({
          id: founderVideos.id,
          recipientEmail: founderVideos.recipientEmail,
          recipientName: founderVideos.recipientName,
          subject: founderVideos.subject,
          durationSec: founderVideos.durationSec,
          status: founderVideos.status,
          watchedCount: founderVideos.watchedCount,
          firstWatchedAt: founderVideos.firstWatchedAt,
          lastWatchedAt: founderVideos.lastWatchedAt,
          createdAt: founderVideos.createdAt,
          shareToken: founderVideos.shareToken,
          avgWatchSec: sql<number>`COALESCE(AVG(${founderVideoViews.durationWatchedSec}), 0)`,
          viewCount: sql<number>`COUNT(${founderVideoViews.id})`,
        })
        .from(founderVideos)
        .leftJoin(founderVideoViews, eq(founderVideoViews.videoId, founderVideos.id))
        .where(and(eq(founderVideos.ownerUserId, ctx.user.id), eq(founderVideos.status, "ready")))
        .groupBy(founderVideos.id)
        .orderBy(desc(founderVideos.createdAt));

      const videoIds = videos.map((v) => v.id);
      const sessions =
        videoIds.length === 0
          ? []
          : await db
              .select({
                videoId: founderVideoViews.videoId,
                viewedAt: founderVideoViews.viewedAt,
                durationWatchedSec: founderVideoViews.durationWatchedSec,
              })
              .from(founderVideoViews)
              .where(sql`${founderVideoViews.videoId} = ANY(ARRAY[${sql.join(videoIds.map((id) => sql`${id}`), sql`, `)}]::int[])`)
              .orderBy(desc(founderVideoViews.viewedAt));

      const sessionsByVideo = new Map<number, typeof sessions>();
      for (const s of sessions) {
        if (!sessionsByVideo.has(s.videoId)) sessionsByVideo.set(s.videoId, []);
        sessionsByVideo.get(s.videoId)!.push(s);
      }

      const enriched = videos.map((v) => ({
        ...v,
        avgWatchSec: Number(v.avgWatchSec),
        viewCount: Number(v.viewCount),
        watchThroughPct:
          v.durationSec > 0 ? Math.min(100, Math.round((Number(v.avgWatchSec) / v.durationSec) * 100)) : 0,
        sessions: (sessionsByVideo.get(v.id) ?? []).map((s) => ({
          viewedAt: s.viewedAt,
          durationWatchedSec: s.durationWatchedSec,
          pct:
            v.durationSec > 0 && s.durationWatchedSec != null
              ? Math.min(100, Math.round((s.durationWatchedSec / v.durationSec) * 100))
              : null,
        })),
        shareUrl: `${process.env.FRONTEND_URL ?? "https://greenchainz.com"}/v/${v.shareToken}`,
      }));

      const totalViews = enriched.reduce((acc, v) => acc + v.viewCount, 0);
      const watchedVideos = enriched.filter((v) => v.viewCount > 0);
      const overallAvgPct =
        watchedVideos.length > 0
          ? Math.round(watchedVideos.reduce((acc, v) => acc + v.watchThroughPct, 0) / watchedVideos.length)
          : 0;

      return {
        summary: {
          totalVideos: enriched.length,
          totalViews,
          overallAvgPct,
          openedCount: watchedVideos.length,
        },
        videos: enriched,
      };
    }),

  publicLogView: publicProcedure
    .input(
      z.object({
        token: z.string().min(8).max(32),
        durationWatchedSec: z.number().int().min(0).max(MAX_DURATION_SEC).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return { ok: false };

      const [video] = await db
        .select({
          id: founderVideos.id,
          subject: founderVideos.subject,
          recipientEmail: founderVideos.recipientEmail,
          recipientName: founderVideos.recipientName,
          shareToken: founderVideos.shareToken,
          watchedCount: founderVideos.watchedCount,
        })
        .from(founderVideos)
        .where(eq(founderVideos.shareToken, input.token))
        .limit(1);

      if (!video) return { ok: false };

      const ip = ctx.req?.ip ?? null;
      const userAgent = ctx.req?.headers["user-agent"] ?? null;

      await db.insert(founderVideoViews).values({
        videoId: video.id,
        viewerIp: ip,
        userAgent: typeof userAgent === "string" ? userAgent : null,
        durationWatchedSec: input.durationWatchedSec ?? null,
      });

      const now = new Date();
      await db
        .update(founderVideos)
        .set({
          watchedCount: sql`${founderVideos.watchedCount} + 1`,
          firstWatchedAt: sql`COALESCE(${founderVideos.firstWatchedAt}, ${now})`,
          lastWatchedAt: now,
        })
        .where(eq(founderVideos.id, video.id));

      // Fire-and-forget: alert the founder that their video was watched
      const newWatchedCount = video.watchedCount + 1;
      const shareUrl = `${process.env.FRONTEND_URL ?? "https://greenchainz.com"}/v/${video.shareToken}`;

      void sendFounderVideoWatchAlert({
        founderEmail: FOUNDER_EMAIL,
        recipientName: video.recipientName,
        recipientEmail: video.recipientEmail,
        subject: video.subject,
        durationWatchedSec: input.durationWatchedSec ?? null,
        watchedCount: newWatchedCount,
        shareUrl,
      }).catch((err) => console.error("[founderVideo.publicLogView] watch alert failed:", err));

      return { ok: true };
    }),
});
