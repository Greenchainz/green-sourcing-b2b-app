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

type SortBy = "matchScore" | "datePosted" | "dueDate" | "distance";
type StatusFilter = "all" | "new" | "active" | "closed";
type DistanceFilter = "all" | "25" | "50" | "100" | "250" | "500";
type ViewMode = "list" | "map";

export default function SupplierRfqDashboard() {
  const [sortBy, setSortBy] = useState<SortBy>("matchScore");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [distanceFilter, setDistanceFilter] = useState<DistanceFilter>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const { user } = useAuth();

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
    // The UnifiedChatWidget will automatically show the conversation
    // This function triggers the widget to open with the specific conversation
    console.log("Opening conversation:", { rfqId, buyerId });
    // TODO: Emit event or use state management to open chat widget with specific conversation
  };

  return (
    <div className="min-h-screen bg-gray-50">
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
              variant={viewMode === "list" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("list")}
              className="flex items-center gap-2"
            >
              <List className="w-4 h-4" />
              List
            </Button>
            <Button
              variant={viewMode === "map" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("map")}
              className="flex items-center gap-2"
            >
              <Map className="w-4 h-4" />
              Map
            </Button>
          </div>

          <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)} className="w-full sm:w-auto">
            <TabsList>
              <TabsTrigger value="all">All RFQs</TabsTrigger>
              <TabsTrigger value="new">New</TabsTrigger>
              <TabsTrigger value="active">Active</TabsTrigger>
              <TabsTrigger value="closed">Closed</TabsTrigger>
            </TabsList>
          </Tabs>

          <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortBy)}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="matchScore">Match Score</SelectItem>
              <SelectItem value="distance">Distance (Nearest First)</SelectItem>
              <SelectItem value="datePosted">Date Posted</SelectItem>
              <SelectItem value="dueDate">Due Date</SelectItem>
            </SelectContent>
          </Select>

          <Select value={distanceFilter} onValueChange={(v) => setDistanceFilter(v as DistanceFilter)}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Max Distance" />
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
        </div>

        {/* Map or List View */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
            <p className="text-gray-600 mt-4">Loading RFQs...</p>
          </div>
        ) : viewMode === "map" ? (
          <RfqMapView
            rfqs={filteredRfqs?.map((rfq: any) => ({
              id: rfq.id,
              projectName: rfq.projectName,
              latitude: rfq.latitude,
              longitude: rfq.longitude,
              distanceMiles: rfq.distanceMiles,
            })) || []}
            supplierLocation={supplierLocation}
            radiusFilter={distanceFilter !== "all" ? parseInt(distanceFilter) : null}
            onRfqClick={(rfqId) => window.location.href = `/rfq/${rfqId}`}
          />
        ) : filteredRfqs && filteredRfqs.length > 0 ? (
          <div className="grid gap-4">
            {filteredRfqs.map((rfq: any) => (
              <Card key={rfq.id} className="p-6 hover:shadow-lg transition-shadow">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  {/* Left: RFQ Info */}
                  <div className="flex-1 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-xl font-semibold text-gray-900">{rfq.projectName}</h3>
                        <div className="flex items-center gap-2 text-gray-600">
                          <MapPin className="w-4 h-4" />
                          {rfq.projectLocation}
                          {rfq.distanceMiles !== null && (
                            <span className="text-xs text-gray-500">
                              ({rfq.distanceMiles} mi
                              {rfq.driveTimeMinutes && ` • ${Math.floor(rfq.driveTimeMinutes / 60)}h ${rfq.driveTimeMinutes % 60}m drive`})
                            </span>
                          )}
                        </div>
                      </div>
                      {getStatusBadge(rfq)}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                      <div className="flex items-center gap-2 text-gray-600">
                        <Package className="w-4 h-4" />
                        <span>{rfq.materialCount} material{rfq.materialCount > 1 ? 's' : ''}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <Calendar className="w-4 h-4" />
                        <span>Posted {formatDistanceToNow(new Date(rfq.createdAt), { addSuffix: true })}</span>
                      </div>
                      {rfq.dueDate && (
                        <div className="flex items-center gap-2 text-gray-600">
                          <Clock className="w-4 h-4" />
                          <span>Due {formatDistanceToNow(new Date(rfq.dueDate), { addSuffix: true })}</span>
                        </div>
                      )}
                    </div>

                    {/* Certification Badges */}
                    {(rfq.matchedCertifications?.length > 0 || rfq.missingCertifications?.length > 0) && (
                      <div className="pt-2">
                        <CertificationBadge
                          certifications={{
                            matched: rfq.matchedCertifications || [],
                            missing: rfq.missingCertifications || [],
                          }}
                          compact
                        />
                      </div>
                    )}

                    {rfq.notes && (
                      <p className="text-sm text-gray-600 line-clamp-2">{rfq.notes}</p>
                    )}
                  </div>

                  {/* Right: Match Score & Actions */}
                  <div className="flex flex-col items-center gap-4 lg:w-48">
                    <div className="text-center">
                      <div className="flex items-center gap-2 mb-1">
                        <TrendingUp className="w-4 h-4 text-gray-600" />
                        <span className="text-xs text-gray-600 uppercase tracking-wide">Match Score</span>
                      </div>
                      <div className={`text-4xl font-bold ${getMatchScoreColor(rfq.matchScore)}`}>
                        {rfq.matchScore}%
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                        <div
                          className="bg-green-600 h-2 rounded-full transition-all"
                          style={{ width: `${rfq.matchScore}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 w-full">
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
                          className="w-full"
                          onClick={() => window.location.href = `/rfq/${rfq.id}#bid`}
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
            ))}
          </div>
        ) : (
          <Card className="p-12 text-center">
            <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No RFQs Found</h3>
            <p className="text-gray-600">
              {statusFilter === "all"
                ? "No RFQs have been matched to your company yet."
                : `No ${statusFilter} RFQs found.`}
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}
