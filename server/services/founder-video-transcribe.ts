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
import { getAzureOpenAIAuthConfig } from "../../lib/azure/openai-auth";

function getWhisperClient(): { client: AzureOpenAI; deployment: string } | null {
  let auth;
  try {
    auth = getAzureOpenAIAuthConfig({
      deploymentEnvVar: "AZURE_OPENAI_WHISPER_DEPLOYMENT",
      defaultDeployment: "whisper",
      defaultApiVersion: "2024-08-01-preview",
    });
  } catch {
    console.warn("[founder-video/transcribe] Azure OpenAI authentication is not configured");
    return null;
  }

  const options: ConstructorParameters<typeof AzureOpenAI>[0] = {
    endpoint: auth.endpoint,
    apiVersion: auth.apiVersion,
    deployment: auth.deployment,
  };

  if (auth.authMode === "managed-identity" && auth.azureADTokenProvider) {
    options.azureADTokenProvider = auth.azureADTokenProvider;
  } else if (auth.apiKey) {
    options.apiKey = auth.apiKey;
  }

  const client = new AzureOpenAI(options);

  return { client, deployment: auth.deployment };
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
    // Download the blob — Whisper needs a File-like input.
    const readUrl = await generateReadSasUrl(video.blobKey);
    const response = await fetch(readUrl);
    if (!response.ok) {
      throw new Error(`failed to fetch blob: HTTP ${response.status}`);
    }
    const arrayBuffer = await response.arrayBuffer();

    // Whisper expects a File. Node 20+ provides one globally.
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
