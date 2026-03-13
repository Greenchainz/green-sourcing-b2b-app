/**
 * TXDOT Bid Tab Scraper Service
 *
 * Extracts real-world material pricing from TXDOT bid tabulation HTML pages
 * and populates the pricing_data table with regional construction cost data.
 *
 * Data Source: https://www.dot.state.tx.us/insdtdot/orgchart/cmd/cserve/bidtab/BidTot01.htm
 * Format: HTML pages with project-level bid summaries
 *
 * MVP Approach: HTML scraping only (no PDF parsing yet)
 */

import * as cheerio from 'cheerio';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface TxdotProject {
  // Project identification
  county: string;
  projectType: string;
  highway: string;
  contractNumber: string;
  ccsj: string;
  projectId: string;

  // Project details
  letDate: string; // Format: "MM/DD/YY"
  seqNo: string;
  timeAllowed: string; // e.g., "180 CALENDAR DAYS"
  length: string; // Miles
  limitsFrom: string;
  limitsTo: string;
  checkAmount: string; // Bid bond amount

  // Pricing
  engineerEstimate: number;
  bids: TxdotBid[];
}

export interface TxdotBid {
  bidderName: string;
  bidAmount: number;
  percentOverUnder: number; // Percentage over/under engineer's estimate
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

/**
 * Maps TXDOT project types to material categories
 * This is a heuristic mapping for MVP - will be refined with PDF parsing
 */
const PROJECT_TYPE_TO_MATERIAL: Record<string, { category: string; unit: string; confidence: number }> = {
  // Concrete & Base Materials
  'FLEXIBLE BASE': { category: 'Flexible Base Material', unit: 'CY', confidence: 70 },
  'PORTLAND CEMENT CONCRETE': { category: 'Portland Cement Concrete', unit: 'CY', confidence: 80 },
  'CONCRETE PAVEMENT': { category: 'Concrete Pavement', unit: 'SY', confidence: 75 },

  // Asphalt
  'ASPHALT CONCRETE': { category: 'Asphalt Concrete', unit: 'TON', confidence: 80 },
  'HOT MIX ASPHALT': { category: 'Hot Mix Asphalt', unit: 'TON', confidence: 80 },
  'ASPHALT PAVEMENT': { category: 'Asphalt Pavement', unit: 'SY', confidence: 75 },

  // Sealants & Coatings
  'CRACK SEAL': { category: 'Crack Sealant', unit: 'LB', confidence: 70 },
  'PAVEMENT MARKINGS': { category: 'Pavement Marking Paint', unit: 'GAL', confidence: 65 },
  'REFLECTIVE PAVEMENT MARKINGS': { category: 'Reflective Pavement Markings', unit: 'LF', confidence: 65 },

  // Steel & Metal
  'STEEL REINFORCING': { category: 'Steel Reinforcing Bar', unit: 'LB', confidence: 75 },
  'GUARDRAIL': { category: 'Steel Guardrail', unit: 'LF', confidence: 70 },

  // Drainage & Pipe
  'STORM SEWER': { category: 'Storm Sewer Pipe', unit: 'LF', confidence: 60 },
  'DRAINAGE': { category: 'Drainage Pipe', unit: 'LF', confidence: 60 },

  // Earthwork
  'EXCAVATION': { category: 'Excavation', unit: 'CY', confidence: 65 },
  'EMBANKMENT': { category: 'Embankment Fill', unit: 'CY', confidence: 65 },
};

/**
 * Infers material category from project type description
 */
function inferMaterialCategory(projectType: string): { category: string; unit: string; confidence: number } | null {
  const upperType = projectType.toUpperCase();

  // Direct match
  for (const [key, value] of Object.entries(PROJECT_TYPE_TO_MATERIAL)) {
    if (upperType.includes(key)) {
      return value;
    }
  }

  // Partial match heuristics
  if (upperType.includes('CONCRETE')) {
    return { category: 'Concrete (Generic)', unit: 'CY', confidence: 50 };
  }
  if (upperType.includes('ASPHALT')) {
    return { category: 'Asphalt (Generic)', unit: 'TON', confidence: 50 };
  }
  if (upperType.includes('STEEL')) {
    return { category: 'Steel (Generic)', unit: 'LB', confidence: 50 };
  }
  if (upperType.includes('PIPE')) {
    return { category: 'Pipe (Generic)', unit: 'LF', confidence: 50 };
  }

  return null;
}

// ─── HTML Scraping ──────────────────────────────────────────────────────────

/**
 * Fetches TXDOT bid totals page HTML
 */
async function fetchBidTotalsPage(pageNumber: number): Promise<string> {
  const url = `https://www.dot.state.tx.us/insdtdot/orgchart/cmd/cserve/bidtab/BidTot${String(pageNumber).padStart(2, '0')}.htm`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch TXDOT bid totals page ${pageNumber}: ${response.statusText}`);
  }

  return response.text();
}

/**
 * Parses a single project block from HTML
 */
function parseProjectBlock(html: string): TxdotProject | null {
  const $ = cheerio.load(html);

  try {
    // Extract project header information
    const county = $('b:contains("County:")').parent().text().match(/County:\s*(\w+)/)?.[1] || '';
    const projectType = $('b:contains("Type:")').parent().text().match(/Type:\s*(.+)/)?.[1]?.trim() || '';
    const highway = $('b:contains("Highway:")').parent().text().match(/Highway:\s*(\w+)/)?.[1] || '';
    const contractNumber = $('b:contains("Contract #:")').parent().text().match(/Contract #:\s*(\S+)/)?.[1] || '';
    const ccsj = $('b:contains("CCSJ:")').parent().text().match(/CCSJ:\s*(\S+)/)?.[1] || '';
    const projectId = $('b:contains("Project ID:")').parent().text().match(/Project ID:\s*(.+)/)?.[1]?.trim() || '';
    const letDate = $('b:contains("Let Date:")').parent().text().match(/Let Date:\s*(\d{2}\/\d{2}\/\d{2})/)?.[1] || '';
    const seqNo = $('b:contains("Seq No:")').parent().text().match(/Seq No:\s*(\d+)/)?.[1] || '';
    const timeAllowed = $('b:contains("Time:")').parent().text().match(/Time:\s*(.+)/)?.[1]?.trim() || '';
    const length = $('b:contains("Length:")').parent().text().match(/Length:\s*(\S+)/)?.[1] || '';
    const limitsFrom = $('b:contains("From:")').parent().text().match(/From:\s*(.+)/)?.[1]?.trim() || '';
    const limitsTo = $('b:contains("To:")').parent().text().match(/To:\s*(.+)/)?.[1]?.trim() || '';
    const checkAmount = $('b:contains("Check:")').parent().text().match(/Check:\s*(\$[\d,]+)/)?.[1] || '';

    // Extract engineer's estimate
    const estimateText = $('b:contains("Estimate")').parent().text().match(/Estimate\s*\$?([\d,]+\.?\d*)/)?.[1] || '0';
    const engineerEstimate = parseFloat(estimateText.replace(/,/g, ''));

    // Extract bids
    const bids: TxdotBid[] = [];
    $('b:contains("Bidder")').each((_i: number, elem: any) => {
      const bidText = $(elem).parent().text();
      const bidAmountMatch = bidText.match(/\$?([\d,]+\.?\d*)/);
      const percentMatch = bidText.match(/([+-]?\d+\.?\d*)%/);
      const companyMatch = bidText.match(/%(.*)/);

      if (bidAmountMatch && percentMatch && companyMatch) {
        bids.push({
          bidderName: companyMatch[1].trim(),
          bidAmount: parseFloat(bidAmountMatch[1].replace(/,/g, '')),
          percentOverUnder: parseFloat(percentMatch[1]),
        });
      }
    });

    // Validate required fields
    if (!county || !projectType || !engineerEstimate || bids.length === 0) {
      return null;
    }

    return {
      county,
      projectType,
      highway,
      contractNumber,
      ccsj,
      projectId,
      letDate,
      seqNo,
      timeAllowed,
      length,
      limitsFrom,
      limitsTo,
      checkAmount,
      engineerEstimate,
      bids,
    };
  } catch (error) {
    console.error('Error parsing project block:', error);
    return null;
  }
}

/**
 * Scrapes all projects from a single bid totals page
 */
export async function scrapeBidTotalsPage(pageNumber: number): Promise<TxdotProject[]> {
  const html = await fetchBidTotalsPage(pageNumber);
  const $ = cheerio.load(html);

  const projects: TxdotProject[] = [];

  // Find all project blocks (separated by "Text version of this page" links)
  const projectBlocks = html.split(/Text version of this page/);

  for (const block of projectBlocks) {
    if (block.trim().length < 100) continue; // Skip empty blocks

    const project = parseProjectBlock(block);
    if (project) {
      projects.push(project);
    }
  }

  return projects;
}

/**
 * Scrapes all 36 pages of TXDOT bid totals
 */
export async function scrapeAllBidTotals(): Promise<TxdotProject[]> {
  const allProjects: TxdotProject[] = [];

  for (let page = 1; page <= 36; page++) {
    try {
      console.log(`Scraping TXDOT bid totals page ${page}/36...`);
      const projects = await scrapeBidTotalsPage(page);
      allProjects.push(...projects);

      // Rate limiting: wait 1 second between requests
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`Error scraping page ${page}:`, error);
      // Continue with next page
    }
  }

  return allProjects;
}

// ─── Data Transformation ────────────────────────────────────────────────────

/**
 * Converts TXDOT project to pricing data records
 * Uses winning bid (lowest bid) for pricing
 */
export function projectToPricingData(project: TxdotProject, pageNumber: number): ScrapedPricingData[] {
  const materialMapping = inferMaterialCategory(project.projectType);
  if (!materialMapping) {
    // Skip projects that don't map to materials
    return [];
  }

  // Use winning bid (lowest bid amount)
  const winningBid = project.bids.reduce((lowest, bid) =>
    bid.bidAmount < lowest.bidAmount ? bid : lowest
  );

  // Parse let date (MM/DD/YY format)
  let sourceDate = new Date();
  if (project.letDate) {
    const [month, day, year] = project.letDate.split('/');
    sourceDate = new Date(2000 + parseInt(year), parseInt(month) - 1, parseInt(day));
  }

  // Calculate estimated price per unit
  // This is a rough estimate since we don't have quantity breakdown
  // Assume project total / 1000 as a placeholder unit price
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

/**
 * Main scraper function: scrapes all pages and returns pricing data
 */
export async function scrapeTxdotPricingData(): Promise<ScrapedPricingData[]> {
  console.log('Starting TXDOT bid tab scraper...');

  const allPricingData: ScrapedPricingData[] = [];

  for (let page = 1; page <= 36; page++) {
    try {
      console.log(`Scraping page ${page}/36...`);
      const projects = await scrapeBidTotalsPage(page);

      for (const project of projects) {
        const pricingData = projectToPricingData(project, page);
        allPricingData.push(...pricingData);
      }

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`Error scraping page ${page}:`, error);
    }
  }

  console.log(`Scraping complete. Extracted ${allPricingData.length} pricing records.`);
  return allPricingData;
}
