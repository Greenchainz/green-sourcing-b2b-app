import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ShieldCheck, Wind, Award, MapPin, Eye, Info } from "lucide-react";

export interface McsBreakdown {
  epd: { score: number; max: number; hasEpd: boolean; hasEpdNumber: boolean };
  carbon: { score: number; max: number; gwp: number | null; median: number | null; bestPractice: number | null };
  certifications: { score: number; max: number; certNames: string[] };
  localSourcing: { score: number; max: number; miles: number | null; usManufactured: boolean };
  transparency: { score: number; max: number; filledFields: number; totalFields: number };
}

const TIPS: Record<string, string> = {
  epd: "Upload a verified EPD from EC3 or EPD International to earn full points. An EPD number on file earns partial credit.",
  carbon: "GWP performance is scored against the EC3 industry median and best practice benchmarks for your material category.",
  certifications: "Each unique certification (LEED, FSC, Cradle to Cradle, GREENGUARD, Declare, HPD) earns 4 points up to a maximum of 20.",
  localSourcing: "Materials available within 100 miles score near full points. US-manufactured materials earn a 3-point bonus.",
  transparency: "Complete all product data fields — GWP, price, lead time, spec sheet, EPD URL, recycled content — to maximize this score.",
};

interface DimensionRowProps {
  value: string;
  icon: React.ReactNode;
  label: string;
  score: number;
  max: number;
  detail: React.ReactNode;
  tip: string;
}

function DimensionRow({ value, icon, label, score, max, detail, tip }: DimensionRowProps) {
  const pct = Math.round((score / max) * 100);
  const color = pct >= 80 ? "text-green-600" : pct >= 50 ? "text-amber-600" : "text-red-500";

  return (
    <AccordionItem value={value} className="border-b border-border/40 last:border-0">
      <AccordionTrigger className="hover:no-underline py-3 px-1">
        <div className="flex items-center gap-3 flex-1 text-left">
          <span className="shrink-0 text-muted-foreground">{icon}</span>
          <span className="text-sm font-medium flex-1">{label}</span>
          <span className={`text-sm font-bold tabular-nums ${color} mr-1`}>
            {score}<span className="text-muted-foreground font-normal text-xs">/{max}</span>
          </span>
        </div>
      </AccordionTrigger>
      <AccordionContent className="px-1 pb-3">
        <Progress value={pct} className="h-2 mb-3" />
        <div className="text-xs text-muted-foreground mb-2">{detail}</div>
        <div className="flex items-start gap-1.5 bg-muted/40 rounded-md p-2">
          <Info className="w-3 h-3 mt-0.5 shrink-0 text-muted-foreground" />
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="text-xs text-muted-foreground cursor-help underline decoration-dotted">
                What improves this score?
              </span>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs text-xs leading-relaxed">{tip}</TooltipContent>
          </Tooltip>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}

interface ScoreBreakdownProps {
  breakdown: McsBreakdown;
  defaultValue?: string[];
}

export function ScoreBreakdown({ breakdown, defaultValue }: ScoreBreakdownProps) {
  return (
    <Accordion type="multiple" defaultValue={defaultValue} className="w-full">
      <DimensionRow
        value="epd"
        icon={<ShieldCheck className="w-4 h-4" />}
        label="EPD Verified"
        score={breakdown.epd.score}
        max={breakdown.epd.max}
        tip={TIPS.epd}
        detail={
          breakdown.epd.hasEpd
            ? "Third-party verified EPD on file — full points awarded."
            : breakdown.epd.hasEpdNumber
            ? "EPD number on file but not fully verified. Upload to EC3 for full credit."
            : "No EPD found. Submit an EPD through the supplier portal to earn up to 30 points."
        }
      />

      <DimensionRow
        value="carbon"
        icon={<Wind className="w-4 h-4" />}
        label="Carbon Performance"
        score={breakdown.carbon.score}
        max={breakdown.carbon.max}
        tip={TIPS.carbon}
        detail={
          breakdown.carbon.gwp !== null && breakdown.carbon.median !== null ? (
            <span>
              GWP: <strong>{breakdown.carbon.gwp.toFixed(3)}</strong> · Industry median:{" "}
              <strong>{breakdown.carbon.median.toFixed(3)}</strong>
              {breakdown.carbon.bestPractice !== null && (
                <> · Best practice: <strong>{breakdown.carbon.bestPractice.toFixed(3)}</strong></>
              )}
            </span>
          ) : (
            "GWP data or EC3 benchmarks not available. Add verified GWP data to score this dimension."
          )
        }
      />

      <DimensionRow
        value="certifications"
        icon={<Award className="w-4 h-4" />}
        label="Certifications"
        score={breakdown.certifications.score}
        max={breakdown.certifications.max}
        tip={TIPS.certifications}
        detail={
          breakdown.certifications.certNames.length > 0 ? (
            <span>Verified: {breakdown.certifications.certNames.join(", ")}</span>
          ) : (
            "No certifications on file. Add LEED, FSC, C2C, GREENGUARD, Declare, or HPD to earn points."
          )
        }
      />

      <DimensionRow
        value="localSourcing"
        icon={<MapPin className="w-4 h-4" />}
        label="Local Sourcing"
        score={breakdown.localSourcing.score}
        max={breakdown.localSourcing.max}
        tip={TIPS.localSourcing}
        detail={
          <span>
            {breakdown.localSourcing.miles !== null
              ? `Available within ${breakdown.localSourcing.miles} miles`
              : "Regional availability not specified"}
            {breakdown.localSourcing.usManufactured && " · 🇺🇸 US Manufactured (+3 pts)"}
          </span>
        }
      />

      <DimensionRow
        value="transparency"
        icon={<Eye className="w-4 h-4" />}
        label="Transparency"
        score={breakdown.transparency.score}
        max={breakdown.transparency.max}
        tip={TIPS.transparency}
        detail={
          <span>
            {breakdown.transparency.filledFields}/{breakdown.transparency.totalFields} data fields complete
          </span>
        }
      />
    </Accordion>
  );
}
