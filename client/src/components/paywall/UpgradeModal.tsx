import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check, X, Sparkles, Zap, Crown } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { toast } from "sonner";

interface UpgradeModalProps {
  open: boolean;
  onClose: () => void;
}

const TIER_FEATURES = {
  free: {
    name: "Free",
    price: "$0",
    priceDetail: undefined,
    badge: undefined,
    icon: Sparkles,
    color: "text-gray-600",
    bgColor: "bg-gray-50",
    features: [
      { name: "Material Catalog Access", included: true },
      { name: "CCPS Scoring", included: true },
      { name: "Basic Search", included: true },
      { name: "10 AI Queries/month", included: true },
      { name: "5 Swap Analyses/month", included: true },
      { name: "3 CCPS Exports/month", included: true },
      { name: "10 Material Comparisons/month", included: true },
      { name: "RFQ Submissions", included: false },
      { name: "Bid Comparison", included: false },
      { name: "Real-Time Messaging", included: false },
      { name: "Swap Recommendations", included: false },
      { name: "API Access", included: false },
    ],
  },
  standard: {
    name: "Standard",
    price: "$99",
    priceDetail: "/month",
    badge: undefined,
    icon: Zap,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    features: [
      { name: "Everything in Free", included: true },
      { name: "5 RFQ Submissions/month", included: true },
      { name: "25 AI Queries/month", included: true },
      { name: "20 Swap Analyses/month", included: true },
      { name: "10 CCPS Exports/month", included: true },
      { name: "50 Material Comparisons/month", included: true },
      { name: "Bid Comparison", included: true },
      { name: "Real-Time Messaging", included: true },
      { name: "Swap Recommendations", included: true },
      { name: "3 Team Seats", included: true },
      { name: "API Access", included: false },
    ],
  },
  premium: {
    name: "Premium",
    price: "$299",
    priceDetail: "/month",
    icon: Crown,
    color: "text-purple-600",
    bgColor: "bg-purple-50",
    badge: "Most Popular",
    features: [
      { name: "Everything in Standard", included: true },
      { name: "Unlimited RFQ Submissions", included: true },
      { name: "Unlimited AI Queries", included: true },
      { name: "Unlimited Swap Analyses", included: true },
      { name: "Unlimited CCPS Exports", included: true },
      { name: "Unlimited Material Comparisons", included: true },
      { name: "Priority Support", included: true },
      { name: "Bid Analytics Dashboard", included: true },
      { name: "API Access", included: true },
      { name: "10 Team Seats", included: true },
      { name: "Custom Integrations", included: true },
    ],
  },
};

export function UpgradeModal({ open, onClose }: UpgradeModalProps) {
  const { data: subscription } = trpc.subscription.getBuyerSubscription.useQuery();
  const upgradeMutation = trpc.subscription.upgradeBuyerSubscription.useMutation();
  const [selectedTier, setSelectedTier] = useState<"standard" | "premium" | null>(null);

  const currentTier = subscription?.tier || "free";

  const handleUpgrade = async (tier: "standard" | "premium") => {
    try {
      setSelectedTier(tier);
      
      // In production, this would redirect to Microsoft marketplace
      // For now, we'll just call the upgrade mutation
      await upgradeMutation.mutateAsync({
        tier,
        // These would come from Microsoft marketplace callback
        msSubscriptionId: undefined,
        msPlanId: undefined,
      });

      toast.success(`Successfully upgraded to ${tier} plan!`);
      onClose();
    } catch (error) {
      toast.error("Failed to upgrade. Please try again.");
      console.error(error);
    } finally {
      setSelectedTier(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center">
            Choose Your Plan
          </DialogTitle>
          <p className="text-center text-gray-600 mt-2">
            Upgrade to unlock more features and increase your limits
          </p>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
          {(["free", "standard", "premium"] as const).map((tier) => {
            const tierData = TIER_FEATURES[tier];
            const Icon = tierData.icon;
            const isCurrent = tier === currentTier;
            const canUpgrade = tier !== "free" && (
              (tier === "standard" && currentTier === "free") ||
              (tier === "premium" && (currentTier === "free" || currentTier === "standard"))
            );

            return (
              <div
                key={tier}
                className={`relative rounded-lg border-2 p-6 ${
                  isCurrent
                    ? "border-green-500 shadow-lg"
                    : canUpgrade
                    ? "border-gray-200 hover:border-blue-400 hover:shadow-md transition-all"
                    : "border-gray-100 opacity-60"
                }`}
              >
                {tierData.badge && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <span className="bg-purple-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                      {tierData.badge}
                    </span>
                  </div>
                )}

                {isCurrent && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <span className="bg-green-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                      Current Plan
                    </span>
                  </div>
                )}

                <div className={`${tierData.bgColor} rounded-lg p-4 mb-4`}>
                  <Icon className={`w-8 h-8 ${tierData.color} mb-2`} />
                  <h3 className="text-xl font-bold">{tierData.name}</h3>
                  <div className="mt-2">
                    <span className="text-3xl font-bold">{tierData.price}</span>
                    {tierData.priceDetail !== undefined && (
                      <span className="text-gray-600 text-sm">{tierData.priceDetail}</span>
                    )}
                  </div>
                </div>

                <ul className="space-y-2 mb-6">
                  {tierData.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      {feature.included ? (
                        <Check className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                      ) : (
                        <X className="w-4 h-4 text-gray-300 flex-shrink-0 mt-0.5" />
                      )}
                      <span className={feature.included ? "text-gray-900" : "text-gray-400"}>
                        {feature.name}
                      </span>
                    </li>
                  ))}
                </ul>

                {canUpgrade && (
                  <Button
                    className="w-full"
                    variant={tier === "premium" ? "default" : "outline"}
                    onClick={() => handleUpgrade(tier)}
                    disabled={selectedTier !== null}
                  >
                    {selectedTier === tier ? "Processing..." : `Upgrade to ${tierData.name}`}
                  </Button>
                )}

                {isCurrent && (
                  <Button className="w-full" variant="outline" disabled>
                    Current Plan
                  </Button>
                )}

                {!canUpgrade && !isCurrent && (
                  <Button className="w-full" variant="ghost" disabled>
                    Not Available
                  </Button>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-6 text-center text-sm text-gray-600">
          <p>
            All plans include access to our verified sustainable materials catalog.
            <br />
            Need a custom plan? <a href="mailto:sales@greenchainz.com" className="text-blue-600 hover:underline">Contact sales</a>
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
