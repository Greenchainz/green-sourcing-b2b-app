import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Clock, MessageSquare, CheckCircle2, XCircle, ArrowRight, FileDown } from "lucide-react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useState } from "react";

// Status values come from the rfqRequests table
const STATUS_CONFIG = {
  pending:   { label: "Pending",   color: "bg-blue-500",   icon: Clock         },
  accepted:  { label: "Accepted",  color: "bg-green-500",  icon: CheckCircle2  },
  declined:  { label: "Declined",  color: "bg-red-500",    icon: XCircle       },
  fulfilled: { label: "Fulfilled", color: "bg-purple-500", icon: CheckCircle2  },
  cancelled: { label: "Cancelled", color: "bg-gray-600",   icon: XCircle       },
} as const;

type StatusKey = keyof typeof STATUS_CONFIG;

/** Pull display fields out of the specs JSON blob */
function parseSpecs(specs: string | null): { projectName: string; projectLocation: string; notes: string } {
  if (specs) {
    try {
      const p = JSON.parse(specs);
      const info = p?.projectInfo ?? p;
      const name = info?.projectName as string | undefined;
      const city = info?.projectCity as string | undefined;
      const state = info?.projectState as string | undefined;
      const notes = (info?.notes ?? info?.additionalNotes ?? p?.notes ?? "") as string;
      return {
        projectName: name || "",
        projectLocation: [city, state].filter(Boolean).join(", "),
        notes,
      };
    } catch { /* not JSON */ }
  }
  return { projectName: "", projectLocation: "", notes: "" };
}

export default function RfqDashboard() {
  const [selectedRfqId, setSelectedRfqId] = useState<number | null>(null);

  // Use rfqRequests.listMine — the same table createMulti writes to
  const { data: rawRfqs = [], isLoading: rfqsLoading } = trpc.rfqRequests.listMine.useQuery(undefined, {
    staleTime: 30_000,
  });

  // Enrich each row with derived display fields
  const rfqs = rawRfqs.map((r) => {
    const { projectName, projectLocation, notes } = parseSpecs(r.specs ?? null);
    return {
      ...r,
      projectName: projectName || r.materialType,
      projectLocation,
      notes,
    };
  });

  const selectedRfq = rfqs.find((r) => r.id === selectedRfqId) ?? null;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <div className="container py-6 flex-1">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">RFQ Dashboard</h1>
          <p className="text-muted-foreground">Track your requests for quotation and compare supplier bids</p>
        </div>

        <Tabs defaultValue="all" className="w-full">
          <TabsList>
            <TabsTrigger value="all">All RFQs</TabsTrigger>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="accepted">Accepted</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            {rfqsLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-32" />
                <Skeleton className="h-32" />
              </div>
            ) : rfqs.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* RFQ List */}
                <div className="lg:col-span-1 space-y-3">
                  {rfqs.map((rfq) => {
                    const status = ((rfq.status as string) || "pending") as StatusKey;
                    const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;
                    const StatusIcon = config.icon;
                    return (
                      <Card
                        key={rfq.id}
                        className={`cursor-pointer transition-all ${selectedRfqId === rfq.id ? "ring-2 ring-primary" : ""}`}
                        onClick={() => setSelectedRfqId(rfq.id)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-2">
                            <h3 className="font-semibold text-sm">{rfq.projectName}</h3>
                            <Badge className={`${config.color} text-white text-xs`}>
                              <StatusIcon className="w-3 h-3 mr-1" />
                              {config.label}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mb-2">{rfq.projectLocation || rfq.materialType}</p>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">
                              {rfq.supplierName ?? `Supplier #${rfq.supplierId}`}
                            </span>
                            <ArrowRight className="w-3 h-3 text-muted-foreground" />
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>

                {/* RFQ Details */}
                <div className="lg:col-span-2">
                  {selectedRfq ? (
                    <div className="space-y-4">
                      {/* RFQ Header */}
                      <Card>
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div>
                              <CardTitle className="text-xl">{selectedRfq.projectName}</CardTitle>
                              <p className="text-sm text-muted-foreground mt-1">
                                {selectedRfq.projectLocation || selectedRfq.materialType}
                              </p>
                            </div>
                            <Badge className={`${(STATUS_CONFIG[(selectedRfq.status as StatusKey)] ?? STATUS_CONFIG.pending).color} text-white`}>
                              {(STATUS_CONFIG[(selectedRfq.status as StatusKey)] ?? STATUS_CONFIG.pending).label}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <p className="text-xs text-muted-foreground">Supplier</p>
                              <p className="font-semibold">{selectedRfq.supplierName ?? `Supplier #${selectedRfq.supplierId}`}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Submitted</p>
                              <p className="font-semibold">
                                {new Date(selectedRfq.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Material</p>
                              <p className="font-semibold">{selectedRfq.materialType}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Quantity</p>
                              <p className="font-semibold">{selectedRfq.quantity}</p>
                            </div>
                          </div>
                          {selectedRfq.notes && (
                            <div className="pt-3 border-t">
                              <p className="text-xs text-muted-foreground mb-1">Notes</p>
                              <p className="text-sm">{selectedRfq.notes}</p>
                            </div>
                          )}
                        </CardContent>
                      </Card>

                      {/* Waiting for bids */}
                      {selectedRfq.status === "pending" && (
                        <Card>
                          <CardContent className="p-8 text-center">
                            <Clock className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                            <p className="text-sm text-muted-foreground mb-2">Waiting for supplier response...</p>
                            <p className="text-xs text-muted-foreground">
                              Suppliers typically respond within 24–48 hours.
                            </p>
                          </CardContent>
                        </Card>
                      )}

                      {/* Message supplier link */}
                      <div className="flex gap-2">
                        <Link href={`/rfqs/${selectedRfq.id}`}>
                          <Button size="sm" variant="outline">
                            <FileDown className="w-4 h-4 mr-1" />
                            View Full Detail
                          </Button>
                        </Link>
                        <Button size="sm" variant="ghost">
                          <MessageSquare className="w-4 h-4 mr-1" />
                          Message Supplier
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Card>
                      <CardContent className="p-8 text-center">
                        <p className="text-muted-foreground">Select an RFQ to view details</p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <p className="text-muted-foreground mb-4">No RFQs yet</p>
                  <Link href="/rfq/new">
                    <Button className="bg-green-600 hover:bg-green-700">Send your first RFQ</Button>
                  </Link>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="active">
            {rfqsLoading ? (
              <Skeleton className="h-32" />
            ) : rfqs.filter((r) => r.status === "pending").length > 0 ? (
              <div className="space-y-3">
                {rfqs
                  .filter((r) => r.status === "pending")
                  .map((rfq) => (
                    <Card key={rfq.id} className="cursor-pointer" onClick={() => setSelectedRfqId(rfq.id)}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold">{rfq.projectName}</p>
                            <p className="text-sm text-muted-foreground">{rfq.projectLocation || rfq.materialType}</p>
                          </div>
                          <Badge className="bg-blue-500 text-white">Pending</Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <p className="text-muted-foreground">No active RFQs</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="accepted">
            {rfqsLoading ? (
              <Skeleton className="h-32" />
            ) : rfqs.filter((r) => r.status === "accepted").length > 0 ? (
              <div className="space-y-3">
                {rfqs
                  .filter((r) => r.status === "accepted")
                  .map((rfq) => (
                    <Card key={rfq.id} className="cursor-pointer" onClick={() => setSelectedRfqId(rfq.id)}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold">{rfq.projectName}</p>
                            <p className="text-sm text-muted-foreground">{rfq.projectLocation || rfq.materialType}</p>
                          </div>
                          <Badge className="bg-green-500 text-white">Accepted</Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <p className="text-muted-foreground">No accepted RFQs yet</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
      <Footer />
    </div>
  );
}
