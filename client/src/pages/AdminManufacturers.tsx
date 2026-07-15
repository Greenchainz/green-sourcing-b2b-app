import { useState } from 'react';
import { Link } from 'wouter';
import { toast } from 'sonner';
import Header from '@/components/Header';
import { useAuth } from '@/contexts/AuthContext';
import { trpc, type RouterOutputs } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { DeleteConfirmDialog } from '@/components/admin/DeleteConfirmDialog';
import {
  Factory,
  Search,
  Trash2,
  RotateCcw,
  Pencil,
  ShieldCheck,
  ShieldAlert,
  Star,
  Loader2,
  ArrowLeft,
} from 'lucide-react';

type AdminManufacturer = RouterOutputs['admin']['getAllManufacturersAdmin'][number];

// ─── Edit dialog ─────────────────────────────────────────────────────────────

interface EditDialogProps {
  manufacturer: AdminManufacturer | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

function EditManufacturerDialog({ manufacturer, open, onOpenChange, onSaved }: EditDialogProps) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [subcategory, setSubcategory] = useState('');
  const [website, setWebsite] = useState('');
  const [location, setLocation] = useState('');
  const [pitchAngle, setPitchAngle] = useState('');
  const [description, setDescription] = useState('');
  const [hydratedId, setHydratedId] = useState<number | null>(null);

  // Hydrate the form once per opened manufacturer.
  if (manufacturer && hydratedId !== manufacturer.id) {
    setHydratedId(manufacturer.id);
    setName(manufacturer.name ?? '');
    setCategory(manufacturer.category ?? '');
    setSubcategory(manufacturer.subcategory ?? '');
    setWebsite(manufacturer.website ?? '');
    setLocation(manufacturer.location ?? '');
    setPitchAngle(manufacturer.pitchAngle ?? '');
    setDescription(manufacturer.description ?? '');
  }

  const updateMutation = trpc.admin.updateManufacturer.useMutation({
    onSuccess: () => {
      toast.success('Manufacturer updated');
      onSaved();
      onOpenChange(false);
    },
    onError: (err) => toast.error(err.message ?? 'Failed to update manufacturer'),
  });

  const handleSave = () => {
    if (!manufacturer) return;
    if (name.trim().length === 0) {
      toast.error('Name is required');
      return;
    }
    const orNull = (v: string) => (v.trim().length === 0 ? null : v.trim());
    updateMutation.mutate({
      id: manufacturer.id,
      name: name.trim(),
      category: orNull(category),
      subcategory: orNull(subcategory),
      website: orNull(website),
      location: orNull(location),
      pitchAngle: orNull(pitchAngle),
      description: orNull(description),
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) setHydratedId(null);
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit manufacturer</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="mfr-name">Name</Label>
            <Input id="mfr-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="mfr-category">Category</Label>
              <Input id="mfr-category" value={category} onChange={(e) => setCategory(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mfr-subcategory">Subcategory</Label>
              <Input id="mfr-subcategory" value={subcategory} onChange={(e) => setSubcategory(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="mfr-website">Website</Label>
              <Input id="mfr-website" value={website} onChange={(e) => setWebsite(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mfr-location">Location</Label>
              <Input id="mfr-location" value={location} onChange={(e) => setLocation(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="mfr-pitch">Pitch angle</Label>
            <Textarea id="mfr-pitch" rows={2} value={pitchAngle} onChange={(e) => setPitchAngle(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="mfr-description">Description</Label>
            <Textarea id="mfr-description" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={updateMutation.isPending}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={updateMutation.isPending}>
            {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

function ManufacturersTable() {
  const { data, isLoading, refetch } = trpc.admin.getAllManufacturersAdmin.useQuery();
  const [search, setSearch] = useState('');
  const [editTarget, setEditTarget] = useState<AdminManufacturer | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminManufacturer | null>(null);
  const [purgeTarget, setPurgeTarget] = useState<AdminManufacturer | null>(null);

  const verifiedMutation = trpc.admin.setManufacturerVerified.useMutation({
    onSuccess: () => { void refetch(); },
    onError: (err) => toast.error(err.message ?? 'Failed to update verification'),
  });
  const featuredMutation = trpc.manufacturer.setFeatured.useMutation({
    onSuccess: () => { void refetch(); },
    onError: (err) => toast.error(err.message ?? 'Failed to update featured'),
  });
  const deleteMutation = trpc.admin.deleteManufacturer.useMutation({
    onSuccess: () => { toast.success('Manufacturer deleted'); void refetch(); setDeleteTarget(null); },
    onError: (err) => toast.error(err.message ?? 'Failed to delete manufacturer'),
  });
  const restoreMutation = trpc.admin.restoreManufacturer.useMutation({
    onSuccess: () => { toast.success('Manufacturer restored'); void refetch(); },
    onError: (err) => toast.error(err.message ?? 'Failed to restore manufacturer'),
  });
  const purgeMutation = trpc.admin.purgeManufacturer.useMutation({
    onSuccess: () => { toast.success('Manufacturer permanently purged'); void refetch(); setPurgeTarget(null); },
    onError: (err) => toast.error(err.message ?? 'Failed to purge manufacturer'),
  });

  const q = search.trim().toLowerCase();
  const filtered = (data ?? []).filter((m) => {
    if (!q) return true;
    return (
      m.name.toLowerCase().includes(q) ||
      (m.category ?? '').toLowerCase().includes(q) ||
      (m.location ?? '').toLowerCase().includes(q)
    );
  });

  const activeCount = (data ?? []).filter((m) => !m.deletedAt).length;
  const deletedCount = (data ?? []).length - activeCount;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-white">
            <Factory className="h-6 w-6 text-amber-400" />
            Manufacturers
          </h1>
          <p className="mt-1 text-sm text-gray-400">
            {activeCount} active{deletedCount > 0 ? ` · ${deletedCount} deleted` : ''} · manage the directory &amp; Spotlight pool
          </p>
        </div>
        <Link href="/admin">
          <Button variant="outline" size="sm" className="border-gray-700 bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white">
            <ArrowLeft className="mr-2 h-4 w-4" />Back to Admin
          </Button>
        </Link>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
        <Input
          placeholder="Search by name, category or location…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border-gray-700 bg-gray-900 pl-9 text-white"
        />
      </div>

      <Card className="border-gray-800 bg-gray-900">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-gray-800 hover:bg-transparent">
                  <TableHead className="text-gray-400">Name</TableHead>
                  <TableHead className="text-gray-400">Category</TableHead>
                  <TableHead className="text-gray-400 text-center">Materials</TableHead>
                  <TableHead className="text-gray-400 text-center">Verified</TableHead>
                  <TableHead className="text-gray-400 text-center">Featured</TableHead>
                  <TableHead className="text-gray-400 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-10 text-center text-gray-500">
                      No manufacturers match your search.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((m) => (
                    <TableRow key={m.id} className={`border-gray-800 hover:bg-gray-800/50 ${m.deletedAt ? 'opacity-60' : ''}`}>
                      <TableCell className="font-medium text-white">
                        <div className="flex items-center gap-2">
                          <span>{m.name}</span>
                          {m.deletedAt && (
                            <Badge variant="outline" className="border-red-800 text-[10px] text-red-400">Deleted</Badge>
                          )}
                        </div>
                        {m.location && <div className="text-xs text-gray-500">{m.location}</div>}
                      </TableCell>
                      <TableCell className="text-sm text-gray-300">
                        {m.category ?? <span className="text-gray-600 italic">—</span>}
                        {m.subcategory && <div className="text-xs text-gray-500">{m.subcategory}</div>}
                      </TableCell>
                      <TableCell className="text-center text-sm text-gray-300">{m.materialCount}</TableCell>
                      <TableCell className="text-center">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={verifiedMutation.isPending || !!m.deletedAt}
                          onClick={() => verifiedMutation.mutate({ id: m.id, verified: !m.verified })}
                          className={
                            m.verified
                              ? 'h-7 border-emerald-800 bg-emerald-950 text-xs text-emerald-300 hover:bg-emerald-900'
                              : 'h-7 border-gray-700 bg-gray-800 text-xs text-gray-400 hover:bg-gray-700'
                          }
                          title={m.verified ? 'Verified — click to unverify' : 'Not verified — click to verify'}
                        >
                          <ShieldCheck className="mr-1 h-3 w-3" />
                          {m.verified ? 'Yes' : 'No'}
                        </Button>
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={featuredMutation.isPending || !!m.deletedAt}
                          onClick={() => featuredMutation.mutate({ id: m.id, featured: !m.featured })}
                          className={
                            m.featured
                              ? 'h-7 border-amber-700 bg-amber-950 text-xs text-amber-300 hover:bg-amber-900'
                              : 'h-7 border-gray-700 bg-gray-800 text-xs text-gray-400 hover:bg-gray-700'
                          }
                          title={m.featured ? 'Featured (Supplier of the Week) — click to unfeature' : 'Click to feature'}
                        >
                          <Star className={`mr-1 h-3 w-3 ${m.featured ? 'fill-amber-300' : ''}`} />
                          {m.featured ? 'Yes' : 'No'}
                        </Button>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-2">
                          {!m.deletedAt && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 border-gray-700 bg-gray-800 text-xs text-gray-300 hover:bg-gray-700 hover:text-white"
                              onClick={() => setEditTarget(m)}
                            >
                              <Pencil className="mr-1 h-3 w-3" />Edit
                            </Button>
                          )}
                          {m.deletedAt ? (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 border-emerald-800 bg-gray-800 text-xs text-emerald-400 hover:bg-emerald-950 hover:text-emerald-300"
                                onClick={() => restoreMutation.mutate({ id: m.id })}
                                disabled={restoreMutation.isPending}
                              >
                                <RotateCcw className="mr-1 h-3 w-3" />Restore
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 border-red-800 bg-gray-800 text-xs text-red-400 hover:bg-red-950 hover:text-red-300"
                                onClick={() => setPurgeTarget(m)}
                              >
                                <Trash2 className="mr-1 h-3 w-3" />Purge
                              </Button>
                            </>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 border-red-800 bg-gray-800 text-xs text-red-400 hover:bg-red-950 hover:text-red-300"
                              onClick={() => setDeleteTarget(m)}
                            >
                              <Trash2 className="mr-1 h-3 w-3" />Delete
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <EditManufacturerDialog
        manufacturer={editTarget}
        open={editTarget !== null}
        onOpenChange={(open) => { if (!open) setEditTarget(null); }}
        onSaved={() => void refetch()}
      />

      {/* Soft-delete (reversible) */}
      <DeleteConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        title="Delete manufacturer?"
        description={
          <>
            This hides{' '}
            <span className="font-semibold text-white">{deleteTarget?.name}</span>{' '}
            from the directory, profile pages, search and Spotlight. It&apos;s reversible —
            you can restore it afterwards.
          </>
        }
        confirmLabel="Delete manufacturer"
        onConfirm={() => { if (deleteTarget) deleteMutation.mutate({ id: deleteTarget.id }); }}
        isPending={deleteMutation.isPending}
      />

      {/* Hard-purge (irreversible, type-to-confirm) */}
      <DeleteConfirmDialog
        open={purgeTarget !== null}
        onOpenChange={(open) => { if (!open) setPurgeTarget(null); }}
        title="Permanently purge manufacturer?"
        description={
          <>
            This <span className="font-semibold text-red-400">permanently deletes</span>{' '}
            <span className="font-semibold text-white">{purgeTarget?.name}</span>. Any linked
            materials are detached (not deleted). This cannot be undone.
          </>
        }
        confirmWord={purgeTarget?.name}
        confirmLabel="Purge forever"
        onConfirm={() => { if (purgeTarget) purgeMutation.mutate({ id: purgeTarget.id }); }}
        isPending={purgeMutation.isPending}
      />
    </div>
  );
}

export default function AdminManufacturers() {
  const { user, isLoading: authLoading } = useAuth();

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-950">
        <Header />
        <main className="container mx-auto max-w-7xl px-4 py-10">
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
          </div>
        </main>
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gray-950">
        <Header />
        <main className="container mx-auto max-w-7xl px-4 py-10">
          <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center">
            <div className="rounded-full border border-red-500/30 bg-red-500/10 p-5">
              <ShieldAlert className="h-10 w-10 text-red-400" />
            </div>
            <h2 className="text-2xl font-bold text-white">Access Denied</h2>
            <p className="max-w-sm text-gray-400">
              You don&apos;t have admin privileges. This page is restricted to administrators only.
            </p>
            <Link href="/">
              <Button variant="outline" className="mt-2 border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white">
                Back to Home
              </Button>
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950">
      <Header />
      <main className="container mx-auto max-w-7xl px-4 py-10">
        <ManufacturersTable />
      </main>
    </div>
  );
}
