import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle, MessageSquare, TrendingUp, DollarSign, Clock, CheckCircle } from "lucide-react";

export default function SupplierDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("rfqs");
  const [selectedRfq, setSelectedRfq] = useState<number | null>(null);
  const [bidPrice, setBidPrice] = useState("");
  const [leadDays, setLeadDays] = useState("");
  const [bidNotes, setBidNotes] = useState("");
  const [messageContent, setMessageContent] = useState("");
  const [selectedThread, setSelectedThread] = useState<number | null>(null);

  // Mock data - will be replaced with actual tRPC queries
  const mockRfqs = [
    {
      id: 1,
      projectName: "Downtown Office Renovation",
      projectLocation: "New York, NY",
      materials: ["Insulation", "Drywall", "Paint"],
      dueDate: "2026-03-15",
      matchScore: 92,
      status: "open",
    },
    {
      id: 2,
      projectName: "Residential Complex",
      projectLocation: "Austin, TX",
      materials: ["Flooring", "Roofing"],
      dueDate: "2026-04-01",
      matchScore: 85,
      status: "open",
    },
  ];

  const mockBids = [
    {
      id: 1,
      rfqId: 1,
      bidPrice: 45000,
      leadDays: 14,
      status: "submitted",
      submittedAt: "2026-02-10",
    },
    {
      id: 2,
      rfqId: 2,
      bidPrice: 32000,
      leadDays: 21,
      status: "pending",
      submittedAt: null,
    },
  ];

  const mockThreads = [
    {
      id: 1,
      rfqId: 1,
      buyerName: "John Smith",
      lastMessage: "Can you deliver by March 1st?",
      lastMessageAt: "2026-02-11T10:30:00Z",
      unreadCount: 2,
    },
    {
      id: 2,
      rfqId: 2,
      buyerName: "Sarah Johnson",
      lastMessage: "Thanks for the bid. Do you have stock?",
      lastMessageAt: "2026-02-10T14:15:00Z",
      unreadCount: 0,
    },
  ];

  const handleSubmitBid = (rfqId: number) => {
    if (!bidPrice || !leadDays) {
      alert("Please fill in all bid fields");
      return;
    }
    if (!user) {
      alert("Please sign in to submit a bid");
      return;
    }
    // TODO: Call tRPC mutation to submit bid
    console.log("Submitting bid:", { rfqId, bidPrice, leadDays, bidNotes });
    setBidPrice("");
    setLeadDays("");
    setBidNotes("");
    setSelectedRfq(null);
  };

  const handleSendMessage = (threadId: number) => {
    if (!messageContent.trim()) return;
    if (!user) {
      alert("Please sign in to send a message");
      return;
    }
    // TODO: Call tRPC mutation to send message
    console.log("Sending message:", { threadId, content: messageContent });
    setMessageContent("");
  };

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
                <p className="text-3xl font-bold mt-2">{mockRfqs.length}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-600" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Bids</p>
                <p className="text-3xl font-bold mt-2">{mockBids.filter((b) => b.status === "submitted").length}</p>
              </div>
              <DollarSign className="w-8 h-8 text-blue-600" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Conversations</p>
                <p className="text-3xl font-bold mt-2">{mockThreads.length}</p>
              </div>
              <MessageSquare className="w-8 h-8 text-purple-600" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Unread Messages</p>
                <p className="text-3xl font-bold mt-2">{mockThreads.reduce((sum, t) => sum + t.unreadCount, 0)}</p>
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
            <div className="space-y-4">
              {mockRfqs.map((rfq) => (
                <Card key={rfq.id} className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold">{rfq.projectName}</h3>
                        <Badge variant="outline">{rfq.status}</Badge>
                        <Badge className="bg-green-100 text-green-800">Match: {rfq.matchScore}%</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">{rfq.projectLocation}</p>
                      <div className="flex flex-wrap gap-2 mb-4">
                        {rfq.materials.map((material) => (
                          <Badge key={material} variant="secondary">
                            {material}
                          </Badge>
                        ))}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        <Clock className="w-4 h-4 inline mr-1" />
                        Due: {new Date(rfq.dueDate).toLocaleDateString()}
                      </p>
                    </div>
                    <Button
                      onClick={() => setSelectedRfq(rfq.id)}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      Submit Bid
                    </Button>
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
                        <Button onClick={() => handleSubmitBid(rfq.id)} className="bg-green-600 hover:bg-green-700">
                          Submit Bid
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
          </TabsContent>

          {/* My Bids Tab */}
          <TabsContent value="bids" className="space-y-4">
            {mockBids.map((bid) => {
              const rfq = mockRfqs.find((r) => r.id === bid.rfqId);
              return (
                <Card key={bid.id} className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold">{rfq?.projectName}</h3>
                      <p className="text-sm text-muted-foreground mb-3">{rfq?.projectLocation}</p>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Bid Price</p>
                          <p className="font-semibold text-lg">${bid.bidPrice.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Lead Time</p>
                          <p className="font-semibold">{bid.leadDays} days</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Status</p>
                          <Badge className={bid.status === "submitted" ? "bg-blue-100 text-blue-800" : "bg-yellow-100 text-yellow-800"}>
                            {bid.status}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </TabsContent>

          {/* Messages Tab */}
          <TabsContent value="messages" className="space-y-4">
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
                      <h4 className="font-semibold">{thread.buyerName}</h4>
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
                {selectedThread ? (
                  <Card className="p-6 h-full flex flex-col">
                    <div className="flex-1 mb-4 space-y-4 max-h-96 overflow-y-auto">
                      <div className="bg-muted p-3 rounded">
                        <p className="text-sm">
                          <strong>Buyer:</strong> Can you deliver by March 1st?
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">Today at 10:30 AM</p>
                      </div>
                      <div className="bg-primary text-primary-foreground p-3 rounded ml-8">
                        <p className="text-sm">
                          <strong>You:</strong> Yes, we can deliver by Feb 28th.
                        </p>
                        <p className="text-xs opacity-75 mt-1">Today at 10:45 AM</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Textarea
                        placeholder="Type your message..."
                        value={messageContent}
                        onChange={(e) => setMessageContent(e.target.value)}
                        className="min-h-20"
                      />
                      <Button
                        onClick={() => handleSendMessage(selectedThread)}
                        className="w-full bg-green-600 hover:bg-green-700"
                      >
                        Send Message
                      </Button>
                    </div>
                  </Card>
                ) : (
                  <Card className="p-6 h-full flex items-center justify-center">
                    <p className="text-muted-foreground">Select a conversation to view messages</p>
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
