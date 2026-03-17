/**
 * TXDOT Bid Tab Scraper Service
 *
 * Extracts real-world material pricing from TXDOT bid tabulation HTML pages
 * and populates the pricing_data table with regional construction cost data.
 *
 * Data Source: https://www.dot.state.tx.us/insdtdot/orgchart/cmd/cserve/bidtab/BidTot01.htm
 * Format: HTML pages with project-level bid summaries (36 pages)
 */

import * as https from 'https';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface TxdotProject {
  county: string;
  projectType: string;
  highway: string;
  contractNumber: string;
  ccsj: string;
  projectId: string;
  letDate: string;
  seqNo: string;
  timeAllowed: string;
  length: string;
  limitsFrom: string;
  limitsTo: string;
  checkAmount: string;
  engineerEstimate: number;
  bids: TxdotBid[];
}

export interface TxdotBid {
  bidderName: string;
  bidAmount: number;
  percentOverUnder: number;
}

export interface ScrapedPricingData {
  materialCategory: string;
  pricePerUnit: number;
  unit: string;
  state: string;
  county: string;
  source: string;
  sourceDate: Date;
  sourceUrl: string;
  projectName: string;
  contractNumber: string;
  dataConfidence: number;
}

// ─── Material Category Mapping ──────────────────────────────────────────────

const PROJECT_TYPE_TO_MATERIAL: Record<string, { category: string; unit: string; confidence: number }> = {
  'FLEXIBLE BASE': { category: 'Flexible Base Material', unit: 'CY', confidence: 70 },
  'PORTLAND CEMENT CONCRETE': { category: 'Portland Cement Concrete', unit: 'CY', confidence: 80 },
  'CONCRETE PAVEMENT': { category: 'Concrete Pavement', unit: 'SY', confidence: 75 },
  'ASPHALT CONCRETE': { category: 'Asphalt Concrete', unit: 'TON', confidence: 80 },
  'HOT MIX ASPHALT': { category: 'Hot Mix Asphalt', unit: 'TON', confidence: 80 },
  'ASPHALT PAVEMENT': { category: 'Asphalt Pavement', unit: 'SY', confidence: 75 },
  'CRACK SEAL': { category: 'Crack Sealant', unit: 'LB', confidence: 70 },
  'PAVEMENT MARKINGS': { category: 'Pavement Marking Paint', unit: 'GAL', confidence: 65 },
  'STEEL REINFORCING': { category: 'Steel Reinforcing Bar', unit: 'LB', confidence: 75 },
  'GUARDRAIL': { category: 'Steel Guardrail', unit: 'LF', confidence: 70 },
  'STORM SEWER': { category: 'Storm Sewer Pipe', unit: 'LF', confidence: 60 },
  'DRAINAGE': { category: 'Drainage Pipe', unit: 'LF', confidence: 60 },
  'EXCAVATION': { category: 'Excavation', unit: 'CY', confidence: 65 },
  'EMBANKMENT': { category: 'Embankment Fill', unit: 'CY', confidence: 65 },
  'BRIDGE': { category: 'Structural Steel', unit: 'LB', confidence: 55 },
  'CULVERT': { category: 'Concrete Pipe', unit: 'LF', confidence: 60 },
  'MILLING': { category: 'Asphalt Milling', unit: 'SY', confidence: 65 },
  'OVERLAY': { category: 'Asphalt Overlay', unit: 'TON', confidence: 70 },
  'SEAL COAT': { category: 'Seal Coat', unit: 'GAL', confidence: 65 },
};

function inferMaterialCategory(projectType: string): { category: string; unit: string; confidence: number } | null {
  const upperType = projectType.toUpperCase();
  for (const [key, value] of Object.entries(PROJECT_TYPE_TO_MATERIAL)) {
    if (upperType.includes(key)) return value;
  }
  if (upperType.includes('CONCRETE')) return { category: 'Concrete (Generic)', unit: 'CY', confidence: 50 };
  if (upperType.includes('ASPHALT')) return { category: 'Asphalt (Generic)', unit: 'TON', confidence: 50 };
  if (upperType.includes('STEEL')) return { category: 'Steel (Generic)', unit: 'LB', confidence: 50 };
  if (upperType.includes('PIPE')) return { category: 'Pipe (Generic)', unit: 'LF', confidence: 50 };
  return null;
}

// ─── HTTP Fetch with SSL bypass ──────────────────────────────────────────────

function fetchPageHtml(pageNumber: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = `https://www.dot.state.tx.us/insdtdot/orgchart/cmd/cserve/bidtab/BidTot${String(pageNumber).padStart(2, '0')}.htm`;
    const options = {
      rejectUnauthorized: false,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml',
      },
    };
    https.get(url, options, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (chunk: Buffer) => chunks.push(chunk));
      res.on('end', () => {
        // TxDOT pages use latin-1 encoding
        resolve(Buffer.concat(chunks).toString('latin1'));
      });
      res.on('error', reject);
    }).on('error', reject);
  });
}

// ─── Parsing ─────────────────────────────────────────────────────────────────

function extractCell(rows: string[][], labelPattern: RegExp): string {
  for (const row of rows) {
    for (let i = 0; i < row.length; i++) {
      const cell = row[i];
      // Case 1: label + value in same cell (e.g. "County: STERLING")
      const matchInline = cell.match(labelPattern);
      if (matchInline && matchInline[1]?.trim()) return matchInline[1].trim();
      // Case 2: label in this cell (e.g. "County:"), value in next cell
      // Build a label-only pattern by stripping the capture group from the end
      const labelOnlySource = labelPattern.source.replace(/\s*\([^)]+\)\s*$/, '').replace(/\s*\$\s*$/, '');
      const labelOnlyPattern = new RegExp(labelOnlySource, labelPattern.flags);
      if (labelOnlyPattern.test(cell) && i + 1 < row.length) {
        return row[i + 1].trim();
      }
    }
  }
  return '';
}

function parseTableRows(html: string): string[][] {
  const rows: string[][] = [];
  const trMatches = html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi);
  for (const trMatch of trMatches) {
    const cells: string[] = [];
    const tdMatches = trMatch[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi);
    for (const tdMatch of tdMatches) {
      // Strip HTML tags and normalize whitespace
      const text = tdMatch[1]
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      if (text) cells.push(text);
    }
    if (cells.length > 0) rows.push(cells);
  }
  return rows;
}

function parseProjectBlock(blockHtml: string): TxdotProject | null {
  try {
    const rows = parseTableRows(blockHtml);

    const county = extractCell(rows, /^County:\s*(.+)/i);
    const projectType = extractCell(rows, /^Type:\s*(.+)/i);
    const highway = extractCell(rows, /^Highway:\s*(.+)/i);
    const contractNumber = extractCell(rows, /^Contract\s*#?:\s*(.+)/i);
    const ccsj = extractCell(rows, /^CCSJ:\s*(.+)/i);
    const projectId = extractCell(rows, /^Project\s*ID:\s*(.+)/i);
    const letDate = extractCell(rows, /^Let\s*Date:\s*(\d{2}\/\d{2}\/\d{2,4})/i);
    const seqNo = extractCell(rows, /^Seq\s*No:\s*(.+)/i);
    const timeAllowed = extractCell(rows, /^Time:\s*(.+)/i);
    const length = extractCell(rows, /^Length:\s*(.+)/i);
    const limitsFrom = extractCell(rows, /^From:\s*(.+)/i);
    const limitsTo = extractCell(rows, /^To:\s*(.+)/i);
    const checkAmount = extractCell(rows, /^Check:\s*(.+)/i);

    // Find engineer estimate row
    let engineerEstimate = 0;
    for (const row of rows) {
      for (let i = 0; i < row.length; i++) {
        const cell = row[i];
        // Case 1: estimate value in same cell (e.g. "Estimate $167,825.70")
        const m = cell.match(/Estimate\s*\$?([\d,]+\.?\d*)/i);
        if (m && m[1]) {
          engineerEstimate = parseFloat(m[1].replace(/,/g, ''));
          break;
        }
        // Case 2: "Estimate" standalone, value in next cell (e.g. ["Estimate", "$167,825.70"])
        if (/^Estimate$/i.test(cell.trim()) && i + 1 < row.length) {
          const val = parseFloat(row[i + 1].replace(/[$,]/g, ''));
          if (!isNaN(val) && val > 0) {
            engineerEstimate = val;
            break;
          }
        }
      }
      if (engineerEstimate > 0) break;
    }

    // Find bid rows
    const bids: TxdotBid[] = [];
    for (const row of rows) {
      // Look for rows with a bidder number pattern like "Bidder 1" or just a dollar amount + percentage + company
      const fullText = row.join(' ');
      const bidMatch = fullText.match(/Bidder\s*\d+\s*\$?([\d,]+\.?\d*)\s*([+-]?\d+\.?\d*)%\s*(.+)/i);
      if (bidMatch) {
        bids.push({
          bidAmount: parseFloat(bidMatch[1].replace(/,/g, '')),
          percentOverUnder: parseFloat(bidMatch[2]),
          bidderName: bidMatch[3].trim(),
        });
      } else {
        // Try split-cell format: ["Bidder 1", "$181,295.70", "+8.03%", "COMPANY NAME"]
        if (row.length >= 4 && /Bidder\s*\d+/i.test(row[0])) {
          const amount = parseFloat((row[1] || '').replace(/[$,]/g, ''));
          const pct = parseFloat((row[2] || '').replace(/[+%]/g, ''));
          const name = row[3] || '';
          if (amount > 0 && name) {
            bids.push({ bidAmount: amount, percentOverUnder: pct, bidderName: name });
          }
        }
      }
    }

    if (!county || !projectType || engineerEstimate <= 0 || bids.length === 0) return null;

    return {
      county, projectType, highway, contractNumber, ccsj, projectId,
      letDate, seqNo, timeAllowed, length, limitsFrom, limitsTo, checkAmount,
      engineerEstimate, bids,
    };
  } catch (err) {
    return null;
  }
}

export async function scrapeBidTotalsPage(pageNumber: number): Promise<TxdotProject[]> {
  const html = await fetchPageHtml(pageNumber);

  // Split page into project blocks by "County:" label which starts each project
  // Each project block starts with a row containing "County:"
  const blocks = html.split(/(?=<tr[^>]*>[\s\S]{0,200}County:)/i);

  const projects: TxdotProject[] = [];
  for (const block of blocks) {
    if (block.length < 200) continue;
    const project = parseProjectBlock(block);
    if (project) projects.push(project);
  }

  return projects;
}

export async function scrapeAllBidTotals(): Promise<TxdotProject[]> {
  const allProjects: TxdotProject[] = [];
  for (let page = 1; page <= 36; page++) {
    try {
      console.log(`Scraping TXDOT bid totals page ${page}/36...`);
      const projects = await scrapeBidTotalsPage(page);
      allProjects.push(...projects);
      await new Promise((r) => setTimeout(r, 800));
    } catch (err) {
      console.error(`Error scraping page ${page}:`, err);
    }
  }
  return allProjects;
}

export function projectToPricingData(project: TxdotProject, pageNumber: number): ScrapedPricingData[] {
  const materialMapping = inferMaterialCategory(project.projectType);
  if (!materialMapping) return [];

  const winningBid = project.bids.reduce((lowest, bid) =>
    bid.bidAmount < lowest.bidAmount ? bid : lowest
  );

  let sourceDate = new Date();
  if (project.letDate) {
    const parts = project.letDate.split('/');
    if (parts.length === 3) {
      const year = parseInt(parts[2]) < 100 ? 2000 + parseInt(parts[2]) : parseInt(parts[2]);
      sourceDate = new Date(year, parseInt(parts[0]) - 1, parseInt(parts[1]));
    }
  }

  // Price per unit: winning bid / 1000 as rough unit estimate
  const estimatedPricePerUnit = winningBid.bidAmount / 1000;

  return [{
    materialCategory: materialMapping.category,
    pricePerUnit: estimatedPricePerUnit,
    unit: materialMapping.unit,
    state: 'TX',
    county: project.county,
    source: 'TXDOT_BID_TAB',
    sourceDate,
    sourceUrl: `https://www.dot.state.tx.us/insdtdot/orgchart/cmd/cserve/bidtab/BidTot${String(pageNumber).padStart(2, '0')}.htm`,
    projectName: `${project.projectType} - ${project.county} County`,
    contractNumber: project.contractNumber,
    dataConfidence: materialMapping.confidence,
  }];
}

export async function scrapeTxdotPricingData(): Promise<ScrapedPricingData[]> {
  console.log('Starting TXDOT bid tab scraper...');
  const allPricingData: ScrapedPricingData[] = [];

  for (let page = 1; page <= 36; page++) {
    try {
      console.log(`Scraping page ${page}/36...`);
      const projects = await scrapeBidTotalsPage(page);
      for (const project of projects) {
        allPricingData.push(...projectToPricingData(project, page));
      }
      await new Promise((r) => setTimeout(r, 800));
    } catch (err) {
      console.error(`Error scraping page ${page}:`, err);
    }
  }

  console.log(`Scraping complete. Extracted ${allPricingData.length} pricing records.`);
  return allPricingData;
}
