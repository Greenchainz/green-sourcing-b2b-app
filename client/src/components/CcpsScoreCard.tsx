/**
 * CcpsScoreCard — Full Material Credit Score display
 *
 * Shows:
 *  - Ring gauge with total score (color-coded 0-100)
 *  - Persona switcher (Architect / GC PM / Sustainability / Owner)
 *  - 6 pillar bars with weight % per persona
 *  - Data confidence badge (HIGH / MEDIUM / LOW / INSUFFICIENT)
 *  - Trust disclaimer (collapsible)
 *  - Improvement checklist (missing fields)
 *  - Sourcing difficulty dots
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Leaf, Shield, Award, DollarSign, Truck, Heart,
  ShieldCheck, ShieldAlert, AlertTriangle, XCircle,
  ChevronDown, ChevronUp, CheckCircle2, Info,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────

interface DataQualityFlags {
  confidence: "HIGH" | "MEDIUM" | "LOW" | "INSUFFICIENT";
  disclaimer: string;
  missingFields: string[];
  hasEpd: boolean;
  hasVerifiedGwp: boolean;
  hasBaselineData: boolean;
  hasPriceData: boolean;
}

interface CcpsBreakdown {
  carbonScore: number;
  complianceScore: number;
  certificationScore: number;
  costScore: number;
  supplyChainScore: number;
  healthScore: number;
  ccpsTotal: number;
  sourcingDifficulty: number;
  dataQuality: DataQualityFlags;
}

interface CcpsScoreCardProps {
  ccpsByPersona: Record<string, CcpsBreakdown> | null | undefined;
  className?: string;
}

// ── Constants ──────────────────────────────────────────────────────────────

const PILLARS = [
  { key: "carbonScore" as const,       icon: Leaf,       color: "text-green-600",  bg: "bg-green-500",   label: "Carbon",        tip: "Lower GWP vs category baseline" },
  { key: "complianceScore" as const,   icon: Shield,     color: "text-blue-600",   bg: "bg-blue-500",    label: "Compliance",    tip: "Fire rating, ASTM, Title 24, IECC" },
  { key: "certificationScore" as const,icon: Award,      color: "text-purple-600", bg: "bg-purple-500",  label: "Certifications",tip: "EPD, HPD, FSC, C2C, GREENGUARD, Declare" },
  { key: "costScore" as const,         icon: DollarSign, color: "text-yellow-600", bg: "bg-yellow-500",  label: "Cost",          tip: "Price relative to category baseline" },
  { key: "supplyChainScore" as const,  icon: Truck,      color: "text-orange-600", bg: "bg-orange-500",  label: "Supply Chain",  tip: "Lead time, US manufacturing, regional availability" },
  { key: "healthScore" as const,       icon: Heart,      color: "text-red-600",    bg: "bg-red-500",     label: "Health",        tip: "VOC level, Red List status, take-back program" },
] as const;

const PERSONA_LABELS: Record<string, { label: string; short: string }> = {
  architect:      { label: "Architect",       short: "Arch" },
  leed_ap:        { label: "LEED AP",         short: "LEED" },
  gc_pm:          { label: "GC / PM",         short: "GC" },
  spec_writer:    { label: "Spec Writer",     short: "Spec" },
  owner:          { label: "Owner",           short: "Owner" },
  facility_manager:{ label: "Facility Mgr",  short: "FM" },
  sustainability: { label: "Sustainability",  short: "Sust" },
  default:        { label: "Balanced",        short: "Bal" },
};

// Approximate weights per persona key (mirrors ccps-engine PERSONA_WEIGHTS)
const PERSONA_WEIGHTS: Record<string, Record<string, number>> = {
  architect:    { carbonScore: 30, complianceScore: 30, certificationScore: 20, costScore: 8,  supplyChainScore: 7,  healthScore: 5  },
  gc_pm:        { carbonScore: 10, complianceScore: 20, certificationScore: 10, costScore: 30, supplyChainScore: 25, healthScore: 5  },
  sustainability:{ carbonScore: 35, complianceScore: 15, certificationScore: 25, costScore: 5, supplyChainScore: 10, healthScore: 10 },
  owner:        { carbonScore: 20, complianceScore: 20, certificationScore: 15, costScore: 25, supplyChainScore: 15, healthScore: 5  },
  default:      { carbonScore: 25, complianceScore: 20, certificationScore: 15, costScore: 15, supplyChainScore: 15, healthScore: 10 },
};

const PREFERRED_PERSONA_ORDER = ["architect", "gc_pm", "sustainability", "owner", "leed_ap", "spec_writer", "facility_manager", "default"];

// ── Sub-components ─────────────────────────────────────────────────────────

function ScoreRing({ score, size = 120 }: { score: number; size?: number }) {
  const r = (size - 16) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  const color = score >= 75 ? "#16a34a" : score >= 50 ? "#ca8a04" : "#dc2626";
  const bgLabel = score >= 75 ? "text-green-600" : score >= 50 ? "text-yellow-600" : "text-red-600";

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={10} className="text-muted/20" />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke={color} strokeWidth={10}
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          style={{ transition: "stroke-dasharray 0.6s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-3xl font-black leading-none ${bgLabel}`}>{score}</span>
        <span className="text-[10px] text-muted-foreground mt-0.5 font-medium">/ 100</span>
      </div>
    </div>
  );
}

function ConfidenceBadge({ confidence }: { confidence: DataQualityFlags["confidence"] }) {
  const map = {
    HIGH:         { label: "High confidence", icon: ShieldCheck,  cls: "bg-green-100 text-green-800 border-green-300" },
    MEDIUM:       { label: "Medium confidence", icon: ShieldAlert, cls: "bg-yellow-100 text-yellow-800 border-yellow-300" },
    LOW:          { label: "Low confidence",  icon: AlertTriangle, cls: "bg-orange-100 text-orange-800 border-orange-300" },
    INSUFFICIENT: { label: "Insufficient data", icon: XCircle,    cls: "bg-red-100 text-red-800 border-red-300" },
  };
  const { label, icon: Icon, cls } = map[confidence];
  return (
    <Badge variant="outline" className={`gap-1.5 ${cls}`}>
      <Icon className="w-3 h-3" />
      {label}
    </Badge>
  );
}

function SourcingDots({ difficulty }: { difficulty: number }) {
  const labels = ["", "Very easy", "Easy", "Moderate", "Difficult", "Very difficult"];
  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className={`w-2.5 h-2.5 rounded-full ${i <= difficulty ? "bg-orange-500" : "bg-muted"}`}
          />
        ))}
      </div>
      <span className="text-xs text-muted-foreground">{labels[difficulty] || "Unknown"}</span>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────

export function CcpsScoreCard({ ccpsByPersona, className }: CcpsScoreCardProps) {
  const personas = Object.keys(ccpsByPersona ?? {});
  const sortedPersonas = [
    ...PREFERRED_PERSONA_ORDER.filter((k) => personas.includes(k)),
    ...personas.filter((k) => !PREFERRED_PERSONA_ORDER.includes(k)),
  ];

  const [activePersona, setActivePersona] = useState(sortedPersonas[0] ?? "default");
  const [disclaimerOpen, setDisclaimerOpen] = useState(false);

  const ccps: CcpsBreakdown | undefined = ccpsByPersona?.[activePersona];
  if (!ccps) return null;

  const weights = PERSONA_WEIGHTS[activePersona] ?? PERSONA_WEIGHTS.default;
  const { dataQuality } = ccps;

  const gradeLabel = ccps.ccpsTotal >= 85 ? "Excellent"
    : ccps.ccpsTotal >= 70 ? "Good"
    : ccps.ccpsTotal >= 55 ? "Average"
    : ccps.ccpsTotal >= 40 ? "Below Average"
    : "Poor";

  return (
    <div className={`space-y-4 ${className ?? ""}`}>
      {/* ── Score Ring + Persona Tabs ──────────────────────────────── */}
      <Card>
        <CardContent className="p-5">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            {/* Ring */}
            <div className="flex flex-col items-center gap-1 shrink-0">
              <ScoreRing score={ccps.ccpsTotal} />
              <span className="text-sm font-semibold">{gradeLabel}</span>
              <span className="text-[11px] text-muted-foreground">CCPS Score</span>
            </div>

            {/* Right side */}
            <div className="flex-1 space-y-4 w-full">
              {/* Persona tabs */}
              <div>
                <p className="text-[11px] text-muted-foreground mb-1.5 font-medium uppercase tracking-wide">Viewing as</p>
                <div className="flex flex-wrap gap-1.5">
                  {sortedPersonas.map((key) => {
                    const { label } = PERSONA_LABELS[key] ?? { label: key };
                    const score = ccpsByPersona?.[key]?.ccpsTotal ?? 0;
                    return (
                      <button
                        key={key}
                        onClick={() => setActivePersona(key)}
                        className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                          activePersona === key
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-muted/40 text-muted-foreground border-border hover:bg-muted"
                        }`}
                      >
                        {label}
                        <span className={`ml-1.5 ${activePersona === key ? "text-primary-foreground/80" : "text-muted-foreground/60"}`}>
                          {score}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Confidence + sourcing */}
              <div className="flex flex-wrap items-center gap-3">
                <ConfidenceBadge confidence={dataQuality.confidence} />
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span>Sourcing:</span>
                  <SourcingDots difficulty={ccps.sourcingDifficulty} />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Pillar Breakdown ───────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center justify-between">
            Score Breakdown
            <span className="text-[11px] text-muted-foreground font-normal">
              Weight % = {PERSONA_LABELS[activePersona]?.label ?? activePersona} priorities
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {PILLARS.map(({ key, icon: Icon, color, bg, label, tip }) => {
            const score = ccps[key];
            const weight = weights[key] ?? 0;
            const scoreColor =
              score >= 70 ? "text-green-600"
              : score >= 45 ? "text-yellow-600"
              : "text-red-600";
            return (
              <div key={key} title={tip}>
                <div className="flex items-center gap-2 mb-1">
                  <Icon className={`w-3.5 h-3.5 ${color} shrink-0`} />
                  <span className="text-sm font-medium flex-1">{label}</span>
                  <span className="text-[11px] text-muted-foreground w-10 text-right">{weight}%</span>
                  <span className={`text-sm font-bold w-8 text-right ${scoreColor}`}>{score}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-muted/40 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${bg}`}
                      style={{ width: `${score}%`, opacity: 0.85 }}
                    />
                  </div>
                </div>
              </div>
            );
          })}

          {/* Weight totals row */}
          <div className="pt-2 border-t border-border/30 flex items-center gap-2">
            <span className="text-xs text-muted-foreground flex-1">Weights sum</span>
            <span className="text-xs text-muted-foreground">
              {Object.values(weights).reduce((a, b) => a + b, 0)}%
            </span>
          </div>
        </CardContent>
      </Card>

      {/* ── Data Quality + Improvements ───────────────────────────── */}
      {(dataQuality.missingFields.length > 0 || dataQuality.confidence !== "HIGH") && (
        <Card className={
          dataQuality.confidence === "INSUFFICIENT" ? "border-red-300 bg-red-50/30"
          : dataQuality.confidence === "LOW" ? "border-orange-300 bg-orange-50/30"
          : "border-yellow-200 bg-yellow-50/20"
        }>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium">
                  {dataQuality.confidence === "HIGH"
                    ? "Score is based on verified data"
                    : "Add data to improve score accuracy"}
                </p>
                {dataQuality.missingFields.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {dataQuality.missingFields.map((field) => (
                      <li key={field} className="flex items-center gap-2 text-xs text-muted-foreground">
                        <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 shrink-0" />
                        {field}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {/* Collapsible disclaimer */}
            <div className="border-t border-border/30 pt-2">
              <button
                className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setDisclaimerOpen((v) => !v)}
              >
                {disclaimerOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                Data disclaimer
              </button>
              {disclaimerOpen && (
                <p className="mt-2 text-[11px] text-muted-foreground leading-relaxed">
                  {dataQuality.disclaimer}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Verified fields checkmarks (when HIGH confidence) ─────── */}
      {dataQuality.confidence === "HIGH" && (
        <Card className="border-green-200 bg-green-50/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck className="w-4 h-4 text-green-600" />
              <p className="text-sm font-medium text-green-800">Verified data</p>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
              {[
                ["EPD Verified",        dataQuality.hasEpd],
                ["GWP Data",            dataQuality.hasVerifiedGwp],
                ["Category Baseline",   dataQuality.hasBaselineData],
                ["Price Data",          dataQuality.hasPriceData],
              ].map(([label, ok]) => (
                <div key={label as string} className="flex items-center gap-1.5 text-xs">
                  {ok
                    ? <CheckCircle2 className="w-3 h-3 text-green-600" />
                    : <XCircle className="w-3 h-3 text-muted-foreground/40" />
                  }
                  <span className={ok ? "text-green-800" : "text-muted-foreground"}>{label as string}</span>
                </div>
              ))}
            </div>
            <button
              className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground"
              onClick={() => setDisclaimerOpen((v) => !v)}
            >
              {disclaimerOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              View disclaimer
            </button>
            {disclaimerOpen && (
              <p className="mt-2 text-[11px] text-muted-foreground leading-relaxed">
                {dataQuality.disclaimer}
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
