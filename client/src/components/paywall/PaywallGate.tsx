import { ReactNode, useState } from "react";
import { trpc } from "@/lib/trpc";
import { UpgradeModal } from "./UpgradeModal";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lock, TrendingUp } from "lucide-react";
import { toast } from "sonner";

interface PaywallGateProps {
  feature?: string;
  dimension?: "rfq_submissions" | "ai_queries" | "swap_analyses" | "ccps_exports" | "material_comparisons";
  children: ReactNode;
  fallback?: ReactNode;
  mode?: "soft" | "hard"; // soft = show warning, hard = block completely
}

export function PaywallGate({
  feature,
  dimension,
  children,
  fallback,
  mode = "soft",
}: PaywallGateProps) {
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const { data: hasAccess, isLoading: accessLoading } = trpc.subscription.checkBuyerFeatureAccess.useQuery(
    {
      feature: feature || "",
    },
    {
      enabled: !!feature,
    }
  );

  const { data: usageCheck, isLoading: usageLoading } = trpc.subscription.checkUsageLimit.useQuery(
    {
      userType: "buyer",
      dimension: dimension || "rfq_submissions",
    },
    {
      enabled: !!dimension,
    }
  );

  if (accessLoading || (dimension && usageLoading)) {
    return (
      <div className="animate-pulse">
        <div className="h-32 bg-gray-200 rounded"></div>
      </div>
    );
  }

  // Feature access check
  if (hasAccess === false) {
    if (mode === "hard") {
      return (
        <>
          {fallback || (
            <Card className="p-8 text-center border-2 border-dashed border-gray-300">
              <Lock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2">Upgrade Required</h3>
              <p className="text-gray-600 mb-4">
                This feature is not available on your current plan.
              </p>
              <Button onClick={() => setShowUpgradeModal(true)}>
                <TrendingUp className="w-4 h-4 mr-2" />
                View Upgrade Options
              </Button>
            </Card>
          )}
          <UpgradeModal open={showUpgradeModal} onClose={() => setShowUpgradeModal(false)} />
        </>
      );
    }
  }

  // Usage limit check
  if (dimension && usageCheck && !usageCheck.allowed) {
    if (mode === "hard") {
      return (
        <>
          {fallback || (
            <Card className="p-8 text-center border-2 border-dashed border-yellow-300 bg-yellow-50">
              <Lock className="w-12 h-12 text-yellow-600 mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2">Usage Limit Reached</h3>
              <p className="text-gray-600 mb-2">
                You've used {usageCheck.current} of {usageCheck.limit} {dimension.replace(/_/g, " ")} this month.
              </p>
              <p className="text-sm text-gray-500 mb-4">
                Upgrade to increase your monthly limit
              </p>
              <Button onClick={() => setShowUpgradeModal(true)}>
                <TrendingUp className="w-4 h-4 mr-2" />
                Upgrade for More
              </Button>
            </Card>
          )}
          <UpgradeModal open={showUpgradeModal} onClose={() => setShowUpgradeModal(false)} />
        </>
      );
    } else {
      // Soft gate - show warning toast but allow access
      toast.warning(`You've reached your ${dimension.replace(/_/g, " ")} limit for this month`, {
        description: "Consider upgrading for unlimited access",
        action: {
          label: "Upgrade",
          onClick: () => setShowUpgradeModal(true),
        },
      });
    }
  }

  return (
    <>
      {children}
      <UpgradeModal open={showUpgradeModal} onClose={() => setShowUpgradeModal(false)} />
    </>
  );
}

// Utility hook for programmatic paywall checks
export function usePaywallCheck() {
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const utils = trpc.useUtils();

  const checkAccess = async (feature: string): Promise<boolean> => {
    try {
      const result = await utils.subscription.checkBuyerFeatureAccess.fetch({ feature });
      if (!result) {
        toast.error("This feature is not available on your current plan", {
          action: {
            label: "Upgrade",
            onClick: () => setShowUpgradeModal(true),
          },
        });
        return false;
      }
      return true;
    } catch (error) {
      console.error("Feature access check failed:", error);
      return false;
    }
  };

  const checkUsage = async (
    dimension: "rfq_submissions" | "ai_queries" | "swap_analyses" | "ccps_exports" | "material_comparisons"
  ): Promise<boolean> => {
    try {
      const result = await utils.subscription.checkUsageLimit.fetch({
        userType: "buyer",
        dimension,
      });
      if (!result.allowed) {
        toast.warning(`You've reached your ${dimension.replace(/_/g, " ")} limit`, {
          description: `Used ${result.current} of ${result.limit} this month`,
          action: {
            label: "Upgrade",
            onClick: () => setShowUpgradeModal(true),
          },
        });
        return false;
      }
      return true;
    } catch (error) {
      console.error("Usage limit check failed:", error);
      return false;
    }
  };

  return {
    checkAccess,
    checkUsage,
    showUpgradeModal,
    setShowUpgradeModal,
  };
}
