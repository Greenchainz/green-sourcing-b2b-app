import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/contexts/AuthContext";
import { useChatWidget } from "@/contexts/ChatWidgetContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertCircle, CheckCircle, Plus, Loader2 } from "lucide-react";
import { RfqCreationForm } from "@/components/RfqCreationForm";
import { BidComparison } from "@/components/BidComparison";
import { AiRecommendations } from "@/components/AiRecommendations";

export default function BuyerRfqDashboard() {
  const { user } = useAuth();
  const { openWithConversation } = useChatWidget();
  const [activeTab, setActiveTab] = useState("active");
  const [showCreateRfq, setShowCreateRfq] = useState(false);
  const [selectedRfqId, setSelectedRfqId] = useState<number | null>(null);
  const [showAiAnalysis, setShowAiAnalysis] = useState(false);
  const [aiAnalysisData, setAiAnalysisData] = useState<any>(null);

  const userId = typeof user?.id === "string" ? parseInt(user.id) : (user?.id ?? 0);

  // tRPC queries and mutations
  const acceptBidMutation = trpc.rfqMarketplace.acceptBid.useMutation();

  // Fetch buyer's RFQs — always call the hook, guard with enabled
  const { data: buyerRfqs, isLoading: rfqsLoading, refetch: refetchRfqs } =
    trpc.rfqMarketplace.getBuyerRfqs.useQuery(
      { buyerId: userId },
      { enabled: !!userId }
    );

  // Fetch details for selected RFQ — always call, guard with enabled
  const { data: rfqDetails, isLoading: detailsLoading } =
    trpc.rfqMarketplace.getRfqDetails.useQuery(
      { rfqId: selectedRfqId ?? 0 },
      { enabled: !!selectedRfqId }
    );

  const displayRfqs = buyerRfqs ?? [];
  const selectedRfq = displayRfqs.find((r: any) => r.id === selectedRfqId);
  const rfqBids = rfqDetails?.bids ?? [];

  // Filter RFQs by status
  const activeRfqs = displayRfqs.filter(
    (r: any) => r.status === "submitted" || r.status === "responded" || r.status === "draft"
  );
  const closedRfqs = displayRfqs.filter(
    (r: any) => r.status === "awarded" || r.status === "closed"
  );

  const handleCreateRfq = async () => {
    setShowCreateRfq(false);
    await refetchRfqs();
  };

  const handleAcceptBid = async (bidId: number) => {
    if (!selectedRfqId) return;
    try {
      await acceptBidMutation.mutateAsync({ rfqId: selectedRfqId, bidId });
      await refetchRfqs();
    } catch (error) {
      console.error("Failed to accept bid:", error);
    }
  };

  const statusBadge = (status: string) => {
    const map: Record<string, { label: string; className: string }> = {
      draft: { label: "Draft", className: "bg-gray-100 text-gray-700" },
      submitted: { label: "Submitted", className: "bg-blue-100 text-blue-800" },
      responded: { label: "Bids Received", className: "bg-yellow-100 text-yellow-800" },
      awarded: { label: "Awarded", className: "bg-green-100 text-green-800" },
      closed: { label: "Closed", className: "bg-gray-100 text-gray-600" },
    };
    const s = map[status] ?? { label: status, className: "bg-gray-100 text-gray-700" };
    return <Badge className={s.className}>{s.label}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">RFQ Dashboard</h1>
          <p className="text-gray-600">Manage your requests for quotation and compare supplier bids</p>
        </div>
        <Button
          onClick={() => setShowCreateRfq(true)}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
        >
          <Plus className="w-4 h-4" /> Create RFQ
        </Button>
      </div>

      {/* RFQ Creation Modal */}
      <Dialog open={showCreateRfq} onOpenChange={setShowCreateRfq}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New RFQ</DialogTitle>
            <DialogDescription>
              Submit a request for quotation to find the best suppliers for your materials
            </DialogDescription>
          </DialogHeader>
          <RfqCreationForm onSuccess={handleCreateRfq} />
        </DialogContent>
      </Dialog>

      {/* Loading state */}
      {rfqsLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-green-600" />
          <span className="ml-3 text-gray-600">Loading your RFQs...</span>
        </div>
      )}

      {/* Tabs */}
      {!rfqsLoading && (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="active">
              Active RFQs ({activeRfqs.length})
            </TabsTrigger>
            <TabsTrigger value="closed">
              Closed / Awarded ({closedRfqs.length})
            </TabsTrigger>
          </TabsList>

          {/* Active RFQs Tab */}
          <TabsContent value="active" className="space-y-4">
            {activeRfqs.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center">
                  <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-4">No active RFQs yet</p>
                  <Button
                    onClick={() => setShowCreateRfq(true)}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    Create Your First RFQ
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {activeRfqs.map((rfq: any) => (
                  <Card
                    key={rfq.id}
                    className="cursor-pointer hover:shadow-lg transition-shadow"
                    onClick={() => setSelectedRfqId(rfq.id)}
                  >
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <CardTitle>{rfq.projectName}</CardTitle>
                          <CardDescription>{rfq.projectLocation}</CardDescription>
                        </div>
                        {statusBadge(rfq.status)}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-4 gap-4">
                        <div>
                          <p className="text-sm text-gray-600">Items</p>
                          <p className="font-semibold">{rfq.itemCount ?? 0}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Bids Received</p>
                          <p className="font-semibold text-green-600">{rfq.bidCount ?? 0}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Due Date</p>
                          <p className="font-semibold">
                            {rfq.dueDate
                              ? new Date(rfq.dueDate).toLocaleDateString()
                              : "Open"}
                          </p>
                        </div>
                        <div className="text-right">
                          <Button
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedRfqId(rfq.id);
                            }}
                          >
                            View Bids
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Closed / Awarded RFQs Tab */}
          <TabsContent value="closed" className="space-y-4">
            {closedRfqs.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center">
                  <CheckCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No closed or awarded RFQs yet</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {closedRfqs.map((rfq: any) => (
                  <Card key={rfq.id}>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <CardTitle>{rfq.projectName}</CardTitle>
                          <CardDescription>{rfq.projectLocation}</CardDescription>
                        </div>
                        {statusBadge(rfq.status)}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <p className="text-sm text-gray-600">Total Bids</p>
                          <p className="font-semibold">{rfq.bidCount ?? 0}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Project Type</p>
                          <p className="font-semibold">{rfq.projectType ?? "—"}</p>
                        </div>
                        <div className="text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedRfqId(rfq.id)}
                          >
                            View Details
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}

      {/* Bid Comparison View */}
      {selectedRfqId && selectedRfq && (
        <Card className="border-2 border-blue-500">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle>Bid Comparison: {selectedRfq.projectName}</CardTitle>
                <CardDescription>{selectedRfq.projectLocation}</CardDescription>
              </div>
              <Button variant="outline" onClick={() => setSelectedRfqId(null)}>
                Close
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* AI Analysis Section */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">AI-Powered Analysis</h3>
                  <Button
                    variant="outline"
                    onClick={() => setShowAiAnalysis(!showAiAnalysis)}
                  >
                    {showAiAnalysis ? "Hide Analysis" : "Show AI Recommendations"}
                  </Button>
                </div>
                {showAiAnalysis && (
                  <AiRecommendations analysis={aiAnalysisData} isLoading={false} />
                )}
              </div>

              {/* Bid Comparison */}
              {detailsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-green-600" />
                  <span className="ml-2 text-gray-600">Loading bids...</span>
                </div>
              ) : (
                <BidComparison
                  rfqId={selectedRfqId}
                  bids={rfqBids as any}
                  onAcceptBid={handleAcceptBid}
                  onMessage={(supplierId) => openWithConversation({ supplierId })}
                />
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
