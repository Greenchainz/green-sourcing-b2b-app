import { NextRequest, NextResponse } from 'next/server';
import PDFDocument from 'pdfkit';

export const runtime = 'nodejs';

// ─── Payload Types ────────────────────────────────────────────────────────────

export type AssemblyReportRow = {
  assemblyId: string;
  description?: string;
  manufacturer?: string;
  epdNumber: string;
  gwpPerFunctionalUnit: number;
  msfFactor: number;
  totalKgCO2ePer1000SF: number;
};

export type AssemblyReportPayload = {
  projectName: string;
  facadeScope: string;
  architectName?: string;
  architectFirm?: string;
  reportDate?: string;
  assemblies: AssemblyReportRow[];
};

// ─── Number Helpers ───────────────────────────────────────────────────────────

function fmtNum(n: number, decimals = 1): string {
  return n.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function fmtInt(n: number): string {
  return Math.round(n).toLocaleString('en-US');
}

// ─── Hotspot Calculation ──────────────────────────────────────────────────────

function topHotspots(
  assemblies: AssemblyReportRow[],
  n = 3
): AssemblyReportRow[] {
  return [...assemblies]
    .sort((a, b) => b.totalKgCO2ePer1000SF - a.totalKgCO2ePer1000SF)
    .slice(0, n);
}

// ─── Text Wrapping ────────────────────────────────────────────────────────────

/**
 * Splits `text` into lines that fit within `maxWidth` points at the given font size.
 * Uses a greedy word-wrap approach.
 */
function wrapText(
  doc: PDFKit.PDFDocument,
  text: string,
  maxWidth: number,
  fontSize: number
): string[] {
  doc.fontSize(fontSize);
  const words = text.split(' ');
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (doc.widthOfString(candidate) <= maxWidth) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

// ─── Page Factory ─────────────────────────────────────────────────────────────

/** Add a new page and return references to the page dimensions and margins. */
function addPage(doc: PDFKit.PDFDocument): { width: number; height: number; margin: number } {
  doc.addPage();
  return { width: doc.page.width, height: doc.page.height, margin: 50 };
}

// ─── PDF Builder ─────────────────────────────────────────────────────────────

/** Wraps `doc.text()` and advances `y` by the rendered line height. */
function drawLine(
  doc: PDFKit.PDFDocument,
  text: string,
  x: number,
  y: number,
  fontSize: number,
  options?: PDFKit.Mixins.TextOptions & { color?: string }
): number {
  doc.fontSize(fontSize).fillColor(options?.color ?? '#1e293b');
  doc.text(text, x, y, { lineBreak: false, ...options });
  return y + fontSize * 1.4;
}

/**
 * Draw a horizontal rule.
 */
function drawRule(doc: PDFKit.PDFDocument, x: number, y: number, width: number): number {
  doc.moveTo(x, y).lineTo(x + width, y).strokeColor('#e2e8f0').lineWidth(0.5).stroke();
  return y + 8;
}

// ─── POST Handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: AssemblyReportPayload;
  try {
    body = (await req.json()) as AssemblyReportPayload;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body.projectName || typeof body.projectName !== 'string') {
    return NextResponse.json({ error: 'projectName is required' }, { status: 400 });
  }
  if (!body.facadeScope || typeof body.facadeScope !== 'string') {
    return NextResponse.json({ error: 'facadeScope is required' }, { status: 400 });
  }
  if (!Array.isArray(body.assemblies) || body.assemblies.length === 0) {
    return NextResponse.json({ error: 'assemblies must be a non-empty array' }, { status: 400 });
  }

  const reportDate =
    body.reportDate ?? new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  const grandTotal = body.assemblies.reduce((sum, a) => sum + a.totalKgCO2ePer1000SF, 0);
  const hotspots = topHotspots(body.assemblies);

  const pdfBytes = await buildPdf(body, reportDate, grandTotal, hotspots);

  const safeName = body.projectName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const filename = `greenchainz-defensibility-report-${safeName}.pdf`;

  return new NextResponse(pdfBytes, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}

// ─── PDF Construction ─────────────────────────────────────────────────────────

async function buildPdf(
  body: AssemblyReportPayload,
  reportDate: string,
  grandTotal: number,
  hotspots: AssemblyReportRow[]
): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'LETTER' });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const W = doc.page.width;
    const M = 50; // left/right margin
    const contentWidth = W - M * 2;

    // ── Cover / Header ────────────────────────────────────────────────────────
    let y = M;

    // Brand bar
    doc.rect(M, y, contentWidth, 36).fill('#166534');
    doc.fontSize(16).fillColor('#ffffff').font('Helvetica-Bold')
      .text('GreenChainz Defensibility Report', M + 12, y + 10, { lineBreak: false });
    y += 48;

    // Title row
    doc.fontSize(11).fillColor('#1e293b').font('Helvetica-Bold')
      .text('Assembly Carbon Defensibility Report', M, y, { lineBreak: false });
    y += 18;

    // Project metadata
    doc.fontSize(9).fillColor('#475569').font('Helvetica');
    const metaLines: [string, string][] = [
      ['Project', body.projectName],
      ['Facade / Scope', body.facadeScope],
      ['Report Date', reportDate],
    ];
    if (body.architectName) metaLines.push(['Architect', body.architectName]);
    if (body.architectFirm) metaLines.push(['Firm', body.architectFirm]);

    for (const [label, value] of metaLines) {
      doc.font('Helvetica-Bold').text(`${label}:  `, M, y, { continued: true, lineBreak: false });
      doc.font('Helvetica').fillColor('#1e293b').text(value, { lineBreak: false });
      y += 13;
    }
    y += 4;

    y = drawRule(doc, M, y, contentWidth);

    // ── Summary bar ──────────────────────────────────────────────────────────
    doc.rect(M, y, contentWidth, 28).fill('#f0fdf4');
    doc.fontSize(9).fillColor('#166534').font('Helvetica-Bold')
      .text(`Grand Total: ${fmtInt(grandTotal)} kgCO₂e / 1,000 SF   |   Assemblies: ${body.assemblies.length}`, M + 8, y + 9, { lineBreak: false });
    y += 36;

    // Top hotspots
    if (hotspots.length > 0) {
      doc.fontSize(9).fillColor('#1e293b').font('Helvetica-Bold')
        .text('Top Hotspots by kgCO₂e / 1,000 SF:', M, y, { lineBreak: false });
      y += 13;
      hotspots.forEach((h, i) => {
        doc.fontSize(8).font('Helvetica').fillColor('#475569')
          .text(`  ${i + 1}. ${h.assemblyId} — ${fmtInt(h.totalKgCO2ePer1000SF)} kgCO₂e / 1,000 SF (EPD: ${h.epdNumber})`, M, y, { lineBreak: false });
        y += 12;
      });
      y += 4;
    }

    y = drawRule(doc, M, y, contentWidth);

    // ── Assembly Table ────────────────────────────────────────────────────────
    y = drawLine(doc, 'Assembly Carbon Results', M, y, 10, { color: '#1e293b' });
    doc.font('Helvetica').fillColor('#1e293b');
    y += 2;

    // Column layout (points from left margin)
    const cols = {
      id:     { x: M,       w: 70  },
      desc:   { x: M + 75,  w: 110 },
      epd:    { x: M + 190, w: 85  },
      gwp:    { x: M + 280, w: 55  },
      factor: { x: M + 340, w: 45  },
      total:  { x: M + 390, w: 72  },
    };

    // Table header row
    const headerBg = (tableY: number) => {
      doc.rect(M, tableY, contentWidth, 16).fill('#f1f5f9');
      doc.fontSize(8).fillColor('#64748b').font('Helvetica-Bold');
      doc.text('Assembly',     cols.id.x + 2,     tableY + 4, { lineBreak: false, width: cols.id.w });
      doc.text('Description',  cols.desc.x + 2,   tableY + 4, { lineBreak: false, width: cols.desc.w });
      doc.text('EPD #',        cols.epd.x + 2,    tableY + 4, { lineBreak: false, width: cols.epd.w });
      doc.text('GWP / unit',   cols.gwp.x,        tableY + 4, { lineBreak: false, width: cols.gwp.w, align: 'right' });
      doc.text('Factor',       cols.factor.x,     tableY + 4, { lineBreak: false, width: cols.factor.w, align: 'right' });
      doc.text('kgCO₂e/1kSF', cols.total.x,      tableY + 4, { lineBreak: false, width: cols.total.w, align: 'right' });
      return tableY + 16;
    };

    y = headerBg(y);

    // Current page reference used to draw rows on the correct page
    const ensureSpace = (neededHeight: number): void => {
      if (y + neededHeight > doc.page.height - M - 30) {
        doc.addPage();
        y = M;
        y = headerBg(y);
      }
    };

    body.assemblies.forEach((a, idx) => {
      const rowBg = idx % 2 === 0 ? '#ffffff' : '#f8fafc';

      // Compute how tall this row will be (description may wrap)
      const descText = a.description
        ? (a.manufacturer ? `${a.description} / ${a.manufacturer}` : a.description)
        : (a.manufacturer ?? '');

      const descLines = descText
        ? wrapText(doc, descText, cols.desc.w - 4, 7.5)
        : [''];

      const rowHeight = Math.max(14, descLines.length * 10 + 4);
      ensureSpace(rowHeight);

      doc.rect(M, y, contentWidth, rowHeight).fill(rowBg);

      const cy = y + (rowHeight - 8) / 2; // vertically center single-line cells

      doc.fontSize(8).fillColor('#1e293b').font('Helvetica-Bold')
        .text(a.assemblyId, cols.id.x + 2, cy, { lineBreak: false, width: cols.id.w - 4 });

      // Description (may wrap)
      doc.font('Helvetica').fillColor('#475569').fontSize(7.5);
      descLines.forEach((line, li) => {
        doc.text(line, cols.desc.x + 2, y + 4 + li * 10, { lineBreak: false, width: cols.desc.w - 4 });
      });

      doc.fontSize(7.5).fillColor('#334155').font('Helvetica')
        .text(a.epdNumber, cols.epd.x + 2, cy, { lineBreak: false, width: cols.epd.w - 4 });

      doc.text(fmtNum(a.gwpPerFunctionalUnit), cols.gwp.x, cy, { lineBreak: false, width: cols.gwp.w, align: 'right' });
      doc.text(fmtNum(a.msfFactor, 3), cols.factor.x, cy, { lineBreak: false, width: cols.factor.w, align: 'right' });

      doc.font('Helvetica-Bold').fillColor('#166534')
        .text(fmtInt(a.totalKgCO2ePer1000SF), cols.total.x, cy, { lineBreak: false, width: cols.total.w, align: 'right' });

      y += rowHeight;
    });

    // Grand total row
    ensureSpace(18);
    doc.rect(M, y, contentWidth, 18).fill('#dcfce7');
    doc.fontSize(9).fillColor('#14532d').font('Helvetica-Bold')
      .text('GRAND TOTAL', cols.id.x + 2, y + 5, { lineBreak: false, width: 240 });
    doc.text(fmtInt(grandTotal), cols.total.x, y + 5, { lineBreak: false, width: cols.total.w, align: 'right' });
    y += 22;

    y = drawRule(doc, M, y, contentWidth);

    // ── Methodology & Compliance Section ──────────────────────────────────────
    ensureSpace(60);
    y = drawLine(doc, 'Methodology & Compliance Statement', M, y, 10, { color: '#1e293b' });
    doc.font('Helvetica').fillColor('#1e293b');
    y += 2;

    const methodologyText = [
      '• Assembly-level embodied carbon is calculated as: GWP (kg CO₂e per functional unit, from EPD) × ' +
        'project-specific MSF (thousand-square-foot) factor from the architect-provided schedule.',
      '• Values are intended for comparative embodied carbon assessment of assemblies at a 1,000 SF scale ' +
        'and are not a substitute for a full life-cycle assessment (LCA).',
      '• Data source: EWS_Combined_All_Assemblies_WITH_Manufacturers.pdf and associated Environmental ' +
        'Product Declarations (EPDs) as referenced above.',
      '• All EPD-reported GWP values reflect the declared unit stated in each EPD. Users are responsible ' +
        'for confirming EPD validity dates and applicability to their specific project scope.',
    ];

    for (const bullet of methodologyText) {
      const lines = wrapText(doc, bullet, contentWidth - 8, 8);
      ensureSpace(lines.length * 11 + 4);
      doc.fontSize(8).fillColor('#334155').font('Helvetica');
      for (const line of lines) {
        doc.text(line, M + 4, y, { lineBreak: false });
        y += 11;
      }
      y += 2;
    }

    y += 4;
    y = drawRule(doc, M, y, contentWidth);

    // ── Signature / Review Block ──────────────────────────────────────────────
    ensureSpace(90);
    y = drawLine(doc, 'Architect Review & Signature', M, y, 10, { color: '#1e293b' });
    y += 4;

    const sigLines: Array<{ label: string; value: string; line?: boolean }> = [
      { label: 'Architect of Record', value: body.architectName ?? '_______________________________', line: !body.architectName },
      { label: 'Firm',                value: body.architectFirm ?? '_______________________________', line: !body.architectFirm },
      { label: 'Date',                value: reportDate },
      { label: 'Signature',           value: '________________________________', line: true },
      { label: 'Stamp / Seal',        value: '________________________________', line: true },
    ];

    for (const s of sigLines) {
      ensureSpace(18);
      doc.fontSize(8.5).fillColor('#475569').font('Helvetica-Bold')
        .text(`${s.label}:  `, M, y, { continued: true, lineBreak: false });
      doc.font('Helvetica').fillColor(s.line ? '#94a3b8' : '#1e293b')
        .text(s.value, { lineBreak: false });
      y += 18;
    }

    y += 8;

    // Footer note on last page
    ensureSpace(30);
    doc.fontSize(7).fillColor('#94a3b8').font('Helvetica')
      .text(
        `Generated by GreenChainz  |  greenchainz.com  |  ${reportDate}  |  ` +
          'This report is provided for embodied carbon assessment purposes only.',
        M,
        y,
        { lineBreak: false, width: contentWidth }
      );

    doc.end();
  });
}
