import PDFDocument from "pdfkit";
import { PassThrough } from "stream";

/**
 * RFQ PDF Generation Service
 *
 * Generates professional PDF documents for:
 * 1. RFQ Summary — sent to suppliers when an RFQ is published
 * 2. Award Letter — sent to winning supplier when a bid is accepted
 * 3. Bid Comparison Report — buyer's internal view of all bids
 */

interface RfqItem {
  materialName: string;
  quantity: number;
  quantityUnit: string;
  notes?: string;
}

interface RfqPdfData {
  rfqId: number;
  projectName: string;
  projectLocation: string;
  projectType?: string;
  buyerName: string;
  buyerEmail: string;
  dueDate?: Date | string;
  notes?: string;
  items: RfqItem[];
  createdAt: Date | string;
}

interface BidPdfData {
  supplierName: string;
  bidPrice: string;
  leadDays: number;
  notes?: string;
  submittedAt: Date | string;
}

interface AwardLetterData extends RfqPdfData {
  winningBid: BidPdfData;
  awardedAt: Date | string;
}

interface BidComparisonData extends RfqPdfData {
  bids: BidPdfData[];
}

// ─── Color palette ───────────────────────────────────────────────────────────
const COLORS = {
  green: "#1a7a4a",
  lightGreen: "#e8f5ee",
  darkGray: "#1f2937",
  midGray: "#6b7280",
  lightGray: "#f3f4f6",
  border: "#d1d5db",
  white: "#ffffff",
};

function drawHeader(doc: PDFKit.PDFDocument, title: string, subtitle: string) {
  // Green header bar
  doc.rect(0, 0, doc.page.width, 80).fill(COLORS.green);

  // Logo / brand name
  doc
    .fillColor(COLORS.white)
    .fontSize(22)
    .font("Helvetica-Bold")
    .text("GreenChainz", 40, 22);

  doc
    .fillColor("rgba(255,255,255,0.8)")
    .fontSize(9)
    .font("Helvetica")
    .text("Sustainable Material Procurement", 40, 48);

  // Document title (right-aligned)
  doc
    .fillColor(COLORS.white)
    .fontSize(14)
    .font("Helvetica-Bold")
    .text(title, 40, 22, { align: "right" });

  doc
    .fillColor("rgba(255,255,255,0.8)")
    .fontSize(9)
    .font("Helvetica")
    .text(subtitle, 40, 48, { align: "right" });

  doc.moveDown(4);
}

function drawSectionHeader(doc: PDFKit.PDFDocument, text: string) {
  const y = doc.y;
  doc.rect(40, y, doc.page.width - 80, 22).fill(COLORS.lightGreen);
  doc
    .fillColor(COLORS.green)
    .fontSize(10)
    .font("Helvetica-Bold")
    .text(text.toUpperCase(), 48, y + 6);
  doc.moveDown(1.5);
}

function drawKeyValue(
  doc: PDFKit.PDFDocument,
  label: string,
  value: string,
  x = 40,
  labelWidth = 130
) {
  const y = doc.y;
  doc
    .fillColor(COLORS.midGray)
    .fontSize(9)
    .font("Helvetica")
    .text(label, x, y, { width: labelWidth, continued: false });
  doc
    .fillColor(COLORS.darkGray)
    .fontSize(9)
    .font("Helvetica-Bold")
    .text(value, x + labelWidth, y, { width: 300 });
  doc.moveDown(0.6);
}

function drawFooter(doc: PDFKit.PDFDocument, rfqId: number) {
  const pageHeight = doc.page.height;
  const footerY = pageHeight - 50;

  doc
    .moveTo(40, footerY)
    .lineTo(doc.page.width - 40, footerY)
    .strokeColor(COLORS.border)
    .lineWidth(0.5)
    .stroke();

  doc
    .fillColor(COLORS.midGray)
    .fontSize(8)
    .font("Helvetica")
    .text(
      `GreenChainz — Confidential | RFQ #${rfqId} | Generated ${new Date().toLocaleDateString()} | greenchainz.com`,
      40,
      footerY + 8,
      { align: "center" }
    );
}

/**
 * Generate RFQ Summary PDF — sent to matched suppliers
 */
export async function generateRfqSummaryPdf(data: RfqPdfData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: "LETTER" });
    const chunks: Buffer[] = [];
    const stream = new PassThrough();

    stream.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", reject);
    doc.pipe(stream);

    drawHeader(doc, "REQUEST FOR QUOTATION", `RFQ #${data.rfqId}`);

    // Project Details
    drawSectionHeader(doc, "Project Information");
    drawKeyValue(doc, "Project Name", data.projectName);
    drawKeyValue(doc, "Location", data.projectLocation);
    if (data.projectType) drawKeyValue(doc, "Project Type", data.projectType);
    drawKeyValue(doc, "Issued By", `${data.buyerName} <${data.buyerEmail}>`);
    drawKeyValue(
      doc,
      "Issue Date",
      new Date(data.createdAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    );
    if (data.dueDate) {
      drawKeyValue(
        doc,
        "Response Due",
        new Date(data.dueDate).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      );
    }

    doc.moveDown(1);

    // Materials Table
    drawSectionHeader(doc, "Materials Required");

    // Table header
    const tableTop = doc.y;
    const colX = { num: 40, material: 65, qty: 340, unit: 400, notes: 460 };

    doc.rect(40, tableTop, doc.page.width - 80, 20).fill(COLORS.lightGray);
    doc
      .fillColor(COLORS.darkGray)
      .fontSize(9)
      .font("Helvetica-Bold")
      .text("#", colX.num, tableTop + 5)
      .text("Material", colX.material, tableTop + 5)
      .text("Qty", colX.qty, tableTop + 5)
      .text("Unit", colX.unit, tableTop + 5)
      .text("Notes", colX.notes, tableTop + 5);

    doc.moveDown(1.5);

    // Table rows
    data.items.forEach((item, i) => {
      const rowY = doc.y;
      if (i % 2 === 0) {
        doc.rect(40, rowY - 2, doc.page.width - 80, 18).fill("#fafafa");
      }
      doc
        .fillColor(COLORS.darkGray)
        .fontSize(9)
        .font("Helvetica")
        .text(String(i + 1), colX.num, rowY)
        .text(item.materialName, colX.material, rowY, { width: 270 })
        .text(String(item.quantity), colX.qty, rowY)
        .text(item.quantityUnit, colX.unit, rowY)
        .text(item.notes || "—", colX.notes, rowY, { width: 90 });
      doc.moveDown(0.9);
    });

    doc.moveDown(1);

    // Notes
    if (data.notes) {
      drawSectionHeader(doc, "Additional Requirements");
      doc
        .fillColor(COLORS.darkGray)
        .fontSize(9)
        .font("Helvetica")
        .text(data.notes, 40, doc.y, { width: doc.page.width - 80 });
      doc.moveDown(1);
    }

    // Instructions
    drawSectionHeader(doc, "Submission Instructions");
    doc
      .fillColor(COLORS.darkGray)
      .fontSize(9)
      .font("Helvetica")
      .text(
        "Please submit your bid through the GreenChainz platform at greenchainz.com. " +
          "Include unit pricing, lead time, and any applicable certifications (EPD, LEED, etc.). " +
          "All bids are reviewed by the buyer and evaluated on price, lead time, and sustainability credentials.",
        40,
        doc.y,
        { width: doc.page.width - 80 }
      );

    drawFooter(doc, data.rfqId);
    doc.end();
  });
}

/**
 * Generate Award Letter PDF — sent to winning supplier
 */
export async function generateAwardLetterPdf(data: AwardLetterData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: "LETTER" });
    const chunks: Buffer[] = [];
    const stream = new PassThrough();

    stream.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", reject);
    doc.pipe(stream);

    drawHeader(doc, "AWARD LETTER", `RFQ #${data.rfqId}`);

    // Congratulations block
    doc.rect(40, doc.y, doc.page.width - 80, 50).fill(COLORS.lightGreen);
    doc
      .fillColor(COLORS.green)
      .fontSize(14)
      .font("Helvetica-Bold")
      .text("Congratulations — Your Bid Has Been Accepted", 40, doc.y + 10, {
        align: "center",
        width: doc.page.width - 80,
      });
    doc.moveDown(3);

    drawSectionHeader(doc, "Project Details");
    drawKeyValue(doc, "Project Name", data.projectName);
    drawKeyValue(doc, "Location", data.projectLocation);
    drawKeyValue(doc, "Buyer", data.buyerName);
    drawKeyValue(
      doc,
      "Award Date",
      new Date(data.awardedAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    );

    doc.moveDown(1);

    drawSectionHeader(doc, "Awarded Bid");
    drawKeyValue(doc, "Supplier", data.winningBid.supplierName);
    drawKeyValue(doc, "Bid Amount", `$${parseFloat(data.winningBid.bidPrice).toFixed(2)}`);
    drawKeyValue(doc, "Lead Time", `${data.winningBid.leadDays} days`);
    if (data.winningBid.notes) drawKeyValue(doc, "Notes", data.winningBid.notes);

    doc.moveDown(1);

    drawSectionHeader(doc, "Materials");
    data.items.forEach((item, i) => {
      doc
        .fillColor(COLORS.darkGray)
        .fontSize(9)
        .font("Helvetica")
        .text(
          `${i + 1}. ${item.materialName} — ${item.quantity} ${item.quantityUnit}`,
          48,
          doc.y
        );
      doc.moveDown(0.6);
    });

    doc.moveDown(1);

    drawSectionHeader(doc, "Next Steps");
    doc
      .fillColor(COLORS.darkGray)
      .fontSize(9)
      .font("Helvetica")
      .text(
        "The buyer will contact you directly through the GreenChainz messaging system to coordinate delivery logistics. " +
          "Please ensure all required certifications and EPD documentation are available upon request. " +
          "This letter serves as confirmation of award — a formal purchase order will follow.",
        40,
        doc.y,
        { width: doc.page.width - 80 }
      );

    drawFooter(doc, data.rfqId);
    doc.end();
  });
}

/**
 * Generate Bid Comparison PDF — buyer's internal report
 */
export async function generateBidComparisonPdf(data: BidComparisonData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: "LETTER" });
    const chunks: Buffer[] = [];
    const stream = new PassThrough();

    stream.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", reject);
    doc.pipe(stream);

    drawHeader(doc, "BID COMPARISON REPORT", `RFQ #${data.rfqId}`);

    drawSectionHeader(doc, "Project Summary");
    drawKeyValue(doc, "Project Name", data.projectName);
    drawKeyValue(doc, "Location", data.projectLocation);
    drawKeyValue(doc, "Buyer", data.buyerName);
    drawKeyValue(doc, "Total Bids", String(data.bids.length));

    doc.moveDown(1);

    drawSectionHeader(doc, "Bid Comparison");

    // Table header
    const tableTop = doc.y;
    const colX = { rank: 40, supplier: 65, price: 280, lead: 360, notes: 430 };

    doc.rect(40, tableTop, doc.page.width - 80, 20).fill(COLORS.lightGray);
    doc
      .fillColor(COLORS.darkGray)
      .fontSize(9)
      .font("Helvetica-Bold")
      .text("#", colX.rank, tableTop + 5)
      .text("Supplier", colX.supplier, tableTop + 5)
      .text("Bid Price", colX.price, tableTop + 5)
      .text("Lead (days)", colX.lead, tableTop + 5)
      .text("Notes", colX.notes, tableTop + 5);

    doc.moveDown(1.5);

    // Sort bids by price ascending
    const sortedBids = [...data.bids].sort(
      (a, b) => parseFloat(a.bidPrice) - parseFloat(b.bidPrice)
    );

    sortedBids.forEach((bid, i) => {
      const rowY = doc.y;
      const isLowest = i === 0;

      if (isLowest) {
        doc.rect(40, rowY - 2, doc.page.width - 80, 18).fill("#dcfce7");
      } else if (i % 2 === 0) {
        doc.rect(40, rowY - 2, doc.page.width - 80, 18).fill("#fafafa");
      }

      doc
        .fillColor(isLowest ? COLORS.green : COLORS.darkGray)
        .fontSize(9)
        .font(isLowest ? "Helvetica-Bold" : "Helvetica")
        .text(String(i + 1), colX.rank, rowY)
        .text(bid.supplierName, colX.supplier, rowY, { width: 210 })
        .text(`$${parseFloat(bid.bidPrice).toFixed(2)}`, colX.price, rowY)
        .text(String(bid.leadDays), colX.lead, rowY)
        .text(bid.notes || "—", colX.notes, rowY, { width: 130 });

      if (isLowest) {
        doc
          .fillColor(COLORS.green)
          .fontSize(7)
          .font("Helvetica")
          .text("★ LOWEST BID", colX.supplier + 180, rowY);
      }

      doc.moveDown(0.9);
    });

    doc.moveDown(1);

    // Summary stats
    if (data.bids.length > 0) {
      const prices = data.bids.map((b) => parseFloat(b.bidPrice));
      const min = Math.min(...prices);
      const max = Math.max(...prices);
      const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
      const savings = ((max - min) / max) * 100;

      drawSectionHeader(doc, "Summary Statistics");
      drawKeyValue(doc, "Lowest Bid", `$${min.toFixed(2)}`);
      drawKeyValue(doc, "Highest Bid", `$${max.toFixed(2)}`);
      drawKeyValue(doc, "Average Bid", `$${avg.toFixed(2)}`);
      drawKeyValue(doc, "Potential Savings", `${savings.toFixed(1)}% vs. highest bid`);
    }

    drawFooter(doc, data.rfqId);
    doc.end();
  });
}
