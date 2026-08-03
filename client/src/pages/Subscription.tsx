import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, X, Zap, MessageCircle, Video, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

export default function Subscription() {
  const [requestedTier, setRequestedTier] = useState<"standard" | "premium" | null>(null);
  const { data: subscription, isLoading: subLoading, error: subError } = trpc.microsoftSubscription.getMySubscription.useQuery(undefined, { retry: false });
  const { data: tier, isLoading: tierLoading, error: tierError } = trpc.microsoftSubscription.getMyTier.useQuery(undefined, { retry: false });
  const { data: usageStats } = trpc.messaging.getUserUsageStats.useQuery(undefined, { retry: false });

  const requestUpgrade = trpc.microsoftSubscription.requestUpgrade.useMutation({
    onSuccess: (result, variables) => {
      if (result.success) {
        setRequestedTier(variables.tier);
        toast.success("Upgrade request sent!", {
          description: "We'll email you an invoice with payment options within 1 business day.",
        });
      } else {
        toast.error("Could not send your upgrade request. Please try again or email founder@greenchainz.com.");
      }
    },
    onError: (err) => {
      toast.error(err.message || "Could not send your upgrade request.");
    },
  });

  if (subLoading || tierLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="h-32 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  const isUnauthorized =
    (subError as any)?.data?.code === "UNAUTHORIZED" ||
    (tierError as any)?.data?.code === "UNAUTHORIZED";

  if (isUnauthorized) {
    return (
      <div className="container mx-auto py-16 text-center">
        <Card className="max-w-md mx-auto">
          <CardContent className="py-12">
            <Zap className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Sign in to view your subscription</h2>
            <p className="text-muted-foreground">
              You need to be signed in to see your plan and usage details.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (subError || tierError) {
    return (
      <div className="container mx-auto py-16 text-center">
        <Card className="max-w-md mx-auto">
          <CardContent className="py-12">
            <p className="text-muted-foreground">
              {subError?.message ?? tierError?.message ?? "Something went wrong loading your subscription."}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const tierInfo = {
    free: {
      name: "Free",
      price: "$0",
      color: "bg-gray-500",
      features: [
        { text: "1 message per conversation", included: true },
        { text: "No video calling", included: false },
        { text: "Basic material search", included: true },
        { text: "RFQ submission", included: true },
      ],
    },
    standard: {
      name: "Standard",
      price: "$99/month",
      color: "bg-blue-500",
      features: [
        { text: "300 messages per month", included: true },
        { text: "15 hours WebRTC video per month", included: true },
        { text: "Advanced material search", included: true },
        { text: "Priority RFQ matching", included: true },
        { text: "Material swap recommendations", included: true },
      ],
    },
    premium: {
      name: "Premium",
      price: "$299/month",
      color: "bg-purple-500",
      features: [
        { text: "Unlimited messages", included: true },
        { text: "50 hours enterprise video per month", included: true },
        { text: "HD video quality + recording", included: true },
        { text: "Group video calls", included: true },
        { text: "Priority support", included: true },
        { text: "Custom integrations", included: true },
      ],
    },
  };

  const currentTier = tier || "free";
  const currentTierInfo = tierInfo[currentTier];

  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Current Subscription */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Your Subscription</CardTitle>
              <CardDescription>Manage your GreenChainz subscription</CardDescription>
            </div>
            <Badge className={`${currentTierInfo.color} text-white px-4 py-2 text-lg`}>
              {currentTierInfo.name}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {subscription ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <p className="font-medium capitalize">{subscription.status}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Price</p>
                  <p className="font-medium">{currentTierInfo.price}</p>
                </div>
                {subscription.startDate && (
                  <div>
                    <p className="text-sm text-muted-foreground">Start Date</p>
                    <p className="font-medium">
                      {new Date(subscription.startDate).toLocaleDateString()}
                    </p>
                  </div>
                )}
                {subscription.endDate && (
                  <div>
                    <p className="text-sm text-muted-foreground">Next Renewal</p>
                    <p className="font-medium">
                      {new Date(subscription.endDate).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">
                You're on the Free tier. Upgrade to unlock more features!
              </p>
            </div>
          )}

          {/* Usage Stats */}
          {usageStats && (
            <div className="border-t pt-4 mt-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Usage This Month
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <MessageCircle className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Messages</p>
                    <p className="font-medium">
                      {usageStats.messages.used} / {usageStats.messages.limit === null ? "∞" : usageStats.messages.limit}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Video className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Video Minutes</p>
                    <p className="font-medium">
                      {usageStats.video.hoursUsed} / {usageStats.video.hoursLimit === Infinity ? "∞" : usageStats.video.hoursLimit} hours
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pricing Tiers */}
      <div>
        <h2 className="text-2xl font-bold mb-6">Available Plans</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {Object.entries(tierInfo).map(([tierKey, info]) => (
            <Card
              key={tierKey}
              className={`relative ${currentTier === tierKey ? "border-2 border-primary" : ""}`}
            >
              {currentTier === tierKey && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-primary">Current Plan</Badge>
                </div>
              )}
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  {info.name}
                  <span className="text-2xl font-bold">{info.price}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2">
                  {info.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      {feature.included ? (
                        <Check className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                      ) : (
                        <X className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                      )}
                      <span className={feature.included ? "" : "text-muted-foreground"}>
                        {feature.text}
                      </span>
                    </li>
                  ))}
                </ul>

                {currentTier !== tierKey && tierKey !== "free" && (
                  <Button
                    className="w-full"
                    variant={tierKey === "premium" ? "default" : "outline"}
                    disabled={requestUpgrade.isPending || requestedTier === tierKey}
                    onClick={() => {
                      requestUpgrade.mutate({ tier: tierKey as "standard" | "premium" });
                    }}
                  >
                    {requestUpgrade.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : null}
                    {requestedTier === tierKey ? "Request Sent ✓" : "Upgrade"}
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Billing Info */}
      <Card>
        <CardHeader>
          <CardTitle>Billing Information</CardTitle>
          <CardDescription>
            Invoiced billing — no credit card required to get started
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            When you request an upgrade, our team emails you an invoice with payment
            options (bank transfer, card, or Microsoft AppSource). Your plan is
            activated as soon as payment is confirmed. For billing questions, invoices,
            or cancellations, email{" "}
            <a href="mailto:founder@greenchainz.com" className="underline">
              founder@greenchainz.com
            </a>
            .
          </p>
          <Button
            variant="outline"
            onClick={() => {
              window.location.href = "mailto:founder@greenchainz.com?subject=GreenChainz%20Billing";
            }}
          >
            Contact Billing
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
