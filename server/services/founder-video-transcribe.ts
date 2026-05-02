/**
 * Founder Video Transcription
 *
 * Downloads the uploaded video blob and runs OpenAI Whisper on the audio.
 * Fire-and-forget from the tRPC finalize handler — failures are logged
 * and update the video row's transcriptStatus to 'failed'.
 */

import { AzureOpenAI } from "openai";
import { eq } from "drizzle-orm";
import { getDb } from "../db";
import { founderVideos } from "../../drizzle/schema";
import { generateReadSasUrl } from "../../lib/founder-video-storage";

function getWhisperClient(): { client: AzureOpenAI; deployment: string } | null {
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
  const apiKey = process.env.AZURE_OPENAI_API_KEY;
  const deployment = process.env.AZURE_OPENAI_WHISPER_DEPLOYMENT ?? "whisper";

  if (!endpoint || !apiKey) {
    console.warn("[founder-video/transcribe] AZURE_OPENAI_ENDPOINT or AZURE_OPENAI_API_KEY not set");
    return null;
  }

  const client = new AzureOpenAI({
    endpoint,
    apiKey,
    apiVersion: "2024-08-01-preview",
    deployment,
  });

  return { client, deployment };
}

/**
 * Transcribe a finalized founder video. Updates the videos row with the
 * transcript and a 'done' / 'failed' status. Safe to call as fire-and-forget.
 */
export async function transcribeFounderVideo(videoId: number): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.error(`[founder-video/transcribe] no db connection for video ${videoId}`);
    return;
  }

  const [video] = await db
    .select()
    .from(founderVideos)
    .where(eq(founderVideos.id, videoId))
    .limit(1);

  if (!video) {
    console.error(`[founder-video/transcribe] video ${videoId} not found`);
    return;
  }

  const whisper = getWhisperClient();
  if (!whisper) {
    await db
      .update(founderVideos)
      .set({ transcriptStatus: "failed" })
      .where(eq(founderVideos.id, videoId));
    return;
  }

  try {
    const readUrl = generateReadSasUrl(video.blobKey);
    const response = await fetch(readUrl);
    if (!response.ok) {
      throw new Error(`failed to fetch blob: HTTP ${response.status}`);
    }
    const arrayBuffer = await response.arrayBuffer();

    const file = new File([Buffer.from(arrayBuffer)], `${videoId}.webm`, { type: "video/webm" });

    const result = await whisper.client.audio.transcriptions.create({
      file,
      model: "whisper-1",
    });

    await db
      .update(founderVideos)
      .set({
        transcript: result.text,
        transcriptStatus: "done",
      })
      .where(eq(founderVideos.id, videoId));

    console.log(`[founder-video/transcribe] video ${videoId} transcribed (${result.text.length} chars)`);
  } catch (err) {
    console.error(`[founder-video/transcribe] video ${videoId} failed:`, err);
    await db
      .update(founderVideos)
      .set({ transcriptStatus: "failed" })
      .where(eq(founderVideos.id, videoId));
  }
}
