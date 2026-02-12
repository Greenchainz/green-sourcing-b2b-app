import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { AlertCircle, TrendingUp, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

interface UsageCounterProps {
  dimension: "rfq_submissions" | "ai_queries" | "swap_analyses" | "ccps_exports" | "material_comparisons";
  label: string;
  onUpgradeClick?: () => void;
}

export function UsageCounter({ dimension, label, onUpgradeClick }: UsageCounterProps) {
  const { data: usage, isLoading: usageLoading } = trpc.subscription.getBuyerUsage.useQuery({
    dimension,
    period: "month",
  });

  const { data: limits, isLoading: limitsLoading } = trpc.subscription.getBuyerTierLimits.useQuery();

  if (usageLoading || limitsLoading) {
    return (
      <Card className="p-4">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
          <div className="h-2 bg-gray-200 rounded w-full"></div>
        </div>
      </Card>
    );
  }

  if (!usage || !limits) return null;

  const dimensionMap: Record<string, keyof typeof usage> = {
    rfq_submissions: "rfqSubmissions",
    ai_queries: "aiQueries",
    swap_analyses: "swapAnalyses",
    ccps_exports: "ccpsExports",
    material_comparisons: "materialComparisons",
  };

  const limitsMap: Record<string, string> = {
    rfq_submissions: "rfqsPerMonth",
    ai_queries: "aiQueriesPerMonth",
    swap_analyses: "swapAnalysesPerMonth",
    ccps_exports: "ccpsExportsPerMonth",
    material_comparisons: "materialComparisonsPerMonth",
  };

  const currentUsage = usage[dimensionMap[dimension]] || 0;
  const limit = (limits as any)[limitsMap[dimension]] || 0;
  const percentage = limit > 0 ? (currentUsage / limit) * 100 : 0;
  const remaining = Math.max(0, limit - currentUsage);

  const isNearLimit = percentage >= 80;
  const isAtLimit = percentage >= 100;

  return (
    <Card className="p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <Zap className={`w-4 h-4 ${isAtLimit ? "text-red-500" : isNearLimit ? "text-yellow-500" : "text-green-500"}`} />
          <h3 className="font-medium text-sm">{label}</h3>
        </div>
        {isNearLimit && (
          <AlertCircle className={`w-4 h-4 ${isAtLimit ? "text-red-500" : "text-yellow-500"}`} />
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-baseline justify-between text-sm">
          <span className="text-gray-600">
            <span className="text-lg font-bold text-gray-900">{currentUsage}</span> / {limit}
          </span>
          <span className="text-xs text-gray-500">{remaining} remaining</span>
        </div>

        <Progress 
          value={Math.min(percentage, 100)} 
          className={`h-2 ${isAtLimit ? "bg-red-100" : isNearLimit ? "bg-yellow-100" : "bg-green-100"}`}
        />

        {isAtLimit && onUpgradeClick && (
          <div className="pt-2 border-t">
            <p className="text-xs text-red-600 mb-2">You've reached your monthly limit</p>
            <Button
              size="sm"
              variant="default"
              className="w-full"
              onClick={onUpgradeClick}
            >
              <TrendingUp className="w-3 h-3 mr-1" />
              Upgrade Plan
            </Button>
          </div>
        )}

        {isNearLimit && !isAtLimit && onUpgradeClick && (
          <div className="pt-2 border-t">
            <p className="text-xs text-yellow-600 mb-2">Running low on usage</p>
            <Button
              size="sm"
              variant="outline"
              className="w-full"
              onClick={onUpgradeClick}
            >
              <TrendingUp className="w-3 h-3 mr-1" />
              View Plans
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}

// Dashboard widget showing all usage counters
export function UsageDashboard({ onUpgradeClick }: { onUpgradeClick?: () => void }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <UsageCounter
        dimension="rfq_submissions"
        label="RFQ Submissions"
        onUpgradeClick={onUpgradeClick}
      />
      <UsageCounter
        dimension="ai_queries"
        label="AI Queries"
        onUpgradeClick={onUpgradeClick}
      />
      <UsageCounter
        dimension="swap_analyses"
        label="Swap Analyses"
        onUpgradeClick={onUpgradeClick}
      />
      <UsageCounter
        dimension="ccps_exports"
        label="CCPS Exports"
        onUpgradeClick={onUpgradeClick}
      />
      <UsageCounter
        dimension="material_comparisons"
        label="Material Comparisons"
        onUpgradeClick={onUpgradeClick}
      />
    </div>
  );
}
