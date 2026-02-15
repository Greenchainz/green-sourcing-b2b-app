import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Calendar, MapPin, Package, TrendingUp, Clock, Map, List, MessageCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { CertificationBadge } from "@/components/CertificationBadge";
import { RfqMapView } from "@/components/RfqMapView";
import { useAuth } from "@/contexts/AuthContext";
import { useChatWidget } from "@/contexts/ChatWidgetContext";
import { BidSubmissionForm } from "@/components/BidSubmissionForm";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type SortBy = "matchScore" | "datePosted" | "dueDate" | "distance";
type StatusFilter = "all" | "new" | "active" | "closed";
type DistanceFilter = "all" | "25" | "50" | "100" | "250" | "500";
type ViewMode = "list" | "map";

export default function SupplierRfqDashboard() {
  const [sortBy, setSortBy] = useState<SortBy>("matchScore");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [distanceFilter, setDistanceFilter] = useState<DistanceFilter>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [selectedRfqId, setSelectedRfqId] = useState<number | null>(null);
  const [showBidForm, setShowBidForm] = useState(false);
  const { user } = useAuth();
  const { openWithConversation } = useChatWidget();

  // Fetch matched RFQs for current supplier
  const { data: rfqs, isLoading } = trpc.supplierRfq.getMatchedRfqs.useQuery();
  
  // Get supplier location from first RFQ's supplier data (will be null if no RFQs)
  const supplierLocation = rfqs && rfqs.length > 0 && rfqs[0].supplierLatitude && rfqs[0].supplierLongitude
    ? { latitude: rfqs[0].supplierLatitude, longitude: rfqs[0].supplierLongitude }
    : null;

  // Filter and sort RFQs
  const filteredRfqs = rfqs
    ?.filter((rfq: any) => {
      // Status filter
      if (statusFilter !== "all") {
        if (statusFilter === "new" && (rfq.status !== "open" || rfq.hasBid)) return false;
        if (statusFilter === "active" && (rfq.status !== "open" || !rfq.hasBid)) return false;
        if (statusFilter === "closed" && rfq.status !== "closed") return false;
      }
      
      // Distance filter
      if (distanceFilter !== "all" && rfq.distanceMiles !== null) {
        const maxDistance = parseInt(distanceFilter);
        if (rfq.distanceMiles > maxDistance) return false;
      }
      
      return true;
    })
    .sort((a: any, b: any) => {
      if (sortBy === "matchScore") return b.matchScore - a.matchScore;
      if (sortBy === "distance") {
        // Sort by distance (nulls last)
        if (a.distanceMiles === null) return 1;
        if (b.distanceMiles === null) return -1;
        return a.distanceMiles - b.distanceMiles;
      }
      if (sortBy === "datePosted") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (sortBy === "dueDate") {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      }
      return 0;
    });

  const getStatusBadge = (rfq: any) => {
    if (rfq.status === "closed") {
      return <Badge variant="secondary">Closed</Badge>;
    }
    if (rfq.hasBid) {
      return <Badge variant="default" className="bg-blue-500">Bid Submitted</Badge>;
    }
    return <Badge variant="default" className="bg-green-500">New</Badge>;
  };

  const getMatchScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-gray-600";
  };

  const handleOpenConversation = (rfqId: number, buyerId: number) => {
    openWithConversation({ rfqId, buyerId });
  };

  const handleSubmitBid = async () => {
    setShowBidForm(false);
    setSelectedRfqId(null);
  };

  const selectedRfq = selectedRfqId ? filteredRfqs?.find((r: any) => r.id === selectedRfqId) : null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Bid Submission Modal */}
      <Dialog open={showBidForm} onOpenChange={setShowBidForm}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Submit Bid</DialogTitle>
            <DialogDescription>
              {selectedRfq ? `Submit your bid for ${selectedRfq.projectName}` : "Submit your bid"}
            </DialogDescription>
          </DialogHeader>
          {selectedRfqId && (
            <BidSubmissionForm rfqId={selectedRfqId} onSuccess={handleSubmitBid} />
          )}
        </DialogContent>
      </Dialog>

      {/* Header */}
      <div className="bg-white border-b">
        <div className="container py-8">
          <h1 className="text-3xl font-bold text-gray-900">RFQ Dashboard</h1>
          <p className="text-gray-600 mt-2">View and respond to matched RFQs</p>
        </div>
      </div>

      <div className="container py-8">
        {/* Filters and Sort */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          {/* View Mode Toggle */}
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={viewMode === "list" ? "default" : "outline"}
              onClick={() => setViewMode("list")}
            >
              <List className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant={viewMode === "map" ? "default" : "outline"}
              onClick={() => setViewMode("map")}
            >
              <Map className="w-4 h-4" />
            </Button>
          </div>

          {/* Filters */}
          <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
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

          <Select value={distanceFilter} onValueChange={(value: any) => setDistanceFilter(value)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Distance" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Distances</SelectItem>
              <SelectItem value="25">Within 25 miles</SelectItem>
              <SelectItem value="50">Within 50 miles</SelectItem>
              <SelectItem value="100">Within 100 miles</SelectItem>
              <SelectItem value="250">Within 250 miles</SelectItem>
              <SelectItem value="500">Within 500 miles</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="matchScore">Match Score</SelectItem>
              <SelectItem value="datePosted">Date Posted</SelectItem>
              <SelectItem value="dueDate">Due Date</SelectItem>
              <SelectItem value="distance">Distance</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Content */}
        {viewMode === "list" ? (
          // List View
          <div className="space-y-4">
            {isLoading ? (
              <Card className="p-12 text-center">
                <p className="text-gray-600">Loading RFQs...</p>
              </Card>
            ) : filteredRfqs && filteredRfqs.length > 0 ? (
              filteredRfqs.map((rfq: any) => (
                <Card key={rfq.id} className="p-6 hover:shadow-lg transition-shadow">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    {/* Left Column - RFQ Info */}
                    <div className="md:col-span-2">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">{rfq.projectName}</h3>
                          <p className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                            <MapPin className="w-4 h-4" />
                            {rfq.projectLocation}
                          </p>
                        </div>
                        {getStatusBadge(rfq)}
                      </div>

                      <div className="space-y-2 text-sm">
                        <p className="flex items-center gap-2 text-gray-700">
                          <Calendar className="w-4 h-4 text-gray-500" />
                          Posted {formatDistanceToNow(new Date(rfq.createdAt), { addSuffix: true })}
                        </p>
                        {rfq.dueDate && (
                          <p className="flex items-center gap-2 text-gray-700">
                            <Clock className="w-4 h-4 text-gray-500" />
                            Due {formatDistanceToNow(new Date(rfq.dueDate), { addSuffix: true })}
                          </p>
                        )}
                        {rfq.distanceMiles !== null && (
                          <p className="flex items-center gap-2 text-gray-700">
                            <MapPin className="w-4 h-4 text-gray-500" />
                            {rfq.distanceMiles.toFixed(1)} miles away
                          </p>
                        )}
                      </div>

                      {/* Materials */}
                      <div className="mt-4">
                        <p className="text-sm font-medium text-gray-700 mb-2">Materials Needed:</p>
                        <div className="flex flex-wrap gap-2">
                          {rfq.materials?.slice(0, 3).map((material: string, idx: number) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              {material}
                            </Badge>
                          ))}
                          {rfq.materials?.length > 3 && (
                            <Badge variant="secondary" className="text-xs">
                              +{rfq.materials.length - 3} more
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right Column - Score and Actions */}
                    <div className="md:col-span-2 flex flex-col justify-between">
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Match Score</p>
                        <p className={`text-3xl font-bold ${getMatchScoreColor(rfq.matchScore)}`}>
                          {rfq.matchScore}%
                        </p>
                        <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                          <div
                            className="bg-green-600 h-2 rounded-full transition-all"
                            style={{ width: `${rfq.matchScore}%` }}
                          />
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 w-full mt-4">
                        <Button
                          variant="default"
                          className="w-full"
                          onClick={() => window.location.href = `/rfq/${rfq.id}`}
                        >
                          <FileText className="w-4 h-4 mr-2" />
                          View Details
                        </Button>
                        {rfq.status === "open" && !rfq.hasBid && (
                          <Button
                            variant="outline"
                            className="w-full bg-green-50 border-green-300 hover:bg-green-100"
                            onClick={() => { setSelectedRfqId(rfq.id); setShowBidForm(true); }}
                          >
                            Submit Bid
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full"
                          onClick={() => handleOpenConversation(rfq.id, rfq.buyerId)}
                        >
                          <MessageCircle className="w-4 h-4 mr-2" />
                          Message Buyer
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              ))
            ) : (
              <Card className="p-12 text-center">
                <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No RFQs match your criteria</p>
              </Card>
            )}
          </div>
        ) : (
          // Map View
          <Card className="p-6">
            {supplierLocation && filteredRfqs ? (
              <RfqMapView rfqs={filteredRfqs.filter((r: any) => r.latitude && r.longitude) as any} supplierLocation={supplierLocation} />
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-600">Map view requires location data</p>
              </div>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}
