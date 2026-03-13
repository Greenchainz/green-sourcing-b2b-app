import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle, MessageSquare, TrendingUp, DollarSign, Clock, Loader2 } from "lucide-react";
import { RealTimeMessageThread } from "@/components/RealTimeMessageThread";
import { toast } from "sonner";

export default function SupplierDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("rfqs");
  const [selectedRfq, setSelectedRfq] = useState<number | null>(null);
  const [bidPrice, setBidPrice] = useState("");
  const [leadDays, setLeadDays] = useState("");
  const [bidNotes, setBidNotes] = useState("");
  const [selectedThread, setSelectedThread] = useState<number | null>(null);

  // ── Live tRPC queries ──────────────────────────────────────────────────────
  const {
    data: matchedRfqs = [],
    isLoading: rfqsLoading,
    refetch: refetchRfqs,
  } = trpc.supplierRfq.getMatchedRfqs.useQuery(undefined, {
    enabled: !!user,
  });

  const {
    data: bidHistory = [],
    isLoading: bidsLoading,
    refetch: refetchBids,
  } = trpc.supplierRfq.getBidHistory.useQuery(
    { limit: 50, offset: 0 },
    { enabled: !!user }
  );

  const {
    data: conversations = [],
    isLoading: convsLoading,
  } = trpc.messaging.getConversations.useQuery(undefined, {
    enabled: !!user,
  });

  // ── Mutations ──────────────────────────────────────────────────────────────
  const submitBidMutation = trpc.supplierRfq.submitBid.useMutation({
    onSuccess: (data) => {
      toast.success(data.message || "Bid submitted successfully");
      setBidPrice("");
      setLeadDays("");
      setBidNotes("");
      setSelectedRfq(null);
      refetchRfqs();
      refetchBids();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to submit bid");
    },
  });

  const handleSubmitBid = (rfqId: number) => {
    if (!bidPrice || !leadDays) {
      toast.error("Please fill in bid price and lead time");
      return;
    }
    if (!user) {
      toast.error("Please sign in to submit a bid");
      return;
    }
    submitBidMutation.mutate({
      rfqId,
      bidPrice: parseFloat(bidPrice),
      leadDays: parseInt(leadDays),
      notes: bidNotes || undefined,
    });
  };

  // ── Derived stats ──────────────────────────────────────────────────────────
  const activeBidsCount = bidHistory.filter((b: any) => b.status === "submitted").length;
  const unreadCount = conversations.reduce((sum: number, c: any) => {
    // conversations don't carry unread count directly — show total as proxy
    return sum;
  }, 0);

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Sign in required</h1>
          <p className="text-muted-foreground">Please sign in to access the supplier dashboard.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container py-6">
          <h1 className="text-3xl font-bold">Supplier Dashboard</h1>
          <p className="text-muted-foreground mt-2">Manage RFQs, bids, and customer conversations</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="container py-8">
        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Matching RFQs</p>
                <p className="text-3xl font-bold mt-2">
                  {rfqsLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : matchedRfqs.length}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-600" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Bids</p>
                <p className="text-3xl font-bold mt-2">
                  {bidsLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : activeBidsCount}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-blue-600" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Conversations</p>
                <p className="text-3xl font-bold mt-2">
                  {convsLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : conversations.length}
                </p>
              </div>
              <MessageSquare className="w-8 h-8 text-purple-600" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Bids</p>
                <p className="text-3xl font-bold mt-2">
                  {bidsLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : bidHistory.length}
                </p>
              </div>
              <AlertCircle className="w-8 h-8 text-orange-600" />
            </div>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="rfqs">Matching RFQs</TabsTrigger>
            <TabsTrigger value="bids">My Bids</TabsTrigger>
            <TabsTrigger value="messages">Messages</TabsTrigger>
          </TabsList>

          {/* Matching RFQs Tab */}
          <TabsContent value="rfqs" className="space-y-4">
            {rfqsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : matchedRfqs.length === 0 ? (
              <Card className="p-12 text-center">
                <TrendingUp className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No matching RFQs yet</h3>
                <p className="text-muted-foreground">
                  RFQs that match your materials and location will appear here.
                </p>
              </Card>
            ) : (
              <div className="space-y-4">
                {matchedRfqs.map((rfq: any) => (
                  <Card key={rfq.id} className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold">{rfq.projectName}</h3>
                          <Badge variant="outline">{rfq.status}</Badge>
                          {rfq.matchScore != null && (
                            <Badge className="bg-green-100 text-green-800">
                              Match: {rfq.matchScore}%
                            </Badge>
                          )}
                          {rfq.hasBid && (
                            <Badge className="bg-blue-100 text-blue-800">Bid Submitted</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">{rfq.projectLocation}</p>
                        {rfq.materialCount != null && (
                          <p className="text-sm text-muted-foreground mb-3">
                            {rfq.materialCount} material{rfq.materialCount !== 1 ? "s" : ""} requested
                          </p>
                        )}
                        {rfq.dueDate && (
                          <p className="text-sm text-muted-foreground">
                            <Clock className="w-4 h-4 inline mr-1" />
                            Due: {new Date(rfq.dueDate).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      {!rfq.hasBid && (
                        <Button
                          onClick={() => setSelectedRfq(rfq.id)}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          Submit Bid
                        </Button>
                      )}
                    </div>

                    {/* Bid Form */}
                    {selectedRfq === rfq.id && (
                      <div className="mt-6 pt-6 border-t space-y-4 bg-muted p-4 rounded">
                        <h4 className="font-semibold">Submit Your Bid</h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-sm font-medium">Bid Price ($)</label>
                            <Input
                              type="number"
                              placeholder="45000"
                              value={bidPrice}
                              onChange={(e) => setBidPrice(e.target.value)}
                              className="mt-2"
                            />
                          </div>
                          <div>
                            <label className="text-sm font-medium">Lead Time (days)</label>
                            <Input
                              type="number"
                              placeholder="14"
                              value={leadDays}
                              onChange={(e) => setLeadDays(e.target.value)}
                              className="mt-2"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="text-sm font-medium">Notes</label>
                          <Textarea
                            placeholder="Any special notes about your bid..."
                            value={bidNotes}
                            onChange={(e) => setBidNotes(e.target.value)}
                            className="mt-2"
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button
                            onClick={() => handleSubmitBid(rfq.id)}
                            className="bg-green-600 hover:bg-green-700"
                            disabled={submitBidMutation.isPending}
                          >
                            {submitBidMutation.isPending ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Submitting...
                              </>
                            ) : (
                              "Submit Bid"
                            )}
                          </Button>
                          <Button variant="outline" onClick={() => setSelectedRfq(null)}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* My Bids Tab */}
          <TabsContent value="bids" className="space-y-4">
            {bidsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : bidHistory.length === 0 ? (
              <Card className="p-12 text-center">
                <DollarSign className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No bids yet</h3>
                <p className="text-muted-foreground">
                  Your submitted bids will appear here.
                </p>
              </Card>
            ) : (
              bidHistory.map((bid: any) => (
                <Card key={bid.id} className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold">RFQ #{bid.rfqId}</h3>
                        <Badge
                          className={
                            bid.status === "submitted"
                              ? "bg-blue-100 text-blue-800"
                              : bid.status === "accepted"
                              ? "bg-green-100 text-green-800"
                              : "bg-yellow-100 text-yellow-800"
                          }
                        >
                          {bid.status}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-sm mt-3">
                        <div>
                          <p className="text-muted-foreground">Bid Price</p>
                          <p className="font-semibold text-lg">
                            ${parseFloat(bid.bidPrice || "0").toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Lead Time</p>
                          <p className="font-semibold">{bid.leadDays} days</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Submitted</p>
                          <p className="font-semibold">
                            {bid.createdAt
                              ? new Date(bid.createdAt).toLocaleDateString()
                              : "—"}
                          </p>
                        </div>
                      </div>
                      {bid.notes && (
                        <p className="text-sm text-muted-foreground mt-3 italic">"{bid.notes}"</p>
                      )}
                    </div>
                  </div>
                </Card>
              ))
            )}
          </TabsContent>

          {/* Messages Tab */}
          <TabsContent value="messages" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Conversation List */}
              <div className="lg:col-span-1 space-y-2">
                {convsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : conversations.length === 0 ? (
                  <Card className="p-6 text-center">
                    <MessageSquare className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No conversations yet</p>
                  </Card>
                ) : (
                  conversations.map((conv: any) => (
                    <Card
                      key={conv.id}
                      className={`p-4 cursor-pointer transition ${
                        selectedThread === conv.id
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-muted"
                      }`}
                      onClick={() => setSelectedThread(conv.id)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-semibold">{conv.otherPartyName || "Buyer"}</h4>
                      </div>
                      {conv.lastMessage && (
                        <p className="text-sm opacity-75 line-clamp-2">{conv.lastMessage}</p>
                      )}
                      {conv.rfqTitle && (
                        <p className="text-xs opacity-50 mt-1">Re: {conv.rfqTitle}</p>
                      )}
                      {conv.lastMessageAt && (
                        <p className="text-xs opacity-50 mt-1">
                          {new Date(conv.lastMessageAt).toLocaleDateString()}
                        </p>
                      )}
                    </Card>
                  ))
                )}
              </div>

              {/* Chat Area */}
              <div className="lg:col-span-2">
                {selectedThread && user ? (
                  <RealTimeMessageThread
                    threadId={selectedThread}
                    isBuyer={false}
                    currentUserId={parseInt(user.id, 10)}
                  />
                ) : (
                  <Card className="p-6 h-full flex items-center justify-center min-h-[400px]">
                    <div className="text-center">
                      <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                      <p className="text-muted-foreground">
                        {!user
                          ? "Please sign in to view messages"
                          : "Select a conversation to view messages"}
                      </p>
                    </div>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
