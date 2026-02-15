import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, DollarSign, MessageSquare, TrendingDown, AlertCircle } from "lucide-react";

interface Bid {
  id: number;
  supplierId: number;
  supplierName: string;
  bidPrice: number;
  leadDays: number;
  notes?: string;
  status: "pending" | "accepted" | "rejected";
  createdAt: Date;
  supplierRating?: number;
  supplierVerified?: boolean;
}

interface BidComparisonProps {
  rfqId: number;
  bids: Bid[];
  onAcceptBid?: (bidId: number) => void;
  onRejectBid?: (bidId: number) => void;
  onMessage?: (supplierId: number) => void;
}

export function BidComparison({ rfqId, bids, onAcceptBid, onRejectBid, onMessage }: BidComparisonProps) {
  const [sortBy, setSortBy] = useState<"price" | "leadTime" | "rating">("price");
  const acceptBid = trpc.rfqMarketplace.acceptBid.useMutation();

  // Calculate statistics
  const prices = bids.map((b) => b.bidPrice);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;

  const leadTimes = bids.map((b) => b.leadDays);
  const minLeadTime = Math.min(...leadTimes);
  const maxLeadTime = Math.max(...leadTimes);

  // Sort bids
  const sortedBids = [...bids].sort((a, b) => {
    switch (sortBy) {
      case "price":
        return a.bidPrice - b.bidPrice;
      case "leadTime":
        return a.leadDays - b.leadDays;
      case "rating":
        return (b.supplierRating || 0) - (a.supplierRating || 0);
      default:
        return 0;
    }
  });

  const handleAcceptBid = async (bidId: number) => {
    try {
      await acceptBid.mutateAsync({ rfqId, bidId });
      alert("Bid accepted successfully!");
      onAcceptBid?.(bidId);
    } catch (error) {
      alert(`Error: ${error instanceof Error ? error.message : "Failed to accept bid"}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <p className="text-sm text-gray-600">Lowest Price</p>
              <p className="text-2xl font-bold text-green-600">${minPrice.toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>
              <p className="text-xs text-gray-500">Savings vs avg: ${(avgPrice - minPrice).toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <p className="text-sm text-gray-600">Average Price</p>
              <p className="text-2xl font-bold">${avgPrice.toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>
              <p className="text-xs text-gray-500">{bids.length} bids received</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <p className="text-sm text-gray-600">Fastest Delivery</p>
              <p className="text-2xl font-bold text-blue-600">{minLeadTime} days</p>
              <p className="text-xs text-gray-500">Slowest: {maxLeadTime} days</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sort Controls */}
      <div className="flex gap-2">
        <Button
          variant={sortBy === "price" ? "default" : "outline"}
          size="sm"
          onClick={() => setSortBy("price")}
          className="flex items-center gap-2"
        >
          <DollarSign className="w-4 h-4" /> Price
        </Button>
        <Button
          variant={sortBy === "leadTime" ? "default" : "outline"}
          size="sm"
          onClick={() => setSortBy("leadTime")}
          className="flex items-center gap-2"
        >
          <Clock className="w-4 h-4" /> Lead Time
        </Button>
        <Button
          variant={sortBy === "rating" ? "default" : "outline"}
          size="sm"
          onClick={() => setSortBy("rating")}
          className="flex items-center gap-2"
        >
          ⭐ Rating
        </Button>
      </div>

      {/* Bid Cards */}
      <div className="space-y-4">
        {sortedBids.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center">
              <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No bids received yet. Check back soon!</p>
            </CardContent>
          </Card>
        ) : (
          sortedBids.map((bid, index) => (
            <Card key={bid.id} className={bid.status === "accepted" ? "border-green-500 bg-green-50" : ""}>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  {/* Header */}
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold">{bid.supplierName}</h3>
                        {bid.supplierVerified && <Badge className="bg-blue-100 text-blue-800">Verified</Badge>}
                        {bid.status === "accepted" && <Badge className="bg-green-100 text-green-800">Accepted</Badge>}
                        {index === 0 && sortBy === "price" && <Badge className="bg-yellow-100 text-yellow-800">Best Price</Badge>}
                      </div>
                      {bid.supplierRating && (
                        <p className="text-sm text-gray-600 mt-1">
                          ⭐ {bid.supplierRating.toFixed(1)}/5.0 rating
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-3xl font-bold text-green-600">${bid.bidPrice.toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>
                      <p className="text-sm text-gray-600">
                        {bid.bidPrice < avgPrice ? (
                          <span className="text-green-600 flex items-center gap-1">
                            <TrendingDown className="w-4 h-4" /> Below average
                          </span>
                        ) : (
                          <span className="text-gray-600">vs avg: ${(bid.bidPrice - avgPrice).toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Details */}
                  <div className="grid grid-cols-2 gap-4 py-4 border-y border-gray-200">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-gray-500" />
                      <div>
                        <p className="text-xs text-gray-600">Lead Time</p>
                        <p className="font-semibold">{bid.leadDays} days</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-gray-500" />
                      <div>
                        <p className="text-xs text-gray-600">Unit Price</p>
                        <p className="font-semibold">${(bid.bidPrice / 1).toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>
                      </div>
                    </div>
                  </div>

                  {/* Notes */}
                  {bid.notes && (
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-sm text-gray-700">{bid.notes}</p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onMessage?.(bid.supplierId)}
                      className="flex items-center gap-2"
                    >
                      <MessageSquare className="w-4 h-4" /> Message
                    </Button>
                    {bid.status !== "accepted" && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onRejectBid?.(bid.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          Reject
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleAcceptBid(bid.id)}
                          disabled={acceptBid.isPending}
                          className="bg-green-600 hover:bg-green-700 flex items-center gap-2"
                        >
                          <CheckCircle2 className="w-4 h-4" /> Accept Bid
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Help Text */}
      {bids.length > 0 && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <p className="text-sm text-blue-900">
              <strong>Tip:</strong> Review all bids carefully. Consider not just price, but also lead time, supplier rating, and any special terms they've offered. You can message suppliers to negotiate before making your final decision.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
