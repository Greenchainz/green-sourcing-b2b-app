import { useState } from "react";
import { useParams, Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/contexts/AuthContext";
import { ScoreRing } from "@/components/MaterialCreditScore/ScoreRing";
import { ScoreBreakdown } from "@/components/MaterialCreditScore/ScoreBreakdown";
import { ScoreTrend } from "@/components/MaterialCreditScore/ScoreTrend";
import { PdfDownloadGateModal } from "@/components/PdfDownloadGateModal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  ShieldCheck,
  ExternalLink,
  CheckCircle2,
  Circle,
  Building2,
  Download,
} from "lucide-react";

// ── Improvement checklist ─────────────────────────────────────────────────────

interface CheckItem {
  label: string;
  done: boolean;
  impact: string;
}

function ImprovementChecklist({ items }: { items: CheckItem[] }) {
  const pending = items.filter((i) => !i.done);
  if (pending.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">How to Improve This Score</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.map((item) => (
          <div key={item.label} className="flex items-start gap-2.5">
            {item.done ? (
              <CheckCircle2 className="w-4 h-4 mt-0.5 text-green-500 shrink-0" />
            ) : (
              <Circle className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <p className={`text-sm ${item.done ? "line-through text-muted-foreground" : ""}`}>
                {item.label}
              </p>
              {!item.done && (
                <p className="text-xs text-muted-foreground">{item.impact}</p>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// ── Loading skeleton ──────────────────────────────────────────────────────────

function ScoreSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="flex items-center gap-6">
          <Skeleton className="w-40 h-40 rounded-full" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-5 w-24" />
          </div>
        </div>
        <Skeleton className="h-64 w-full rounded-lg" />
        <Skeleton className="h-32 w-full rounded-lg" />
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function MaterialCreditScorePage() {
  const { materialId } = useParams<{ materialId: string }>();
  const id = Number(materialId);
  const { isArchitect } = useAuth();

  const [gateOpen, setGateOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const consumeCredit = trpc.architect.consumeDownloadCredit.useMutation({
    onSuccess: () => {
      window.open(`/api/pdf/material-score/${id}`, "_blank");
      setIsDownloading(false);
    },
    onError: (err) => {
      if (err.data?.code === "FORBIDDEN") {
        setGateOpen(true);
      }
      setIsDownloading(false);
    },
  });

  const handleDownload = () => {
    setIsDownloading(true);
    consumeCredit.mutate({ materialId: id });
  };

  const { data, isLoading, error } = trpc.materials.getScore.useQuery(
    { materialId: id },
    { enabled: !isNaN(id) }
  );

  if (isNaN(id) || error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-3">
          <p className="text-muted-foreground">Material not found.</p>
          <Link href="/materials">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to catalog
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (isLoading) return <ScoreSkeleton />;
  if (!data) return null;

  const { total, breakdown, history, materialName, manufacturerName } = data;

  const improvementItems: CheckItem[] = [
    {
      label: "Upload a verified EPD from EC3 or EPD International",
      done: breakdown.epd.hasEpd,
      impact: "+15 to +30 pts — the single highest-impact action",
    },
    {
      label: "Add GWP and EC3 benchmark data",
      done: breakdown.carbon.gwp !== null && breakdown.carbon.median !== null,
      impact: "+up to 25 pts based on carbon performance",
    },
    {
      label: "Register at least 2 certifications (LEED, FSC, C2C, etc.)",
      done: breakdown.certifications.certNames.length >= 2,
      impact: "+8 pts for 2 certifications",
    },
    {
      label: "Confirm US manufacturing or set regional availability",
      done: breakdown.localSourcing.usManufactured || breakdown.localSourcing.miles !== null,
      impact: "+up to 15 pts",
    },
    {
      label: "Complete all product data fields (price, lead time, spec sheet…)",
      done: breakdown.transparency.filledFields >= breakdown.transparency.totalFields - 2,
      impact: "+up to 10 pts for full profile completeness",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Back nav */}
        <div className="flex items-center gap-3">
          <Link href={`/materials/${id}`}>
            <Button variant="ghost" size="sm" className="gap-1.5 -ml-2">
              <ArrowLeft className="w-4 h-4" />
              Material Detail
            </Button>
          </Link>
          <span className="text-muted-foreground text-sm">/</span>
          <span className="text-sm font-medium">Credit Score</span>
        </div>

        {/* Hero: score ring + material identity */}
        <Card>
          <CardContent className="pt-6 pb-5">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
              <ScoreRing score={total} size="lg" showLabel />
              <div className="flex-1 min-w-0 text-center sm:text-left space-y-2">
                <h1 className="text-xl font-bold leading-tight">{materialName}</h1>
                {manufacturerName && (
                  <div className="flex items-center gap-1.5 justify-center sm:justify-start text-muted-foreground">
                    <Building2 className="w-4 h-4 shrink-0" />
                    <span className="text-sm">{manufacturerName}</span>
                  </div>
                )}
                <div className="flex flex-wrap gap-2 justify-center sm:justify-start pt-1">
                  <Badge variant="secondary" className="text-xs">
                    MCS {total} / 100
                  </Badge>
                  {breakdown.epd.hasEpd && (
                    <Badge className="text-xs bg-green-600 hover:bg-green-700">
                      <ShieldCheck className="w-3 h-3 mr-1" />
                      EPD Verified
                    </Badge>
                  )}
                  {breakdown.localSourcing.usManufactured && (
                    <Badge variant="outline" className="text-xs border-blue-300 text-blue-700 bg-blue-50">
                      🇺🇸 US Made
                    </Badge>
                  )}
                </div>

                {/* Get EPD CTA */}
                {!breakdown.epd.hasEpd && (
                  <div className="mt-3 flex flex-col sm:flex-row gap-2">
                    <Link href="/supplier/submit-spec">
                      <Button size="sm" className="gap-1.5 w-full sm:w-auto">
                        <ShieldCheck className="w-4 h-4" />
                        Get EPD Verified (+30 pts)
                      </Button>
                    </Link>
                    <a
                      href="https://buildingtransparency.org"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button variant="outline" size="sm" className="gap-1.5 w-full sm:w-auto">
                        <ExternalLink className="w-4 h-4" />
                        Submit to EC3
                      </Button>
                    </a>
                  </div>
                )}

                {/* PDF download — architects only */}
                {isArchitect() && (
                  <div className="mt-3">
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 w-full sm:w-auto border-green-300 text-green-700 hover:bg-green-50 dark:border-green-700 dark:text-green-400 dark:hover:bg-green-900/20"
                      onClick={handleDownload}
                      disabled={isDownloading}
                    >
                      <Download className="w-4 h-4" />
                      {isDownloading ? "Preparing…" : "Download PDF Report"}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Score breakdown */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Score Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <ScoreBreakdown
              breakdown={breakdown}
              defaultValue={["epd", "carbon", "certifications", "localSourcing", "transparency"]}
            />
          </CardContent>
        </Card>

        {/* Trend */}
        <Card>
          <CardContent className="pt-5 pb-5 px-5">
            <ScoreTrend history={history} />
            <p className="text-[10px] text-muted-foreground mt-3 leading-relaxed">
              Historical scores are estimated from material data completeness over time. Verified monthly
              snapshots will appear once this product is enrolled in automated tracking.
            </p>
          </CardContent>
        </Card>

        {/* Improvement checklist */}
        <ImprovementChecklist items={improvementItems} />
      </div>

      {/* PDF download gate modal */}
      <PdfDownloadGateModal
        open={gateOpen}
        onOpenChange={setGateOpen}
        materialId={id}
        onCreditGranted={handleDownload}
      />
    </div>
  );
}
