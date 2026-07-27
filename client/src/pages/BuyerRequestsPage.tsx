/**
 * BuyerRequestsPage — /buyer/requests
 *
 * Lists all sourcing requests created by the current buyer.
 * Entry point to individual request detail pages.
 */

import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertCircle,
  Plus,
  MapPin,
  Calendar,
  ArrowRight,
  FileText,
  DollarSign,
  ClipboardList,
  UserCheck,
  ArrowLeftRight,
  FolderOpen,
  Package,
  Zap,
  MessageSquare,
} from "lucide-react";

const REQUEST_TYPE_ICONS: Record<string, React.ElementType> = {
  rfi:                     FileText,
  rfq_quote:               DollarSign,
  rfp:                     ClipboardList,
  supplier_qualification:  UserCheck,
  alternative_material:    ArrowLeftRight,
  submittal_documentation: FolderOpen,
  bid_package:             Package,
};

const REQUEST_TYPE_LABELS: Record<string, string> = {
  rfi:                     "RFI",
  rfq_quote:               "RFQ",
  rfp:                     "RFP",
  supplier_qualification:  "Qualification",
  alternative_material:    "Alternative",
  submittal_documentation: "Submittal",
  bid_package:             "Bid Package",
};

const STATUS_STYLES: Record<string, string> = {
  draft:     "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  submitted: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  responded: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  awarded:   "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  closed:    "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400",
};

export default function BuyerRequestsPage() {
  const [, navigate] = useLocation();

  const { data: requests, isLoading, error } =
    trpc.sourcingRequest.listMine.useQuery(
      { limit: 50 },
      { placeholderData: prev => prev }
    );

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-8 space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Zap className="w-5 h-5 text-green-600" />
              <h1 className="text-2xl font-bold">Sourcing Requests</h1>
            </div>
            <p className="text-muted-foreground text-sm">
              All your RFIs, RFQs, RFPs, and supplier qualification requests.
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button
              variant="outline"
              onClick={() => navigate("/buyer/submittals")}
            >
              <FolderOpen className="w-4 h-4 mr-1.5" />
              Submittal log
            </Button>
            <Button
              onClick={() => navigate("/buyer/new-request")}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              New request
            </Button>
          </div>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        )}

        {/* Error */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="w-4 h-4" />
            <AlertDescription>{error.message}</AlertDescription>
          </Alert>
        )}

        {/* Empty state */}
        {!isLoading && !error && requests?.length === 0 && (
          <Card>
            <CardContent className="py-16 text-center">
              <Zap className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No requests yet</h3>
              <p className="text-muted-foreground text-sm mb-6 max-w-sm mx-auto">
                Describe what you need and GreenChainz will classify it as an RFI, RFQ,
                RFP, or supplier qualification request — then generate supplier-ready fields.
              </p>
              <Button
                onClick={() => navigate("/buyer/new-request")}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <Zap className="w-4 h-4 mr-1.5" />
                Create your first request
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Request list */}
        {!isLoading && !error && requests && requests.length > 0 && (
          <div className="space-y-3">
            {requests.map((req) => {
              const TypeIcon = REQUEST_TYPE_ICONS[req.requestType ?? "rfq_quote"] ?? FileText;
              const typeLabel = REQUEST_TYPE_LABELS[req.requestType ?? "rfq_quote"] ?? "RFQ";
              const statusClass = STATUS_STYLES[req.status ?? "submitted"] ?? STATUS_STYLES.submitted;

              return (
                <Card
                  key={req.id}
                  className="cursor-pointer hover:shadow-md transition-shadow border-border/60"
                  onClick={() => navigate(`/buyer/requests/${req.id}`)}
                >
                  <CardContent className="py-4 px-5">
                    <div className="flex items-center gap-4">
                      {/* Type icon */}
                      <div className="p-2 rounded-lg bg-green-50 dark:bg-green-950/30 shrink-0">
                        <TypeIcon className="w-5 h-5 text-green-600" />
                      </div>

                      {/* Main content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <Badge variant="outline" className="text-xs">
                            {typeLabel}
                          </Badge>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusClass}`}>
                            {req.status?.charAt(0).toUpperCase() + (req.status?.slice(1) ?? "")}
                          </span>
                        </div>

                        <h3 className="font-semibold truncate">{req.projectName}</h3>

                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                          {req.projectLocation && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {req.projectLocation}
                            </span>
                          )}
                          {req.dueDate && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              Due {new Date(req.dueDate).toLocaleDateString()}
                            </span>
                          )}
                          {req.createdAt && (
                            <span>
                              Created {new Date(req.createdAt).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Response count + arrow */}
                      <div className="flex items-center gap-4 shrink-0">
                        {Number(req.responseCount) > 0 && (
                          <div className="text-center">
                            <p className="text-lg font-bold text-green-600">
                              {req.responseCount}
                            </p>
                            <p className="text-xs text-muted-foreground flex items-center gap-0.5">
                              <MessageSquare className="w-2.5 h-2.5" />
                              responses
                            </p>
                          </div>
                        )}
                        <ArrowRight className="w-4 h-4 text-muted-foreground" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

      </main>

      <Footer />
    </div>
  );
}
