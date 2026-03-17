/**
 * TXDOT Bid Tab Scraper Service (Browser-based)
 * 
 * Uses browser navigation to fetch TXDOT bid tabulation HTML pages
 * Bypasses network restrictions by using the browser tool
 */

import * as cheerio from 'cheerio';
import type { TxdotProject, ScrapedPricingData } from './txdotScraper';

// Re-export types
export type { TxdotProject, ScrapedPricingData };

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
  'REFLECTIVE PAVEMENT MARKINGS': { category: 'Reflective Pavement Markings', unit: 'LF', confidence: 65 },
  'STEEL REINFORCING': { category: 'Steel Reinforcing Bar', unit: 'LB', confidence: 75 },
  'GUARDRAIL': { category: 'Steel Guardrail', unit: 'LF', confidence: 70 },
  'STORM SEWER': { category: 'Storm Sewer Pipe', unit: 'LF', confidence: 60 },
  'DRAINAGE': { category: 'Drainage Pipe', unit: 'LF', confidence: 60 },
  'EXCAVATION': { category: 'Excavation', unit: 'CY', confidence: 65 },
  'EMBANKMENT': { category: 'Embankment Fill', unit: 'CY', confidence: 65 },
};

function inferMaterialCategory(projectType: string): { category: string; unit: string; confidence: number } | null {
  const upperType = projectType.toUpperCase();
  
  for (const [key, value] of Object.entries(PROJECT_TYPE_TO_MATERIAL)) {
    if (upperType.includes(key)) {
      return value;
    }
  }
  
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

// ─── HTML Parsing ──────────────────────────────────────────────────────────

function parseProjectBlock(html: string): TxdotProject | null {
  const $ = cheerio.load(html);
  
  try {
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
    
    const estimateText = $('b:contains("Estimate")').parent().text().match(/Estimate\s*\$?([\d,]+\.?\d*)/)?.[1] || '0';
    const engineerEstimate = parseFloat(estimateText.replace(/,/g, ''));
    
    const bids: any[] = [];
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
 * Parses TXDOT bid totals page HTML
 * @param html - Raw HTML content from TXDOT page
 * @returns Array of parsed projects
 */
export function parseBidTotalsPage(html: string): TxdotProject[] {
  const projects: TxdotProject[] = [];
  const projectBlocks = html.split(/Text version of this page/);
  
  for (const block of projectBlocks) {
    if (block.trim().length < 100) continue;
    
    const project = parseProjectBlock(block);
    if (project) {
      projects.push(project);
    }
  }
  
  return projects;
}

/**
 * Converts TXDOT project to pricing data records
 */
export function projectToPricingData(project: TxdotProject, pageNumber: number): ScrapedPricingData[] {
  const materialMapping = inferMaterialCategory(project.projectType);
  if (!materialMapping) {
    return [];
  }
  
  const winningBid = project.bids.reduce((lowest, bid) => 
    bid.bidAmount < lowest.bidAmount ? bid : lowest
  );
  
  let sourceDate = new Date();
  if (project.letDate) {
    const [month, day, year] = project.letDate.split('/');
    sourceDate = new Date(2000 + parseInt(year), parseInt(month) - 1, parseInt(day));
  }
  
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
