import { trpc } from "@/lib/trpc";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp,
  TrendingDown,
  FileText,
  DollarSign,
  CheckCircle,
  Target,
  Loader2,
} from "lucide-react";

export default function SupplierAnalytics() {
  const { user } = useAuth();

  const { data: stats, isLoading: statsLoading } = trpc.supplierRfq.getStats.useQuery(undefined, {
    enabled: !!user,
  });

  const { data: bidHistory = [], isLoading: bidsLoading } = trpc.supplierRfq.getBidHistory.useQuery(
    { limit: 50, offset: 0 },
    { enabled: !!user }
  );

  const isLoading = statsLoading || bidsLoading;

  const kpis = stats
    ? [
        {
          label: "Matched RFQs",
          value: stats.matchedRfqs.toString(),
          icon: Target,
          sub: `${stats.activeBids} bids active`,
          up: stats.matchedRfqs > 0,
        },
        {
          label: "Total Bids",
          value: stats.totalBids.toString(),
          icon: FileText,
          sub: `${stats.acceptedBids} accepted`,
          up: stats.totalBids > 0,
        },
        {
          label: "Win Rate",
          value: `${stats.winRate}%`,
          icon: CheckCircle,
          sub: `${stats.acceptedBids} won of ${stats.totalBids}`,
          up: stats.winRate >= 20,
        },
        {
          label: "Avg Bid Value",
          value: stats.avgBidPrice > 0 ? `$${stats.avgBidPrice.toLocaleString()}` : "—",
          icon: DollarSign,
          sub: "across all bids",
          up: stats.avgBidPrice > 0,
        },
      ]
    : [];

  // Group recent bids by status for activity feed
  const recentBids = bidHistory.slice(0, 8);

  const getBidStatusColor = (status: string) => {
    if (status === "accepted") return "bg-green-100 text-green-800";
    if (status === "rejected") return "bg-red-100 text-red-800";
    if (status === "submitted") return "bg-blue-100 text-blue-800";
    return "bg-gray-100 text-gray-800";
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Analytics</h1>
          <p className="text-muted-foreground mt-1">
            Performance insights for your GreenChainz supplier profile
          </p>
        </div>

        {/* KPI Cards */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {kpis.map((kpi) => {
                const Icon = kpi.icon;
                return (
                  <Card key={kpi.label} className="p-5">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">{kpi.label}</p>
                        <p className="text-3xl font-bold text-foreground mt-1">{kpi.value}</p>
                      </div>
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Icon className="w-5 h-5 text-primary" />
                      </div>
                    </div>
                    <div
                      className={`flex items-center gap-1 mt-3 text-sm font-medium ${
                        kpi.up ? "text-green-500" : "text-muted-foreground"
                      }`}
                    >
                      {kpi.up ? (
                        <TrendingUp className="w-4 h-4" />
                      ) : (
                        <TrendingDown className="w-4 h-4" />
                      )}
                      {kpi.sub}
                    </div>
                  </Card>
                );
              })}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Bid Status Breakdown */}
              <Card className="p-6">
                <h2 className="text-lg font-semibold text-foreground mb-4">Bid Status Breakdown</h2>
                {stats && stats.totalBids > 0 ? (
                  <div className="space-y-4">
                    {[
                      { label: "Active (submitted)", count: stats.activeBids, color: "bg-blue-500" },
                      { label: "Accepted", count: stats.acceptedBids, color: "bg-green-500" },
                      {
                        label: "Rejected / Expired",
                        count: stats.totalBids - stats.activeBids - stats.acceptedBids,
                        color: "bg-gray-300",
                      },
                    ].map((row) => (
                      <div key={row.label}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-muted-foreground">{row.label}</span>
                          <span className="font-semibold text-foreground">{row.count}</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full ${row.color} rounded-full transition-all duration-500`}
                            style={{
                              width:
                                stats.totalBids > 0
                                  ? `${Math.round((row.count / stats.totalBids) * 100)}%`
                                  : "0%",
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground py-6 text-center">
                    No bids submitted yet. Respond to matched RFQs to see stats here.
                  </p>
                )}
              </Card>

              {/* Recent Bid Activity */}
              <Card className="p-6">
                <h2 className="text-lg font-semibold text-foreground mb-4">Recent Bid Activity</h2>
                {recentBids.length > 0 ? (
                  <div className="space-y-3">
                    {recentBids.map((bid: any) => (
                      <div
                        key={bid.id}
                        className="flex items-center justify-between py-2 border-b border-border last:border-0"
                      >
                        <div>
                          <p className="text-sm font-medium text-foreground">RFQ #{bid.rfqId}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            ${parseFloat(bid.bidPrice ?? "0").toLocaleString()} · {bid.leadDays}d lead
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={`text-[10px] px-1.5 ${getBidStatusColor(bid.status)}`}>
                            {bid.status}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {bid.createdAt ? new Date(bid.createdAt).toLocaleDateString() : "—"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground py-6 text-center">
                    No bid history yet.
                  </p>
                )}
              </Card>
            </div>

            {/* Win Rate visualization */}
            {stats && stats.totalBids > 0 && (
              <Card className="p-6 mt-6">
                <h2 className="text-lg font-semibold text-foreground mb-2">Win Rate</h2>
                <p className="text-sm text-muted-foreground mb-4">
                  {stats.acceptedBids} accepted out of {stats.totalBids} total bids
                </p>
                <div className="h-4 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-green-500 to-green-400 rounded-full transition-all duration-700"
                    style={{ width: `${stats.winRate}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>0%</span>
                  <span className="font-semibold text-foreground">{stats.winRate}%</span>
                  <span>100%</span>
                </div>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}
