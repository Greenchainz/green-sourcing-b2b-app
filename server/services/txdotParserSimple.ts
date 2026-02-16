/**
 * Simplified TXDOT Parser
 * 
 * Parses TXDOT bid data from markdown/text format
 */

export interface TxdotBid {
  bidderName: string;
  bidAmount: number;
  percentOverUnder: number;
}

export interface TxdotProject {
  county: string;
  projectType: string;
  highway: string;
  contractNumber: string;
  letDate: string;
  seqNo: string;
  timeAllowed: string;
  projectId: string;
  engineerEstimate: number;
  bids: TxdotBid[];
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

const PROJECT_TYPE_TO_MATERIAL: Record<string, { category: string; unit: string; confidence: number }> = {
  'FLEXIBLE BASE': { category: 'Flexible Base Material', unit: 'CY', confidence: 70 },
  'PORTLAND CEMENT CONCRETE': { category: 'Portland Cement Concrete', unit: 'CY', confidence: 80 },
  'CONCRETE PAVEMENT': { category: 'Concrete Pavement', unit: 'SY', confidence: 75 },
  'ASPHALT CONCRETE': { category: 'Asphalt Concrete', unit: 'TON', confidence: 80 },
  'HOT MIX ASPHALT': { category: 'Hot Mix Asphalt', unit: 'TON', confidence: 80 },
  'CRACK SEAL': { category: 'Crack Sealant', unit: 'LB', confidence: 70 },
  'REFLECTIVE PAVEMENT MARKINGS': { category: 'Reflective Pavement Markings', unit: 'LF', confidence: 65 },
  'STORM SEWER': { category: 'Storm Sewer Pipe', unit: 'LF', confidence: 60 },
};

function inferMaterialCategory(projectType: string): { category: string; unit: string; confidence: number } | null {
  const upperType = projectType.toUpperCase();
  
  for (const [key, value] of Object.entries(PROJECT_TYPE_TO_MATERIAL)) {
    if (upperType.includes(key)) {
      return value;
    }
  }
  
  if (upperType.includes('CONCRETE')) return { category: 'Concrete (Generic)', unit: 'CY', confidence: 50 };
  if (upperType.includes('ASPHALT')) return { category: 'Asphalt (Generic)', unit: 'TON', confidence: 50 };
  if (upperType.includes('STEEL')) return { category: 'Steel (Generic)', unit: 'LB', confidence: 50 };
  
  return null;
}

/**
 * Parses TXDOT markdown text into project objects
 */
export function parseMarkdownText(text: string): TxdotProject[] {
  const projects: TxdotProject[] = [];
  const projectBlocks = text.split(/\n\n+/);
  
  for (const block of projectBlocks) {
    if (block.trim().length < 50) continue;
    
    const lines = block.split('\n');
    const project: Partial<TxdotProject> = { bids: [] };
    
    for (const line of lines) {
      if (line.includes('County:')) {
        project.county = line.match(/County:\s*(\w+)/)?.[1] || '';
        project.letDate = line.match(/Let Date:\s*(\d{2}\/\d{2}\/\d{2})/)?.[1] || '';
      }
      if (line.includes('Type:')) {
        project.projectType = line.match(/Type:\s*(.+?)\s+Seq No:/)?.[1]?.trim() || '';
        project.seqNo = line.match(/Seq No:\s*(\d+)/)?.[1] || '';
      }
      if (line.includes('Time:')) {
        project.timeAllowed = line.match(/Time:\s*(.+?)\s+Project ID:/)?.[1]?.trim() || '';
        project.projectId = line.match(/Project ID:\s*(.+)/)?.[1]?.trim() || '';
      }
      if (line.includes('Highway:')) {
        project.highway = line.match(/Highway:\s*(\S+)/)?.[1] || '';
        project.contractNumber = line.match(/Contract #:\s*(\S+)/)?.[1] || '';
      }
      if (line.includes('Estimate')) {
        const estimateMatch = line.match(/Estimate\s*\$?([\d,]+\.?\d*)/);
        if (estimateMatch) {
          project.engineerEstimate = parseFloat(estimateMatch[1].replace(/,/g, ''));
        }
      }
      if (line.includes('Bidder')) {
        const bidAmountMatch = line.match(/\$?([\d,]+\.?\d*)/);
        const percentMatch = line.match(/([+-]?\d+\.?\d*)%/);
        const companyMatch = line.match(/%\s*(.+)/);
        
        if (bidAmountMatch && percentMatch && companyMatch) {
          project.bids!.push({
            bidderName: companyMatch[1].trim(),
            bidAmount: parseFloat(bidAmountMatch[1].replace(/,/g, '')),
            percentOverUnder: parseFloat(percentMatch[1]),
          });
        }
      }
    }
    
    if (project.county && project.projectType && project.engineerEstimate && project.bids!.length > 0) {
      projects.push(project as TxdotProject);
    }
  }
  
  return projects;
}

/**
 * Converts project to pricing data
 */
export function projectToPricingData(project: TxdotProject, pageNumber: number): ScrapedPricingData[] {
  const materialMapping = inferMaterialCategory(project.projectType);
  if (!materialMapping) return [];
  
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
