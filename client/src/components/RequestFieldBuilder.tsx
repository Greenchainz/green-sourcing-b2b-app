/**
 * RequestFieldBuilder
 *
 * Allows buyers to toggle required/optional fields and adjust scoring weights
 * before submitting a sourcing request.
 * Works with the field schema produced by the smart-rfx-classifier.
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  ChevronDown,
  ChevronUp,
  Settings2,
  Scale,
  RotateCcw,
} from "lucide-react";
import type { SupplierResponseField, RequestType } from "./SmartRfxRecommendationCard";

export interface ScoringWeights {
  price: number;
  carbon: number;
  leadTime: number;
  documentation: number;
  certifications: number;
}

export const DEFAULT_WEIGHTS: ScoringWeights = {
  price: 0.30,
  carbon: 0.30,
  leadTime: 0.15,
  documentation: 0.15,
  certifications: 0.10,
};

const WEIGHT_LABELS: Record<keyof ScoringWeights, string> = {
  price: "Price",
  carbon: "Embodied Carbon",
  leadTime: "Lead Time",
  documentation: "Documentation",
  certifications: "Certifications",
};

const CATEGORY_LABELS: Record<string, string> = {
  commercial: "💰 Commercial",
  sustainability: "🌿 Sustainability",
  logistics: "🚚 Logistics",
  qualification: "🏅 Qualification",
  documentation: "📄 Documentation",
  technical: "⚙️ Technical",
};

interface Props {
  fields: SupplierResponseField[];
  weights: ScoringWeights;
  onFieldsChange: (fields: SupplierResponseField[]) => void;
  onWeightsChange: (weights: ScoringWeights) => void;
}

export function RequestFieldBuilder({
  fields,
  weights,
  onFieldsChange,
  onWeightsChange,
}: Props) {
  const [weightsOpen, setWeightsOpen] = useState(false);

  // Group fields by category
  const byCategory = fields.reduce<Record<string, SupplierResponseField[]>>((acc, f) => {
    if (!acc[f.category]) acc[f.category] = [];
    acc[f.category].push(f);
    return acc;
  }, {});

  const toggleRequired = (key: string) => {
    onFieldsChange(
      fields.map((f) =>
        f.key === key ? { ...f, required: !f.required } : f
      )
    );
  };

  const toggleEnabled = (key: string) => {
    // "Remove" a field by filtering it out; not possible to re-add in this simple UI
    onFieldsChange(fields.filter((f) => f.key !== key));
  };

  const totalWeight = Object.values(weights).reduce((s, v) => s + v, 0);

  const setWeight = (key: keyof ScoringWeights, pct: number) => {
    onWeightsChange({ ...weights, [key]: pct / 100 });
  };

  const resetWeights = () => onWeightsChange(DEFAULT_WEIGHTS);

  return (
    <div className="space-y-4">
      {/* Field toggles */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Settings2 className="w-4 h-4 text-green-600" />
            Supplier response fields
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Toggle fields on/off and mark which are required. Suppliers see exactly these fields.
          </p>
        </CardHeader>
        <CardContent className="space-y-5">
          {Object.entries(byCategory).map(([cat, catFields]) => (
            <div key={cat}>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                {CATEGORY_LABELS[cat] ?? cat}
              </p>
              <div className="space-y-2">
                {catFields.map((f) => (
                  <div
                    key={f.key}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border/50 bg-muted/20 px-3 py-2"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{f.label}</p>
                      {f.helpText && (
                        <p className="text-xs text-muted-foreground truncate">{f.helpText}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {/* Required toggle */}
                      <div className="flex items-center gap-1.5">
                        <Label
                          htmlFor={`req-${f.key}`}
                          className="text-xs text-muted-foreground cursor-pointer"
                        >
                          Required
                        </Label>
                        <Switch
                          id={`req-${f.key}`}
                          checked={f.required}
                          onCheckedChange={() => toggleRequired(f.key)}
                          className="scale-75"
                        />
                      </div>

                      {/* Enabled toggle */}
                      <div className="flex items-center gap-1.5">
                        <Label
                          htmlFor={`en-${f.key}`}
                          className="text-xs text-muted-foreground cursor-pointer"
                        >
                          Include
                        </Label>
                        <Switch
                          id={`en-${f.key}`}
                          checked={true}
                          onCheckedChange={() => toggleEnabled(f.key)}
                          className="scale-75"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Scoring weights */}
      <Card>
        <Collapsible open={weightsOpen} onOpenChange={setWeightsOpen}>
          <CollapsibleTrigger asChild>
            <CardHeader className="pb-2 cursor-pointer hover:bg-muted/20 rounded-t-lg transition-colors">
              <CardTitle className="text-base flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Scale className="w-4 h-4 text-green-600" />
                  Scoring weights
                  <Badge variant="secondary" className="text-xs">
                    {Math.round(totalWeight * 100)}% total
                  </Badge>
                  {Math.round(totalWeight * 100) !== 100 && (
                    <span className="text-xs text-amber-600">⚠ should sum to 100%</span>
                  )}
                </span>
                {weightsOpen ? (
                  <ChevronUp className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                )}
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                How GreenChainz scores and ranks supplier responses
              </p>
            </CardHeader>
          </CollapsibleTrigger>

          <CollapsibleContent>
            <CardContent className="pt-0 space-y-4">
              <Separator />
              {(Object.keys(weights) as (keyof ScoringWeights)[]).map((key) => {
                const pct = Math.round(weights[key] * 100);
                return (
                  <div key={key} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <Label className="font-medium">{WEIGHT_LABELS[key]}</Label>
                      <span className="text-muted-foreground font-mono">{pct}%</span>
                    </div>
                    <Slider
                      value={[pct]}
                      min={0}
                      max={50}
                      step={5}
                      onValueChange={([v]) => setWeight(key, v)}
                      className="w-full"
                    />
                  </div>
                );
              })}
              <Button
                variant="ghost"
                size="sm"
                onClick={resetWeights}
                className="text-xs text-muted-foreground"
              >
                <RotateCcw className="w-3 h-3 mr-1" />
                Reset to defaults
              </Button>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>
    </div>
  );
}
