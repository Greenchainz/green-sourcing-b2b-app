import { router, adminProcedure, publicProcedure } from "../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq, desc, and, sql, asc } from "drizzle-orm";
import { nanoid } from "nanoid";
import { getDb } from "../db";
import { founderVideos, founderVideoViews, aboutYoutubeVideos } from "../../drizzle/schema";
import {
  ensureFounderVideosContainer,
  generateUploadSasUrl,
  generateReadSasUrl,
  buildBlobUrl,
  blobKeyForVideo,
  deleteFounderVideoBlob,
} from "../../lib/founder-video-storage";
import { transcribeFounderVideo } from "../services/founder-video-transcribe";
import { sendFounderVideoEmail, sendFounderVideoWatchAlert, FOUNDER_EMAIL } from "../email-service";

/**
 * Founder Video Messaging
 *
 * Async 60-second videos from the founder to suppliers / architects.
 * Browser records → uploads to Azure Blob via SAS → recipient gets a
 * personalized share link → AI auto-transcribes → owner sees view stats.
 *
 * Procedures:
 *   founderVideo.create       — admin creates a draft + returns SAS upload URL
 *   founderVideo.finalize     — admin marks upload complete; kicks off transcription + email
 *   founderVideo.list         — admin lists their sent videos with view counts
 *   founderVideo.delete       — admin deletes a video (cascades views)
 *   founderVideo.publicGet    — public watch page reads metadata + read SAS
 *   founderVideo.publicLogView— public beacon when recipient watches
 */

const SHARE_TOKEN_LENGTH = 16;
const DEFAULT_RETENTION_DAYS = 90;
const MAX_DURATION_SEC = 600; // supports short marketing videos and founder clips
const MARKETING_LIBRARY_EMAIL = "marketing-library@greenchainz.local";
const MARKETING_LIBRARY_NAME = "Marketing Video Library";

export const founderVideoRouter = router({
  // ── Founder: create a video draft + return upload SAS URL ─────────────────
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
          blobKey: "", // filled below
          blobUrl: "", // filled below
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
      const uploadUrl = await generateUploadSasUrl(blobKey);

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

  // ── Founder: mark upload complete; transcribe + email recipient ───────────
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

      // Fire-and-forget: transcription
      void transcribeFounderVideo(input.videoId).catch((err) =>
        console.error(`[founderVideo.finalize] transcribe failed:`, err),
      );

      // Fire-and-forget: email
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


  // ── Admin: upload marketing videos as files (no recipient required) ──────
  createMarketingFile: adminProcedure
    .input(
      z.object({
        title: z.string().min(1).max(255),
        note: z.string().max(2000).optional(),
        extension: z.string().min(2).max(10).default("mp4"),
        contentType: z.string().min(3).max(120).default("video/mp4"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database connection failed" });
      }

      await ensureFounderVideosContainer().catch((err) => {
        console.error("[founderVideo.createMarketingFile] container check failed:", err);
      });

      const shareToken = nanoid(SHARE_TOKEN_LENGTH);
      // Marketing library links must never expire: the resend procedure rejects them,
      // so a time-limited entry would become permanently unusable after 90 days.

      const [inserted] = await db
        .insert(founderVideos)
        .values({
          ownerUserId: ctx.user.id,
          recipientEmail: MARKETING_LIBRARY_EMAIL,
          recipientName: MARKETING_LIBRARY_NAME,
          subject: input.title,
          note: input.note ?? null,
          shareToken,
          blobKey: "",
          blobUrl: "",
          durationSec: 0,
          transcriptStatus: "pending",
          status: "draft",
          expiresAt: null,
        })
        .returning({ id: founderVideos.id });

      if (!inserted) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create marketing video draft" });
      }

      const blobKey = blobKeyForVideo(inserted.id, new Date(), input.extension);
      const blobUrl = buildBlobUrl(blobKey);
      const uploadUrl = await generateUploadSasUrl(blobKey, input.contentType);

      await db
        .update(founderVideos)
        .set({ blobKey, blobUrl })
        .where(eq(founderVideos.id, inserted.id));

      return {
        videoId: inserted.id,
        uploadUrl,
        shareUrl: `${process.env.FRONTEND_URL ?? "https://greenchainz.com"}/v/${shareToken}`,
      };
    }),

  finalizeMarketingFile: adminProcedure
    .input(
      z.object({
        videoId: z.number().int().positive(),
        durationSec: z.number().int().min(1).max(MAX_DURATION_SEC).default(120),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database connection failed" });
      }

      const [video] = await db
        .select({
          id: founderVideos.id,
          shareToken: founderVideos.shareToken,
          status: founderVideos.status,
          recipientEmail: founderVideos.recipientEmail,
        })
        .from(founderVideos)
        .where(and(eq(founderVideos.id, input.videoId), eq(founderVideos.ownerUserId, ctx.user.id)))
        .limit(1);

      if (!video || video.recipientEmail !== MARKETING_LIBRARY_EMAIL) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Marketing video draft not found" });
      }

      if (video.status !== "draft") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Marketing video already finalized" });
      }

      await db
        .update(founderVideos)
        .set({
          durationSec: input.durationSec,
          status: "ready",
          transcriptStatus: "done",
        })
        .where(eq(founderVideos.id, input.videoId));

      return {
        videoId: input.videoId,
        shareUrl: `${process.env.FRONTEND_URL ?? "https://greenchainz.com"}/v/${video.shareToken}`,
      };
    }),

  marketingLibrary: adminProcedure
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const rows = await db
        .select({
          id: founderVideos.id,
          subject: founderVideos.subject,
          note: founderVideos.note,
          durationSec: founderVideos.durationSec,
          status: founderVideos.status,
          watchedCount: founderVideos.watchedCount,
          createdAt: founderVideos.createdAt,
          lastWatchedAt: founderVideos.lastWatchedAt,
          shareToken: founderVideos.shareToken,
        })
        .from(founderVideos)
        .where(and(eq(founderVideos.ownerUserId, ctx.user.id), eq(founderVideos.recipientEmail, MARKETING_LIBRARY_EMAIL)))
        .orderBy(desc(founderVideos.createdAt));

      return rows.map((row) => ({
        ...row,
        shareUrl: `${process.env.FRONTEND_URL ?? "https://greenchainz.com"}/v/${row.shareToken}`,
      }));
    }),

  deleteMarketingFile: adminProcedure
    .input(z.object({ videoId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      // Fetch first so we can delete the blob and verify ownership before touching data.
      const [video] = await db
        .select({ id: founderVideos.id, blobKey: founderVideos.blobKey })
        .from(founderVideos)
        .where(and(
          eq(founderVideos.id, input.videoId),
          eq(founderVideos.ownerUserId, ctx.user.id),
          eq(founderVideos.recipientEmail, MARKETING_LIBRARY_EMAIL),
        ));

      if (!video) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Marketing video not found" });
      }

      // Delete child view rows and parent row transactionally.
      await db.transaction(async (tx) => {
        await tx.delete(founderVideoViews).where(eq(founderVideoViews.videoId, video.id));
        await tx.delete(founderVideos).where(eq(founderVideos.id, video.id));
      });

      // Delete the blob after DB rows are gone; best-effort (log on failure, don't surface).
      if (video.blobKey) {
        await deleteFounderVideoBlob(video.blobKey).catch((err: unknown) =>
          console.error("[deleteMarketingFile] blob delete failed:", err),
        );
      }

      return { ok: true };
    }),
  // ── Founder: list my sent videos with view stats ──────────────────────────
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
          expiresAt: founderVideos.expiresAt,
        })
        .from(founderVideos)
        .where(and(eq(founderVideos.ownerUserId, ctx.user.id), sql`${founderVideos.recipientEmail} <> ${MARKETING_LIBRARY_EMAIL}`))
        .orderBy(desc(founderVideos.createdAt))
        .limit(limit);

      return rows.map((r) => ({
        ...r,
        shareUrl: `${process.env.FRONTEND_URL ?? "https://greenchainz.com"}/v/${r.shareToken}`,
      }));
    }),

  resend: adminProcedure
    .input(z.object({ videoId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database connection failed" });

      const [video] = await db
        .select()
        .from(founderVideos)
        .where(and(eq(founderVideos.id, input.videoId), eq(founderVideos.ownerUserId, ctx.user.id)))
        .limit(1);

      if (!video) throw new TRPCError({ code: "NOT_FOUND", message: "Video not found" });
      if (video.status !== "ready") throw new TRPCError({ code: "BAD_REQUEST", message: "Video is not ready to send" });
      if (video.recipientEmail === MARKETING_LIBRARY_EMAIL) throw new TRPCError({ code: "BAD_REQUEST", message: "Marketing library videos do not support resend" });

      const newExpiresAt = new Date(Date.now() + DEFAULT_RETENTION_DAYS * 24 * 60 * 60 * 1000);

      await db
        .update(founderVideos)
        .set({ expiresAt: newExpiresAt })
        .where(eq(founderVideos.id, video.id));

      const shareUrl = `${process.env.FRONTEND_URL ?? "https://greenchainz.com"}/v/${video.shareToken}`;

      void sendFounderVideoEmail({
        recipientEmail: video.recipientEmail,
        recipientName: video.recipientName,
        subject: video.subject,
        shareUrl,
        founderName: ctx.user.name ?? "Jerit Norville",
      }).catch((err) => console.error("[founderVideo.resend] email failed:", err));

      return { ok: true, newExpiresAt };
    }),

  // ── Founder: delete a video ───────────────────────────────────────────────
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

  // ── Public: About page YouTube videos — ordered list of video IDs ───────────
  aboutVideos: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return { videos: [] };
    const rows = await db
      .select()
      .from(aboutYoutubeVideos)
      .orderBy(asc(aboutYoutubeVideos.sortOrder), asc(aboutYoutubeVideos.createdAt));
    return { videos: rows };
  }),

  // ── Admin: add a YouTube video to the About page ─────────────────────────
  addAboutVideo: adminProcedure
    .input(
      z.object({
        youtubeId: z.string().min(6).max(20),
        title: z.string().max(200).default(""),
        sortOrder: z.number().int().default(0),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const [row] = await db
        .insert(aboutYoutubeVideos)
        .values({ youtubeId: input.youtubeId, title: input.title, sortOrder: input.sortOrder })
        .onConflictDoNothing()
        .returning();
      return { video: row ?? null };
    }),

  // ── Admin: remove a YouTube video from the About page ────────────────────
  removeAboutVideo: adminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      await db.delete(aboutYoutubeVideos).where(eq(aboutYoutubeVideos.id, input.id));
      return { ok: true };
    }),

  // ── Public: watch page metadata + short-lived read SAS URL ────────────────
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
        throw new TRPCError({ code: "FORBIDDEN", message: "This video has expired" });
      }

      return {
        id: video.id,
        recipientName: video.recipientName,
        subject: video.subject,
        note: video.note,
        durationSec: video.durationSec,
        transcript: video.transcript,
        createdAt: video.createdAt,
        videoUrl: await generateReadSasUrl(video.blobKey),
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
        .where(and(eq(founderVideos.ownerUserId, ctx.user.id), eq(founderVideos.status, "ready"), sql`${founderVideos.recipientEmail} <> ${MARKETING_LIBRARY_EMAIL}`))
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

  // ── Public: log a view (called once per session by watch page) ────────────
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

      // Fire-and-forget: alert the founder that their video was watched.
      // Marketing-library entries use a synthetic .local sentinel address and have no
      // real recipient, so suppress the watch alert for them (view counters are still
      // incremented above).
      const newWatchedCount = video.watchedCount + 1;
      if (video.recipientEmail !== MARKETING_LIBRARY_EMAIL) {
        const shareUrl = `${process.env.FRONTEND_URL ?? "https://greenchainz.com"}/v/${video.shareToken}`;
        void sendFounderVideoWatchAlert({
          founderEmail: FOUNDER_EMAIL,
          recipientName: video.recipientName,
          recipientEmail: video.recipientEmail,
          subject: video.subject,
          durationWatchedSec: input.durationWatchedSec ?? null,
          watchedCount: newWatchedCount,
          shareUrl,
        }).catch((err: unknown) => console.error("[founderVideo.publicLogView] watch alert failed:", err));
      }

      return { ok: true };
    }),
});





