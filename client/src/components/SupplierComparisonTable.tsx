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
}

// Score color helper
function scoreColor(score: number): string {
  if (score >= 80) return "text-green-600";
  if (score >= 60) return "text-yellow-600";
  return "text-red-500";
}


export function SupplierComparisonTable({ rfqId, bids, onRescore }: Props) {
  const rescoreMutation = trpc.supplierResponse.scoreResponses.useMutation({
    onSuccess: ({ updated }) => {
      toast.success(`Rescored ${updated} responses`);
      onRescore?.();
    },
    onError: (err) => toast.error(err.message ?? "Rescore failed"),
  });

  const topBid = bids[0];
  const canFulfillBids = bids.filter((b) => b.canFulfill !== false);

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
                  <TableHead className="text-right">
                    <span className="flex items-center justify-end gap-1">
                      <Leaf className="w-3.5 h-3.5 text-green-500" />
                      GWP
                    </span>
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

                      {/* GWP + data quality badge */}
                      <TableCell className="text-right">
                        {bid.gwpValue ? (
                          <div className="flex flex-col items-end gap-0.5">
                            <span className="font-mono text-sm text-green-700 dark:text-green-400">
                              {parseFloat(bid.gwpValue).toFixed(1)}
                              <span className="text-xs text-muted-foreground ml-0.5">kg</span>
                            </span>
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
