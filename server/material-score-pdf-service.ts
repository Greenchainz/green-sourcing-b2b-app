import PDFDocument from "pdfkit";
import type { User } from "../drizzle/schema";
import { getDb } from "./db";
import { materials } from "../drizzle/schema";
import { eq } from "drizzle-orm";

/**
 * Generate a Material Credit Score report PDF for a given material.
 * Called by the gated /api/pdf/material-score/:materialId Express route.
 */
export async function generateMaterialScorePdf(
  materialId: number,
  requestingUser: User
): Promise<Buffer> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");

  // Pull material data
  const [mat] = await db
    .select()
    .from(materials)
    .where(eq(materials.id, materialId))
    .limit(1);

  const materialName = mat?.name ?? `Material #${materialId}`;
  const category = (mat as Record<string, unknown>)?.category as string | undefined;
  const manufacturer = (mat as Record<string, unknown>)?.manufacturer as string | undefined;
  const gwp = (mat as Record<string, unknown>)?.gwp as number | undefined;
  const certifications = ((mat as Record<string, unknown>)?.certifications as string[]) ?? [];

  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: "LETTER" });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const GREEN = "#16a34a";
    const DARK = "#1f2937";
    const MID = "#6b7280";
    const LIGHT = "#f0fdf4";

    // ── Header bar ──────────────────────────────────────────────────────────
    doc
      .rect(0, 0, doc.page.width, 72)
      .fill(GREEN);

    doc
      .fill("#ffffff")
      .fontSize(20)
      .font("Helvetica-Bold")
      .text("GreenChainz", 50, 20);

    doc
      .fontSize(10)
      .font("Helvetica")
      .text("Material Credit Score Report", 50, 46);

    doc
      .fontSize(9)
      .text(`Generated ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`, 50, 58);

    // ── Material name ───────────────────────────────────────────────────────
    doc.moveDown(2);
    doc
      .fill(DARK)
      .fontSize(18)
      .font("Helvetica-Bold")
      .text(materialName, 50, 90);

    if (manufacturer) {
      doc
        .fill(MID)
        .fontSize(11)
        .font("Helvetica")
        .text(manufacturer, 50, 115);
    }

    if (category) {
      doc
        .fill(MID)
        .fontSize(10)
        .text(category, 50, manufacturer ? 132 : 115);
    }

    // ── Score box ───────────────────────────────────────────────────────────
    const scoreY = 155;
    doc
      .rect(50, scoreY, 120, 80)
      .fill(LIGHT);

    const score = (mat as Record<string, unknown>)?.ccpsScore as number | undefined;
    doc
      .fill(GREEN)
      .fontSize(40)
      .font("Helvetica-Bold")
      .text(score != null ? String(Math.round(score)) : "—", 50, scoreY + 12, { width: 120, align: "center" });

    doc
      .fill(MID)
      .fontSize(9)
      .font("Helvetica")
      .text("MCS / 100", 50, scoreY + 58, { width: 120, align: "center" });

    // Score description
    const scoreDesc =
      score == null ? "Score not available"
      : score >= 80 ? "Excellent — top-tier sustainable material"
      : score >= 60 ? "Good — solid sustainability credentials"
      : score >= 40 ? "Fair — room for improvement"
      : "Developing — consider alternatives";

    doc
      .fill(DARK)
      .fontSize(11)
      .font("Helvetica")
      .text(scoreDesc, 190, scoreY + 28);

    // ── Key data table ──────────────────────────────────────────────────────
    const tableY = 260;
    doc
      .fill(DARK)
      .fontSize(12)
      .font("Helvetica-Bold")
      .text("Material Data", 50, tableY);

    doc.moveTo(50, tableY + 18).lineTo(560, tableY + 18).stroke("#e5e7eb");

    const rows: [string, string][] = [
      ["GWP (Global Warming Potential)", gwp != null ? `${gwp.toFixed(3)} kgCO₂e/kg` : "Not available"],
      ["Certifications", certifications.length > 0 ? certifications.join(", ") : "None on record"],
      ["US Manufactured", (mat as Record<string, unknown>)?.usManufactured ? "Yes" : "Not specified"],
      ["EPD Available", (mat as Record<string, unknown>)?.hasEpd ? "Yes — verified" : "No"],
    ];

    rows.forEach(([label, value], i) => {
      const y = tableY + 26 + i * 22;
      if (i % 2 === 0) {
        doc.rect(50, y - 2, 510, 20).fill("#f9fafb");
      }
      doc.fill(MID).fontSize(10).font("Helvetica").text(label, 56, y + 2);
      doc.fill(DARK).text(value, 310, y + 2);
    });

    // ── Certifications detail ───────────────────────────────────────────────
    if (certifications.length > 0) {
      const certY = tableY + 140;
      doc
        .fill(DARK)
        .fontSize(12)
        .font("Helvetica-Bold")
        .text("Certifications", 50, certY);

      doc.moveTo(50, certY + 18).lineTo(560, certY + 18).stroke("#e5e7eb");

      certifications.forEach((cert, i) => {
        doc
          .fill(GREEN)
          .fontSize(10)
          .font("Helvetica")
          .text(`✓  ${cert}`, 56, certY + 28 + i * 18);
      });
    }

    // ── Footer ──────────────────────────────────────────────────────────────
    const footerY = doc.page.height - 50;
    doc
      .moveTo(50, footerY - 10)
      .lineTo(560, footerY - 10)
      .stroke("#e5e7eb");

    doc
      .fill(MID)
      .fontSize(8)
      .font("Helvetica")
      .text(
        `Downloaded by ${requestingUser.email ?? requestingUser.name ?? "architect"} · greenchainz.com · Material ID ${materialId}`,
        50, footerY,
        { width: 510, align: "center" }
      );

    doc.end();
  });
}
