import { cn } from "@/lib/utils";
import {
  carbonEquivalences,
  formatCo2,
  type CarbonWinData,
  type EquivalenceKey,
} from "@shared/carbonWin";
import {
  ArrowRight,
  BadgeCheck,
  Car,
  Fuel,
  Home,
  Leaf,
  TreePine,
} from "lucide-react";
import { useEffect, useRef, useState, type ElementType } from "react";

const EQUIVALENCE_ICONS: Record<EquivalenceKey, ElementType> = {
  cars: Car,
  trees: TreePine,
  homes: Home,
  gas: Fuel,
};

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Ease-out count-up for the headline number. */
function useCountUp(target: number, enabled: boolean, durationMs = 1100): number {
  const [value, setValue] = useState(enabled ? 0 : target);
  const frame = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled || prefersReducedMotion()) {
      setValue(target);
      return;
    }
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(target * eased);
      if (t < 1) frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
    return () => {
      if (frame.current) cancelAnimationFrame(frame.current);
    };
  }, [target, enabled, durationMs]);

  return value;
}

export interface CarbonWinCardProps {
  data: CarbonWinData;
  animate?: boolean;
  className?: string;
}

/**
 * The shareable "Carbon Win" trophy. Brand lime-on-dark, animated headline,
 * real-world equivalences, and the winning supplier named front-and-center.
 */
export function CarbonWinCard({
  data,
  animate = true,
  className,
}: CarbonWinCardProps) {
  const co2 = formatCo2(data.co2SavedKg);
  const animatedKg = useCountUp(data.co2SavedKg, animate);
  const animatedCo2 = formatCo2(animatedKg);
  const equivalences = carbonEquivalences(data.co2SavedKg).slice(0, 3);
  const date = data.date ? new Date(data.date) : new Date();
  const dateStr = isNaN(date.getTime())
    ? ""
    : date.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-[#9FE870]/40 p-6 sm:p-8 text-white shadow-2xl",
        "bg-[radial-gradient(120%_120%_at_100%_0%,rgba(159,232,112,0.18)_0%,rgba(159,232,112,0)_45%),linear-gradient(135deg,#0a1310_0%,#122a1c_100%)]",
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-1.5 text-sm font-bold tracking-wide text-[#9FE870]">
          <Leaf className="h-4 w-4" />
          GreenChainz
        </span>
        <span className="flex items-center gap-1.5 rounded-full border border-[#9FE870]/30 bg-[#9FE870]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-[#9FE870]">
          <BadgeCheck className="h-3.5 w-3.5" />
          Verified Carbon Win
        </span>
      </div>

      {/* Headline */}
      <div className="mt-6 sm:mt-8">
        <div className="flex flex-wrap items-baseline gap-x-3">
          <span className="text-5xl font-extrabold leading-none tracking-tight sm:text-7xl">
            {animatedCo2.value}
          </span>
          <span className="text-xl font-extrabold text-[#9FE870] sm:text-3xl">
            {co2.unit}
          </span>
        </div>
        <p className="mt-2 text-sm text-white/60 sm:text-base">
          of embodied carbon avoided
        </p>
        {data.savingsPct && data.savingsPct > 0 ? (
          <span className="mt-3 inline-flex rounded-full bg-[#9FE870]/12 px-3 py-1 text-sm font-bold text-[#9FE870]">
            −{data.savingsPct}% vs baseline
          </span>
        ) : null}
      </div>

      {/* Swap line */}
      <div className="mt-6 space-y-1 border-t border-[#9FE870]/15 pt-5">
        <div className="flex flex-wrap items-center gap-2 text-sm sm:text-base">
          <span className="text-white/55 line-through decoration-white/30">
            {data.fromMaterial}
          </span>
          <ArrowRight className="h-4 w-4 shrink-0 text-[#9FE870]" />
          <span className="font-semibold text-white">{data.toMaterial}</span>
        </div>
        {data.supplier ? (
          <p className="text-sm text-white/60">
            Supplier:{" "}
            <span className="font-medium text-[#9FE870]">{data.supplier}</span>
          </p>
        ) : null}
        {data.project ? (
          <p className="text-sm text-white/50">Project: {data.project}</p>
        ) : null}
      </div>

      {/* Equivalences */}
      <div className="mt-6 grid grid-cols-3 gap-3">
        {equivalences.map((eq) => {
          const Icon = EQUIVALENCE_ICONS[eq.key];
          return (
            <div
              key={eq.key}
              className="rounded-xl border border-white/10 bg-black/20 p-3 text-center"
            >
              <Icon className="mx-auto mb-1.5 h-5 w-5 text-[#9FE870]" />
              <div className="text-xl font-extrabold sm:text-2xl">
                {eq.display}
              </div>
              <div className="mt-0.5 text-[11px] leading-tight text-white/55">
                {eq.label}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="mt-6 flex items-center justify-between border-t border-[#9FE870]/15 pt-4 text-[11px] text-white/45">
        <span>greenchainz.com — verified sustainable materials</span>
        {dateStr ? <span>{dateStr}</span> : null}
      </div>
    </div>
  );
}

export default CarbonWinCard;
