import { NextRequest, NextResponse } from "next/server";
import { AIProjectClient } from "@azure/ai-projects";
import { DefaultAzureCredential } from "@azure/identity";
import {
    MessageTextContent,
    MessageImageFileContent,
    MessageTextFilePathAnnotation
} from "@azure/ai-agents";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/submittal/status/[jobId]
 *
 * Checks the status of a submittal generation job (Foundry Agent Run).
 * Requires `thread_id` as a query parameter.
 * If completed, returns the download URL for the generated PDF.
 */
export async function GET(
    req: NextRequest,
    { params }: { params: { jobId: string } }
) {
    const jobId = params.jobId;
    const searchParams = req.nextUrl.searchParams;
    const threadId = searchParams.get("thread_id");

    if (!threadId) {
         return NextResponse.json(
            { error: "Missing thread_id query parameter" },
            { status: 400 }
        );
    }

    try {
        const endpoint = process.env.AZURE_AI_FOUNDRY_ENDPOINT;

        if (!endpoint) {
            throw new Error("Missing Azure AI Foundry endpoint");
        }

        const credential = new DefaultAzureCredential();
        const client = AIProjectClient.fromEndpoint(endpoint, credential);

        // Get Run Status
        const run = await client.agents.runs.get(threadId, jobId);

        if (run.status === "completed") {
            // Get output messages
            const messagesList = client.agents.messages.list(threadId);

            // Iterate to get the latest message
            let latestMessage;
            for await (const msg of messagesList) {
                latestMessage = msg;
                break; // Just need the first one (latest)
            }

            let fileId: string | undefined;

            if (latestMessage) {
                // Check attachments
                if (latestMessage.attachments && latestMessage.attachments.length > 0) {
                     fileId = latestMessage.attachments[0].fileId;
                }

                // Fallback: Check content annotations
                if (!fileId && latestMessage.content) {
                    for (const contentPart of latestMessage.content) {
                        if (contentPart.type === "image_file") {
                            const imageContent = contentPart as MessageImageFileContent;
                            if (imageContent.imageFile) {
                                fileId = imageContent.imageFile.fileId;
                                break;
                            }
                        }
                        if (contentPart.type === "text") {
                            const textContent = contentPart as MessageTextContent;
                            if (textContent.text?.annotations) {
                                 for (const annotation of textContent.text.annotations) {
                                     if (annotation.type === "file_path") {
                                         const filePathAnnotation = annotation as MessageTextFilePathAnnotation;
                                         if (filePathAnnotation.filePath) {
                                             fileId = filePathAnnotation.filePath.fileId;
                                             break;
                                         }
                                     }
                                 }
                            }
                        }
                        if (fileId) break;
                    }
                }
            }

            return NextResponse.json({
                status: "completed",
                download_url: fileId ? `/api/submittal/download/${fileId}` : null,
                completed_at: run.completedAt,
            });
        } else if (run.status === "failed") {
            return NextResponse.json({
                status: "failed",
                error: run.lastError,
            });
        }

        return NextResponse.json({
            status: run.status,
            progress: (run.metadata as any)?.progress || 0
        });

    } catch (error) {
        console.error("❌ Status Check Error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Internal server error" },
            { status: 500 }
        );
    }
}
