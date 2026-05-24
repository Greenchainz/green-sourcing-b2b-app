/**
 * SupplierComparisonTable
 *
 * The money screen — shows all supplier responses to a sourcing request ranked
 * by rfxTotalScore, with price, GWP, EPD, lead time, certifications, and
 * per-dimension score breakdown.
 *
 * Buyer can re-weight and trigger a rescore.
 */


import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Trophy,
  Leaf,
  DollarSign,
  Clock,
  FileText,
  Award,
  RefreshCw,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Calculator,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { DataQualityBadge } from "@/components/DataQualityBadge";

interface ScoreBreakdown {
  total: number;
  priceScore: number;
  carbonScore: number;
  carbonScoreRaw?: number;
  leadTimeScore: number;
  documentationScore: number;
  certificationScore: number;
  dataQualityLevel?: string | null;
  qualityMultiplier?: number | null;
}

interface BidRow {
  id: number;
  supplierId: number;
  supplierName: string | null;
  canFulfill: boolean | null;
  bidPrice: string | null;
  leadDays: number | null;
  gwpValue: string | null;
  epdReference: string | null;
  rfxTotalScore: string | null;
  dataQualityLevel: string | null;
  scoreBreakdown: ScoreBreakdown;
  createdAt: Date;
}

interface Props {
  rfqId: number;
  bids: BidRow[];
  onRescore?: () => void;
  /** Buyer-set internal carbon price in $/tonne CO₂e. When set, shows a carbon-adjusted cost column. */
  shadowCarbonPrice?: number | null;
}

// ─── Score color helper ───────────────────────────────────────────────────────

function scoreColor(score: number): string {
  if (score >= 80) return "text-green-600";
  if (score >= 60) return "text-yellow-600";
  return "text-red-500";
}

// ─── Winner narrative ─────────────────────────────────────────────────────────

const QUALITY_RANK: Record<string, number> = { L3: 3, L2: 2, L1: 1, L0: 0 };

function generateWinnerNarrative(
  winner: BidRow,
  allBids: BidRow[],
  shadowCarbonPrice?: number | null,
): string {
  const qualifiers = allBids.filter((b) => b.canFulfill !== false);
  if (qualifiers.length <= 1) return "Only qualifying response received.";

  const runnerUp = qualifiers[1];
  const name = winner.supplierName ?? "This supplier";

  const winnerPrice  = winner.bidPrice   ? parseFloat(winner.bidPrice)   : null;
  const winnerGwp    = winner.gwpValue   ? parseFloat(winner.gwpValue)   : null;
  const runnerPrice  = runnerUp.bidPrice  ? parseFloat(runnerUp.bidPrice)  : null;
  const runnerGwp    = runnerUp.gwpValue  ? parseFloat(runnerUp.gwpValue)  : null;

  const winnerScore = winner.rfxTotalScore   ? Number(winner.rfxTotalScore)   : winner.scoreBreakdown.total;
  const runnerScore = runnerUp.rfxTotalScore ? Number(runnerUp.rfxTotalScore) : runnerUp.scoreBreakdown.total;
  const scoreDelta  = winnerScore - runnerScore;

  const advantages: string[] = [];
  const tradeoffs:  string[] = [];

  // Price comparison vs runner-up
  if (winnerPrice != null && runnerPrice != null) {
    const pct = ((winnerPrice - runnerPrice) / runnerPrice) * 100;
    if (pct <= -2) advantages.push(`${Math.abs(pct).toFixed(0)}% lower price`);
    if (pct >=  3) tradeoffs.push(`${pct.toFixed(0)}% higher price than ${runnerUp.supplierName ?? "runner-up"}`);
  }

  // Carbon comparison
  if (winnerGwp != null && runnerGwp != null) {
    const pct = ((winnerGwp - runnerGwp) / runnerGwp) * 100;
    if (pct <= -5)  advantages.push(`${Math.abs(pct).toFixed(0)}% lower embodied carbon`);
    if (pct >=  10) tradeoffs.push("higher embodied carbon");
  }

  // EPD edge
  if (winner.epdReference && !runnerUp.epdReference) {
    advantages.push("verified EPD");
  }

  // Data quality tier
  const wTier = winner.dataQualityLevel   ?? winner.scoreBreakdown.dataQualityLevel   ?? "L0";
  const rTier = runnerUp.dataQualityLevel ?? runnerUp.scoreBreakdown.dataQualityLevel ?? "L0";
  if ((QUALITY_RANK[wTier] ?? 0) > (QUALITY_RANK[rTier] ?? 0) && !winner.epdReference) {
    advantages.push("higher-quality emissions data");
  }

  // Shadow carbon pricing reversal — winner costs more on bid but wins on adj. cost
  if (
    shadowCarbonPrice != null && shadowCarbonPrice > 0 &&
    winnerPrice != null && winnerGwp != null &&
    runnerPrice != null && runnerGwp != null
  ) {
    const wAdj = winnerPrice + (winnerGwp / 1000) * shadowCarbonPrice;
    const rAdj = runnerPrice + (runnerGwp / 1000) * shadowCarbonPrice;
    if (wAdj < rAdj && winnerPrice > runnerPrice) {
      const saving = ((rAdj - wAdj) / rAdj * 100).toFixed(0);
      advantages.push(`${saving}% lower carbon-adjusted total cost at $${shadowCarbonPrice}/tonne CO₂e`);
    }
  }

  // Build sentence
  if (tradeoffs.length > 0 && advantages.length > 0) {
    return `${name} selected despite ${tradeoffs.join(" and ")} — offset by ${advantages.join(", ")}.`;
  }
  if (advantages.length > 0) {
    const scoreNote = scoreDelta > 5 ? `, leading by ${scoreDelta} points` : "";
    return `${name} leads on ${advantages.join(", ")}${scoreNote}.`;
  }
  return `${name} achieves the highest weighted score across price, carbon, and documentation.`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function SupplierComparisonTable({ rfqId, bids, onRescore, shadowCarbonPrice }: Props) {
  const rescoreMutation = trpc.supplierResponse.scoreResponses.useMutation({
    onSuccess: ({ updated }) => {
      toast.success(`Rescored ${updated} responses`);
      onRescore?.();
    },
    onError: (err) => toast.error(err.message ?? "Rescore failed"),
  });

  const topBid = bids[0];
  const canFulfillBids = bids.filter((b) => b.canFulfill !== false);

  // Compute average GWP across all bids that have data — used for delta chips
  const gwpValues = bids
    .map((b) => (b.gwpValue != null ? parseFloat(b.gwpValue) : null))
    .filter((v): v is number => v != null);
  const avgGwp =
    gwpValues.length >= 2
      ? gwpValues.reduce((sum, v) => sum + v, 0) / gwpValues.length
      : null;

  if (bids.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <AlertCircle className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No supplier responses yet.</p>
          <p className="text-xs text-muted-foreground mt-1">
            Share the link with suppliers to start receiving responses.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Winner card */}
      {topBid && (
        <Card className="border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/20">
          <CardContent className="py-4 px-5">
            <div className="flex items-center gap-3">
              <Trophy className="w-8 h-8 text-green-600 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-green-700 dark:text-green-400 uppercase tracking-wide mb-0.5">
                  Best Overall Match
                </p>
                <p className="font-bold text-green-900 dark:text-green-200 truncate">
                  {topBid.supplierName ?? `Supplier #${topBid.supplierId}`}
                </p>
                {/* Decision rationale */}
                <p className="text-xs text-green-700/80 dark:text-green-400/80 mt-1 leading-relaxed">
                  {generateWinnerNarrative(topBid, bids, shadowCarbonPrice)}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-2xl font-bold text-green-700 dark:text-green-400">
                  {topBid.rfxTotalScore ?? topBid.scoreBreakdown.total}
                  <span className="text-sm font-normal">/100</span>
                </p>
                <p className="text-xs text-green-600 dark:text-green-500">GreenChainz Score</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Shadow carbon price active banner */}
      {shadowCarbonPrice != null && shadowCarbonPrice > 0 && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300 text-xs">
          <Calculator className="w-3.5 h-3.5 shrink-0" />
          <span>
            <strong>Internal carbon price active:</strong> ${shadowCarbonPrice}/tonne CO₂e —
            "Adj. Cost" adds the carbon penalty to each bid price.
          </span>
        </div>
      )}

      {/* Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">
              All responses ({bids.length})
              {canFulfillBids.length < bids.length && (
                <span className="ml-2 text-xs text-muted-foreground font-normal">
                  ({bids.length - canFulfillBids.length} can't fulfill)
                </span>
              )}
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => rescoreMutation.mutate({ rfqId })}
              disabled={rescoreMutation.isPending}
            >
              {rescoreMutation.isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
              )}
              Rescore all
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[180px]">Supplier</TableHead>
                  <TableHead className="text-right">
                    <span className="flex items-center justify-end gap-1">
                      <DollarSign className="w-3.5 h-3.5" />
                      Price
                    </span>
                  </TableHead>
                  {shadowCarbonPrice != null && shadowCarbonPrice > 0 && (
                    <TableHead className="text-right">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="flex items-center justify-end gap-1 cursor-help">
                              <Calculator className="w-3.5 h-3.5 text-blue-500" />
                              Adj. Cost
                            </span>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-[220px] text-xs">
                            Carbon-adjusted cost = Bid price + (GWP kg ÷ 1,000 × ${shadowCarbonPrice}/tonne CO₂e)
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableHead>
                  )}
                  <TableHead className="text-right">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="flex items-center justify-end gap-1 cursor-help">
                            <Leaf className="w-3.5 h-3.5 text-green-500" />
                            GWP
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs">
                          Global Warming Potential (kg CO₂e).
                          {avgGwp != null && " Delta shown vs. field average."}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </TableHead>
                  <TableHead className="text-center">EPD</TableHead>
                  <TableHead className="text-right">
                    <span className="flex items-center justify-end gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      Lead
                    </span>
                  </TableHead>
                  <TableHead className="text-center w-[120px]">Score</TableHead>
                  <TableHead className="text-center">Breakdown</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bids.map((bid, idx) => {
                  const isTop = idx === 0;
                  const score = bid.rfxTotalScore ? Number(bid.rfxTotalScore) : bid.scoreBreakdown.total;
                  const bd = bid.scoreBreakdown;

                  // Carbon-adjusted cost: Bid Price + (GWP_kg / 1000 × shadowCarbonPrice)
                  const carbonAdjustedCost =
                    shadowCarbonPrice != null &&
                    shadowCarbonPrice > 0 &&
                    bid.bidPrice != null &&
                    bid.gwpValue != null
                      ? parseFloat(bid.bidPrice) + (parseFloat(bid.gwpValue) / 1000) * shadowCarbonPrice
                      : null;

                  // GWP delta vs. field average
                  const gwpNum = bid.gwpValue != null ? parseFloat(bid.gwpValue) : null;
                  const gwpDeltaPct =
                    gwpNum != null && avgGwp != null
                      ? ((gwpNum - avgGwp) / avgGwp) * 100
                      : null;

                  return (
                    <TableRow
                      key={bid.id}
                      className={isTop ? "bg-green-50/50 dark:bg-green-950/10" : ""}
                    >
                      {/* Supplier */}
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {isTop && <Trophy className="w-3.5 h-3.5 text-green-600 shrink-0" />}
                          <div>
                            <p className="font-medium text-sm truncate max-w-[140px]">
                              {bid.supplierName ?? `Supplier #${bid.supplierId}`}
                            </p>
                            {bid.canFulfill === false && (
                              <Badge variant="destructive" className="text-xs py-0">
                                Can't fulfill
                              </Badge>
                            )}
                          </div>
                        </div>
                      </TableCell>

                      {/* Price */}
                      <TableCell className="text-right">
                        {bid.bidPrice ? (
                          <span className="font-mono text-sm">
                            ${parseFloat(bid.bidPrice).toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </TableCell>

                      {/* Carbon-adjusted cost (only when shadow price is active) */}
                      {shadowCarbonPrice != null && shadowCarbonPrice > 0 && (
                        <TableCell className="text-right">
                          {carbonAdjustedCost != null ? (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className={`font-mono text-sm cursor-help ${isTop ? "text-blue-700 dark:text-blue-400 font-bold" : "text-blue-600 dark:text-blue-500"}`}>
                                    ${carbonAdjustedCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="text-xs space-y-0.5 p-2">
                                  <p className="font-semibold">Carbon-adjusted cost</p>
                                  <p className="text-muted-foreground">
                                    ${parseFloat(bid.bidPrice!).toLocaleString()} bid
                                    {" + "}
                                    ${(parseFloat(bid.gwpValue!) / 1000 * shadowCarbonPrice).toLocaleString(undefined, { maximumFractionDigits: 0 })} carbon
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          ) : bid.gwpValue == null ? (
                            <span className="text-muted-foreground text-xs">No GWP</span>
                          ) : (
                            <span className="text-muted-foreground text-xs">No price</span>
                          )}
                        </TableCell>
                      )}

                      {/* GWP + delta vs avg + data quality badge */}
                      <TableCell className="text-right">
                        {gwpNum != null ? (
                          <div className="flex flex-col items-end gap-0.5">
                            <span className="font-mono text-sm text-green-700 dark:text-green-400">
                              {gwpNum.toFixed(1)}
                              <span className="text-xs text-muted-foreground ml-0.5">kg</span>
                            </span>
                            {/* Delta chip vs. field average */}
                            {gwpDeltaPct != null && (
                              <GwpDeltaChip delta={gwpDeltaPct} />
                            )}
                            <DataQualityBadge
                              level={bid.dataQualityLevel ?? bid.scoreBreakdown.dataQualityLevel}
                              size="sm"
                              showTooltip
                            />
                          </div>
                        ) : (
                          <div className="flex flex-col items-end gap-0.5">
                            <span className="text-muted-foreground text-xs">—</span>
                            <DataQualityBadge
                              level={bid.dataQualityLevel ?? bid.scoreBreakdown.dataQualityLevel}
                              size="sm"
                              showTooltip
                            />
                          </div>
                        )}
                      </TableCell>

                      {/* EPD */}
                      <TableCell className="text-center">
                        {bid.epdReference ? (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                <CheckCircle2 className="w-4 h-4 text-green-600 mx-auto" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="text-xs max-w-[200px] break-all">{bid.epdReference}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </TableCell>

                      {/* Lead time */}
                      <TableCell className="text-right">
                        {bid.leadDays != null ? (
                          <span className="text-sm">{bid.leadDays}d</span>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </TableCell>

                      {/* Total score */}
                      <TableCell className="text-center">
                        <span className={`text-xl font-bold ${scoreColor(score)}`}>{score}</span>
                        <p className="text-xs text-muted-foreground">/100</p>
                      </TableCell>

                      {/* Score breakdown mini-bars */}
                      <TableCell>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="space-y-0.5 cursor-help">
                                <MiniBar icon={<DollarSign className="w-2.5 h-2.5" />} score={bd.priceScore} />
                                <MiniBar icon={<Leaf className="w-2.5 h-2.5 text-green-500" />} score={bd.carbonScore} />
                                <MiniBar icon={<Clock className="w-2.5 h-2.5" />} score={bd.leadTimeScore} />
                                <MiniBar icon={<FileText className="w-2.5 h-2.5" />} score={bd.documentationScore} />
                                <MiniBar icon={<Award className="w-2.5 h-2.5" />} score={bd.certificationScore} />
                              </div>
                            </TooltipTrigger>
                            <TooltipContent className="space-y-1 p-3">
                              <p className="text-xs font-semibold mb-1">Score breakdown</p>
                              <ScoreLine label="Price" score={bd.priceScore} />
                              <ScoreLine
                                label={`Carbon${bd.qualityMultiplier != null && bd.qualityMultiplier < 1 ? ` (×${bd.qualityMultiplier})` : ""}`}
                                score={bd.carbonScore}
                                rawScore={bd.carbonScoreRaw}
                              />
                              <ScoreLine label="Lead time" score={bd.leadTimeScore} />
                              <ScoreLine label="Documentation" score={bd.documentationScore} />
                              <ScoreLine label="Certifications" score={bd.certificationScore} />
                              {bd.dataQualityLevel && (
                                <div className="pt-1 border-t mt-1">
                                  <DataQualityBadge
                                    level={bd.dataQualityLevel}
                                    size="sm"
                                    showTooltip={false}
                                  />
                                </div>
                              )}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function GwpDeltaChip({ delta }: { delta: number }) {
  const isBetter = delta < 0;
  const abs = Math.abs(delta);
  if (abs < 2) return null; // too close to average to matter

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={[
              "inline-flex items-center gap-0.5 text-[10px] font-mono font-semibold px-1 py-0.5 rounded cursor-help",
              isBetter
                ? "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400"
                : "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400",
            ].join(" ")}
          >
            {isBetter
              ? <TrendingDown className="w-2.5 h-2.5" />
              : <TrendingUp className="w-2.5 h-2.5" />
            }
            {isBetter ? "−" : "+"}{abs.toFixed(0)}%
          </span>
        </TooltipTrigger>
        <TooltipContent side="left" className="text-xs">
          {isBetter
            ? `${abs.toFixed(0)}% below field average GWP`
            : `${abs.toFixed(0)}% above field average GWP`}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function MiniBar({ icon, score }: { icon: React.ReactNode; score: number }) {
  return (
    <div className="flex items-center gap-1">
      <span className="text-muted-foreground">{icon}</span>
      <div className="w-12 h-1 rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full ${
            score >= 80 ? "bg-green-500" : score >= 60 ? "bg-yellow-500" : "bg-red-400"
          }`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}

function ScoreLine({
  label,
  score,
  rawScore,
}: {
  label: string;
  score: number;
  rawScore?: number;
}) {
  return (
    <div className="flex items-center justify-between gap-4 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-mono font-medium ${scoreColor(score)}`}>
        {score}
        {rawScore != null && rawScore !== score && (
          <span className="text-muted-foreground font-normal ml-1">
            (raw {rawScore})
          </span>
        )}
      </span>
    </div>
  );
}
