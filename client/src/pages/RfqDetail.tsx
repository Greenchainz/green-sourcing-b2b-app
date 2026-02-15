import React, { useState, useEffect } from "react";
import { useRoute } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, MapPin, Package, Calendar, Clock, Send, ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";

export default function RfqDetail() {
  const { user } = useAuth();
  const [match, params] = useRoute("/rfq/:id");
  const rfqId = params?.id ? parseInt(params.id) : null;

  const [bidPrice, setBidPrice] = useState("");
  const [leadDays, setLeadDays] = useState("");
  const [bidNotes, setBidNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch RFQ details
  const { data: rfqData, isLoading } = trpc.rfqMarketplace.getWithBids.useQuery(
    { rfqId: rfqId || 0 },
    { enabled: !!rfqId }
  );

  // Fetch supplier info
  const { data: supplierData } = trpc.supplier.getProfile.useQuery(undefined, {
    enabled: !!user,
  });

  // Submit bid mutation
  const submitBidMutation = trpc.rfqMarketplace.submitBid.useMutation({
    onSuccess: () => {
      toast.success("Bid submitted successfully!");
      setBidPrice("");
      setLeadDays("");
      setBidNotes("");
    },
    onError: (err) => toast.error(err.message),
  });

  const handleSubmitBid = async () => {
    if (!bidPrice.trim() || !leadDays.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (!supplierData?.id) {
      toast.error("Supplier profile not found");
      return;
    }

    setIsSubmitting(true);
    try {
      await submitBidMutation.mutateAsync({
        rfqId: rfqId || 0,
        supplierId: supplierData.id,
        bidPrice: parseFloat(bidPrice),
        leadDays: parseInt(leadDays),
        notes: bidNotes || undefined,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!match) return null;

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-12 h-12 text-yellow-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Sign In Required</h2>
            <p className="text-muted-foreground mb-4">
              Please sign in to view RFQ details and submit bids.
            </p>
            <Link href="/supplier/register">
              <Button className="w-full">Sign In as Supplier</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground mt-4">Loading RFQ details...</p>
        </div>
      </div>
    );
  }

  if (!rfqData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">RFQ Not Found</h2>
            <p className="text-muted-foreground mb-4">
              The RFQ you're looking for doesn't exist or has been removed.
            </p>
            <Link href="/supplier/rfqs">
              <Button className="w-full">Back to RFQs</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const rfq = rfqData.rfq;
  const items = rfqData.items || [];
  const bids = rfqData.bids || [];
  const hasUserBid = bids.some((b) => b.supplierId === supplierData?.id);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container py-6">
          <Link href="/supplier/rfqs">
            <Button variant="ghost" size="sm" className="mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to RFQs
            </Button>
          </Link>
          <h1 className="text-3xl font-bold">{rfq.projectName}</h1>
          <div className="flex items-center gap-2 text-muted-foreground mt-2">
            <MapPin className="w-4 h-4" />
            {rfq.projectLocation}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: RFQ Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Status & Metadata */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Project Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <Badge className="mt-1">
                      {rfq.status === "submitted" ? "Open" : rfq.status}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Posted</p>
                    <p className="font-semibold mt-1">
                      {new Date(rfq.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  {rfq.dueDate && (
                    <div>
                      <p className="text-sm text-muted-foreground">Due Date</p>
                      <p className="font-semibold mt-1">
                        {new Date(rfq.dueDate).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-muted-foreground">Total Bids</p>
                    <p className="font-semibold mt-1">{bids.length}</p>
                  </div>
                </div>
                {rfq.notes && (
                  <div className="pt-4 border-t">
                    <p className="text-sm text-muted-foreground mb-2">Notes</p>
                    <p className="text-sm">{rfq.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Materials */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  Materials Requested
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {items.length > 0 ? (
                    items.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3 bg-muted rounded"
                      >
                        <div>
                          <p className="font-semibold">Material #{item.materialId}</p>
                          <p className="text-sm text-muted-foreground">
                            {item.quantity} {item.quantityUnit}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-muted-foreground">No materials specified</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Existing Bids */}
            {bids.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Submitted Bids</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {bids.map((bid) => (
                      <div
                        key={bid.id}
                        className="p-3 bg-muted rounded flex items-center justify-between"
                      >
                        <div>
                          <p className="font-semibold">{bid.supplierName}</p>
                          <p className="text-sm text-muted-foreground">
                            {bid.leadDays} days lead time
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-lg">
                            ${parseFloat(bid.bidPrice || "0").toLocaleString()}
                          </p>
                          <Badge variant="outline" className="mt-1">
                            {bid.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right: Bid Submission */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  {hasUserBid ? "Your Bid" : "Submit Your Bid"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {hasUserBid ? (
                  <div className="text-center py-6">
                    <Badge className="bg-green-600 mb-2">Bid Submitted</Badge>
                    <p className="text-sm text-muted-foreground">
                      You have already submitted a bid for this RFQ.
                    </p>
                  </div>
                ) : rfq.status !== "submitted" ? (
                  <div className="text-center py-6">
                    <AlertCircle className="w-12 h-12 text-yellow-600 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">
                      This RFQ is no longer accepting bids.
                    </p>
                  </div>
                ) : (
                  <>
                    <div>
                      <Label className="text-sm">Bid Price *</Label>
                      <div className="flex items-center mt-1">
                        <span className="text-muted-foreground mr-2">$</span>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={bidPrice}
                          onChange={(e) => setBidPrice(e.target.value)}
                          placeholder="0.00"
                          disabled={isSubmitting}
                        />
                      </div>
                    </div>

                    <div>
                      <Label className="text-sm">Lead Time (days) *</Label>
                      <Input
                        type="number"
                        min="1"
                        value={leadDays}
                        onChange={(e) => setLeadDays(e.target.value)}
                        placeholder="14"
                        disabled={isSubmitting}
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label className="text-sm">Notes</Label>
                      <Textarea
                        value={bidNotes}
                        onChange={(e) => setBidNotes(e.target.value)}
                        placeholder="e.g., In stock, ready to ship..."
                        disabled={isSubmitting}
                        className="mt-1"
                        rows={3}
                      />
                    </div>

                    <Button
                      className="w-full"
                      onClick={handleSubmitBid}
                      disabled={isSubmitting || !bidPrice || !leadDays}
                    >
                      <Send className="w-4 h-4 mr-2" />
                      {isSubmitting ? "Submitting..." : "Submit Bid"}
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
