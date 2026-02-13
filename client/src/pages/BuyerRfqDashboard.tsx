import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/contexts/AuthContext";
import { useChatWidget } from "@/contexts/ChatWidgetContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle, MessageSquare, TrendingDown, DollarSign, Clock, CheckCircle, X } from "lucide-react";
import { RealTimeMessageThread } from "@/components/RealTimeMessageThread";

export default function BuyerRfqDashboard() {
  const { user } = useAuth();
  const { openWithConversation } = useChatWidget();
  const [activeTab, setActiveTab] = useState("active");
  const [selectedRfq, setSelectedRfq] = useState<number | null>(null);
  const [selectedBids, setSelectedBids] = useState<Set<number>>(new Set());
  const [messageContent, setMessageContent] = useState("");
  const [selectedThread, setSelectedThread] = useState<number | null>(null);

  // Mock data - will be replaced with actual tRPC queries
  const mockRfqs = [
    {
      id: 1,
      projectName: "Downtown Office Renovation",
      projectLocation: "New York, NY",
      materials: ["Insulation", "Drywall", "Paint"],
      submittedAt: "2026-02-10",
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
      submittedAt: "2026-02-08",
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
      status: "submitted",
      submittedAt: "2026-02-10T09:30:00Z",
    },
    {
      id: 2,
      rfqId: 1,
      supplierId: 2,
      supplierName: "EcoSupply Co",
      bidPrice: 45000,
      leadDays: 10,
      notes: "Premium eco-certified materials",
      status: "submitted",
      submittedAt: "2026-02-10T11:15:00Z",
    },
    {
      id: 3,
      rfqId: 1,
      supplierId: 3,
      supplierName: "GreenBuild Inc",
      bidPrice: 48000,
      leadDays: 7,
      notes: "Expedited delivery available",
      status: "submitted",
      submittedAt: "2026-02-10T14:45:00Z",
    },
  ];

  const mockThreads = [
    {
      id: 1,
      rfqId: 1,
      supplierId: 1,
      supplierName: "BuildRight Materials",
      lastMessage: "Can you confirm the delivery address?",
      lastMessageAt: "2026-02-11T10:30:00Z",
      unreadCount: 1,
    },
  ];

  const activeRfq = mockRfqs.find((r) => r.id === selectedRfq);
  const rfqBids = mockBids.filter((b) => b.rfqId === selectedRfq);

  const handleAcceptBid = (bidId: number) => {
    console.log("Accepting bid:", bidId);
    // TODO: Call tRPC mutation to accept bid
  };

  const handleRejectBid = (bidId: number) => {
    console.log("Rejecting bid:", bidId);
    // TODO: Call tRPC mutation to reject bid
  };

  const handleSendMessage = (threadId: number) => {
    if (!messageContent.trim()) return;
    if (!user) {
      alert("Please sign in to send a message");
      return;
    }
    console.log("Sending message:", { threadId, content: messageContent });
    setMessageContent("");
  };

  const handleOpenConversation = (rfqId: number, supplierId: number) => {
    openWithConversation({ rfqId, supplierId });
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Sign in required</h1>
          <p className="text-muted-foreground">Please sign in to access your RFQ dashboard.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container py-6">
          <h1 className="text-3xl font-bold">My RFQs</h1>
          <p className="text-muted-foreground mt-2">Manage your requests for quotes and compare bids</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="container py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="active">Active RFQs</TabsTrigger>
            <TabsTrigger value="closed">Closed RFQs</TabsTrigger>
          </TabsList>

          {/* Active RFQs Tab */}
          <TabsContent value="active" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* RFQ List */}
              <div className="lg:col-span-1 space-y-2">
                {mockRfqs
                  .filter((r) => r.status === "active")
                  .map((rfq) => (
                    <Card
                      key={rfq.id}
                      className={`p-4 cursor-pointer transition ${
                        selectedRfq === rfq.id ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                      }`}
                      onClick={() => setSelectedRfq(rfq.id)}
                    >
                      <h4 className="font-semibold mb-2">{rfq.projectName}</h4>
                      <p className="text-sm opacity-75 mb-3">{rfq.projectLocation}</p>
                      <div className="flex items-center justify-between text-xs">
                        <Badge className="bg-blue-100 text-blue-800">{rfq.totalBids} bids</Badge>
                        <span className="opacity-50">{new Date(rfq.submittedAt).toLocaleDateString()}</span>
                      </div>
                    </Card>
                  ))}
              </div>

              {/* Bid Comparison */}
              <div className="lg:col-span-2">
                {selectedRfq && activeRfq ? (
                  <Card className="p-6 space-y-6">
                    {/* RFQ Summary */}
                    <div>
                      <h3 className="text-xl font-semibold mb-4">{activeRfq.projectName}</h3>
                      <div className="grid grid-cols-4 gap-4">
                        <div className="bg-muted p-4 rounded">
                          <p className="text-sm text-muted-foreground">Total Bids</p>
                          <p className="text-2xl font-bold mt-2">{activeRfq.totalBids}</p>
                        </div>
                        <div className="bg-muted p-4 rounded">
                          <p className="text-sm text-muted-foreground">Lowest Bid</p>
                          <p className="text-2xl font-bold mt-2 text-green-600">${activeRfq.lowestBid.toLocaleString()}</p>
                        </div>
                        <div className="bg-muted p-4 rounded">
                          <p className="text-sm text-muted-foreground">Average Bid</p>
                          <p className="text-2xl font-bold mt-2">${activeRfq.averageBid.toLocaleString()}</p>
                        </div>
                        <div className="bg-muted p-4 rounded">
                          <p className="text-sm text-muted-foreground">Highest Bid</p>
                          <p className="text-2xl font-bold mt-2 text-red-600">${activeRfq.highestBid.toLocaleString()}</p>
                        </div>
                      </div>
                    </div>

                    {/* Bid Comparison Table */}
                    <div>
                      <h4 className="font-semibold mb-4">Bid Comparison</h4>
                      <div className="space-y-3 max-h-96 overflow-y-auto">
                        {rfqBids.map((bid) => (
                          <Card key={bid.id} className="p-4">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex-1">
                                <h5 className="font-semibold">{bid.supplierName}</h5>
                                <p className="text-sm text-muted-foreground">{bid.notes}</p>
                              </div>
                              <Badge className={bid.bidPrice === activeRfq.lowestBid ? "bg-green-100 text-green-800" : ""}>
                                {bid.status}
                              </Badge>
                            </div>
                            <div className="grid grid-cols-3 gap-4 mb-4 text-sm">
                              <div>
                                <p className="text-muted-foreground">Bid Price</p>
                                <p className="font-semibold text-lg">${bid.bidPrice.toLocaleString()}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Lead Time</p>
                                <p className="font-semibold">{bid.leadDays} days</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Submitted</p>
                                <p className="font-semibold">{new Date(bid.submittedAt).toLocaleDateString()}</p>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => handleAcceptBid(bid.id)}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Accept
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleRejectBid(bid.id)}
                              >
                                <X className="w-4 h-4 mr-2" />
                                Reject
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenConversation(bid.rfqId, bid.supplierId)}
                              >
                                <MessageSquare className="w-4 h-4 mr-2" />
                                Message
                              </Button>
                            </div>
                          </Card>
                        ))}
                      </div>
                    </div>
                  </Card>
                ) : (
                  <Card className="p-6 h-full flex items-center justify-center">
                    <p className="text-muted-foreground">Select an RFQ to view bids</p>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Closed RFQs Tab */}
          <TabsContent value="closed" className="space-y-4">
            {mockRfqs
              .filter((r) => r.status === "closed")
              .map((rfq) => (
                <Card key={rfq.id} className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold">{rfq.projectName}</h3>
                      <p className="text-sm text-muted-foreground mb-3">{rfq.projectLocation}</p>
                      <div className="flex flex-wrap gap-2 mb-4">
                        {rfq.materials.map((material) => (
                          <Badge key={material} variant="secondary">
                            {material}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <Badge className="bg-green-100 text-green-800">Closed</Badge>
                  </div>

                  <div className="grid grid-cols-4 gap-4 pt-4 border-t">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Bids</p>
                      <p className="font-semibold mt-1">{rfq.totalBids}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Accepted Bid</p>
                      <p className="font-semibold mt-1 text-green-600">${rfq.acceptedBid?.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Supplier</p>
                      <p className="font-semibold mt-1">{rfq.acceptedSupplier}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Savings</p>
                      <p className="font-semibold mt-1 text-green-600">
                        ${(rfq.highestBid - rfq.acceptedBid!).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </Card>
              ))}
          </TabsContent>
        </Tabs>

        {/* Messages Section */}
        <div className="mt-12 pt-8 border-t">
          <h2 className="text-2xl font-bold mb-6">Supplier Messages</h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Thread List */}
            <div className="lg:col-span-1 space-y-2">
              {mockThreads.map((thread) => (
                <Card
                  key={thread.id}
                  className={`p-4 cursor-pointer transition ${
                    selectedThread === thread.id ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                  }`}
                  onClick={() => setSelectedThread(thread.id)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-semibold">{thread.supplierName}</h4>
                    {thread.unreadCount > 0 && (
                      <Badge className="bg-red-600">{thread.unreadCount}</Badge>
                    )}
                  </div>
                  <p className="text-sm opacity-75 line-clamp-2">{thread.lastMessage}</p>
                  <p className="text-xs opacity-50 mt-2">
                    {new Date(thread.lastMessageAt).toLocaleDateString()}
                  </p>
                </Card>
              ))}
            </div>

            {/* Chat Area */}
            <div className="lg:col-span-2">
              {selectedThread && user ? (
                <RealTimeMessageThread
                  threadId={selectedThread}
                  isBuyer={true}
                  currentUserId={parseInt(user.id, 10)}
                />
              ) : (
                <Card className="p-6 h-full flex items-center justify-center">
                  <p className="text-muted-foreground">
                    {!user ? "Please sign in to view messages" : "Select a conversation to view messages"}
                  </p>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
