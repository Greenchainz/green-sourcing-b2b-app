import { useState } from "react";
import { trpc } from "../lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Textarea } from "../components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { CheckCircle2, XCircle, Building2, MapPin, Mail, Phone, Calendar } from "lucide-react";


export default function AdminVerificationQueue() {
  const [selectedSupplier, setSelectedSupplier] = useState<any>(null);
  const [actionType, setActionType] = useState<"approve" | "reject" | null>(null);
  const [notes, setNotes] = useState("");

  const { data: pendingSuppliers, isLoading, refetch } = trpc.admin.getPendingSuppliers.useQuery();
  const approveSupplier = trpc.admin.approveSupplier.useMutation({
    onSuccess: () => {
      alert("Supplier approved and notified!");
      refetch();
      setSelectedSupplier(null);
      setActionType(null);
      setNotes("");
    },
  });
  const rejectSupplier = trpc.admin.rejectSupplier.useMutation({
    onSuccess: () => {
      alert("Supplier rejected and notified.");
      refetch();
      setSelectedSupplier(null);
      setActionType(null);
      setNotes("");
    },
  });

  const handleAction = () => {
    if (!selectedSupplier) return;

    if (actionType === "approve") {
      approveSupplier.mutate({ supplierId: selectedSupplier.id, notes });
    } else if (actionType === "reject") {
      rejectSupplier.mutate({ supplierId: selectedSupplier.id, notes });
    }
  };

  if (isLoading) {
    return (
      <div className="container py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Supplier Verification Queue</h1>
        <p className="text-gray-600 mt-2">Review and approve supplier registrations</p>
      </div>

      {!pendingSuppliers || pendingSuppliers.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">All Caught Up!</h3>
            <p className="text-gray-600">No pending supplier verifications at the moment.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {pendingSuppliers.map((supplier: any) => (
            <Card key={supplier.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Building2 className="w-8 h-8 text-blue-600" />
                    <div>
                      <CardTitle className="text-xl">{supplier.companyName}</CardTitle>
                      <CardDescription className="flex items-center gap-2 mt-1">
                        <Calendar className="w-4 h-4" />
                        Registered {new Date(supplier.createdAt).toLocaleDateString()}
                      </CardDescription>
                    </div>
                  </div>
                  <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                    Pending Review
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="w-4 h-4 text-gray-500" />
                    <span className="text-gray-600">Email:</span>
                    <span className="font-medium">{supplier.email}</span>
                  </div>
                  {supplier.phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="w-4 h-4 text-gray-500" />
                      <span className="text-gray-600">Phone:</span>
                      <span className="font-medium">{supplier.phone}</span>
                    </div>
                  )}
                  {supplier.location && (
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="w-4 h-4 text-gray-500" />
                      <span className="text-gray-600">Location:</span>
                      <span className="font-medium">{supplier.location}</span>
                    </div>
                  )}
                  {supplier.website && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-gray-600">Website:</span>
                      <a href={supplier.website} target="_blank" rel="noopener noreferrer" className="font-medium text-blue-600 hover:underline">
                        {supplier.website}
                      </a>
                    </div>
                  )}
                </div>

                {supplier.description && (
                  <div className="pt-4 border-t">
                    <p className="text-sm text-gray-600 font-medium mb-2">Company Description:</p>
                    <p className="text-sm text-gray-700">{supplier.description}</p>
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  <Button
                    onClick={() => {
                      setSelectedSupplier(supplier);
                      setActionType("approve");
                    }}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Approve
                  </Button>
                  <Button
                    onClick={() => {
                      setSelectedSupplier(supplier);
                      setActionType("reject");
                    }}
                    variant="destructive"
                    className="flex-1"
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Reject
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Confirmation Dialog */}
      <Dialog open={actionType !== null} onOpenChange={() => { setActionType(null); setNotes(""); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === "approve" ? "Approve Supplier" : "Reject Supplier"}
            </DialogTitle>
            <DialogDescription>
              {actionType === "approve"
                ? `Approve ${selectedSupplier?.companyName}? They will be notified via email and gain access to the platform.`
                : `Reject ${selectedSupplier?.companyName}? They will be notified via email with your feedback.`}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <label className="text-sm font-medium mb-2 block">
              {actionType === "approve" ? "Welcome Message (Optional)" : "Rejection Reason (Required)"}
            </label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={
                actionType === "approve"
                  ? "Welcome to GreenChainz! We're excited to have you on board..."
                  : "Please provide a reason for rejection..."
              }
              rows={4}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setActionType(null); setNotes(""); }}>
              Cancel
            </Button>
            <Button
              onClick={handleAction}
              disabled={actionType === "reject" && !notes.trim()}
              className={actionType === "approve" ? "bg-green-600 hover:bg-green-700" : ""}
            >
              {actionType === "approve" ? "Approve" : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
