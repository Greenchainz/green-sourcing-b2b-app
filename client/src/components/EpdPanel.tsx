/**
 * EpdPanel — Key differentiator component.
 *
 * Shows:
 *  - GWP benchmark bar: where this material sits vs industry median / best practice
 *  - EPD document metadata (number, operator, expiry, declared unit)
 *  - External verification badge
 *  - Supplier-submitted EPDs for this material
 */

import { ExternalLink, ShieldCheck, ShieldAlert, AlertTriangle, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";

// ── GWP Benchmark Bar ─────────────────────────────────────────────────────────

function parseGwpNum(v: string | null | undefined): number | null {
  if (!v) return null;
  const n = parseFloat(v.replace(/[^0-9.]/g, ""));
  return isNaN(n) ? null : n;
}

interface GwpBarProps {
  gwp: number;
  median: number | null;
  bestPractice: number | null;
  conservative: number | null;
  unit: string;
}

function GwpBar({ gwp, median, bestPractice, conservative, unit }: GwpBarProps) {
  // All non-null values
  const all = [gwp, median, bestPractice, conservative].filter((v): v is number => v !== null);
  const max = Math.max(...all) * 1.1;

  const pct = (v: number) => Math.min(100, (v / max) * 100);

  const gwpColor =
    bestPractice && gwp <= bestPractice
      ? "bg-green-500"
      : median && gwp <= median
      ? "bg-yellow-400"
      : "bg-red-500";

  const gwpLabel =
    bestPractice && gwp <= bestPractice
      ? "Best Practice"
      : median && gwp <= median
      ? "Below Median"
      : "Above Median";

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm">
        <span className="font-semibold">
          {gwp.toFixed(2)} {unit}
        </span>
        <Badge
          className={
            gwpColor === "bg-green-500"
              ? "bg-green-100 text-green-800 border-green-300"
              : gwpColor === "bg-yellow-400"
              ? "bg-yellow-100 text-yellow-800 border-yellow-300"
              : "bg-red-100 text-red-800 border-red-300"
          }
          variant="outline"
        >
          {gwpLabel}
        </Badge>
      </div>

      {/* Bar visualization */}
      <div className="relative h-7 bg-muted rounded-full overflow-hidden">
        {/* Conservative estimate baseline */}
        {conservative !== null && (
          <div
            className="absolute inset-y-0 bg-red-200/40"
            style={{ width: `${pct(conservative)}%` }}
            title={`Conservative: ${conservative.toFixed(2)} ${unit}`}
          />
        )}
        {/* Industry median band */}
        {median !== null && (
          <div
            className="absolute inset-y-0 w-0.5 bg-orange-400"
            style={{ left: `${pct(median)}%` }}
            title={`Industry median: ${median.toFixed(2)} ${unit}`}
          />
        )}
        {/* Best practice marker */}
        {bestPractice !== null && (
          <div
            className="absolute inset-y-0 w-0.5 bg-green-500"
            style={{ left: `${pct(bestPractice)}%` }}
            title={`Best practice: ${bestPractice.toFixed(2)} ${unit}`}
          />
        )}
        {/* This material */}
        <div
          className={`absolute inset-y-0 rounded-r-full ${gwpColor} transition-all`}
          style={{ width: `${pct(gwp)}%` }}
        />
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className={`inline-block w-3 h-2 rounded-sm ${gwpColor}`} />
          This material
        </span>
        {median !== null && (
          <span className="flex items-center gap-1">
            <span className="inline-block w-0.5 h-3 bg-orange-400" />
            Median {median.toFixed(2)} {unit}
          </span>
        )}
        {bestPractice !== null && (
          <span className="flex items-center gap-1">
            <span className="inline-block w-0.5 h-3 bg-green-500" />
            Best practice {bestPractice.toFixed(2)} {unit}
          </span>
        )}
      </div>
    </div>
  );
}

// ── Main Panel ────────────────────────────────────────────────────────────────

interface EpdPanelProps {
  materialId: number;
  // Material-level EPD data from materials table (EC3-sourced)
  gwpValue?: string | null;
  gwpUnit?: string | null;
  declaredUnit?: string | null;
  epdNumber?: string | null;
  epdUrl?: string | null;
  epdExpiry?: string | null;
  epdProgramOperator?: string | null;
  externallyVerified?: boolean | null;
  // EC3 benchmarks
  ec3IndustryMedian?: string | null;
  ec3BestPractice?: string | null;
  ec3ConservativeEstimate?: string | null;
  hasEpd?: boolean | number | null;
}

export function EpdPanel({
  materialId,
  gwpValue,
  gwpUnit,
  declaredUnit,
  epdNumber,
  epdUrl,
  epdExpiry,
  epdProgramOperator,
  externallyVerified,
  ec3IndustryMedian,
  ec3BestPractice,
  ec3ConservativeEstimate,
  hasEpd,
}: EpdPanelProps) {
  const gwp = parseGwpNum(gwpValue);
  const median = parseGwpNum(ec3IndustryMedian);
  const best = parseGwpNum(ec3BestPractice);
  const conservative = parseGwpNum(ec3ConservativeEstimate);
  const unit = gwpUnit || "kgCO₂e";

  const { data: supplierEpds = [], isLoading: epdsLoading } =
    trpc.epd.listForMaterial.useQuery({ materialId }, { staleTime: 60_000 });

  const isExpired = epdExpiry ? new Date(epdExpiry) < new Date() : false;
  const expiryDaysLeft = epdExpiry
    ? Math.round((new Date(epdExpiry).getTime() - Date.now()) / 86_400_000)
    : null;

  return (
    <div className="space-y-5">
      {/* ── GWP Benchmark ─────────────────────────────────────── */}
      {gwp !== null ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              Carbon Footprint (GWP)
              <span className="text-xs font-normal text-muted-foreground">
                per {declaredUnit || "declared unit"}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <GwpBar
              gwp={gwp}
              median={median}
              bestPractice={best}
              conservative={conservative}
              unit={unit}
            />
            {(median !== null || best !== null) && (
              <p className="text-xs text-muted-foreground mt-3">
                EC3 benchmarks based on industry EPD data for this material category.
              </p>
            )}
          </CardContent>
        </Card>
      ) : (
        !hasEpd && (
          <Card className="border-dashed">
            <CardContent className="py-6 text-center text-sm text-muted-foreground">
              <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
              No EPD data available for this material yet.
            </CardContent>
          </Card>
        )
      )}

      {/* ── EPD Document Metadata ─────────────────────────────── */}
      {hasEpd && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              EPD Document
              {externallyVerified ? (
                <Badge className="bg-green-100 text-green-800 border-green-300 gap-1" variant="outline">
                  <ShieldCheck className="w-3 h-3" /> Externally Verified
                </Badge>
              ) : (
                <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300 gap-1" variant="outline">
                  <ShieldAlert className="w-3 h-3" /> Self-Declared
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              <div>
                <p className="text-xs text-muted-foreground">EPD Number</p>
                <p className="font-mono text-xs">{epdNumber || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Program Operator</p>
                <p className="text-xs">{epdProgramOperator || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Declared Unit</p>
                <p className="text-xs">{declaredUnit || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Expiry</p>
                {epdExpiry ? (
                  <p className={`text-xs flex items-center gap-1 ${isExpired ? "text-red-600" : expiryDaysLeft !== null && expiryDaysLeft < 180 ? "text-yellow-600" : "text-foreground"}`}>
                    {isExpired && <AlertTriangle className="w-3 h-3" />}
                    {new Date(epdExpiry).toLocaleDateString()}
                    {!isExpired && expiryDaysLeft !== null && expiryDaysLeft < 365 && (
                      <span className="text-muted-foreground">({expiryDaysLeft}d left)</span>
                    )}
                  </p>
                ) : (
                  <p className="text-xs">—</p>
                )}
              </div>
            </div>
            {epdUrl && (
              <a href={epdUrl} target="_blank" rel="noopener noreferrer" className="inline-flex">
                <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5 mt-1">
                  <ExternalLink className="w-3 h-3" /> View Full EPD Document
                </Button>
              </a>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Supplier EPDs ─────────────────────────────────────── */}
      {!epdsLoading && supplierEpds.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Supplier-Submitted EPDs</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {supplierEpds.map((epd) => (
              <div key={epd.id} className="p-3 rounded-md border bg-muted/20 space-y-1">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium">{epd.productName}</p>
                    <p className="text-xs text-muted-foreground">{epd.supplierName}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    {epd.gwpValue && (
                      <span className="text-xs font-mono">
                        {parseFloat(epd.gwpValue).toFixed(2)} {epd.gwpUnit ?? "kgCO₂e"}
                      </span>
                    )}
                    {epd.externallyVerified ? (
                      <Badge className="text-[10px] bg-green-100 text-green-800 border-green-300 gap-0.5 px-1.5" variant="outline">
                        <ShieldCheck className="w-2.5 h-2.5" /> Verified
                      </Badge>
                    ) : (
                      <Badge className="text-[10px] bg-muted text-muted-foreground gap-0.5 px-1.5" variant="outline">
                        Self-Declared
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-x-4 text-[11px] text-muted-foreground">
                  {epd.epdNumber && <span>EPD# {epd.epdNumber}</span>}
                  {epd.epdProgramOperator && <span>{epd.epdProgramOperator}</span>}
                  {epd.declaredUnit && <span>per {epd.declaredUnit}</span>}
                </div>
                {epd.epdUrl && (
                  <a href={epd.epdUrl} target="_blank" rel="noopener noreferrer">
                    <Button variant="ghost" size="sm" className="h-6 px-2 text-[11px] gap-1 mt-0.5">
                      <ExternalLink className="w-3 h-3" /> View EPD
                    </Button>
                  </a>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
