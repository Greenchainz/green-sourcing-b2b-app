import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { format, formatDistanceToNow, isPast, isBefore, addDays } from "date-fns";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  FileText,
  Calendar,
  MapPin,
  Package,
  Clock,
  Loader2,
  Send,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Inbox,
  History,
  DollarSign,
  Truck,
  StickyNote,
} from "lucide-react";

type StatusFilter = "all" | "new" | "active" | "closed";
type SortBy = "matchScore" | "datePosted" | "dueDate";

export default function SupplierRfqDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("matched");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortBy, setSortBy] = useState<SortBy>("matchScore");

  // Quote submission dialog state
  const [quoteDialogOpen, setQuoteDialogOpen] = useState(false);
  const [selectedRfq, setSelectedRfq] = useState<any>(null);
  const [bidPrice, setBidPrice] = useState("");
  const [leadDays, setLeadDays] = useState("");
  const [bidNotes, setBidNotes] = useState("");
  const [isSubmittingBid, setIsSubmittingBid] = useState(false);

  // Direct request response state
  const [respondingId, setRespondingId] = useState<number | null>(null);

  // Queries
  const matchedRfqs = trpc.supplierRfq.getMatchedRfqs.useQuery(undefined, {
    enabled: !!user,
  });

  const incomingRequests = trpc.rfqRequests.listIncoming.useQuery(undefined, {
    enabled: !!user,
  });

  const bidHistory = trpc.supplierRfq.getBidHistory.useQuery(
    { limit: 50, offset: 0 },
    { enabled: !!user }
  );

  // Mutations
  const submitBid = trpc.supplierRfq.submitBid.useMutation({
    onSuccess: () => {
      toast.success("Quote submitted successfully!");
      setQuoteDialogOpen(false);
      resetQuoteForm();
      matchedRfqs.refetch();
      bidHistory.refetch();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to submit quote");
    },
  });

  const respondToRequest = trpc.rfqRequests.respond.useMutation({
    onSuccess: (_, variables) => {
      toast.success(
        variables.status === "accepted"
          ? "Request accepted!"
          : "Request declined"
      );
      setRespondingId(null);
      incomingRequests.refetch();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to respond");
      setRespondingId(null);
    },
  });

  const resetQuoteForm = () => {
    setBidPrice("");
    setLeadDays("");
    setBidNotes("");
    setSelectedRfq(null);
  };

  const openQuoteDialog = (rfq: any) => {
    setSelectedRfq(rfq);
    setBidPrice("");
    setLeadDays("");
    setBidNotes("");
    setQuoteDialogOpen(true);
  };

  const handleSubmitQuote = async () => {
    if (!selectedRfq) return;
    const price = parseFloat(bidPrice);
    const days = parseInt(leadDays, 10);

    if (isNaN(price) || price <= 0) {
      toast.error("Please enter a valid bid price");
      return;
    }
    if (isNaN(days) || days <= 0) {
      toast.error("Please enter valid lead days");
      return;
    }

    setIsSubmittingBid(true);
    try {
      await submitBid.mutateAsync({
        rfqId: selectedRfq.id,
        bidPrice: price,
        leadDays: days,
        notes: bidNotes || undefined,
      });
    } finally {
      setIsSubmittingBid(false);
    }
  };

  const handleRespondToRequest = (
    rfqRequestId: number,
    response: "accepted" | "declined"
  ) => {
    setRespondingId(rfqRequestId);
    respondToRequest.mutate({ id: rfqRequestId, status: response });
  };

  // "submitted" and "responded" are the live/bidable states — "open" doesn't exist in our enum
  const isLive = (status: string) => status === "submitted" || status === "responded";

  // Filter and sort matched RFQs
  const filteredRfqs = matchedRfqs.data
    ?.filter((rfq: any) => {
      if (statusFilter === "all") return true;
      if (statusFilter === "new" && isLive(rfq.status) && !rfq.hasBid) return true;
      if (statusFilter === "active" && isLive(rfq.status) && rfq.hasBid) return true;
      if (statusFilter === "closed" && (rfq.status === "awarded" || rfq.status === "closed"))
        return true;
      return false;
    })
    .sort((a: any, b: any) => {
      if (sortBy === "matchScore") return (b.matchScore || 0) - (a.matchScore || 0);
      if (sortBy === "datePosted")
        return (
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      if (sortBy === "dueDate") {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return (
          new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
        );
      }
      return 0;
    });

  const getMatchScoreBadge = (score: number) => {
    if (score >= 80)
      return (
        <Badge className="bg-green-100 text-green-800 border-green-300">
          {score}% Match
        </Badge>
      );
    if (score >= 50)
      return (
        <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">
          {score}% Match
        </Badge>
      );
    return (
      <Badge className="bg-red-100 text-red-800 border-red-300">
        {score}% Match
      </Badge>
    );
  };

  const getDueDateDisplay = (dueDate: string | null) => {
    if (!dueDate) return null;
    const date = new Date(dueDate);
    const isOverdue = isPast(date);
    const isApproaching = !isOverdue && isBefore(date, addDays(new Date(), 7));

    return (
      <span
        className={
          isOverdue
            ? "text-red-600 font-medium"
            : isApproaching
              ? "text-orange-600 font-medium"
              : "text-gray-600"
        }
      >
        {isOverdue ? "Overdue" : `Due ${formatDistanceToNow(date, { addSuffix: true })}`}
      </span>
    );
  };

  const getBidStatusBadge = (status: string) => {
    switch (status) {
      case "submitted":
        return <Badge className="bg-blue-100 text-blue-800 border-blue-300">Submitted</Badge>;
      case "accepted":
        return <Badge className="bg-green-100 text-green-800 border-green-300">Accepted</Badge>;
      case "rejected":
        return <Badge className="bg-red-100 text-red-800 border-red-300">Rejected</Badge>;
      case "expired":
        return <Badge className="bg-gray-100 text-gray-600 border-gray-300">Expired</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getRequestStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">Pending</Badge>;
      case "accepted":
        return <Badge className="bg-green-100 text-green-800 border-green-300">Accepted</Badge>;
      case "declined":
        return <Badge className="bg-red-100 text-red-800 border-red-300">Declined</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />

      <main className="flex-1 px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">RFQ Dashboard</h1>
            <p className="text-gray-600 mt-1">
              View and respond to matched RFQs, manage direct requests, and track your bids
            </p>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-6">
              <TabsTrigger
                value="matched"
                className="data-[state=active]:bg-[#2D6A4F] data-[state=active]:text-white"
              >
                <FileText className="w-4 h-4 mr-2" />
                Matched RFQs
                {matchedRfqs.data && (
                  <Badge variant="secondary" className="ml-2 text-xs">
                    {matchedRfqs.data.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="requests"
                className="data-[state=active]:bg-[#2D6A4F] data-[state=active]:text-white"
              >
                <Inbox className="w-4 h-4 mr-2" />
                Direct Requests
                {incomingRequests.data && (
                  <Badge variant="secondary" className="ml-2 text-xs">
                    {incomingRequests.data.filter((r: any) => r.status === "pending").length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="history"
                className="data-[state=active]:bg-[#2D6A4F] data-[state=active]:text-white"
              >
                <History className="w-4 h-4 mr-2" />
                Bid History
              </TabsTrigger>
            </TabsList>

            {/* ===== Matched RFQs Tab ===== */}
            <TabsContent value="matched">
              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-3 mb-6">
                <Select
                  value={statusFilter}
                  onValueChange={(v) => setStatusFilter(v as StatusFilter)}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All RFQs</SelectItem>
                    <SelectItem value="new">New RFQs</SelectItem>
                    <SelectItem value="active">Active Bids</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={sortBy}
                  onValueChange={(v) => setSortBy(v as SortBy)}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="matchScore">Match Score</SelectItem>
                    <SelectItem value="datePosted">Date Posted</SelectItem>
                    <SelectItem value="dueDate">Due Date</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* RFQ Cards */}
              {matchedRfqs.isLoading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="w-8 h-8 animate-spin text-[#2D6A4F]" />
                  <span className="ml-3 text-gray-600">Loading matched RFQs...</span>
                </div>
              ) : matchedRfqs.isError ? (
                <Card className="p-8 text-center">
                  <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
                  <p className="text-gray-700 font-medium">Failed to load RFQs</p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => matchedRfqs.refetch()}
                  >
                    Retry
                  </Button>
                </Card>
              ) : filteredRfqs && filteredRfqs.length > 0 ? (
                <div className="grid gap-4">
                  {filteredRfqs.map((rfq: any) => (
                    <Card
                      key={rfq.id}
                      className="hover:shadow-md transition-shadow border border-gray-200"
                    >
                      <CardContent className="p-6">
                        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                          {/* Left: RFQ info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start gap-3 mb-3">
                              <div className="flex-1 min-w-0">
                                <h3 className="text-lg font-semibold text-gray-900 truncate">
                                  {rfq.projectName}
                                </h3>
                                <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                                  <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                                  {rfq.projectLocation || "Location not specified"}
                                </p>
                              </div>
                              {getMatchScoreBadge(rfq.matchScore || 0)}
                            </div>

                            {/* Material types */}
                            {rfq.materials && rfq.materials.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 mb-3">
                                {rfq.materials.slice(0, 4).map((m: string, i: number) => (
                                  <Badge key={i} variant="secondary" className="text-xs">
                                    <Package className="w-3 h-3 mr-1" />
                                    {m}
                                  </Badge>
                                ))}
                                {rfq.materials.length > 4 && (
                                  <Badge variant="secondary" className="text-xs">
                                    +{rfq.materials.length - 4} more
                                  </Badge>
                                )}
                              </div>
                            )}

                            {/* Meta info */}
                            <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5" />
                                Posted{" "}
                                {formatDistanceToNow(new Date(rfq.createdAt), {
                                  addSuffix: true,
                                })}
                              </span>
                              {rfq.dueDate && (
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3.5 h-3.5" />
                                  {getDueDateDisplay(rfq.dueDate)}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Right: Actions */}
                          <div className="flex flex-col gap-2 sm:flex-row lg:flex-col lg:items-end">
                            {rfq.hasBid ? (
                              <Badge className="bg-blue-100 text-blue-800 border-blue-300">
                                Bid Submitted
                              </Badge>
                            ) : isLive(rfq.status) ? (
                              <Button
                                className="bg-[#2D6A4F] hover:bg-[#245a42] text-white"
                                onClick={() => openQuoteDialog(rfq)}
                              >
                                <Send className="w-4 h-4 mr-2" />
                                Submit Quote
                              </Button>
                            ) : (
                              <Badge variant="secondary">
                                {rfq.status === "awarded" ? "Awarded" : "Closed"}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="p-12 text-center border-dashed">
                  <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600 font-medium">No matched RFQs found</p>
                  <p className="text-sm text-gray-400 mt-1">
                    Complete your profile to improve matching accuracy
                  </p>
                </Card>
              )}
            </TabsContent>

            {/* ===== Direct Requests Tab ===== */}
            <TabsContent value="requests">
              {incomingRequests.isLoading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="w-8 h-8 animate-spin text-[#2D6A4F]" />
                  <span className="ml-3 text-gray-600">Loading requests...</span>
                </div>
              ) : incomingRequests.isError ? (
                <Card className="p-8 text-center">
                  <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
                  <p className="text-gray-700 font-medium">Failed to load requests</p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => incomingRequests.refetch()}
                  >
                    Retry
                  </Button>
                </Card>
              ) : incomingRequests.data && incomingRequests.data.length > 0 ? (
                <div className="grid gap-4">
                  {incomingRequests.data.map((req: any) => (
                    <Card
                      key={req.id}
                      className="border border-gray-200 hover:shadow-md transition-shadow"
                    >
                      <CardContent className="p-6">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="font-semibold text-gray-900">
                                {req.materialType || "Material Request"}
                              </h3>
                              {getRequestStatusBadge(req.status)}
                            </div>

                            {req.quantity && (
                              <p className="text-sm text-gray-600 mb-1">
                                <span className="font-medium">Quantity:</span>{" "}
                                {req.quantity}
                              </p>
                            )}
                            {req.specs && (
                              <p className="text-sm text-gray-600 mb-1">
                                <span className="font-medium">Specs:</span> {req.specs}
                              </p>
                            )}

                            <p className="text-xs text-gray-400 mt-2">
                              Received{" "}
                              {formatDistanceToNow(new Date(req.createdAt), {
                                addSuffix: true,
                              })}
                            </p>
                          </div>

                          {req.status === "pending" && (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                className="bg-[#2D6A4F] hover:bg-[#245a42] text-white"
                                disabled={respondingId === req.id}
                                onClick={() =>
                                  handleRespondToRequest(req.id, "accepted")
                                }
                              >
                                {respondingId === req.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <>
                                    <CheckCircle2 className="w-4 h-4 mr-1" />
                                    Accept
                                  </>
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-red-600 border-red-300 hover:bg-red-50"
                                disabled={respondingId === req.id}
                                onClick={() =>
                                  handleRespondToRequest(req.id, "declined")
                                }
                              >
                                {respondingId === req.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <>
                                    <XCircle className="w-4 h-4 mr-1" />
                                    Decline
                                  </>
                                )}
                              </Button>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="p-12 text-center border-dashed">
                  <Inbox className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600 font-medium">No direct requests</p>
                  <p className="text-sm text-gray-400 mt-1">
                    When project teams send you direct RFQ requests, they'll appear here
                  </p>
                </Card>
              )}
            </TabsContent>

            {/* ===== Bid History Tab ===== */}
            <TabsContent value="history">
              {bidHistory.isLoading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="w-8 h-8 animate-spin text-[#2D6A4F]" />
                  <span className="ml-3 text-gray-600">Loading bid history...</span>
                </div>
              ) : bidHistory.isError ? (
                <Card className="p-8 text-center">
                  <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
                  <p className="text-gray-700 font-medium">Failed to load bid history</p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => bidHistory.refetch()}
                  >
                    Retry
                  </Button>
                </Card>
              ) : bidHistory.data && bidHistory.data.length > 0 ? (
                <Card>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b bg-gray-50">
                          <th className="text-left text-sm font-medium text-gray-600 px-6 py-3">
                            Project
                          </th>
                          <th className="text-left text-sm font-medium text-gray-600 px-6 py-3">
                            Bid Price
                          </th>
                          <th className="text-left text-sm font-medium text-gray-600 px-6 py-3">
                            Lead Time
                          </th>
                          <th className="text-left text-sm font-medium text-gray-600 px-6 py-3">
                            Status
                          </th>
                          <th className="text-left text-sm font-medium text-gray-600 px-6 py-3">
                            Submitted
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {bidHistory.data.map((bid: any) => (
                          <tr
                            key={bid.id}
                            className="border-b last:border-0 hover:bg-gray-50 transition-colors"
                          >
                            <td className="px-6 py-4">
                              <p className="font-medium text-gray-900">
                                {bid.projectName || `RFQ #${bid.rfqId}`}
                              </p>
                            </td>
                            <td className="px-6 py-4 text-gray-700">
                              ${Number(bid.bidPrice).toLocaleString("en-US", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </td>
                            <td className="px-6 py-4 text-gray-700">
                              {bid.leadDays} days
                            </td>
                            <td className="px-6 py-4">
                              {getBidStatusBadge(bid.status)}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-500">
                              {format(new Date(bid.createdAt), "MMM d, yyyy")}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              ) : (
                <Card className="p-12 text-center border-dashed">
                  <History className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600 font-medium">No bid history yet</p>
                  <p className="text-sm text-gray-400 mt-1">
                    Your submitted quotes will be tracked here
                  </p>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>

      {/* Quote Submission Dialog */}
      <Dialog
        open={quoteDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            resetQuoteForm();
          }
          setQuoteDialogOpen(open);
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Submit Quote</DialogTitle>
            <DialogDescription>
              {selectedRfq
                ? `Provide your quote for "${selectedRfq.projectName}"`
                : "Submit your quote for this RFQ"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="bidPrice" className="flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-gray-500" />
                Bid Price ($) *
              </Label>
              <Input
                id="bidPrice"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={bidPrice}
                onChange={(e) => setBidPrice(e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="leadDays" className="flex items-center gap-1.5">
                <Truck className="w-4 h-4 text-gray-500" />
                Lead Time (days) *
              </Label>
              <Input
                id="leadDays"
                type="number"
                min="1"
                placeholder="e.g. 14"
                value={leadDays}
                onChange={(e) => setLeadDays(e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="bidNotes" className="flex items-center gap-1.5">
                <StickyNote className="w-4 h-4 text-gray-500" />
                Notes (optional)
              </Label>
              <Textarea
                id="bidNotes"
                placeholder="Additional details, availability, shipping info..."
                value={bidNotes}
                onChange={(e) => setBidNotes(e.target.value)}
                rows={3}
                className="mt-1"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setQuoteDialogOpen(false);
                resetQuoteForm();
              }}
              disabled={isSubmittingBid}
            >
              Cancel
            </Button>
            <Button
              className="bg-[#2D6A4F] hover:bg-[#245a42] text-white"
              onClick={handleSubmitQuote}
              disabled={isSubmittingBid || !bidPrice || !leadDays}
            >
              {isSubmittingBid ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Submit Quote
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
}
