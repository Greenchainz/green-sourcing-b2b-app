import PDFDocument from "pdfkit";
import { materials, swapValidations } from "../../drizzle/schema";

type SwapValidationRow = typeof swapValidations.$inferSelect;
type MaterialRow = typeof materials.$inferSelect;
const MAX_FAILED_CHECKS_IN_PDF = 8;

export function buildCsi15CFilename(projectName: string | undefined, validationId: number): string {
  // Keep filenames filesystem-safe across browser/OS download behavior.
  const safeProjectName = (projectName || "Project")
    .replace(/[^a-zA-Z0-9-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60) || "Project";
  const date = new Date().toISOString().slice(0, 10);
  return `CSI-1.5C_${safeProjectName}_Validation-${validationId}_${date}.pdf`;
}

function extractShowstopperSummary(validation: SwapValidationRow): {
  passed: number;
  failed: number;
  skipped: number;
  failedChecks: string[];
} {
  const failedChecks: string[] = [];
  const raw = validation.showstopperResults;
  if (raw && typeof raw === "object") {
    for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
      const status =
        value && typeof value === "object"
          ? (value as Record<string, unknown>).status
          : value;
      if (typeof status === "string" && /fail/i.test(status)) {
        failedChecks.push(key);
      }
    }
  }
  return {
    passed: validation.passedChecks,
    failed: validation.failedChecks,
    skipped: validation.skippedChecks,
    failedChecks: failedChecks.slice(0, MAX_FAILED_CHECKS_IN_PDF),
  };
}

function asNumber(value: string | null): number | null {
  if (value == null) return null;
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function generateCsiForm15CPdf(params: {
  validation: SwapValidationRow;
  incumbent: MaterialRow;
  sustainable: MaterialRow;
  incumbentManufacturer?: string;
  sustainableManufacturer?: string;
  projectName?: string;
  specSection?: string;
  requestedBy?: string;
}): Promise<Buffer> {
  const doc = new PDFDocument({ size: "LETTER", margin: 50 });
  const chunks: Buffer[] = [];
  doc.on("data", (chunk) => chunks.push(chunk));

  const {
    validation,
    incumbent,
    sustainable,
    incumbentManufacturer,
    sustainableManufacturer,
    projectName,
    specSection,
    requestedBy,
  } = params;

  const score = asNumber(validation.overallScore);
  const costDelta = asNumber(validation.costDeltaPercentage);
  const carbonDelta = asNumber(validation.carbonReductionPercentage);
  const showstopper = extractShowstopperSummary(validation);
  const date = new Date().toISOString().split("T")[0];

  doc.font("Helvetica-Bold").fontSize(16).text("CSI Form 1.5C");
  doc.fontSize(11).text("Substitution Request During the Bidding/Negotiating Stage");
  doc.moveDown(0.3);
  doc.font("Helvetica").fontSize(10);
  doc.text(`Date: ${date}`);
  doc.text(`Project: ${projectName || "Unspecified"}`);
  doc.text(`Spec Section: ${specSection || "01 25 00"}`);
  doc.text(`Requested By: ${requestedBy || "GreenChainz User"}`);
  doc.text(`Validation Reference: GCZ-${validation.id}`);

  doc.moveDown();
  doc.font("Helvetica-Bold").fontSize(11).text("1) Product Information");
  doc.font("Helvetica").fontSize(10);
  doc.text(`Specified Product: ${incumbent.productName || incumbent.name}`);
  doc.text(`Specified Manufacturer: ${incumbentManufacturer || "N/A"}`);
  doc.text(`Proposed Product: ${sustainable.productName || sustainable.name}`);
  doc.text(`Proposed Manufacturer: ${sustainableManufacturer || "N/A"}`);
  doc.text(`Category: ${sustainable.category}`);
  doc.text(`EPD Number: ${sustainable.epdNumber || "N/A"}`);

  doc.moveDown();
  doc.font("Helvetica-Bold").fontSize(11).text("2) Cost Impact");
  doc.font("Helvetica").fontSize(10);
  doc.text(`Incumbent Total Cost: ${validation.incumbentTotalCost ? `$${validation.incumbentTotalCost}` : "N/A"}`);
  doc.text(`Proposed Total Cost: ${validation.sustainableTotalCost ? `$${validation.sustainableTotalCost}` : "N/A"}`);
  doc.text(`Cost Delta: ${costDelta == null ? "N/A" : `${costDelta.toFixed(1)}%`}`);

  doc.moveDown();
  doc.font("Helvetica-Bold").fontSize(11).text("3) GreenChainz Enhancement Summary");
  doc.font("Helvetica").fontSize(10);
  doc.text(`Validation Status: ${validation.validationStatus}`);
  doc.text(`Overall Validation Score: ${score == null ? "N/A" : `${score.toFixed(1)} / 100`}`);
  doc.text(`Showstopper Checks: ${showstopper.passed} passed / ${showstopper.failed} failed / ${showstopper.skipped} skipped`);
  if (showstopper.failedChecks.length > 0) {
    doc.text(`Failed Check Names: ${showstopper.failedChecks.join(", ")}`);
  }
  doc.text(`Carbon Delta vs Specified Material: ${carbonDelta == null ? "N/A" : `${carbonDelta.toFixed(1)}%`}`);

  doc.moveDown();
  doc.font("Helvetica-Bold").fontSize(11).text("4) Reviewer Notes");
  doc.font("Helvetica").fontSize(10);
  doc.text(validation.recommendation || "No additional recommendation provided.");

  doc.moveDown();
  doc.font("Helvetica-Bold").fontSize(11).text("5) Acknowledgements");
  doc.font("Helvetica").fontSize(10);
  doc.text("Architect/Engineer: _________________________  Date: __________");
  doc.text("Contractor: ________________________________  Date: __________");
  doc.text("Owner: _____________________________________  Date: __________");

  doc.moveDown();
  doc.fontSize(8).fillColor("#555555").text(
    "Generated by GreenChainz Swap Validation Engine. This draft supports bidding-stage substitution review and must be confirmed by project decision makers.",
    { align: "center" },
  );

  doc.end();
  await new Promise<void>((resolve, reject) => {
    doc.on("end", () => resolve());
    doc.on("error", reject);
  });
  return Buffer.concat(chunks);
}
