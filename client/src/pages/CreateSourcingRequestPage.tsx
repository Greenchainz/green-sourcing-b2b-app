/**
 * CreateSourcingRequestPage — /buyer/new-request
 *
 * Smart RFx Builder entry point.
 * Buyer describes what they need → GreenChainz classifies → buyer reviews fields
 * → buyer submits as a structured sourcing request.
 *
 * Flow:
 *   DESCRIBE → RECOMMEND → CUSTOMIZE → SUBMIT
 */

import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/contexts/AuthContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Loader2,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import {
  SmartRfxRecommendationCard,
  type SmartRfxRecommendation,
  type RequestType,
  type SupplierResponseField,
} from "@/components/SmartRfxRecommendationCard";
import {
  RequestFieldBuilder,
  DEFAULT_WEIGHTS,
  type ScoringWeights,
} from "@/components/RequestFieldBuilder";

const REQUEST_TYPE_DISPLAY: Record<string, string> = {
  rfi:                     "RFI — Request for Information",
  rfq_quote:               "RFQ — Request for Quote",
  rfp:                     "RFP — Request for Proposal",
  supplier_qualification:  "Supplier Qualification Request",
  alternative_material:    "Alternative Material Request",
  submittal_documentation: "Submittal Documentation Request",
  bid_package:             "Bid Package",
};

const WEIGHT_LABELS: Record<string, string> = {
  price:         "Price",
  carbon:        "Embodied Carbon",
  leadTime:      "Lead Time",
  documentation: "Documentation",
  certifications:"Certifications",
};

// ─── Steps ───────────────────────────────────────────────────────────────────

type Step = "describe" | "recommend" | "customize" | "submit";

const STEPS: { id: Step; label: string }[] = [
  { id: "describe",  label: "Describe" },
  { id: "recommend", label: "Classify" },
  { id: "customize", label: "Customize" },
  { id: "submit",    label: "Submit" },
];

// ─── Example prompts ─────────────────────────────────────────────────────────

const EXAMPLES = [
  "I need low-carbon ready-mix concrete within 150 miles of Richmond, VA. Need EPDs, Buy Clean compliance, pricing, and lead time.",
  "Looking for a low-carbon alternative to standard steel studs for an office retrofit in Austin, TX. EPDs required.",
  "Need to qualify sustainable insulation suppliers for a LEED Platinum project — interested in certifications, insurance, and references.",
  "Request for proposals: design-assist framing system for a mass timber project in Seattle. Full sustainability package required.",
];

// ─── Page component ───────────────────────────────────────────────────────────

export default function CreateSourcingRequestPage() {
  const [, navigate] = useLocation();
  useAuth();

  // Step state
  const [step, setStep] = useState<Step>("describe");

  // Form state
  const [description, setDescription] = useState("");
  const [projectName, setProjectName] = useState("");
  const [projectLocation, setProjectLocation] = useState("");
  const [recommendation, setRecommendation] = useState<SmartRfxRecommendation | null>(null);
  const [fields, setFields] = useState<SupplierResponseField[]>([]);
  const [weights, setWeights] = useState<ScoringWeights>(DEFAULT_WEIGHTS);
  const [overriddenType, setOverriddenType] = useState<RequestType | null>(null);

  // tRPC
  const recommendQuery = trpc.sourcingRequest.recommend.useQuery(
    { description: description.trim() },
    {
      enabled: false,
      retry: false,
    }
  );

  const createMutation = trpc.sourcingRequest.create.useMutation({
    onSuccess: ({ rfqId }) => {
      toast.success("Sourcing request created!");
      navigate(`/buyer/requests/${rfqId}`);
    },
    onError: (err) => toast.error(err.message ?? "Failed to create request"),
  });

  // Imperative fetcher avoids stale-closure issues with state-derived query inputs
  const utils = trpc.useUtils();

  // ─── Handlers ──────────────────────────────────────────────────────────────

  const handleClassify = async () => {
    if (!projectName.trim()) {
      toast.error("Project name is required before continuing");
      return;
    }
    if (description.trim().length < 10) {
      toast.error("Please describe your need in at least 10 characters");
      return;
    }
    const result = await recommendQuery.refetch();
    if (result.data) {
      setRecommendation(result.data as SmartRfxRecommendation);
      setFields(result.data.suggestedFields as SupplierResponseField[]);
      setStep("recommend");
    }
  };

  const handleAcceptRecommendation = () => {
    setStep("customize");
  };

  const handleChangeType = async (type: RequestType) => {
    setOverriddenType(type);
    // Fetch with the new `type` directly — avoids stale closure on `overriddenType`
    const data = await utils.sourcingRequest.getDefaultFields.fetch({ requestType: type });
    if (data) {
      setFields(data as SupplierResponseField[]);
      setRecommendation((prev) =>
        prev ? { ...prev, requestType: type, confidence: 1, reason: "Manually selected" } : null
      );
    }
  };

  const handleSubmit = async () => {
    if (!projectName.trim()) {
      toast.error("Project name is required");
      return;
    }
    if (fields.length === 0) {
      toast.error("At least one supplier response field is required");
      return;
    }

    await createMutation.mutateAsync({
      projectName: projectName.trim(),
      projectLocation: projectLocation.trim() || undefined,
      notes: description.trim(),
      requestType: (recommendation?.requestType ?? "rfq_quote") as RequestType,
      responseFieldSchema: fields,
      scoringWeights: weights,
    });
  };

  // ─── Step indicator ────────────────────────────────────────────────────────

  const stepIdx = STEPS.findIndex((s) => s.id === step);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-8 space-y-8">

        {/* Header */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-5 h-5 text-green-600" />
            <h1 className="text-2xl font-bold">Smart RFx Builder</h1>
          </div>
          <p className="text-muted-foreground">
            Describe your material need. GreenChainz recommends the right request type and
            generates supplier-ready fields for pricing, EPDs, certifications, and lead times.
          </p>
        </div>

        {/* Step indicators */}
        <div className="flex items-center gap-1">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center gap-1">
              <div
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  i < stepIdx
                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                    : i === stepIdx
                    ? "bg-green-600 text-white"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {i < stepIdx ? (
                  <CheckCircle2 className="w-3 h-3" />
                ) : (
                  <span>{i + 1}</span>
                )}
                {s.label}
              </div>
              {i < STEPS.length - 1 && (
                <div className={`h-0.5 w-4 ${i < stepIdx ? "bg-green-400" : "bg-border"}`} />
              )}
            </div>
          ))}
        </div>

        {/* ── Step 1: Describe ────────────────────────────────────────────── */}
        {step === "describe" && (
          <div className="space-y-6">
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="description" className="text-base font-semibold">
                    Describe what you need
                  </Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="e.g. I need low-carbon ready-mix concrete within 150 miles of Richmond, VA with EPDs, Buy Clean compliance, pricing, and lead time..."
                    rows={5}
                    maxLength={2000}
                    className="resize-none text-base"
                  />
                  <p className="text-xs text-muted-foreground text-right">
                    {description.length}/2000
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="projectName" className="text-sm font-medium">
                    Project name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="projectName"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    placeholder="e.g. Midtown Office Tower — Structural Package"
                    maxLength={255}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="projectLocation" className="text-sm font-medium">
                    Project location
                  </Label>
                  <Input
                    id="projectLocation"
                    value={projectLocation}
                    onChange={(e) => setProjectLocation(e.target.value)}
                    placeholder="e.g. Richmond, VA"
                    maxLength={255}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Example prompts */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Try an example
              </p>
              <div className="space-y-2">
                {EXAMPLES.map((ex) => (
                  <button
                    key={ex}
                    type="button"
                    onClick={() => setDescription(ex)}
                    className="w-full text-left text-sm border border-border rounded-lg px-3 py-2 hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground"
                  >
                    "{ex}"
                  </button>
                ))}
              </div>
            </div>

            <Button
              onClick={handleClassify}
              disabled={description.trim().length < 10 || recommendQuery.isFetching}
              className="w-full bg-green-600 hover:bg-green-700 text-white py-6 text-base"
            >
              {recommendQuery.isFetching ? (
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
              ) : (
                <Sparkles className="w-5 h-5 mr-2" />
              )}
              Generate Smart Request
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        )}

        {/* ── Step 2: Recommend ───────────────────────────────────────────── */}
        {step === "recommend" && recommendation && (
          <div className="space-y-4">
            <SmartRfxRecommendationCard
              recommendation={recommendation}
              onAccept={handleAcceptRecommendation}
              onChangeType={handleChangeType}
            />

            <Button
              variant="ghost"
              onClick={() => setStep("describe")}
              className="text-muted-foreground"
            >
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              Edit description
            </Button>
          </div>
        )}

        {/* ── Step 3: Customize ───────────────────────────────────────────── */}
        {step === "customize" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-lg">Customize request</h2>
                <p className="text-sm text-muted-foreground">
                  Toggle fields and adjust scoring weights for supplier responses.
                </p>
              </div>
              <Badge variant="outline" className="text-sm">
                {fields.length} fields
              </Badge>
            </div>

            <RequestFieldBuilder
              fields={fields}
              weights={weights}
              onFieldsChange={setFields}
              onWeightsChange={setWeights}
            />

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep("recommend")} className="flex-1">
                <ArrowLeft className="w-4 h-4 mr-1.5" />
                Back
              </Button>
              <Button
                onClick={() => setStep("submit")}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                disabled={fields.length === 0}
              >
                Review & submit
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 4: Submit ──────────────────────────────────────────────── */}
        {step === "submit" && recommendation && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Review before submitting</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs mb-0.5">Project</p>
                    <p className="font-medium">{projectName}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs mb-0.5">Location</p>
                    <p className="font-medium">{projectLocation || "—"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs mb-0.5">Request type</p>
                    <p className="font-medium">
                      {REQUEST_TYPE_DISPLAY[recommendation.requestType] ?? recommendation.requestType.replace(/_/g, " ")}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs mb-0.5">Fields</p>
                    <p className="font-medium">{fields.length} ({fields.filter((f) => f.required).length} required)</p>
                  </div>
                </div>

                <Separator />

                <div>
                  <p className="text-muted-foreground text-xs mb-1.5">Description</p>
                  <p className="text-sm bg-muted/30 rounded-md px-3 py-2 leading-relaxed">
                    {description}
                  </p>
                </div>

                <div>
                  <p className="text-muted-foreground text-xs mb-1.5">Scoring weights</p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(weights).map(([k, v]) => (
                      <Badge key={k} variant="secondary" className="text-xs">
                        {WEIGHT_LABELS[k as keyof typeof WEIGHT_LABELS] ?? k}: {Math.round(v * 100)}%
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {createMutation.isError && (
              <Alert variant="destructive">
                <AlertCircle className="w-4 h-4" />
                <AlertDescription>{createMutation.error?.message}</AlertDescription>
              </Alert>
            )}

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep("customize")} className="flex-1">
                <ArrowLeft className="w-4 h-4 mr-1.5" />
                Back
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={createMutation.isPending}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
              >
                {createMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                )}
                Submit sourcing request
              </Button>
            </div>
          </div>
        )}

      </main>

      <Footer />
    </div>
  );
}
