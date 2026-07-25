/**
 * DataQualityBadge
 *
 * Displays the L0–L3 Data Ladder level for a supplier's emissions data.
 * Buyers see the badge; suppliers see "Upload EPD → improve your score."
 *
 * Usage:
 *   <DataQualityBadge level="L3" />                 — standalone chip
 *   <DataQualityBadge level="L1" showTooltip />     — with explainer tooltip
 *   <DataQualityBadge level="L0" size="sm" />       — compact variant
 */

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ShieldCheck, ShieldAlert, Shield } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

export type DataQualityLevel = "L0" | "L1" | "L2" | "L3";

interface BadgeConfig {
  label: string;
  description: string;
  multiplier: string;
  icon: typeof ShieldCheck;
  colors: {
    bg: string;
    text: string;
    border: string;
    icon: string;
  };
}

const BADGE_CONFIG: Record<DataQualityLevel, BadgeConfig> = {
  L3: {
    label: "EPD Verified",
    description: "Product EPD with verified activity-based data — highest trust. Carbon score applied at full weight.",
    multiplier: "100%",
    icon: ShieldCheck,
    colors: {
      bg:     "bg-green-50 dark:bg-green-950/30",
      text:   "text-green-800 dark:text-green-300",
      border: "border-green-200 dark:border-green-800",
      icon:   "text-green-600 dark:text-green-400",
    },
  },
  L2: {
    label: "Third-party Verified",
    description: "Audited by a third party but not yet EPD-verified. Carbon score applied at 90% weight.",
    multiplier: "90%",
    icon: ShieldCheck,
    colors: {
      bg:     "bg-blue-50 dark:bg-blue-950/30",
      text:   "text-blue-800 dark:text-blue-300",
      border: "border-blue-200 dark:border-blue-800",
      icon:   "text-blue-600 dark:text-blue-400",
    },
  },
  L1: {
    label: "Self-reported",
    description: "Supplier-provided energy bills or activity data. Carbon score applied at 70% weight.",
    multiplier: "70%",
    icon: Shield,
    colors: {
      bg:     "bg-yellow-50 dark:bg-yellow-950/30",
      text:   "text-yellow-800 dark:text-yellow-300",
      border: "border-yellow-200 dark:border-yellow-800",
      icon:   "text-yellow-600 dark:text-yellow-400",
    },
  },
  L0: {
    label: "Proxy Data",
    description: "Industry average or spend-based estimate. Least accurate — carbon score applied at 50% weight.",
    multiplier: "50%",
    icon: ShieldAlert,
    colors: {
      bg:     "bg-gray-50 dark:bg-gray-900/30",
      text:   "text-gray-600 dark:text-gray-400",
      border: "border-gray-200 dark:border-gray-700",
      icon:   "text-gray-400 dark:text-gray-500",
    },
  },
};

// ─── Component ────────────────────────────────────────────────────────────────

interface DataQualityBadgeProps {
  level: DataQualityLevel | string | null | undefined;
  /** Show a tooltip with level description and weight multiplier */
  showTooltip?: boolean;
  /** "sm" = compact chip only, "md" = chip + label (default) */
  size?: "sm" | "md";
  /** Additional class names */
  className?: string;
}

export function DataQualityBadge({
  level,
  showTooltip = true,
  size = "md",
  className = "",
}: DataQualityBadgeProps) {
  // Normalise unknown levels to L0
  const safeLevel: DataQualityLevel =
    level === "L3" || level === "L2" || level === "L1" || level === "L0"
      ? level
      : "L0";

  const cfg = BADGE_CONFIG[safeLevel];
  const Icon = cfg.icon;

  const badge = (
    <span
      className={[
        "inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 font-mono font-semibold",
        size === "sm" ? "text-[10px]" : "text-xs",
        cfg.colors.bg,
        cfg.colors.text,
        cfg.colors.border,
        className,
      ].join(" ")}
    >
      <Icon className={`shrink-0 ${size === "sm" ? "w-2.5 h-2.5" : "w-3 h-3"} ${cfg.colors.icon}`} />
      {size === "md" ? cfg.label : safeLevel}
    </span>
  );

  if (!showTooltip) return badge;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{badge}</TooltipTrigger>
        <TooltipContent className="max-w-[240px] space-y-1 p-3" side="top">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-semibold">{cfg.label}</p>
            <span className="text-xs text-muted-foreground font-mono">
              {cfg.multiplier} weight
            </span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {cfg.description}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ─── Data ladder summary (for supplier onboarding / profile pages) ────────────

interface DataLadderStepProps {
  level: DataQualityLevel;
  current: DataQualityLevel;
}

function DataLadderStep({ level, current }: DataLadderStepProps) {
  const cfg = BADGE_CONFIG[level];
  const Icon = cfg.icon;
  const levels: DataQualityLevel[] = ["L0", "L1", "L2", "L3"];
  const isReached = levels.indexOf(current) >= levels.indexOf(level);

  return (
    <div className={`flex items-start gap-2.5 ${isReached ? "opacity-100" : "opacity-40"}`}>
      <div className={`mt-0.5 rounded-full p-1 ${isReached ? cfg.colors.bg : "bg-muted"}`}>
        <Icon className={`w-3.5 h-3.5 ${isReached ? cfg.colors.icon : "text-muted-foreground"}`} />
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold font-mono text-muted-foreground">{level}</span>
          <span className="text-xs font-medium">{cfg.label}</span>
          {isReached && current === level && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
              Current
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">{cfg.description}</p>
      </div>
    </div>
  );
}

interface DataLadderProps {
  currentLevel: DataQualityLevel | string | null | undefined;
}

/**
 * Full Data Ladder display — shows all 4 levels with current progress.
 * Use on the supplier sustainability profile page.
 */
export function DataLadder({ currentLevel }: DataLadderProps) {
  const safeLevel: DataQualityLevel =
    currentLevel === "L3" || currentLevel === "L2" ||
    currentLevel === "L1" || currentLevel === "L0"
      ? currentLevel
      : "L0";

  return (
    <div className="space-y-3">
      {(["L3", "L2", "L1", "L0"] as DataQualityLevel[]).map((level) => (
        <DataLadderStep key={level} level={level} current={safeLevel} />
      ))}
    </div>
  );
}
