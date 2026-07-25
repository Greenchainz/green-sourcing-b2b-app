/**
 * SmartRfxRecommendationCard
 *
 * Shows the classifier output: request type, confidence, reason, field list.
 * Buyer can override the type or click "Use this setup" to accept.
 */

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  FileText,
  DollarSign,
  ClipboardList,
  UserCheck,
  ArrowLeftRight,
  FolderOpen,
  Package,
  ChevronDown,
  CheckCircle2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// ─── Types (inlined to avoid extra imports — matches smart-rfx-classifier.ts) ─

export type RequestType =
  | "rfi"
  | "rfq_quote"
  | "rfp"
  | "supplier_qualification"
  | "alternative_material"
  | "submittal_documentation"
  | "bid_package";

export interface SupplierResponseField {
  key: string;
  label: string;
  fieldType: "text" | "number" | "currency" | "date" | "boolean" | "file" | "url" | "select";
  required: boolean;
  category: "commercial" | "sustainability" | "logistics" | "qualification" | "documentation" | "technical";
  helpText?: string;
}

export interface SmartRfxRecommendation {
  requestType: RequestType;
  confidence: number;
  reason: string;
  suggestedFields: SupplierResponseField[];
}

const TYPE_META: Record<
  RequestType,
  { label: string; shortLabel: string; icon: React.ElementType; color: string; bg: string }
> = {
  rfi: {
    label: "RFI — Request for Information",
    shortLabel: "RFI",
    icon: FileText,
    color: "text-blue-700 dark:text-blue-400",
    bg: "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800",
  },
  rfq_quote: {
    label: "RFQ — Request for Quote",
    shortLabel: "RFQ",
    icon: DollarSign,
    color: "text-green-700 dark:text-green-400",
    bg: "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800",
  },
  rfp: {
    label: "RFP — Request for Proposal",
    shortLabel: "RFP",
    icon: ClipboardList,
    color: "text-purple-700 dark:text-purple-400",
    bg: "bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800",
  },
  supplier_qualification: {
    label: "Supplier Qualification",
    shortLabel: "Qualification",
    icon: UserCheck,
    color: "text-orange-700 dark:text-orange-400",
    bg: "bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800",
  },
  alternative_material: {
    label: "Alternative Material Request",
    shortLabel: "Alternative",
    icon: ArrowLeftRight,
    color: "text-teal-700 dark:text-teal-400",
    bg: "bg-teal-50 dark:bg-teal-950/30 border-teal-200 dark:border-teal-800",
  },
  submittal_documentation: {
    label: "Submittal Documentation",
    shortLabel: "Submittal",
    icon: FolderOpen,
    color: "text-yellow-700 dark:text-yellow-400",
    bg: "bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200 dark:border-yellow-800",
  },
  bid_package: {
    label: "Bid Package",
    shortLabel: "Bid Package",
    icon: Package,
    color: "text-red-700 dark:text-red-400",
    bg: "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800",
  },
};

const CATEGORY_LABELS: Record<string, string> = {
  commercial: "Commercial",
  sustainability: "Sustainability",
  logistics: "Logistics",
  qualification: "Qualification",
  documentation: "Documentation",
  technical: "Technical",
};

interface Props {
  recommendation: SmartRfxRecommendation;
  onAccept: () => void;
  onChangeType: (type: RequestType) => void;
}

export function SmartRfxRecommendationCard({ recommendation, onAccept, onChangeType }: Props) {
  const { requestType, confidence, reason, suggestedFields } = recommendation;
  const meta = TYPE_META[requestType];
  const Icon = meta.icon;

  const confidencePct = Math.round(confidence * 100);

  // Group fields by category
  const byCategory = suggestedFields.reduce<Record<string, SupplierResponseField[]>>((acc, f) => {
    const cat = f.category;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(f);
    return acc;
  }, {});

  return (
    <Card className={`border-2 ${meta.bg}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg bg-white dark:bg-gray-900 shadow-sm`}>
              <Icon className={`w-6 h-6 ${meta.color}`} />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-0.5">
                Recommended Request Type
              </p>
              <CardTitle className={`text-xl ${meta.color}`}>{meta.label}</CardTitle>
            </div>
          </div>

          {/* Override dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="shrink-0">
                Change type <ChevronDown className="ml-1 w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {(Object.keys(TYPE_META) as RequestType[]).map((t) => {
                const m = TYPE_META[t];
                const TIcon = m.icon;
                return (
                  <DropdownMenuItem
                    key={t}
                    onClick={() => onChangeType(t)}
                    className="flex items-center gap-2"
                  >
                    <TIcon className="w-4 h-4 text-muted-foreground" />
                    {m.label}
                    {t === requestType && <CheckCircle2 className="w-3.5 h-3.5 ml-auto text-green-600" />}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Confidence bar */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Confidence</span>
            <span className="font-medium">{confidencePct}%</span>
          </div>
          <Progress value={confidencePct} className="h-1.5" />
        </div>

        {/* Reason */}
        <p className="text-sm text-muted-foreground leading-relaxed">{reason}</p>

        {/* Field list by category */}
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Supplier fields included ({suggestedFields.length})
          </p>
          {Object.entries(byCategory).map(([cat, fields]) => (
            <div key={cat}>
              <p className="text-xs font-medium text-muted-foreground mb-1.5">
                {CATEGORY_LABELS[cat] ?? cat}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {fields.map((f) => (
                  <Badge
                    key={f.key}
                    variant={f.required ? "default" : "secondary"}
                    className="text-xs"
                  >
                    {f.label}
                    {f.required && <span className="ml-1 text-red-400">*</span>}
                  </Badge>
                ))}
              </div>
            </div>
          ))}
        </div>

        <Button onClick={onAccept} className="w-full bg-green-600 hover:bg-green-700 text-white mt-2">
          <CheckCircle2 className="w-4 h-4 mr-2" />
          Use this setup — continue
        </Button>
      </CardContent>
    </Card>
  );
}
