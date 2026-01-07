import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { Readable } from "node:stream";
import sql from "mssql";
import { DocumentAnalysisClient, AzureKeyCredential } from "@azure/ai-form-recognizer";
import { OpenAIClient, AzureKeyCredential as AOKey } from "@azure/openai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Match = {
    ProductID: number;
    ProductName: string;
    SupplierID: number;
    CategoryName: string | null;
    GlobalWarmingPotential: number | null;
    EPDDocumentURL: string | null;
};

// Azure SQL Connection (singleton)
let pool: sql.ConnectionPool | null = null;
async function getAzureSQLPool(): Promise<sql.ConnectionPool> {
    if (pool) return pool;
    pool = new sql.ConnectionPool({
        server: process.env.AZURE_SQL_SERVER || "",
        database: process.env.AZURE_SQL_DATABASE || "",
        authentication: {
            type: "default",
            options: {
                userName: process.env.AZURE_SQL_USER || "",
                password: process.env.AZURE_SQL_PASSWORD || "",
            },
        },
        options: { encrypt: true, trustServerCertificate: false },
    });
    await pool.connect();
    return pool;
}

async function extractTextWithADI(file: File): Promise<string> {
    const endpoint = process.env.AZURE_FORMRECOGNIZER_ENDPOINT;
    const key = process.env.AZURE_FORMRECOGNIZER_KEY;
    if (!endpoint || !key) throw new Error("Missing Document Intelligence env vars");

    const client = new DocumentAnalysisClient(endpoint, new AzureKeyCredential(key));
    const buf = Buffer.from(await file.arrayBuffer());
    const stream = Readable.from(buf);
    const poller = await client.beginAnalyzeDocument("prebuilt-document", stream);
    const result = await poller.pollUntilDone();
    const text = result?.content ?? "";
    return text.slice(0, 80000); // safety cap
}

async function extractCriteriaWithOpenAI(specText: string) {
    const aoEndpoint = process.env.AZURE_OPENAI_ENDPOINT;
    const aoKey = process.env.AZURE_OPENAI_API_KEY;
    const deployment = process.env.AZURE_OPENAI_DEPLOYMENT || "gpt-4o-mini";
    if (!aoEndpoint || !aoKey) throw new Error("Missing Azure OpenAI env vars");

    const client = new OpenAIClient(aoEndpoint, new AOKey(aoKey));

    const system = `You extract material submittal criteria from spec text and return strict JSON.
Fields: category (string), standards (string[]), minRecycledPercent (number|null), maxGlobalWarmingPotential (number|null), requiredCerts (string[]).
Keep arrays small (<=5).`;

    const user = `Spec Text:\n${specText.substring(0, 6000)}\nReturn JSON only.`;
    const resp = await client.getChatCompletions(deployment, [
        { role: "system", content: system },
        { role: "user", content: user },
    ], { responseFormat: { type: "json_object" } });

    const content = resp.choices?.[0]?.message?.content ?? "{}";
    let parsed: any = {};
    try { parsed = JSON.parse(content); } catch { parsed = {}; }
    return {
        category: parsed.category ?? null,
        standards: Array.isArray(parsed.standards) ? parsed.standards : [],
        minRecycledPercent: typeof parsed.minRecycledPercent === "number" ? parsed.minRecycledPercent : null,
        maxGlobalWarmingPotential: typeof parsed.maxGlobalWarmingPotential === "number" ? parsed.maxGlobalWarmingPotential : null,
        requiredCerts: Array.isArray(parsed.requiredCerts) ? parsed.requiredCerts : [],
    };
}

async function findMatches(criteria: any): Promise<Match[]> {
    const pool = await getAzureSQLPool();
    const request = pool.request();

    request.input("category", sql.VarChar, criteria.category ? `%${criteria.category.toLowerCase()}%` : null);
    request.input("maxGWP", sql.Decimal(15, 4), criteria.maxGlobalWarmingPotential ?? null);

    const query = `
    SELECT TOP 3 p.ProductID, p.ProductName, p.SupplierID, pc.CategoryName, e.GlobalWarmingPotential, e.EPDDocumentURL
    FROM Products p
    LEFT JOIN Product_Categories pc ON pc.CategoryID = p.CategoryID
    INNER JOIN Product_EPDs e ON e.ProductID = p.ProductID AND e.EPDDocumentURL IS NOT NULL
    WHERE ( @category IS NULL OR LOWER(pc.CategoryName) LIKE @category OR LOWER(p.ProductName) LIKE @category )
      AND ( @maxGWP IS NULL OR e.GlobalWarmingPotential <= @maxGWP )
    ORDER BY e.GlobalWarmingPotential ASC, p.ProductName ASC`;

    const result = await request.query(query);
    return result.recordset as Match[];
}

async function buildPackage(specFileName: string, criteria: any, matches: Match[]): Promise<Uint8Array> {
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);

    // Cover
    let page = doc.addPage([612, 792]); // Letter
    page.drawText("GreenChainz Submittal Package", { x: 50, y: 720, size: 24, font, color: rgb(0.1, 0.3, 0.2) });
    page.drawText(`Source: ${specFileName}`, { x: 50, y: 690, size: 12, font });
    page.drawText(`Generated: ${new Date().toLocaleString()}`, { x: 50, y: 672, size: 12, font });

    // Comparison
    page = doc.addPage([612, 792]);
    page.drawText("Spec Criteria", { x: 50, y: 740, size: 16, font });
    const lines = [
        `Category: ${criteria.category ?? "-"}`,
        `Standards: ${(criteria.standards || []).join(", ") || "-"}`,
        `Min Recycled %: ${criteria.minRecycledPercent ?? "-"}`,
        `Max GWP: ${criteria.maxGlobalWarmingPotential ?? "-"}`,
        `Required Certs: ${(criteria.requiredCerts || []).join(", ") || "-"}`,
    ];
    let y = 710;
    for (const l of lines) { page.drawText(l, { x: 50, y, size: 12, font }); y -= 18; }

    y -= 12;
    page.drawText("Proposed Products", { x: 50, y, size: 16, font });
    y -= 24;
    matches.forEach((m, i) => {
        const t = `${i + 1}. ${m.ProductName} (Supplier ${m.SupplierID})  GWP: ${m.GlobalWarmingPotential ?? "-"}`;
        page.drawText(t, { x: 50, y, size: 12, font });
        y -= 18;
    });

    // Append EPD PDFs
    for (const m of matches) {
        if (!m.EPDDocumentURL) continue;
        try {
            const res = await fetch(m.EPDDocumentURL);
            if (!res.ok) continue;
            const arr = new Uint8Array(await res.arrayBuffer());
            const src = await PDFDocument.load(arr);
            const copied = await doc.copyPages(src, src.getPageIndices());
            copied.forEach((p) => doc.addPage(p));
        } catch { }
    }

    return await doc.save();
}

export async function POST(req: NextRequest) {
    try {
        const form = await req.formData();
        const file = form.get("file");
        if (!(file instanceof File)) {
            return NextResponse.json({ error: "Missing PDF file" }, { status: 400 });
        }

        const specText = await extractTextWithADI(file);
        const criteria = await extractCriteriaWithOpenAI(specText);
        const matches = await findMatches(criteria);
        const pdfBytes = await buildPackage(file.name || "Spec.pdf", criteria, matches);

        return new NextResponse(Buffer.from(pdfBytes), {
            status: 200,
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": 'attachment; filename="GreenChainz_Submittal.pdf"',
            },
        });
    } catch (err: any) {
        const message = err?.message || "Internal error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
