import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Loader2, CheckCircle, XCircle, AlertCircle, Search, Eye, Mail } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { Textarea } from '@/components/ui/textarea';

interface SupplierDetailModalProps {
  open: boolean;
  supplierId: number | null;
  onClose: () => void;
  onApprove: (notes: string) => void;
  onReject: (notes: string) => void;
  isLoading: boolean;
}

function SupplierDetailModal({ open, supplierId, onClose, onApprove, onReject, isLoading }: SupplierDetailModalProps) {
  const [actionNotes, setActionNotes] = useState('');
  const [action, setAction] = useState<'approve' | 'reject' | null>(null);

  const { data: supplier, isLoading: detailLoading } = trpc.admin.getSupplierDetail.useQuery(
    { supplierId: supplierId || 0 },
    { enabled: open && supplierId !== null }
  );

  const handleApprove = () => {
    onApprove(actionNotes);
    setActionNotes('');
    setAction(null);
  };

  const handleReject = () => {
    onReject(actionNotes);
    setActionNotes('');
    setAction(null);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Supplier Details</DialogTitle>
        </DialogHeader>

        {detailLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-accent" />
          </div>
        ) : supplier ? (
          <div className="space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Company Name</p>
                <p className="font-medium">{supplier.companyName}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{supplier.email}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Phone</p>
                <p className="font-medium">{supplier.phone || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Location</p>
                <p className="font-medium">{supplier.location || 'N/A'}</p>
              </div>
            </div>

            {/* Website & Certifications */}
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Website</p>
              {supplier.website ? (
                <a href={supplier.website} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
                  {supplier.website}
                </a>
              ) : (
                <p className="text-sm">N/A</p>
              )}
            </div>

            {/* Certifications */}
            {supplier.certifications && Array.isArray(supplier.certifications) && supplier.certifications.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Certifications</p>
                <div className="flex flex-wrap gap-2">
                  {supplier.certifications.map((cert: string) => (
                    <Badge key={cert} variant="secondary">
                      {cert}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Sustainability Score */}
            {supplier.sustainabilityScore && (
              <div>
                <p className="text-sm text-muted-foreground">Sustainability Score</p>
                <p className="text-lg font-semibold text-accent">{supplier.sustainabilityScore}</p>
              </div>
            )}

            {/* Description */}
            {supplier.description && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Company Description</p>
                <p className="text-sm">{supplier.description}</p>
              </div>
            )}

            {/* Status */}
            <div className="pt-4 border-t">
              <p className="text-sm text-muted-foreground mb-2">Current Status</p>
              <Badge
                variant={
                  supplier.verificationStatus === 'approved'
                    ? 'default'
                    : supplier.verificationStatus === 'rejected'
                      ? 'destructive'
                      : 'secondary'
                }
              >
                {supplier.verificationStatus.toUpperCase()}
              </Badge>
            </div>

            {/* Action Section */}
            {supplier.verificationStatus === 'pending' && (
              <div className="space-y-4 pt-4 border-t">
                {action ? (
                  <div className="space-y-3">
                    <Textarea
                      placeholder={
                        action === 'approve'
                          ? 'Optional message to send to the supplier...'
                          : 'Reason for rejection (required)...'
                      }
                      value={actionNotes}
                      onChange={(e) => setActionNotes(e.target.value)}
                      className="min-h-24"
                    />
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setAction(null);
                          setActionNotes('');
                        }}
                        disabled={isLoading}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={() => (action === 'approve' ? handleApprove() : handleReject())}
                        disabled={isLoading || (action === 'reject' && !actionNotes.trim())}
                        variant={action === 'approve' ? 'default' : 'destructive'}
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            Processing...
                          </>
                        ) : action === 'approve' ? (
                          'Confirm Approval'
                        ) : (
                          'Confirm Rejection'
                        )}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Button
                      onClick={() => setAction('approve')}
                      variant="default"
                      className="flex-1 gap-2"
                      disabled={isLoading}
                    >
                      <CheckCircle className="h-4 w-4" />
                      Approve
                    </Button>
                    <Button
                      onClick={() => setAction('reject')}
                      variant="destructive"
                      className="flex-1 gap-2"
                      disabled={isLoading}
                    >
                      <XCircle className="h-4 w-4" />
                      Reject
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <p className="text-center text-muted-foreground">Supplier not found</p>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function AdminSupplierDashboard() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSupplierId, setSelectedSupplierId] = useState<number | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('pending');

  // Fetch data
  const { data: stats, isLoading: statsLoading } = trpc.admin.getSupplierStats.useQuery();
  const { data: allSuppliers, isLoading: suppliersLoading, refetch } = trpc.admin.getAllSuppliers.useQuery();

  // Mutations
  const { mutate: approveSupplier, isPending: approveLoading } = trpc.admin.approveSupplier.useMutation({
    onSuccess: () => {
      refetch();
      setDetailModalOpen(false);
    },
  });

  const { mutate: rejectSupplier, isPending: rejectLoading } = trpc.admin.rejectSupplier.useMutation({
    onSuccess: () => {
      refetch();
      setDetailModalOpen(false);
    },
  });

  // Filter suppliers
  const filteredSuppliers = allSuppliers?.filter((s) => {
    const matchesSearch =
      s.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.email.toLowerCase().includes(searchQuery.toLowerCase());

    if (activeTab === 'pending') return matchesSearch && s.verificationStatus === 'pending';
    if (activeTab === 'approved') return matchesSearch && s.verificationStatus === 'approved';
    if (activeTab === 'rejected') return matchesSearch && s.verificationStatus === 'rejected';
    return matchesSearch;
  });

  const handleApprove = (notes: string) => {
    if (selectedSupplierId) {
      approveSupplier({ supplierId: selectedSupplierId, notes: notes || undefined });
    }
  };

  const handleReject = (notes: string) => {
    if (selectedSupplierId && notes.trim()) {
      rejectSupplier({ supplierId: selectedSupplierId, notes });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Supplier Verification Dashboard</h1>
        <p className="text-muted-foreground mt-1">Manage and verify new supplier registrations</p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Suppliers</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats.total}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Approved</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Rejected</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Avg Sustainability</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-accent">{stats.avgSustainabilityScore}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search & Tabs */}
      <div className="space-y-4">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by company name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="pending" className="gap-2">
              <AlertCircle className="h-4 w-4" />
              Pending ({stats?.pending || 0})
            </TabsTrigger>
            <TabsTrigger value="approved" className="gap-2">
              <CheckCircle className="h-4 w-4" />
              Approved ({stats?.approved || 0})
            </TabsTrigger>
            <TabsTrigger value="rejected" className="gap-2">
              <XCircle className="h-4 w-4" />
              Rejected ({stats?.rejected || 0})
            </TabsTrigger>
            <TabsTrigger value="all">All ({stats?.total || 0})</TabsTrigger>
          </TabsList>

          {/* Suppliers List */}
          <div className="mt-6 space-y-3">
            {suppliersLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-accent" />
              </div>
            ) : filteredSuppliers && filteredSuppliers.length > 0 ? (
              filteredSuppliers.map((supplier) => (
                <Card key={supplier.id} className="hover:bg-muted/50 transition-colors">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold">{supplier.companyName}</h3>
                          <Badge
                            variant={
                              supplier.verificationStatus === 'approved'
                                ? 'default'
                                : supplier.verificationStatus === 'rejected'
                                  ? 'destructive'
                                  : 'secondary'
                            }
                          >
                            {supplier.verificationStatus}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{supplier.email}</p>
                        {supplier.location && <p className="text-sm text-muted-foreground">{supplier.location}</p>}
                        {supplier.sustainabilityScore && (
                          <p className="text-sm mt-2">
                            Sustainability Score: <span className="font-semibold text-accent">{supplier.sustainabilityScore}</span>
                          </p>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedSupplierId(supplier.id);
                            setDetailModalOpen(true);
                          }}
                          className="gap-2"
                        >
                          <Eye className="h-4 w-4" />
                          View
                        </Button>
                        {supplier.email && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => (window.location.href = `mailto:${supplier.email}`)}
                            className="gap-2"
                          >
                            <Mail className="h-4 w-4" />
                            Email
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="pt-6 text-center text-muted-foreground">
                  No suppliers found
                </CardContent>
              </Card>
            )}
          </div>
        </Tabs>
      </div>

      {/* Detail Modal */}
      <SupplierDetailModal
        open={detailModalOpen}
        supplierId={selectedSupplierId}
        onClose={() => {
          setDetailModalOpen(false);
          setSelectedSupplierId(null);
        }}
        onApprove={handleApprove}
        onReject={handleReject}
        isLoading={approveLoading || rejectLoading}
      />
    </div>
  );
}
