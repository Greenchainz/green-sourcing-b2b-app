/**
 * MaterialCard — architect-first spec snapshot.
 *
 * Product direction:
 *   - Lead with: Name, Manufacturer, Category, Price, Lead Time
 *   - Sustainability data is a bonus column, not the headline
 *   - CCPS score shown as "GreenScore" (quality/trust signal, not compliance)
 *   - GWP shown as "Carbon Score" using plain-language context label
 *   - EPD backed = "Verified Data" (data quality, not environmental compliance)
 *   - "Request Quote →" is the primary CTA — full width, always visible
 *   - Details + Score links are icon-only in the card top-right corner
 *
 * Variants:
 *   "grid" (default) — vertical card
 *   "list"           — compact horizontal row
 */
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
  FileText,
  BarChart3,
  Leaf,
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { ScoreBadge } from "@/components/MaterialCreditScore/ScoreBadge";

// ── Types ──────────────────────────────────────────────────────────────────────

export interface MaterialCardProps {
  id: number;
  name: string;
  productName?: string | null;
  category: string;
  subcategory?: string | null;
  manufacturerName?: string | null;
  gwpValue?: string | null;
  gwpUnit?: string | null;
  declaredUnit?: string | null;
  ec3IndustryMedian?: string | null;
  pricePerUnit?: string | null;
  priceUnit?: string | null;
  leadTimeDays?: number | null;
  hasEpd?: boolean | null;
  hasHpd?: boolean | null;
  hasFsc?: boolean | null;
  hasC2c?: boolean | null;
  hasGreenguard?: boolean | null;
  hasDeclare?: boolean | null;
  usManufactured?: boolean | null;
  recycledContentPct?: string | null;
  ccps: {
    ccpsTotal: number;
    carbonScore: number;
    certificationScore: number;
    complianceScore: number;
    costScore: number;
    supplyChainScore: number;
    healthScore: number;
    sourcingDifficulty: number;
  };
  /** "grid" (default) = vertical card; "list" = compact horizontal row */
  variant?: "grid" | "list";
}

// ── Carbon context helper (plain-language GWP summary) ────────────────────────

function carbonContext(
  gwp: string | null | undefined,
  median: string | null | undefined
): { label: string; color: string } | null {
  const g = parseFloat(gwp ?? "");
  const m = parseFloat(median ?? "");
  if (isNaN(g) || isNaN(m) || m === 0) return null;
  const pct = Math.round(((m - g) / m) * 100); // positive = better than median
  if (pct >= 40) return { label: "Top 25% in class", color: "text-green-600" };
  if (pct >= 15) return { label: `${pct}% below avg`,  color: "text-green-600" };
  if (pct >= -10) return { label: "Near avg",            color: "text-amber-600" };
  return { label: `${Math.abs(pct)}% above avg`,         color: "text-red-500"   };
}

// ── Cert definitions ──────────────────────────────────────────────────────────

const CERT_DEFS = [
  { key: "hasEpd"        as const, label: "EPD",     cls: "bg-emerald-50 border-emerald-200 text-emerald-700" },
  { key: "hasFsc"        as const, label: "FSC",     cls: "bg-green-50 border-green-200 text-green-700"       },
  { key: "hasC2c"        as const, label: "C2C",     cls: "bg-teal-50 border-teal-200 text-teal-700"          },
  { key: "hasHpd"        as const, label: "HPD",     cls: "bg-sky-50 border-sky-200 text-sky-700"             },
  { key: "hasGreenguard" as const, label: "GG",      cls: "bg-lime-50 border-lime-200 text-lime-700"          },
  { key: "hasDeclare"    as const, label: "Declare", cls: "bg-purple-50 border-purple-200 text-purple-700"    },
] as const;

// ── Component ─────────────────────────────────────────────────────────────────

export default function MaterialCard(props: MaterialCardProps) {
  const {
    id, name, productName, category, subcategory,
    manufacturerName, gwpValue, gwpUnit, declaredUnit,
    ec3IndustryMedian, pricePerUnit, priceUnit,
    leadTimeDays, usManufactured, recycledContentPct,
    ccps, variant = "grid",
  } = props;

  const [, navigate] = useLocation();
  const mcsScore    = ccps.ccpsTotal;
  const carbCtx     = carbonContext(gwpValue, ec3IndustryMedian);
  const activeCerts = CERT_DEFS.filter((c) => !!props[c.key]);

  const handleRequestQuote = (e: React.MouseEvent) => {
    e.preventDefault();
    navigate(
      `/rfq/new?materialId=${id}&category=${encodeURIComponent(category)}&epdRequired=${
        props.hasEpd ? "true" : "false"
      }`
    );
  };

  // ── List variant ────────────────────────────────────────────────────────────
  if (variant === "list") {
    return (
      <div className="group flex items-center gap-3 px-4 py-3 bg-card border border-border/60 rounded-lg hover:border-border hover:shadow-sm transition-all duration-150">

        {/* GreenScore badge */}
        <div className="shrink-0 flex flex-col items-center gap-0.5">
          <ScoreBadge score={mcsScore} materialId={id} />
          <span className="text-[8px] text-muted-foreground uppercase tracking-wider">
            GreenScore
          </span>
        </div>

        {/* Name + meta — flex-1 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Link href={`/materials/${id}`}>
              <span className="text-sm font-semibold text-foreground hover:text-primary cursor-pointer line-clamp-1 transition-colors">
                {name}
              </span>
            </Link>
            {props.hasEpd ? (
              <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-emerald-700 shrink-0">
                <ShieldCheck className="w-3 h-3" />Verified Data
              </span>
            ) : null}
          </div>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <Badge variant="secondary" className="text-[10px] h-4 px-1.5">{category}</Badge>
            {subcategory && (
              <span className="text-[10px] text-muted-foreground">{subcategory}</span>
            )}
            {manufacturerName && (
              <span className="text-[10px] text-muted-foreground/70">{manufacturerName}</span>
            )}
            {usManufactured && (
              <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 border-blue-200 text-blue-700 bg-blue-50 shrink-0">
                🇺🇸 US Made
              </Badge>
            )}
          </div>
        </div>

        {/* Cert pills */}
        {activeCerts.length > 0 && (
          <div className="hidden sm:flex items-center gap-1 shrink-0">
            {activeCerts.slice(0, 4).map((c) => (
              <Badge key={c.key} variant="outline" className={`text-[9px] px-1.5 py-0 h-4 ${c.cls}`}>
                {c.label}
              </Badge>
            ))}
          </div>
        )}

        {/* Price + lead time */}
        <div className="hidden lg:block text-right w-24 shrink-0">
          {pricePerUnit ? (
            <p className="text-xs font-semibold text-foreground tabular-nums">
              ${Number(pricePerUnit).toFixed(2)}
              <span className="text-[9px] font-normal text-muted-foreground">/{priceUnit || "unit"}</span>
            </p>
          ) : null}
          {leadTimeDays ? (
            <p className="text-[10px] text-muted-foreground">{leadTimeDays}d lead</p>
          ) : null}
        </div>

        {/* Carbon Score */}
        <div className="hidden md:block text-right w-28 shrink-0">
          <p className="text-[9px] text-muted-foreground uppercase tracking-wider mb-0.5">Carbon Score</p>
          {carbCtx ? (
            <p className={`text-[10px] font-semibold ${carbCtx.color}`}>{carbCtx.label}</p>
          ) : gwpValue ? (
            <p className="text-xs font-mono tabular-nums text-foreground">
              {Number(gwpValue).toFixed(2)}
              <span className="text-[9px] text-muted-foreground ml-0.5">{gwpUnit || "kgCO₂e"}</span>
            </p>
          ) : (
            <span
              className="inline-flex items-center gap-1 text-[10px] text-muted-foreground/50 cursor-default"
              title="No EPD data — carbon figures unavailable for this product"
            >
              <Leaf className="w-3 h-3" />No EPD data
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          <Button
            size="sm"
            className="h-7 text-[11px] bg-green-700 hover:bg-green-800 text-white gap-1 px-3 font-medium"
            onClick={handleRequestQuote}
          >
            Request Quote <ArrowRight className="w-3 h-3" />
          </Button>
          <Link href={`/materials/${id}`}>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground" title="Details">
              <FileText className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // ── Grid variant (default) ──────────────────────────────────────────────────
  return (
    <Card className="group hover:shadow-md transition-all duration-150 border-border/60 overflow-hidden flex flex-col">
      <CardContent className="p-0 flex flex-col flex-1">

        {/* ── Zone 1: Header ────────────────────────────────────────────── */}
        <div className="p-4 pb-3 flex-1 relative">

          {/* Icon actions — top-right corner */}
          <div className="absolute top-3 right-3 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <Link href={`/materials/${id}`}>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                title="View details"
              >
                <FileText className="w-3.5 h-3.5" />
              </Button>
            </Link>
            <Link href={`/materials/${id}/score`}>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                title="GreenScore details"
              >
                <BarChart3 className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </div>

          {/* Category + flags (pad right to not overlap icon buttons) */}
          <div className="flex items-center gap-1.5 mb-2 flex-wrap pr-14">
            <Badge variant="secondary" className="text-[10px] font-medium">{category}</Badge>
            {subcategory && (
              <span className="text-[10px] text-muted-foreground">{subcategory}</span>
            )}
            {usManufactured && (
              <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 border-blue-200 text-blue-700 bg-blue-50">
                🇺🇸 US Made
              </Badge>
            )}
          </div>

          {/* Product name */}
          <Link href={`/materials/${id}`}>
            <h3 className="text-sm font-semibold text-foreground hover:text-primary cursor-pointer leading-snug line-clamp-2 mb-0.5 pr-2 transition-colors">
              {name}
            </h3>
          </Link>
          {productName && productName !== name && (
            <p className="text-[11px] text-muted-foreground line-clamp-1">{productName}</p>
          )}
          {manufacturerName && (
            <p className="text-[11px] text-muted-foreground/70 mt-0.5">{manufacturerName}</p>
          )}

          {/* Price + lead time — the primary spec data architects need */}
          {(pricePerUnit || leadTimeDays) && (
            <div className="flex items-center gap-3 mt-2.5 text-xs">
              {pricePerUnit && (
                <span>
                  <span className="font-semibold text-foreground">
                    ${Number(pricePerUnit).toFixed(2)}
                  </span>
                  <span className="text-muted-foreground">/{priceUnit || "unit"}</span>
                </span>
              )}
              {leadTimeDays && (
                <span className="text-muted-foreground">{leadTimeDays}d lead</span>
              )}
            </div>
          )}
        </div>

        {/* ── Zone 2: ESG snapshot ──────────────────────────────────────── */}
        <div className="px-4 py-2.5 border-t border-border/30 bg-muted/30 flex items-center justify-between gap-2">

          {/* GreenScore */}
          <div className="flex flex-col items-center gap-0.5 shrink-0">
            <ScoreBadge score={mcsScore} materialId={id} />
            <span className="text-[8px] text-muted-foreground uppercase tracking-wider font-medium">
              GreenScore
            </span>
          </div>

          {/* Verified Data status */}
          {props.hasEpd ? (
            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-700">
              <ShieldCheck className="w-3 h-3" />Verified Data
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
              <ShieldAlert className="w-3 h-3" />No EPD
            </span>
          )}

          {/* Carbon Score — only rendered when gwpValue is populated */}
          {gwpValue && (
            <div className="text-right">
              <p className="text-[8px] text-muted-foreground uppercase tracking-wider mb-0.5">
                Carbon Score
              </p>
              {carbCtx ? (
                <p className={`text-[10px] font-semibold leading-tight ${carbCtx.color}`}>
                  {carbCtx.label}
                </p>
              ) : (
                <>
                  <p className="text-xs font-semibold tabular-nums leading-none">
                    {Number(gwpValue).toFixed(2)}
                  </p>
                  <p className="text-[9px] text-muted-foreground">
                    {gwpUnit || "kgCO₂e"}/{declaredUnit || "unit"}
                  </p>
                </>
              )}
            </div>
          )}
        </div>

        {/* ── Zone 3: Cert pills ────────────────────────────────────────── */}
        {(activeCerts.length > 0 || (recycledContentPct && Number(recycledContentPct) > 0)) && (
          <div className="px-4 py-1.5 flex flex-wrap gap-1 border-t border-border/30">
            {activeCerts.slice(0, 4).map((c) => (
              <Badge key={c.key} variant="outline" className={`text-[9px] px-1.5 py-0 h-4 ${c.cls}`}>
                {c.label}
              </Badge>
            ))}
            {recycledContentPct && Number(recycledContentPct) > 0 && (
              <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 bg-emerald-50 border-emerald-200 text-emerald-700">
                {Number(recycledContentPct).toFixed(0)}% Recycled
              </Badge>
            )}
          </div>
        )}

        {/* ── CTA: Request Quote — full width ──────────────────────────── */}
        <div className="px-3 py-3 border-t border-border/30 mt-auto">
          <Button
            className="w-full h-8 text-xs bg-green-700 hover:bg-green-800 text-white gap-1.5 font-medium hover:shadow-[0_0_12px_rgba(22,163,74,0.4)] transition-all"
            onClick={handleRequestQuote}
          >
            Request Quote
            <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </div>

      </CardContent>
    </Card>
  );
}
