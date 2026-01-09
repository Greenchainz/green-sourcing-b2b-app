import { NextRequest, NextResponse } from "next/server";
import { generateSubmittalPackage } from "@/lib/agents/submittal-generator";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/submittal/generate
 * 
 * Accepts a PDF file via FormData and returns a complete submittal package PDF
 * 
 * Azure Services Used:
 * - Azure Blob Storage (upload spec)
 * - Azure Document Intelligence (extract text)
 * - Azure OpenAI (extract requirements)
 * - Azure SQL Database (find matches)
 * - pdf-lib (generate package)
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

        console.log(`📄 Processing submittal for: ${file.name}`);

        // Call the Azure-native agent
        const result = await generateSubmittalPackage(file);

        // Return PDF as binary response
        return new NextResponse(Buffer.from(result.pdfBytes), {
            status: 200,
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": 'attachment; filename="GreenChainz_Submittal.pdf"',
                "Cache-Control": "no-cache, no-store, must-revalidate",
            },
        });
    } catch (error) {
        console.error("❌ Submittal Generation Error:", error);

        const errorMessage =
            error instanceof Error ? error.message : "Internal server error";

        return NextResponse.json(
            { error: errorMessage, details: "Check server logs for details" },
            { status: 500 }
        );
    }
}
