import { NextRequest, NextResponse } from "next/server";
import { AIProjectClient } from "@azure/ai-projects";
import { uploadBlob } from "@/lib/azure/blob-storage";
import { DefaultAzureCredential } from "@azure/identity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/submittal/generate
 * 
 * Accepts a PDF file via FormData and initiates an async Foundry Agent run.
 * Returns a job ID immediately for polling.
 * 
 * Flow:
 * 1. Upload PDF to Azure Blob Storage
 * 2. Create Foundry Thread
 * 3. Add Message with Blob URL
 * 4. Start Run (Foundry handles async processing)
 * 5. Return Job ID
 */

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get("file") as File | null;

        if (!file) {
            return NextResponse.json(
                { error: "No file uploaded" },
                { status: 400 }
            );
        }

        if (!file.name.toLowerCase().endsWith(".pdf")) {
            return NextResponse.json(
                { error: "Only PDF files are supported" },
                { status: 400 }
            );
        }

        console.log(`📄 Initiating submittal generation for: ${file.name}`);

        // 1. Upload to Azure Blob Storage
        const fileBuffer = Buffer.from(await file.arrayBuffer());
        const blobName = `submittal-upload-${Date.now()}-${file.name}`;

        const uploadResult = await uploadBlob("submittals", blobName, fileBuffer, {
            contentType: "application/pdf"
        });

        const blobUrl = uploadResult.url;
        console.log(`✅ Uploaded to Blob: ${blobUrl}`);

        // 2. Initialize Foundry Client
        const endpoint = process.env.AZURE_AI_FOUNDRY_ENDPOINT;

        // This env var should contain the Agent ID created by the setup script
        const agentId = process.env.AZURE_AI_FOUNDRY_DEPLOYMENT_NAME;

        if (!endpoint || !agentId) {
            throw new Error("Missing Azure AI Foundry configuration (Endpoint or Agent ID)");
        }

        const credential = new DefaultAzureCredential();
        const client = AIProjectClient.fromEndpoint(endpoint, credential);

        // 3. Create Thread
        const thread = await client.agents.threads.create();
        console.log(`🧵 Created Foundry Thread: ${thread.id}`);

        // 4. Add Message
        // Passing arguments as (threadId, role, content, options)
        await client.agents.messages.create(
            thread.id,
            "user",
            `Process submittal PDF: ${blobUrl}`,
            {}
        );

        // 5. Start Run
        // Using existing agent ID
        // Passing empty object for options to satisfy TS
        const run = await client.agents.runs.create(thread.id, agentId, {});

        console.log(`🏃‍♂️ Started Run: ${run.id}`);

        // 6. Return Job Details
        return NextResponse.json({
            job_id: run.id,
            thread_id: thread.id,
            status: run.status,
            status_url: `/api/submittal/status/${run.id}?thread_id=${thread.id}`,
            original_file: file.name
        });

    } catch (error) {
        console.error("❌ Submittal Initiation Error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Internal server error" },
            { status: 500 }
        );
    }
}
