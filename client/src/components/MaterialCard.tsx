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
  Frown,
  ArrowRight,
  FileText,
  BarChart3,
  Leaf,
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { ScoreBadge } from "@/components/MaterialCreditScore/ScoreBadge";
import { PriceTrendBadge } from "@/components/PriceTrendBadge";
import { getMaterialImage } from "@/lib/material-images";


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
  imageUrl?: string | null;
  manufacturerId?: number | null;
  /** "grid" (default) = vertical card; "list" = compact horizontal row */
  variant?: "grid" | "list";
}

// ── Material avatar (initials + hash-based color when no photo exists) ───────

const AVATAR_PALETTES = [
  { bg: "bg-emerald-100", text: "text-emerald-800", border: "border-emerald-200" },
  { bg: "bg-teal-100", text: "text-teal-800", border: "border-teal-200" },
  { bg: "bg-sky-100", text: "text-sky-800", border: "border-sky-200" },
  { bg: "bg-violet-100", text: "text-violet-800", border: "border-violet-200" },
  { bg: "bg-amber-100", text: "text-amber-800", border: "border-amber-200" },
  { bg: "bg-rose-100", text: "text-rose-800", border: "border-rose-200" },
  { bg: "bg-lime-100", text: "text-lime-800", border: "border-lime-200" },
  { bg: "bg-cyan-100", text: "text-cyan-800", border: "border-cyan-200" },
  { bg: "bg-orange-100", text: "text-orange-800", border: "border-orange-200" },
  { bg: "bg-indigo-100", text: "text-indigo-800", border: "border-indigo-200" },
];

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function materialAvatar(name: string, category: string) {
  const palette = AVATAR_PALETTES[hashStr(name + category) % AVATAR_PALETTES.length];
  const words = name.trim().split(/\s+/);
  const initials = words.length >= 2
    ? (words[0][0] + words[1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase();
  return { ...palette, initials };
}

// ── Carbon context helper (plain-language GWP summary) ────────────────────────

// Card-level preferred baseline for sustainable-first ranking.
const MIN_MCS_SCORE_FOR_PREFERRED = 60;

type CarbonContext = {
  label: string;
  color: string;
  pct: number;
  bucket: "top" | "below" | "near" | "above";
};

const NON_PREFERRED_COPY = {
  shortLabel: "Not preferred",
  accessibleLabel: "Not preferred low-carbon option",
  tooltip: "Data is shown for transparency, but this option is not a preferred low-carbon choice.",
} as const;

export function carbonContext(
  gwp: string | null | undefined,
  median: string | null | undefined
): CarbonContext | null {
  const g = parseFloat(gwp ?? "");
  const m = parseFloat(median ?? "");
  if (isNaN(g) || isNaN(m) || m === 0) return null;
  const pct = Math.round(((m - g) / m) * 100); // positive = better than median
  if (pct >= 40) return { label: "Top 25% in class", color: "text-green-600", pct, bucket: "top" };
  if (pct >= 15) return { label: `${pct}% below avg`, color: "text-green-600", pct, bucket: "below" };
  if (pct >= -10) return { label: "Near avg", color: "text-amber-600", pct, bucket: "near" };
  return { label: `${Math.abs(pct)}% above avg`, color: "text-red-500", pct, bucket: "above" };
}

export function isNonSustainableOption(
  mcsScore: number,
  hasEpd: boolean | null | undefined,
  carbCtx: CarbonContext | null
) {
  if (!hasEpd) return true;
  if (mcsScore < MIN_MCS_SCORE_FOR_PREFERRED) return true;
  return carbCtx?.bucket === "above";
}

function NonPreferredLabel({ variant }: { variant: "list" | "grid" }) {
  if (variant === "list") {
    return (
      <Badge
        variant="outline"
        className="text-[9px] px-1 py-0 h-4 border-amber-300 text-amber-800 bg-amber-50 shrink-0"
        title={NON_PREFERRED_COPY.tooltip}
        aria-label={NON_PREFERRED_COPY.accessibleLabel}
      >
        <Frown className="w-2.5 h-2.5 mr-0.5" aria-hidden="true" />
        {NON_PREFERRED_COPY.shortLabel}
      </Badge>
    );
  }

  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-700"
      title={NON_PREFERRED_COPY.tooltip}
      aria-label={NON_PREFERRED_COPY.accessibleLabel}
    >
      <Frown className="w-3 h-3" aria-hidden="true" />
      {NON_PREFERRED_COPY.shortLabel}
    </span>
  );
}

// ── Cert definitions ──────────────────────────────────────────────────────────

const CERT_DEFS = [
  { key: "hasEpd" as const, label: "EPD", cls: "bg-emerald-50 border-emerald-200 text-emerald-700" },
  { key: "hasFsc" as const, label: "FSC", cls: "bg-green-50 border-green-200 text-green-700" },
  { key: "hasC2c" as const, label: "C2C", cls: "bg-teal-50 border-teal-200 text-teal-700" },
  { key: "hasHpd" as const, label: "HPD", cls: "bg-sky-50 border-sky-200 text-sky-700" },
  { key: "hasGreenguard" as const, label: "GG", cls: "bg-lime-50 border-lime-200 text-lime-700" },
  { key: "hasDeclare" as const, label: "Declare", cls: "bg-purple-50 border-purple-200 text-purple-700" },
] as const;

// ── Component ─────────────────────────────────────────────────────────────────

export default function MaterialCard(props: MaterialCardProps) {
  const {
    id, name, productName, category, subcategory,
    manufacturerName, manufacturerId, gwpValue, gwpUnit, declaredUnit,
    ec3IndustryMedian, pricePerUnit, priceUnit,
    leadTimeDays, usManufactured, recycledContentPct,
    ccps, variant = "grid",
  } = props;

  const [, navigate] = useLocation();
  const mcsScore = ccps.ccpsTotal;
  const carbCtx = carbonContext(gwpValue, ec3IndustryMedian);
  const activeCerts = CERT_DEFS.filter((c) => !!props[c.key]);
  const nonSustainableOption = isNonSustainableOption(mcsScore, props.hasEpd, carbCtx);

  const handleRequestQuote = (e: React.MouseEvent) => {
    e.preventDefault();
    navigate(
      `/rfq/new?materialId=${id}&category=${encodeURIComponent(category)}&epdRequired=${props.hasEpd ? "true" : "false"
      }`
    );
  };

  const avatar = materialAvatar(name, category);
  const imageSrc = getMaterialImage(category, props.imageUrl);

  // ── List variant ────────────────────────────────────────────────────────────
  if (variant === "list") {
    return (
      <div className="group flex items-center gap-3 px-4 py-3 bg-card border border-border/60 rounded-lg hover:border-border hover:shadow-sm transition-all duration-150">

        {/* Thumbnail */}
        <div className={`shrink-0 w-10 h-10 rounded overflow-hidden border ${avatar.border} ${avatar.bg} flex items-center justify-center`}>
          {imageSrc ? (
            <img src={imageSrc} alt={name} className="w-full h-full object-cover" loading="lazy" />
          ) : (
            <span className={`text-xs font-bold ${avatar.text}`}>{avatar.initials}</span>
          )}
        </div>

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
              manufacturerId ? (
                <Link href={`/manufacturers/${manufacturerId}`}>
                  <span className="text-[10px] text-muted-foreground/70 hover:text-primary transition-colors cursor-pointer">
                    {manufacturerName}
                  </span>
                </Link>
              ) : (
                <span className="text-[10px] text-muted-foreground/70">{manufacturerName}</span>
              )
            )}
            {usManufactured && (
              <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 border-blue-200 text-blue-700 bg-blue-50 shrink-0">
                🇺🇸 US Made
              </Badge>
            )}
            {nonSustainableOption && (
              <NonPreferredLabel variant="list" />
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
          <div className="flex items-center justify-end gap-1">
            {leadTimeDays ? (
              <p className="text-[10px] text-muted-foreground">{leadTimeDays}d lead</p>
            ) : null}
            <PriceTrendBadge category={category} mode="compact" />
          </div>
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

        {/* ── Hero image / avatar ─────────────────────────────────────── */}
        <div className={`relative w-full h-32 overflow-hidden ${props.imageUrl ? "bg-muted" : `${avatar.bg} border-b ${avatar.border}`}`}>
          {imageSrc ? (
            <>
              <img
                src={imageSrc}
                alt={name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
            </>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-1">
              <span className={`text-4xl font-black tracking-tighter ${avatar.text} opacity-90`}>
                {avatar.initials}
              </span>
              <span className={`text-[10px] font-medium uppercase tracking-widest ${avatar.text} opacity-50`}>
                {category.replace(/([A-Z])/g, " $1").trim().slice(0, 22)}
              </span>
            </div>
          )}
        </div>

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
            manufacturerId ? (
              <Link href={`/manufacturers/${manufacturerId}`}>
                <p className="text-[11px] text-muted-foreground/70 mt-0.5 hover:text-primary transition-colors cursor-pointer">
                  {manufacturerName}
                </p>
              </Link>
            ) : (
              <p className="text-[11px] text-muted-foreground/70 mt-0.5">{manufacturerName}</p>
            )
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
              <PriceTrendBadge category={category} mode="compact" />
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

          {nonSustainableOption && (
            <NonPreferredLabel variant="grid" />
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
