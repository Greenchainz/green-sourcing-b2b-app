/**
 * RFx Response Scorer
 *
 * Scores a structured supplier response against the buyer's requirements.
 * Runs after responses come in — result stored in rfq_bids.rfx_total_score.
 *
 * Separate from composite-score.ts (which scores candidate suppliers BEFORE
 * an RFQ exists). This scores actual responses AFTER submission.
 *
 * Default weights: price 30%, carbon 30%, lead time 15%, docs 15%, certs 10%.
 * Buyers can override via scoringWeights on the sourcing request.
 */

export interface RfxScoringWeights {
  price:           number;  // 0–1, sum must equal 1
  carbon:          number;
  leadTime:        number;
  documentation:   number;
  certifications:  number;
}

export const DEFAULT_SCORING_WEIGHTS: RfxScoringWeights = {
  price:          0.30,
  carbon:         0.30,
  leadTime:       0.15,
  documentation:  0.15,
  certifications: 0.10,
};

export interface RfxResponseScoreInput {
  /** Supplier's bid price. Pass null if not provided. */
  bidPrice: number | null;
  /** Median bid price across all responses for this request. */
  medianBidPrice: number | null;
  /** Supplier's GWP value (kgCO₂e per declared unit). */
  gwpValue: number | null;
  /** Buyer's max GWP constraint from the RFQ. */
  maxGwp: number | null;
  /** Lead time in days. */
  leadDays: number | null;
  /** Max acceptable lead days (derived from dueDate or buyer-set). */
  maxLeadDays: number | null;
  /** Whether an EPD was provided. */
  hasEpd: boolean;
  /** Number of required response fields the supplier filled in. */
  filledRequiredFields: number;
  /** Total number of required fields on the request. */
  totalRequiredFields: number;
  /** Certification keywords provided. */
  certifications: string | null;
}

export interface RfxResponseScoreBreakdown {
  total: number;           // 0–100 integer
  priceScore: number;      // 0–100
  carbonScore: number;
  leadTimeScore: number;
  documentationScore: number;
  certificationScore: number;
}

/**
 * Score a single supplier response. Returns scores 0–100 for each dimension
 * and a weighted total. Store the total in rfqBids.rfxTotalScore.
 */
export function scoreRfxResponse(
  input: RfxResponseScoreInput,
  weights: RfxScoringWeights = DEFAULT_SCORING_WEIGHTS,
): RfxResponseScoreBreakdown {
  const priceScore = scorePriceDimension(input.bidPrice, input.medianBidPrice);
  const carbonScore = scoreCarbonDimension(input.gwpValue, input.maxGwp, input.hasEpd);
  const leadTimeScore = scoreLeadTimeDimension(input.leadDays, input.maxLeadDays);
  const documentationScore = scoreDocumentationDimension(
    input.hasEpd,
    input.filledRequiredFields,
    input.totalRequiredFields,
  );
  const certificationScore = scoreCertificationDimension(input.certifications);

  const total = Math.round(
    priceScore        * weights.price +
    carbonScore       * weights.carbon +
    leadTimeScore     * weights.leadTime +
    documentationScore* weights.documentation +
    certificationScore* weights.certifications,
  );

  return {
    total: Math.min(100, Math.max(0, total)),
    priceScore,
    carbonScore,
    leadTimeScore,
    documentationScore,
    certificationScore,
  };
}

// ─── Dimension scorers (0–100) ────────────────────────────────────────────────

function scorePriceDimension(price: number | null, median: number | null): number {
  if (price == null) return 50;   // unknown → neutral
  if (median == null || median === 0) return 70;  // no comparison baseline
  const ratio = price / median;
  // Below median is better; 20%+ below = 100, 20%+ above = 20
  if (ratio <= 0.80) return 100;
  if (ratio <= 0.90) return 90;
  if (ratio <= 1.00) return 75;
  if (ratio <= 1.10) return 55;
  if (ratio <= 1.20) return 35;
  return 20;
}

function scoreCarbonDimension(
  gwp: number | null,
  maxGwp: number | null,
  hasEpd: boolean,
): number {
  if (!hasEpd && gwp == null) return 30;   // no EPD, no GWP data
  if (!hasEpd && gwp != null) return 50;   // has GWP but no verified EPD
  if (gwp == null) return 60;              // has EPD but no GWP value
  if (maxGwp == null) {
    // No limit set — rank low gwp as better
    if (gwp < 50)  return 100;
    if (gwp < 100) return 85;
    if (gwp < 200) return 70;
    if (gwp < 400) return 55;
    return 40;
  }
  // Has limit — below limit is good, headroom matters
  if (gwp > maxGwp) return 10;   // exceeds limit
  const ratio = gwp / maxGwp;
  if (ratio <= 0.50) return 100;
  if (ratio <= 0.70) return 90;
  if (ratio <= 0.85) return 75;
  if (ratio <= 1.00) return 55;
  return 10;
}

function scoreLeadTimeDimension(leadDays: number | null, maxLeadDays: number | null): number {
  if (leadDays == null) return 50;
  if (maxLeadDays == null) {
    if (leadDays <= 7)  return 100;
    if (leadDays <= 14) return 88;
    if (leadDays <= 21) return 74;
    if (leadDays <= 30) return 60;
    if (leadDays <= 60) return 45;
    return 30;
  }
  if (leadDays > maxLeadDays) return 10;
  const ratio = leadDays / maxLeadDays;
  if (ratio <= 0.50) return 100;
  if (ratio <= 0.70) return 85;
  if (ratio <= 0.85) return 70;
  return 55;
}

function scoreDocumentationDimension(
  hasEpd: boolean,
  filled: number,
  total: number,
): number {
  const completeness = total > 0 ? filled / total : 1;
  const base = Math.round(completeness * 70);   // max 70 from field completeness
  const epdBonus = hasEpd ? 30 : 0;             // EPD worth extra 30 pts
  return Math.min(100, base + epdBonus);
}

function scoreCertificationDimension(certifications: string | null): number {
  if (!certifications || certifications.trim() === "") return 30;
  const text = certifications.toLowerCase();
  let score = 30;
  if (/leed|declare|c2c|cradle/i.test(text)) score += 25;
  if (/iso.?14001|iso.?9001/i.test(text))    score += 20;
  if (/buy.?clean|epd/i.test(text))          score += 15;
  if (/fsc|recycled|usgbc/i.test(text))      score += 10;
  return Math.min(100, score);
}

/**
 * Compute the median bid price from a list of bid prices.
 * Ignores null values.
 */
export function computeMedianBidPrice(prices: (number | null)[]): number | null {
  const valid = prices.filter((p): p is number => p != null).sort((a, b) => a - b);
  if (valid.length === 0) return null;
  const mid = Math.floor(valid.length / 2);
  return valid.length % 2 !== 0
    ? valid[mid]
    : (valid[mid - 1] + valid[mid]) / 2;
}
