import { trpc } from "@/lib/trpc";
import { useAuth } from "@/contexts/AuthContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import {
  Loader2,
  FileText,
  Package,
  UserCheck,
  ShieldCheck,
  Plus,
  Eye,
  Settings,
  Upload,
  Clock,
  ArrowRight,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  Gavel,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

// ── Helpers ────────────────────────────────────────────────────────────────────

function calcProfileCompleteness(profile: any): number {
  const fields = [
    "companyName",
    "contactName",
    "email",
    "phone",
    "website",
    "description",
    "materialCategories",
    "certifications",
  ];
  let filled = 0;
  for (const f of fields) {
    const val = profile[f];
    if (val && (typeof val !== "object" || (Array.isArray(val) && val.length > 0))) {
      filled++;
    }
  }
  return Math.round((filled / fields.length) * 100);
}

function verificationColor(status?: string) {
  switch (status) {
    case "approved":
      return "bg-green-100 text-green-700 border-green-200";
    case "rejected":
      return "bg-red-100 text-red-700 border-red-200";
    default:
      return "bg-yellow-100 text-yellow-700 border-yellow-200";
  }
}

function verificationLabel(status?: string) {
  switch (status) {
    case "approved":
      return "Verified";
    case "rejected":
      return "Rejected";
    default:
      return "Pending Review";
  }
}

// ── Skeleton Card ──────────────────────────────────────────────────────────────

function StatCardSkeleton() {
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
          <div className="h-8 w-16 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="w-12 h-12 bg-gray-100 rounded-xl animate-pulse" />
      </div>
    </Card>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────────

export default function SupplierDashboard() {
  const { user } = useAuth();

  const profileQuery = trpc.supplierOnboarding.getMyProfile.useQuery(
    undefined,
    { enabled: !!user }
  );

  const rfqsQuery = trpc.supplierRfq.getMatchedRfqs.useQuery(undefined, {
    enabled: !!user && !!profileQuery.data,
  });

  const bidsQuery = trpc.supplierRfq.getBidHistory.useQuery(
    { limit: 50, offset: 0 },
    { enabled: !!user && !!profileQuery.data }
  );

  const profile = profileQuery.data as any;
  const matchedRfqs = (rfqsQuery.data ?? []) as any[];
  const bidHistory = (bidsQuery.data ?? []) as any[];
  const isLoading = profileQuery.isLoading;

  // Derived stats
  const activeRfqCount = matchedRfqs.filter(
    (r) => r.status === "open" || r.status === "active" || !r.hasBid
  ).length;
  const materialsCount = profile?.materialCategories?.length ?? 0;
  const completeness = profile ? calcProfileCompleteness(profile) : 0;
  const verificationStatus = profile?.verificationStatus ?? "pending";

  // Build recent activity from RFQs and bids
  const activities: {
    id: string;
    type: "rfq_match" | "bid_submitted" | "bid_accepted" | "bid_rejected";
    title: string;
    description: string;
    date: string;
  }[] = [];

  matchedRfqs.slice(0, 5).forEach((rfq) => {
    activities.push({
      id: `rfq-${rfq.id}`,
      type: "rfq_match",
      title: "New RFQ Match",
      description: rfq.projectName ?? `RFQ #${rfq.id}`,
      date: rfq.createdAt ?? rfq.dueDate ?? new Date().toISOString(),
    });
  });

  bidHistory.slice(0, 5).forEach((bid) => {
    const type =
      bid.status === "accepted"
        ? "bid_accepted"
        : bid.status === "rejected"
        ? "bid_rejected"
        : "bid_submitted";
    activities.push({
      id: `bid-${bid.id}`,
      type,
      title:
        type === "bid_accepted"
          ? "Bid Accepted"
          : type === "bid_rejected"
          ? "Bid Rejected"
          : "Bid Submitted",
      description: `RFQ #${bid.rfqId} — $${parseFloat(
        bid.bidPrice || "0"
      ).toLocaleString()}`,
      date: bid.createdAt ?? new Date().toISOString(),
    });
  });

  activities.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const activityIcon = (type: string) => {
    switch (type) {
      case "rfq_match":
        return (
          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-blue-600" />
          </div>
        );
      case "bid_submitted":
        return (
          <div className="w-8 h-8 rounded-full bg-[#2D6A4F]/10 flex items-center justify-center">
            <Gavel className="w-4 h-4 text-[#2D6A4F]" />
          </div>
        );
      case "bid_accepted":
        return (
          <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
            <CheckCircle className="w-4 h-4 text-green-600" />
          </div>
        );
      case "bid_rejected":
        return (
          <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
            <AlertCircle className="w-4 h-4 text-red-500" />
          </div>
        );
      default:
        return (
          <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
            <Clock className="w-4 h-4 text-gray-500" />
          </div>
        );
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-[#2D6A4F]" />
            <p className="text-sm text-muted-foreground">Loading dashboard…</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // No profile — CTA to onboarding
  if (!profile) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Header />
        <main className="flex-1 flex items-center justify-center px-4">
          <Card className="max-w-md w-full text-center p-8 shadow-sm">
            <div className="w-16 h-16 rounded-full bg-[#2D6A4F]/10 flex items-center justify-center mx-auto mb-5">
              <UserCheck className="w-8 h-8 text-[#2D6A4F]" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Complete Your Profile
            </h2>
            <p className="text-muted-foreground mb-6">
              Set up your supplier profile to start receiving RFQ matches and
              connect with architects looking for sustainable materials.
            </p>
            <Link href="/supplier/onboarding">
              <Button className="bg-[#2D6A4F] hover:bg-[#245a42] text-white w-full">
                Start Onboarding
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      <main className="flex-1 px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-7xl mx-auto">
          {/* ── Welcome Header ───────────────────────────────────── */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">
              Welcome back, {profile.contactName || user?.name || "Supplier"}
            </h1>
            <p className="text-muted-foreground mt-1">
              {profile.companyName} — Supplier Dashboard
            </p>
          </div>

          {/* ── Stat Cards ───────────────────────────────────────── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {rfqsQuery.isLoading ? (
              <StatCardSkeleton />
            ) : (
              <Card className="p-6 border hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground font-medium">
                      Active RFQs
                    </p>
                    <p className="text-3xl font-bold mt-1 text-gray-900">
                      {activeRfqCount}
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
                    <FileText className="w-6 h-6 text-[#2D6A4F]" />
                  </div>
                </div>
              </Card>
            )}

            <Card className="p-6 border hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground font-medium">
                    Materials Listed
                  </p>
                  <p className="text-3xl font-bold mt-1 text-gray-900">
                    {materialsCount}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center">
                  <Package className="w-6 h-6 text-[#2D6A4F]" />
                </div>
              </div>
            </Card>

            <Card className="p-6 border hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground font-medium">
                    Profile Completeness
                  </p>
                  <p className="text-3xl font-bold mt-1 text-gray-900">
                    {completeness}%
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center">
                  <UserCheck className="w-6 h-6 text-[#2D6A4F]" />
                </div>
              </div>
              <div className="mt-3 w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-[#2D6A4F] h-2 rounded-full transition-all"
                  style={{ width: `${completeness}%` }}
                />
              </div>
            </Card>

            <Card className="p-6 border hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground font-medium">
                    Verification Status
                  </p>
                  <div className="mt-2">
                    <Badge
                      className={`text-sm px-3 py-1 ${verificationColor(
                        verificationStatus
                      )}`}
                    >
                      {verificationStatus === "approved" && (
                        <CheckCircle className="w-3.5 h-3.5 mr-1" />
                      )}
                      {verificationStatus === "pending" && (
                        <Clock className="w-3.5 h-3.5 mr-1" />
                      )}
                      {verificationStatus === "rejected" && (
                        <AlertCircle className="w-3.5 h-3.5 mr-1" />
                      )}
                      {verificationLabel(verificationStatus)}
                    </Badge>
                  </div>
                </div>
                <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center">
                  <ShieldCheck className="w-6 h-6 text-[#2D6A4F]" />
                </div>
              </div>
            </Card>
          </div>

          {/* ── Quick Actions ────────────────────────────────────── */}
          <Card className="mb-8 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Link href="/supplier/materials">
                  <Button
                    variant="outline"
                    className="w-full h-auto py-4 flex flex-col gap-2 hover:border-[#2D6A4F] hover:text-[#2D6A4F]"
                  >
                    <Plus className="w-5 h-5" />
                    <span className="text-xs font-medium">Add Material</span>
                  </Button>
                </Link>
                <Link href="/supplier/rfqs">
                  <Button
                    variant="outline"
                    className="w-full h-auto py-4 flex flex-col gap-2 hover:border-[#2D6A4F] hover:text-[#2D6A4F]"
                  >
                    <Eye className="w-5 h-5" />
                    <span className="text-xs font-medium">View RFQs</span>
                  </Button>
                </Link>
                <Link href="/supplier/dashboard">
                  <Button
                    variant="outline"
                    className="w-full h-auto py-4 flex flex-col gap-2 hover:border-[#2D6A4F] hover:text-[#2D6A4F]"
                  >
                    <Settings className="w-5 h-5" />
                    <span className="text-xs font-medium">Edit Profile</span>
                  </Button>
                </Link>
                <Link href="/supplier/upload">
                  <Button
                    variant="outline"
                    className="w-full h-auto py-4 flex flex-col gap-2 hover:border-[#2D6A4F] hover:text-[#2D6A4F]"
                  >
                    <Upload className="w-5 h-5" />
                    <span className="text-xs font-medium">Bulk Upload</span>
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* ── Recent Activity Feed ─────────────────────────────── */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              {rfqsQuery.isLoading || bidsQuery.isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : activities.length === 0 ? (
                <div className="text-center py-8">
                  <Clock className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-muted-foreground text-sm">
                    No recent activity yet. Start by browsing RFQs or adding
                    materials.
                  </p>
                  <Link href="/supplier/rfqs">
                    <Button
                      variant="outline"
                      className="mt-4 text-[#2D6A4F] border-[#2D6A4F] hover:bg-[#2D6A4F]/5"
                    >
                      Browse RFQs
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-0">
                  {activities.slice(0, 8).map((activity, idx) => (
                    <div
                      key={activity.id}
                      className="flex items-start gap-3 py-3 relative"
                    >
                      {/* Timeline connector */}
                      {idx < activities.length - 1 && idx < 7 && (
                        <div className="absolute left-4 top-11 w-px h-[calc(100%-20px)] bg-gray-200" />
                      )}
                      {activityIcon(activity.type)}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">
                          {activity.title}
                        </p>
                        <p className="text-sm text-muted-foreground truncate">
                          {activity.description}
                        </p>
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {(() => {
                          try {
                            return formatDistanceToNow(
                              new Date(activity.date),
                              { addSuffix: true }
                            );
                          } catch {
                            return "recently";
                          }
                        })()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
}
