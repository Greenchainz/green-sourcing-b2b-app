import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/contexts/AuthContext";
import { useChatWidget } from "@/contexts/ChatWidgetContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

import { AlertCircle, MessageSquare, TrendingDown, DollarSign, Clock, CheckCircle, Plus } from "lucide-react";
import { RealTimeMessageThread } from "@/components/RealTimeMessageThread";
import { RfqCreationForm } from "@/components/RfqCreationForm";
import { BidComparison } from "@/components/BidComparison";
import { AiRecommendations } from "@/components/AiRecommendations";

export default function BuyerRfqDashboard() {
  const { user } = useAuth();
  const { openWithConversation } = useChatWidget();
  const [activeTab, setActiveTab] = useState("active");
  const [showCreateRfq, setShowCreateRfq] = useState(false);
  const [selectedRfqId, setSelectedRfqId] = useState<number | null>(null);
  const [selectedBids, setSelectedBids] = useState<Set<number>>(new Set());
  const [messageContent, setMessageContent] = useState("");
  const [selectedThread, setSelectedThread] = useState<number | null>(null);
  const [showAiAnalysis, setShowAiAnalysis] = useState(false);
  const [aiAnalysisData, setAiAnalysisData] = useState<any>(null);

  // tRPC queries and mutations
  const acceptBidMutation = trpc.rfqMarketplace.acceptBid.useMutation();
  const utils = trpc.useUtils();

  // Fetch buyer's RFQs
  const { data: buyerRfqs, isLoading: rfqsLoading, refetch: refetchRfqs } = trpc.rfqMarketplace.getBuyerRfqs.useQuery({ 
    buyerId: typeof user?.id === 'string' ? parseInt(user.id) : (user?.id || 0)
  });

  // Fetch bids for selected RFQ
  const { data: rfqDetails } = selectedRfqId ? trpc.rfqMarketplace.getRfqDetails.useQuery({ rfqId: selectedRfqId }) : { data: undefined };
  const rfqBids = rfqDetails?.bids || [];

  // Mock data for demonstration
  const mockRfqs = [
    {
      id: 1,
      projectName: "Downtown Office Renovation",
      projectLocation: "New York, NY",
      materials: ["Insulation", "Drywall", "Paint"],
      submittedAt: new Date("2026-02-10"),
      status: "active",
      totalBids: 3,
      lowestBid: 42000,
      highestBid: 48000,
      averageBid: 45000,
    },
    {
      id: 2,
      projectName: "Residential Complex",
      projectLocation: "Austin, TX",
      materials: ["Flooring", "Roofing"],
      submittedAt: new Date("2026-02-08"),
      status: "closed",
      totalBids: 2,
      lowestBid: 30000,
      highestBid: 35000,
      averageBid: 32500,
      acceptedBid: 30000,
      acceptedSupplier: "BuildRight Materials",
    },
  ];

  const mockBids = [
    {
      id: 1,
      rfqId: 1,
      supplierId: 1,
      supplierName: "BuildRight Materials",
      bidPrice: 42000,
      leadDays: 14,
      notes: "In stock, ready to ship",
      status: "pending",
      createdAt: new Date("2026-02-10T09:30:00Z"),
      supplierRating: 4.8,
      supplierVerified: true,
    },
    {
      id: 2,
      rfqId: 1,
      supplierId: 2,
      supplierName: "EcoSupply Co",
      bidPrice: 45000,
      leadDays: 10,
      notes: "Premium eco-certified materials",
      status: "pending",
      createdAt: new Date("2026-02-10T11:15:00Z"),
      supplierRating: 4.9,
      supplierVerified: true,
    },
    {
      id: 3,
      rfqId: 1,
      supplierId: 3,
      supplierName: "GreenBuild Inc",
      bidPrice: 48000,
      leadDays: 7,
      notes: "Expedited delivery available",
      status: "pending",
      createdAt: new Date("2026-02-10T14:45:00Z"),
      supplierRating: 4.6,
      supplierVerified: true,
    },
  ];

  const displayRfqs = buyerRfqs || mockRfqs;
  const selectedRfq = displayRfqs.find((r: any) => r.id === selectedRfqId);
  const displayBids = rfqBids || (selectedRfqId === 1 ? mockBids : []);

  // Filter RFQs by status
  const activeRfqs = displayRfqs?.filter((r: any) => r.status === "active") || [];
  const closedRfqs = displayRfqs?.filter((r: any) => r.status === "closed") || [];

  const handleCreateRfq = async () => {
    setShowCreateRfq(false);
    await refetchRfqs();
  };

  const handleAcceptBid = async (bidId: number) => {
    if (!selectedRfqId) return;
    try {
      await acceptBidMutation.mutateAsync({ rfqId: selectedRfqId, bidId });
      await refetchRfqs();
      alert("Bid accepted successfully!");
    } catch (error) {
      alert(`Error: ${error instanceof Error ? error.message : "Failed to accept bid"}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">RFQ Dashboard</h1>
          <p className="text-gray-600">Manage your requests for quotation and compare supplier bids</p>
        </div>
        <Button onClick={() => setShowCreateRfq(true)} className="flex items-center gap-2 bg-green-600 hover:bg-green-700">
          <Plus className="w-4 h-4" /> Create RFQ
        </Button>
      </div>

      {/* RFQ Creation Modal */}
      <Dialog open={showCreateRfq} onOpenChange={setShowCreateRfq}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New RFQ</DialogTitle>
            <DialogDescription>Submit a request for quotation to find the best suppliers for your materials</DialogDescription>
          </DialogHeader>
          <RfqCreationForm onSuccess={handleCreateRfq} />
        </DialogContent>
      </Dialog>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="active">
            Active RFQs ({activeRfqs.length})
          </TabsTrigger>
          <TabsTrigger value="closed">
            Closed RFQs ({closedRfqs.length})
          </TabsTrigger>
        </TabsList>

        {/* Active RFQs Tab */}
        <TabsContent value="active" className="space-y-4">
          {activeRfqs.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center">
                <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-4">No active RFQs yet</p>
                <Button onClick={() => setShowCreateRfq(true)} className="bg-green-600 hover:bg-green-700">
                  Create Your First RFQ
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {activeRfqs.map((rfq: any) => (
                <Card key={rfq.id} className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setSelectedRfqId(rfq.id)}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <CardTitle>{rfq.projectName}</CardTitle>
                        <CardDescription>{rfq.projectLocation}</CardDescription>
                      </div>
                      <Badge className="bg-blue-100 text-blue-800">Active</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-4 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">Materials</p>
                        <p className="font-semibold">{rfq.materials?.length || 0} items</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Bids Received</p>
                        <p className="font-semibold text-green-600">{rfq.totalBids}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Price Range</p>
                        <p className="font-semibold">${rfq.lowestBid?.toLocaleString()} - ${rfq.highestBid?.toLocaleString()}</p>
                      </div>
                      <div className="text-right">
                        <Button size="sm" onClick={(e) => { e.stopPropagation(); setSelectedRfqId(rfq.id); }}>
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

        {/* Closed RFQs Tab */}
        <TabsContent value="closed" className="space-y-4">
          {closedRfqs.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center">
                <CheckCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No closed RFQs yet</p>
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
                      <Badge className="bg-gray-100 text-gray-800">Closed</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-4 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">Accepted Bid</p>
                        <p className="font-semibold text-green-600">${rfq.acceptedBid?.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Supplier</p>
                        <p className="font-semibold">{rfq.acceptedSupplier}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Total Bids</p>
                        <p className="font-semibold">{rfq.totalBids}</p>
                      </div>
                      <div className="text-right">
                        <Button size="sm" variant="outline" onClick={() => setSelectedRfqId(rfq.id)}>
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
                  <AiRecommendations
                    analysis={aiAnalysisData}
                    isLoading={false}
                  />
                )}
              </div>

              {/* Bid Comparison */}
              <BidComparison
                rfqId={selectedRfqId}
                bids={displayBids as any}
                onAcceptBid={handleAcceptBid}
                onMessage={(supplierId) => openWithConversation({ supplierId })}
              />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
