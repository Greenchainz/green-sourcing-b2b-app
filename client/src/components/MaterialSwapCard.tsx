import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { ArrowDownRight, ArrowUpRight, Leaf, DollarSign, Clock, TrendingDown, Sparkles, ShoppingCart } from "lucide-react";
import { Link } from "wouter";

interface MaterialSwapCardProps {
  swap: {
    id: number;
    name: string;
    manufacturer: string | null;
    tier: "good" | "better" | "best";
    score: number;
    confidence: string;
    reason: string | null;
    embodiedCarbon: string;
    price: string;
    leadTime: string;
    source: string;
  };
  originalCarbon: number;
  originalPrice?: number;
  onAddToRfq?: (materialId: number) => void;
}

const TIER_CONFIG = {
  good: {
    label: "Good",
    color: "bg-blue-500",
    textColor: "text-blue-700",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    icon: "✓",
  },
  better: {
    label: "Better",
    color: "bg-purple-500",
    textColor: "text-purple-700",
    bgColor: "bg-purple-50",
    borderColor: "border-purple-200",
    icon: "✓✓",
  },
  best: {
    label: "Best",
    color: "bg-green-500",
    textColor: "text-green-700",
    bgColor: "bg-green-50",
    borderColor: "border-green-200",
    icon: "★",
  },
};

export default function MaterialSwapCard({ swap, originalCarbon, originalPrice, onAddToRfq }: MaterialSwapCardProps) {
  const tierConfig = TIER_CONFIG[swap.tier];
  const swapCarbon = parseFloat(swap.embodiedCarbon.split(" ")[0]);
  const carbonDelta = originalCarbon - swapCarbon;
  const carbonDeltaPct = originalCarbon > 0 ? ((carbonDelta / originalCarbon) * 100).toFixed(1) : "0";
  
  const swapPrice = parseFloat(swap.price.split(" ")[0].replace("$", ""));
  const priceDelta = originalPrice && swapPrice ? swapPrice - originalPrice : null;
  const priceDeltaPct = originalPrice && priceDelta !== null ? ((priceDelta / originalPrice) * 100).toFixed(1) : null;

  return (
    <Card className={`border-2 ${tierConfig.borderColor} ${tierConfig.bgColor} hover:shadow-lg transition-shadow`}>
      <CardContent className="p-5">
        {/* Tier Badge */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <Badge className={`${tierConfig.color} text-white font-semibold px-3 py-1`}>
              {tierConfig.icon} {tierConfig.label} Tier
            </Badge>
            <Badge variant="outline" className="text-xs">
              Score: {swap.score}/100
            </Badge>
          </div>
          {swap.source === "saved" && (
            <Badge variant="secondary" className="text-xs">
              <Sparkles className="w-3 h-3 mr-1" />
              Verified
            </Badge>
          )}
        </div>

        {/* Material Info */}
        <Link href={`/materials/${swap.id}`}>
          <h3 className="text-lg font-bold text-foreground hover:text-primary cursor-pointer mb-1">
            {swap.name}
          </h3>
        </Link>
        {swap.manufacturer && (
          <p className="text-sm text-muted-foreground mb-3">by {swap.manufacturer}</p>
        )}

        {/* Swap Reason */}
        {swap.reason && (
          <p className="text-sm text-muted-foreground mb-4 italic border-l-2 border-muted pl-3">
            {swap.reason}
          </p>
        )}

        {/* Comparison Metrics */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          {/* Carbon Savings */}
          <div className="p-3 bg-white/50 rounded-lg border border-border/30">
            <div className="flex items-center gap-1.5 mb-1">
              <Leaf className="w-4 h-4 text-green-600" />
              <span className="text-xs font-medium text-muted-foreground">Carbon</span>
            </div>
            <div className="flex items-baseline gap-1">
              {carbonDelta > 0 ? (
                <>
                  <TrendingDown className="w-4 h-4 text-green-600" />
                  <span className="text-lg font-bold text-green-600">-{carbonDeltaPct}%</span>
                </>
              ) : carbonDelta < 0 ? (
                <>
                  <ArrowUpRight className="w-4 h-4 text-red-600" />
                  <span className="text-lg font-bold text-red-600">+{Math.abs(parseFloat(carbonDeltaPct))}%</span>
                </>
              ) : (
                <span className="text-lg font-bold text-muted-foreground">Same</span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {swap.embodiedCarbon}
            </p>
          </div>

          {/* Price Comparison */}
          <div className="p-3 bg-white/50 rounded-lg border border-border/30">
            <div className="flex items-center gap-1.5 mb-1">
              <DollarSign className="w-4 h-4 text-yellow-600" />
              <span className="text-xs font-medium text-muted-foreground">Price</span>
            </div>
            {priceDelta !== null && priceDeltaPct !== null ? (
              <div className="flex items-baseline gap-1">
                {priceDelta < 0 ? (
                  <>
                    <ArrowDownRight className="w-4 h-4 text-green-600" />
                    <span className="text-lg font-bold text-green-600">{priceDeltaPct}%</span>
                  </>
                ) : priceDelta > 0 ? (
                  <>
                    <ArrowUpRight className="w-4 h-4 text-red-600" />
                    <span className="text-lg font-bold text-red-600">+{priceDeltaPct}%</span>
                  </>
                ) : (
                  <span className="text-lg font-bold text-muted-foreground">Same</span>
                )}
              </div>
            ) : (
              <div className="text-lg font-bold text-foreground">{swap.price}</div>
            )}
            <p className="text-xs text-muted-foreground mt-0.5">
              {priceDelta !== null ? `${swap.price}` : "per unit"}
            </p>
          </div>

          {/* Lead Time */}
          <div className="p-3 bg-white/50 rounded-lg border border-border/30">
            <div className="flex items-center gap-1.5 mb-1">
              <Clock className="w-4 h-4 text-blue-600" />
              <span className="text-xs font-medium text-muted-foreground">Lead Time</span>
            </div>
            <p className="text-lg font-bold text-foreground">{swap.leadTime}</p>
          </div>

          {/* Confidence */}
          <div className="p-3 bg-white/50 rounded-lg border border-border/30">
            <div className="flex items-center gap-1.5 mb-1">
              <Sparkles className="w-4 h-4 text-purple-600" />
              <span className="text-xs font-medium text-muted-foreground">Confidence</span>
            </div>
            <p className="text-lg font-bold text-foreground">{swap.confidence}</p>
            <Progress value={parseFloat(swap.confidence)} className="h-1.5 mt-1" />
          </div>
        </div>

        {/* Action Button */}
        <Button
          className="w-full"
          variant={swap.tier === "best" ? "default" : "outline"}
          onClick={() => onAddToRfq?.(swap.id)}
        >
          <ShoppingCart className="w-4 h-4 mr-2" />
          Add to RFQ
        </Button>
      </CardContent>
    </Card>
  );
}
