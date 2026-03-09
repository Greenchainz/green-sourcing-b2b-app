import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Clock, DollarSign, TrendingDown, MessageSquare, CheckCircle2, XCircle, AlertCircle, ArrowRight, FileDown } from "lucide-react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";

const STATUS_CONFIG = {
  draft: { label: "Draft", color: "bg-gray-500", icon: AlertCircle },
  submitted: { label: "Submitted", color: "bg-blue-500", icon: Clock },
  responded: { label: "Bids Received", color: "bg-purple-500", icon: DollarSign },
  awarded: { label: "Awarded", color: "bg-green-500", icon: CheckCircle2 },
  closed: { label: "Closed", color: "bg-gray-600", icon: XCircle },
};

export default function RfqDashboard() {
  const { user } = useAuth();
  const [selectedRfqId, setSelectedRfqId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const acceptBidMutation = trpc.rfqMarketplace.acceptBid.useMutation();
  const utils = trpc.useUtils();

  const handleAcceptBid = async (rfqId: number, bidId: number) => {
    setActionError(null);
    try {
      await acceptBidMutation.mutateAsync({ rfqId, bidId });
      utils.rfqMarketplace.getUserRfqs.invalidate();
      utils.rfqMarketplace.getRfqDetails.invalidate({ rfqId });
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to accept bid");
    }
  };

  const { data: rfqs, isLoading: rfqsLoading } = trpc.rfqMarketplace.getUserRfqs.useQuery(
    { userId: (typeof user?.id === 'string' ? parseInt(user.id) : user?.id) || 0 },
    { enabled: !!user?.id }
  );

  const { data: selectedRfqDetails, isLoading: detailsLoading } = trpc.rfqMarketplace.getRfqDetails.useQuery(
    { rfqId: selectedRfqId || 0 },
    { enabled: !!selectedRfqId }
  );

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <div className="container py-16 text-center flex-1">
          <h2 className="text-2xl font-bold mb-4">Sign in to view your RFQs</h2>
          <p className="text-muted-foreground mb-6">You need to be logged in to track your requests for quotation.</p>
          <Link href="/"><Button>Back to Home</Button></Link>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <div className="container py-6 flex-1">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">RFQ Dashboard</h1>
          <p className="text-muted-foreground">Track your requests for quotation and compare supplier bids</p>
        </div>

        <Tabs defaultValue="all" className="w-full">
          <TabsList>
            <TabsTrigger value="all">All RFQs</TabsTrigger>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="awarded">Awarded</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            {rfqsLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-32" />
                <Skeleton className="h-32" />
              </div>
            ) : rfqs && rfqs.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* RFQ List */}
                <div className="lg:col-span-1 space-y-3">
                  {rfqs.map((rfq: any) => {
                    const status = (rfq.status || 'draft') as keyof typeof STATUS_CONFIG;
                    const config = STATUS_CONFIG[status];
                    const StatusIcon = config.icon;
                    return (
                      <Card
                        key={rfq.id}
                        className={`cursor-pointer transition-all ${selectedRfqId === rfq.id ? "ring-2 ring-primary" : ""}`}
                        onClick={() => setSelectedRfqId(rfq.id)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-2">
                            <h3 className="font-semibold text-sm">{rfq.projectName}</h3>
                            <Badge className={`${config.color} text-white text-xs`}>
                              <StatusIcon className="w-3 h-3 mr-1" />
                              {config.label}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mb-2">{rfq.projectLocation}</p>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">
                              {rfq.itemCount} items • {rfq.bidCount || 0} bids
                            </span>
                            <ArrowRight className="w-3 h-3 text-muted-foreground" />
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>

                {/* RFQ Details */}
                <div className="lg:col-span-2">
                  {selectedRfqId && selectedRfqDetails ? (
                    <div className="space-y-4">
                      {/* PDF Download Buttons */}
                      <div className="flex gap-2 justify-end">
                        <a
                          href={`/api/rfq/${selectedRfqId}/pdf/summary`}
                          download
                          className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded border border-border hover:bg-muted transition-colors"
                        >
                          <FileDown className="w-3.5 h-3.5" /> RFQ Summary PDF
                        </a>
                        {selectedRfqDetails.bids && selectedRfqDetails.bids.length > 0 && (
                          <a
                            href={`/api/rfq/${selectedRfqId}/pdf/bids`}
                            download
                            className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded border border-border hover:bg-muted transition-colors"
                          >
                            <FileDown className="w-3.5 h-3.5" /> Bid Comparison PDF
                          </a>
                        )}
                      </div>

                      {/* RFQ Header */}
                      <Card>
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div>
                              <CardTitle className="text-xl">{selectedRfqDetails.projectName}</CardTitle>
                              <p className="text-sm text-muted-foreground mt-1">{selectedRfqDetails.projectLocation}</p>
                            </div>
                            <Badge className={`${STATUS_CONFIG[(selectedRfqDetails.status || 'draft') as keyof typeof STATUS_CONFIG].color} text-white`}>
                              {STATUS_CONFIG[(selectedRfqDetails.status || 'draft') as keyof typeof STATUS_CONFIG].label}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <p className="text-xs text-muted-foreground">Project Type</p>
                              <p className="font-semibold">{selectedRfqDetails.projectType || "—"}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Submitted</p>
                              <p className="font-semibold">
                                {new Date(selectedRfqDetails.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                            {selectedRfqDetails.dueDate && (
                              <div>
                                <p className="text-xs text-muted-foreground">Due Date</p>
                                <p className="font-semibold">
                                  {new Date(selectedRfqDetails.dueDate).toLocaleDateString()}
                                </p>
                              </div>
                            )}
                            <div>
                              <p className="text-xs text-muted-foreground">Materials</p>
                              <p className="font-semibold">{selectedRfqDetails.itemCount} items</p>
                            </div>
                          </div>
                          {selectedRfqDetails.notes && (
                            <div className="pt-3 border-t">
                              <p className="text-xs text-muted-foreground mb-1">Notes</p>
                              <p className="text-sm">{selectedRfqDetails.notes}</p>
                            </div>
                          )}
                        </CardContent>
                      </Card>

                      {/* Analytics */}
                      {selectedRfqDetails.analytics && (
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-base">Bid Summary</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                              <div className="p-3 bg-muted/30 rounded-lg">
                                <p className="text-xs text-muted-foreground">Total Bids</p>
                                <p className="text-2xl font-bold">{selectedRfqDetails.analytics.totalBidsReceived}</p>
                              </div>
                              <div className="p-3 bg-muted/30 rounded-lg">
                                <p className="text-xs text-muted-foreground">Avg Response Time</p>
                                <p className="text-2xl font-bold">
                                  {selectedRfqDetails.analytics.avgResponseTimeHours
                                    ? `${Number(selectedRfqDetails.analytics.avgResponseTimeHours).toFixed(1)}h`
                                    : "—"}
                                </p>
                              </div>
                            </div>
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">Lowest Bid</span>
                                <span className="text-sm font-bold">
                                  ${Number(selectedRfqDetails.analytics.lowestBidPrice || 0).toFixed(2)}
                                </span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">Average Bid</span>
                                <span className="text-sm font-bold">
                                  ${Number(selectedRfqDetails.analytics.avgBidPrice || 0).toFixed(2)}
                                </span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">Highest Bid</span>
                                <span className="text-sm font-bold">
                                  ${Number(selectedRfqDetails.analytics.highestBidPrice || 0).toFixed(2)}
                                </span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      {/* Bids List */}
                      {selectedRfqDetails.bids && selectedRfqDetails.bids.length > 0 && (
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-base">Supplier Bids ({selectedRfqDetails.bids.length})</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            {selectedRfqDetails.bids.map((bid: any) => (
                              <div
                                key={bid.id}
                                className="p-3 border border-border rounded-lg hover:bg-muted/30 transition-colors"
                              >
                                <div className="flex items-start justify-between mb-2">
                                  <div>
                                    <p className="font-semibold text-sm">{bid.supplierName || "Supplier"}</p>
                                    <p className="text-xs text-muted-foreground">{bid.supplierLocation || "Location TBD"}</p>
                                  </div>
                                  <Badge
                                    variant={
                                      bid.status === "accepted"
                                        ? "default"
                                        : bid.status === "rejected"
                                          ? "destructive"
                                          : "secondary"
                                    }
                                  >
                                    {bid.status.charAt(0).toUpperCase() + bid.status.slice(1)}
                                  </Badge>
                                </div>
                                <div className="grid grid-cols-2 gap-2 mb-2">
                                  <div>
                                    <p className="text-xs text-muted-foreground">Bid Price</p>
                                    <p className="font-bold">${Number(bid.bidPrice || 0).toFixed(2)}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-muted-foreground">Lead Time</p>
                                    <p className="font-bold">{bid.leadDays} days</p>
                                  </div>
                                </div>
                                {bid.notes && <p className="text-xs text-muted-foreground italic mb-2">{bid.notes}</p>}
                                <div className="flex gap-2">
                                  {bid.status === "submitted" && (
                                    <>
                                      <Button
                                        size="sm"
                                        variant="default"
                                        className="bg-green-600 hover:bg-green-700"
                                        disabled={acceptBidMutation.isPending}
                                        onClick={() => selectedRfqId && handleAcceptBid(selectedRfqId, bid.id)}
                                      >
                                        {acceptBidMutation.isPending ? "Accepting..." : "Accept"}
                                      </Button>
                                    </>
                                  )}
                                  <Button size="sm" variant="ghost">
                                    <MessageSquare className="w-4 h-4 mr-1" />
                                    Message
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </CardContent>
                        </Card>
                      )}

                      {/* No Bids Yet */}
                      {(!selectedRfqDetails.bids || selectedRfqDetails.bids.length === 0) &&
                        selectedRfqDetails.status === "submitted" && (
                          <Card>
                            <CardContent className="p-8 text-center">
                              <Clock className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                              <p className="text-sm text-muted-foreground mb-2">Waiting for supplier bids...</p>
                              <p className="text-xs text-muted-foreground">
                                Suppliers are reviewing your RFQ. Bids typically arrive within 24-48 hours.
                              </p>
                            </CardContent>
                          </Card>
                        )}
                    </div>
                  ) : (
                    <Card>
                      <CardContent className="p-8 text-center">
                        <p className="text-muted-foreground">Select an RFQ to view details</p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <p className="text-muted-foreground mb-4">No RFQs yet</p>
                  <Link href="/materials">
                    <Button>Browse Materials & Create RFQ</Button>
                  </Link>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="active">
            {rfqsLoading ? (
              <Skeleton className="h-32" />
            ) : rfqs && rfqs.filter((r: any) => ["submitted", "responded"].includes(r.status)).length > 0 ? (
              <div className="space-y-3">
                {rfqs
                  .filter((r: any) => ["submitted", "responded"].includes(r.status))
                  .map((rfq: any) => (
                    <Card key={rfq.id} className="cursor-pointer" onClick={() => setSelectedRfqId(rfq.id)}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold">{rfq.projectName}</p>
                            <p className="text-sm text-muted-foreground">{rfq.projectLocation}</p>
                          </div>
                          <Badge className="bg-blue-500 text-white">{rfq.bidCount || 0} bids</Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <p className="text-muted-foreground">No active RFQs</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="awarded">
            {rfqsLoading ? (
              <Skeleton className="h-32" />
            ) : rfqs && rfqs.filter((r: any) => r.status === "awarded").length > 0 ? (
              <div className="space-y-3">
                {rfqs
                  .filter((r: any) => r.status === "awarded")
                  .map((rfq: any) => (
                    <Card key={rfq.id} className="cursor-pointer" onClick={() => setSelectedRfqId(rfq.id)}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold">{rfq.projectName}</p>
                            <p className="text-sm text-muted-foreground">{rfq.projectLocation}</p>
                          </div>
                          <Badge className="bg-green-500 text-white">Awarded</Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <p className="text-muted-foreground">No awarded RFQs yet</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
      <Footer />
    </div>
  );
}
