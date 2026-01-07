/**
 * Submittal Generator Agent (Azure-Native)
 * 
 * Orchestrates:
 * 1. PDF upload to Azure Blob Storage
 * 2. Text extraction via Azure Document Intelligence
 * 3. Requirement extraction via Azure OpenAI
 * 4. Product matching from Azure SQL Database
 * 5. PDF package generation via pdf-lib
 */

import { uploadFileToBlob, runQuery } from "@/lib/azure/config";
import { DocumentAnalysisClient, AzureKeyCredential } from "@azure/ai-form-recognizer";
import { OpenAIClient, AzureKeyCredential as AOKey } from "@azure/openai";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export interface SpecRequirements {
    materialType: string | null;
    maxCarbon?: number | null;
    minRecycledPercent?: number | null;
    standards: string[];
    requiredCerts: string[];
}

export interface Product {
    ProductID: number;
    ProductName: string;
    SupplierID: number;
    CategoryName: string | null;
    GlobalWarmingPotential: number | null;
    EPDDocumentURL: string | null;
    SupplierName?: string;
}

/**
 * STEP 1: Upload PDF to Azure Blob Storage
 */
export async function uploadSpecToAzure(
    file: File
): Promise<{ fileUrl: string; fileBuffer: Buffer }> {
    const buffer = Buffer.from(await file.arrayBuffer());
    const fileName = `spec-${Date.now()}-${file.name}`;

    const fileUrl = await uploadFileToBlob("submittals", fileName, buffer);

    console.log(`✅ Uploaded ${file.name} to Azure Blob: ${fileUrl}`);

    return { fileUrl, fileBuffer: buffer };
}

/**
 * STEP 2: Extract text from PDF via Azure Document Intelligence
 */
export async function extractTextFromPDF(fileBuffer: Buffer): Promise<string> {
    const endpoint = process.env.AZURE_DOC_INTEL_ENDPOINT;
    const key = process.env.AZURE_DOC_INTEL_KEY;

    if (!endpoint || !key) {
        throw new Error("Missing Azure Document Intelligence credentials");
    }

    const client = new DocumentAnalysisClient(endpoint, new AzureKeyCredential(key));

    try {
        const poller = await client.beginAnalyzeDocument("prebuilt-read", fileBuffer);
        const result = await poller.pollUntilDone();

        const text = result?.content ?? "";
        console.log(`✅ Extracted ${text.length} characters from PDF`);

        return text.substring(0, 80000); // Safety cap for OpenAI context
    } catch (error) {
        console.error("❌ Document Intelligence Error:", error);
        throw error;
    }
}

/**
 * STEP 3: Extract structured requirements via Azure OpenAI
 */
export async function extractRequirementsWithOpenAI(
    specText: string
): Promise<SpecRequirements> {
    const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
    const key = process.env.AZURE_OPENAI_API_KEY;
    const deployment = process.env.AZURE_OPENAI_DEPLOYMENT || "gpt-4o-mini";

    if (!endpoint || !key) {
        throw new Error("Missing Azure OpenAI credentials");
    }

    const client = new OpenAIClient(endpoint, new AOKey(key));

    const systemPrompt = `You are a construction spec analyzer. Extract material requirements from architectural specs.
Return strict JSON with these fields:
- category (string): Material type (e.g., "Concrete", "Drywall")
- standards (array): Compliance standards (e.g., ["ASTM C150"])
- maxGlobalWarmingPotential (number): Max kgCO2e/unit or null
- minRecycledPercent (number): Min recycled content % or null
- requiredCerts (array): Required certifications (e.g., ["EPD", "HPD"])`;

    const userPrompt = `Analyze this spec excerpt and extract criteria as JSON:\n\n${specText.substring(0, 6000)}`;

    try {
        const response = await client.getChatCompletions(deployment, [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
        ]);

        const content = response.choices?.[0]?.message?.content ?? "{}";
        let parsed = JSON.parse(content);

        console.log(`✅ Extracted requirements:`, parsed);

        return {
            materialType: parsed.category ?? null,
            maxCarbon: parsed.maxGlobalWarmingPotential ?? null,
            minRecycledPercent: parsed.minRecycledPercent ?? null,
            standards: Array.isArray(parsed.standards) ? parsed.standards : [],
            requiredCerts: Array.isArray(parsed.requiredCerts) ? parsed.requiredCerts : [],
        };
    } catch (error) {
        console.error("❌ Azure OpenAI Error:", error);
        throw error;
    }
}

/**
 * STEP 4: Find verified supplier matches in Azure SQL
 */
export async function findVerifiedMatches(
    requirements: SpecRequirements
): Promise<Product[]> {
    try {
        const query = `
      SELECT TOP 3
        p.ProductID,
        p.ProductName,
        p.SupplierID,
        pc.CategoryName,
        e.GlobalWarmingPotential,
        e.EPDDocumentURL,
        s.CompanyName as SupplierName
      FROM Products p
      LEFT JOIN Product_Categories pc ON pc.CategoryID = p.CategoryID
      INNER JOIN Product_EPDs e ON e.ProductID = p.ProductID AND e.EPDDocumentURL IS NOT NULL
      INNER JOIN Suppliers s ON s.SupplierID = p.SupplierID AND s.IsVerified = 1
      WHERE 
        (@category IS NULL OR LOWER(pc.CategoryName) LIKE '%' + LOWER(@category) + '%')
        AND (@maxGWP IS NULL OR e.GlobalWarmingPotential <= @maxGWP)
      ORDER BY e.GlobalWarmingPotential ASC, p.ProductName ASC
    `;

        const matches = await runQuery<Product>(query, {
            category: requirements.materialType,
            maxGWP: requirements.maxCarbon,
        });

        console.log(`✅ Found ${matches.length} verified matches`);
        return matches;
    } catch (error) {
        console.error("❌ Azure SQL Query Error:", error);
        throw error;
    }
}

/**
 * STEP 5: Build PDF submittal package
 */
export async function buildPDFPackage(
    specFileName: string,
    requirements: SpecRequirements,
    matches: Product[]
): Promise<Uint8Array> {
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);

    // Cover Page
    let page = doc.addPage([612, 792]); // Letter size
    page.drawText("GreenChainz", {
        x: 50,
        y: 750,
        size: 28,
        font: boldFont,
        color: rgb(0.18, 0.68, 0.29), // Green
    });
    page.drawText("Verified Submittal Package", {
        x: 50,
        y: 710,
        size: 20,
        font,
        color: rgb(0.2, 0.2, 0.2),
    });
    page.drawText(`Source: ${specFileName}`, {
        x: 50,
        y: 680,
        size: 12,
        font,
        color: rgb(0.5, 0.5, 0.5),
    });
    page.drawText(`Generated: ${new Date().toLocaleString()}`, {
        x: 50,
        y: 665,
        size: 12,
        font,
        color: rgb(0.5, 0.5, 0.5),
    });

    // Spec Criteria Page
    page = doc.addPage([612, 792]);
    page.drawText("Extracted Specification Criteria", {
        x: 50,
        y: 750,
        size: 16,
        font: boldFont,
    });

    let y = 720;
    const criteria = [
        `Material Type: ${requirements.materialType ?? "Not specified"}`,
        `Max Carbon: ${requirements.maxCarbon ?? "No limit"} kgCO2e`,
        `Min Recycled: ${requirements.minRecycledPercent ?? "Not specified"}%`,
        `Standards: ${requirements.standards.join(", ") || "None"}`,
        `Required Certs: ${requirements.requiredCerts.join(", ") || "None"}`,
    ];

    for (const line of criteria) {
        page.drawText(line, { x: 50, y, size: 11, font });
        y -= 18;
    }

    // Proposed Products Page
    page = doc.addPage([612, 792]);
    page.drawText("Proposed Products (Verified Suppliers)", {
        x: 50,
        y: 750,
        size: 16,
        font: boldFont,
    });

    y = 720;
    matches.forEach((m, i) => {
        page.drawText(`${i + 1}. ${m.ProductName}`, {
            x: 50,
            y,
            size: 12,
            font: boldFont,
            color: rgb(0.18, 0.68, 0.29),
        });
        y -= 16;

        page.drawText(`   Supplier: ${m.SupplierName || "Unknown"}`, {
            x: 50,
            y,
            size: 10,
            font,
        });
        y -= 12;

        page.drawText(
            `   Category: ${m.CategoryName} | GWP: ${m.GlobalWarmingPotential ?? "N/A"} kgCO2e`,
            { x: 50, y, size: 10, font }
        );
        y -= 16;

        if (m.EPDDocumentURL) {
            page.drawText(`   EPD Available: Yes`, {
                x: 50,
                y,
                size: 10,
                font,
                color: rgb(0, 0.5, 0),
            });
        }
        y -= 18;
    });

    // Append EPD PDFs
    for (const m of matches) {
        if (!m.EPDDocumentURL) continue;
        try {
            const response = await fetch(m.EPDDocumentURL);
            if (!response.ok) continue;

            const epdBuffer = await response.arrayBuffer();
            const epdDoc = await PDFDocument.load(new Uint8Array(epdBuffer));
            const pages = await doc.copyPages(epdDoc, epdDoc.getPageIndices());
            pages.forEach((p) => doc.addPage(p));
        } catch (error) {
            console.warn(`Could not append EPD for ${m.ProductName}:`, error);
        }
    }

    return await doc.save();
}

/**
 * ORCHESTRATOR: Main function that runs the entire flow
 */
export async function generateSubmittalPackage(file: File) {
    try {
        console.log(`🚀 Starting submittal generation for ${file.name}...`);

        // Upload file
        const { fileUrl, fileBuffer } = await uploadSpecToAzure(file);

        // Extract text
        const specText = await extractTextFromPDF(fileBuffer);

        // Extract requirements
        const requirements = await extractRequirementsWithOpenAI(specText);

        // Find matches
        const matches = await findVerifiedMatches(requirements);

        // Build PDF
        const pdfBytes = await buildPDFPackage(file.name, requirements, matches);

        console.log(`✅ Submittal package generated successfully`);

        return {
            success: true,
            requirements,
            matches,
            pdfBytes,
            fileUrl,
        };
    } catch (error) {
        console.error("❌ Submittal generation failed:", error);
        throw error;
    }
