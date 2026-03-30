import { useState } from 'react';
import { Link } from 'wouter';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { trpc } from '@/lib/trpc';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';

import {
  Users,
  Building2,
  Clock,
  CreditCard,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Search,
  Eye,
  ShieldAlert,
  RefreshCcw,
  ChevronDown,
  ChevronRight,
  Server,
  Zap,
  ExternalLink,
  User,
  LayoutDashboard,
  ListFilter,
} from 'lucide-react';

// ─── Type definitions ────────────────────────────────────────────────────────

type UserRole = 'user' | 'admin' | 'buyer' | 'supplier';
type UserTier = 'free' | 'standard' | 'premium';
type VerificationStatus = 'pending' | 'approved' | 'rejected';

interface AdminUser {
  id: number;
  name: string | null;
  email: string;
  role: string;
  createdAt: Date | string | null;
  lastSignedIn: Date | string | null;
  tier: string;
  subscriptionStatus: string;
}

interface AdminSupplier {
  id: number;
  companyName: string;
  email: string;
  phone: string | null;
  location: string | null;
  website: string | null;
  description: string | null;
  verificationStatus: string | null;
  certifications: unknown;
  sustainabilityScore: unknown;
  createdAt: Date | string | null;
  verifiedAt: Date | string | null;
}

interface SupplierStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  premium?: number;
  avgSustainabilityScore?: string;
}

// ─── Helper utilities ────────────────────────────────────────────────────────

function formatDate(d: Date | string | null | undefined): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatDateTime(d: Date | string | null | undefined): string {
  if (!d) return 'Never';
  return new Date(d).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function roleBadge(role: string) {
  const map: Record<string, string> = {
    admin: 'bg-red-500/20 text-red-400 border-red-500/30',
    supplier: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    buyer: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    architect: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    user: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  };
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${
        map[role] ?? map.user
      }`}
    >
      {role}
    </span>
  );
}

function tierBadge(tier: string) {
  const map: Record<string, string> = {
    premium: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    standard: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    free: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    none: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  };
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${
        map[tier] ?? map.free
      }`}
    >
      {tier}
    </span>
  );
}

function verificationBadge(status: string | null) {
  if (status === 'approved')
    return (
      <span className="inline-flex items-center gap-1 rounded-md border border-emerald-500/30 bg-emerald-500/20 px-2 py-0.5 text-xs font-medium text-emerald-400">
        <CheckCircle className="h-3 w-3" />
        Approved
      </span>
    );
  if (status === 'rejected')
    return (
      <span className="inline-flex items-center gap-1 rounded-md border border-red-500/30 bg-red-500/20 px-2 py-0.5 text-xs font-medium text-red-400">
        <XCircle className="h-3 w-3" />
        Rejected
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 rounded-md border border-amber-500/30 bg-amber-500/20 px-2 py-0.5 text-xs font-medium text-amber-400">
      <Clock className="h-3 w-3" />
      Pending
    </span>
  );
}

// ─── KPI Card ────────────────────────────────────────────────────────────────

interface KpiCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  accent: string;
  loading?: boolean;
}

function KpiCard({ title, value, icon, accent, loading }: KpiCardProps) {
  return (
    <Card className="border-gray-800 bg-gray-900">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm text-gray-400">{title}</p>
            {loading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <p className="text-3xl font-bold text-white">{value}</p>
            )}
          </div>
          <div className={`rounded-lg p-2.5 ${accent}`}>{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Overview Tab ────────────────────────────────────────────────────────────

function OverviewTab() {
  const { data: allUsers, isLoading: usersLoading } = trpc.admin.getAllUsers.useQuery();
  const { data: stats, isLoading: statsLoading } = trpc.admin.getSupplierStats.useQuery();

  const recentUsers = allUsers?.slice(0, 10) ?? [];

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title="Total Users"
          value={allUsers?.length ?? 0}
          icon={<Users className="h-5 w-5 text-emerald-400" />}
          accent="bg-emerald-500/10"
          loading={usersLoading}
        />
        <KpiCard
          title="Total Suppliers"
          value={stats?.total ?? 0}
          icon={<Building2 className="h-5 w-5 text-blue-400" />}
          accent="bg-blue-500/10"
          loading={statsLoading}
        />
        <KpiCard
          title="Pending Verification"
          value={stats?.pending ?? 0}
          icon={<Clock className="h-5 w-5 text-amber-400" />}
          accent="bg-amber-500/10"
          loading={statsLoading}
        />
        <KpiCard
          title="Approved Suppliers"
          value={stats?.approved ?? 0}
          icon={<CreditCard className="h-5 w-5 text-purple-400" />}
          accent="bg-purple-500/10"
          loading={statsLoading}
        />
      </div>

      {/* Quick Actions */}
      <Card className="border-gray-800 bg-gray-900">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-white">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Link href="/admin/users">
            <Button
              variant="outline"
              size="sm"
              className="border-gray-700 bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white"
            >
              <Users className="mr-2 h-4 w-4" />
              View All Users
            </Button>
          </Link>
          <Link href="/admin/suppliers">
            <Button
              variant="outline"
              size="sm"
              className="border-gray-700 bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white"
            >
              <Building2 className="mr-2 h-4 w-4" />
              View Suppliers
            </Button>
          </Link>
          <Link href="/admin/verification-queue">
            <Button
              variant="outline"
              size="sm"
              className="border-amber-700/40 bg-amber-900/20 text-amber-400 hover:bg-amber-900/40 hover:text-amber-300"
            >
              <Clock className="mr-2 h-4 w-4" />
              Verification Queue
              {(stats?.pending ?? 0) > 0 && (
                <span className="ml-2 rounded-full bg-amber-500 px-1.5 py-0.5 text-xs font-bold text-black">
                  {stats?.pending}
                </span>
              )}
            </Button>
          </Link>
        </CardContent>
      </Card>

      {/* Recent Signups */}
      <Card className="border-gray-800 bg-gray-900">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-white">
            Recent Signups
            <span className="ml-2 text-xs font-normal text-gray-500">(last 10)</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {usersLoading ? (
            <div className="space-y-3 p-6">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-gray-800 hover:bg-transparent">
                  <TableHead className="text-gray-400">Name</TableHead>
                  <TableHead className="text-gray-400">Email</TableHead>
                  <TableHead className="text-gray-400">Role</TableHead>
                  <TableHead className="text-gray-400">Tier</TableHead>
                  <TableHead className="text-gray-400">Signed Up</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-8 text-center text-gray-500">
                      No users found.
                    </TableCell>
                  </TableRow>
                ) : (
                  recentUsers.map((u) => (
                    <TableRow
                      key={u.id}
                      className="border-gray-800 hover:bg-gray-800/50"
                    >
                      <TableCell className="font-medium text-white">
                        {u.name ?? <span className="text-gray-500 italic">No name</span>}
                      </TableCell>
                      <TableCell className="text-gray-300">{u.email}</TableCell>
                      <TableCell>{roleBadge(u.role)}</TableCell>
                      <TableCell>{tierBadge(u.tier)}</TableCell>
                      <TableCell className="text-gray-400">{formatDate(u.createdAt)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Users Tab ───────────────────────────────────────────────────────────────

interface ChangeRoleDialogProps {
  user: AdminUser | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (userId: number, role: UserRole) => void;
  isPending: boolean;
}

function ChangeRoleDialog({
  user,
  open,
  onOpenChange,
  onConfirm,
  isPending,
}: ChangeRoleDialogProps) {
  const [selectedRole, setSelectedRole] = useState<UserRole>('buyer');

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-gray-800 bg-gray-900 text-white sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Change Role</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <p className="text-sm text-gray-400">User</p>
            <p className="font-medium">{user.name ?? user.email}</p>
            <p className="text-xs text-gray-500">{user.email}</p>
          </div>
          <div>
            <p className="mb-2 text-sm text-gray-400">New Role</p>
            <Select
              value={selectedRole}
              onValueChange={(v) => setSelectedRole(v as UserRole)}
            >
              <SelectTrigger className="border-gray-700 bg-gray-800 text-white">
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent className="border-gray-700 bg-gray-900 text-white">
                <SelectItem value="buyer">buyer</SelectItem>
                <SelectItem value="supplier">supplier</SelectItem>
                <SelectItem value="admin">admin</SelectItem>
                <SelectItem value="user">user</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {selectedRole === 'admin' && (
            <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-900/20 p-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
              <p className="text-xs text-amber-300">
                Granting admin access gives full control over the platform. Proceed with care.
              </p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            className="border-gray-700 text-gray-300 hover:bg-gray-800"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            className="bg-emerald-600 text-white hover:bg-emerald-500"
            onClick={() => onConfirm(user.id, selectedRole)}
            disabled={isPending}
          >
            {isPending ? 'Saving…' : 'Confirm'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface ChangeTierDialogProps {
  user: AdminUser | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (userId: number, tier: UserTier) => void;
  isPending: boolean;
}

function ChangeTierDialog({
  user,
  open,
  onOpenChange,
  onConfirm,
  isPending,
}: ChangeTierDialogProps) {
  const [selectedTier, setSelectedTier] = useState<UserTier>('free');

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-gray-800 bg-gray-900 text-white sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Change Subscription Tier</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <p className="text-sm text-gray-400">User</p>
            <p className="font-medium">{user.name ?? user.email}</p>
            <p className="text-xs text-gray-500">{user.email}</p>
          </div>
          <div>
            <p className="mb-2 text-sm text-gray-400">New Tier</p>
            <Select
              value={selectedTier}
              onValueChange={(v) => setSelectedTier(v as UserTier)}
            >
              <SelectTrigger className="border-gray-700 bg-gray-800 text-white">
                <SelectValue placeholder="Select tier" />
              </SelectTrigger>
              <SelectContent className="border-gray-700 bg-gray-900 text-white">
                <SelectItem value="free">free</SelectItem>
                <SelectItem value="standard">standard</SelectItem>
                <SelectItem value="premium">premium</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <p className="text-xs text-gray-500">
            This is an admin override — it bypasses the billing flow and sets the tier directly in
            the database.
          </p>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            className="border-gray-700 text-gray-300 hover:bg-gray-800"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            className="bg-emerald-600 text-white hover:bg-emerald-500"
            onClick={() => onConfirm(user.id, selectedTier)}
            disabled={isPending}
          >
            {isPending ? 'Saving…' : 'Confirm'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function UsersTab() {
  const { data: allUsers, isLoading, refetch } = trpc.admin.getAllUsers.useQuery();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');

  const [roleDialogUser, setRoleDialogUser] = useState<AdminUser | null>(null);
  const [tierDialogUser, setTierDialogUser] = useState<AdminUser | null>(null);

  const setUserRoleMutation = trpc.admin.setUserRole.useMutation({
    onSuccess: () => {
      toast.success('Role updated successfully');
      void refetch();
      setRoleDialogUser(null);
    },
    onError: (err) => {
      toast.error(err.message ?? 'Failed to update role');
    },
  });

  const setUserTierMutation = trpc.admin.setUserTier.useMutation({
    onSuccess: () => {
      toast.success('Tier updated successfully');
      void refetch();
      setTierDialogUser(null);
    },
    onError: (err) => {
      toast.error(err.message ?? 'Failed to update tier');
    },
  });

  const filtered = (allUsers ?? []).filter((u) => {
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      (u.name ?? '').toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.role.toLowerCase().includes(q);
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-5">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <Input
            placeholder="Search by name, email or role…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border-gray-700 bg-gray-800 pl-9 text-white placeholder:text-gray-500 focus:border-emerald-500"
          />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-36 border-gray-700 bg-gray-800 text-white">
            <ListFilter className="mr-2 h-4 w-4 text-gray-400" />
            <SelectValue placeholder="All roles" />
          </SelectTrigger>
          <SelectContent className="border-gray-700 bg-gray-900 text-white">
            <SelectItem value="all">All roles</SelectItem>
            <SelectItem value="admin">admin</SelectItem>
            <SelectItem value="buyer">buyer</SelectItem>
            <SelectItem value="architect">architect</SelectItem>
            <SelectItem value="supplier">supplier</SelectItem>
            <SelectItem value="user">user</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="sm"
          className="border-gray-700 bg-gray-800 text-gray-400 hover:text-white"
          onClick={() => void refetch()}
        >
          <RefreshCcw className="h-4 w-4" />
        </Button>
        <span className="text-sm text-gray-500">{filtered.length} users</span>
      </div>

      {/* Table */}
      <Card className="border-gray-800 bg-gray-900">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-3 p-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-gray-800 hover:bg-transparent">
                  <TableHead className="text-gray-400">ID</TableHead>
                  <TableHead className="text-gray-400">Name</TableHead>
                  <TableHead className="text-gray-400">Email</TableHead>
                  <TableHead className="text-gray-400">Role</TableHead>
                  <TableHead className="text-gray-400">Tier</TableHead>
                  <TableHead className="text-gray-400">Created</TableHead>
                  <TableHead className="text-gray-400">Last Active</TableHead>
                  <TableHead className="text-gray-400">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-8 text-center text-gray-500">
                      No users match your search.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((u) => (
                    <TableRow key={u.id} className="border-gray-800 hover:bg-gray-800/50">
                      <TableCell className="text-gray-500 text-xs font-mono">#{u.id}</TableCell>
                      <TableCell className="font-medium text-white">
                        {u.name ?? <span className="text-gray-500 italic">—</span>}
                      </TableCell>
                      <TableCell className="text-gray-300 text-sm">{u.email}</TableCell>
                      <TableCell>{roleBadge(u.role)}</TableCell>
                      <TableCell>{tierBadge(u.tier)}</TableCell>
                      <TableCell className="text-gray-400 text-sm">
                        {formatDate(u.createdAt)}
                      </TableCell>
                      <TableCell className="text-gray-400 text-sm">
                        {u.lastSignedIn ? formatDateTime(u.lastSignedIn) : 'Never'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-gray-700 bg-gray-800 text-xs text-gray-300 hover:bg-gray-700 hover:text-white"
                            onClick={() => setRoleDialogUser(u)}
                          >
                            Role
                            <ChevronDown className="ml-1 h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-gray-700 bg-gray-800 text-xs text-gray-300 hover:bg-gray-700 hover:text-white"
                            onClick={() => setTierDialogUser(u)}
                          >
                            Tier
                            <ChevronDown className="ml-1 h-3 w-3" />
                          </Button>
                          <a
                            href={`mailto:${u.email}`}
                            className="inline-flex h-7 w-7 items-center justify-center rounded border border-gray-700 bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white"
                            title="Email user"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
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

      {/* Dialogs */}
      <ChangeRoleDialog
        user={roleDialogUser}
        open={roleDialogUser !== null}
        onOpenChange={(open) => { if (!open) setRoleDialogUser(null); }}
        onConfirm={(userId, role) => setUserRoleMutation.mutate({ userId, role })}
        isPending={setUserRoleMutation.isPending}
      />
      <ChangeTierDialog
        user={tierDialogUser}
        open={tierDialogUser !== null}
        onOpenChange={(open) => { if (!open) setTierDialogUser(null); }}
        onConfirm={(userId, tier) => setUserTierMutation.mutate({ userId, tier })}
        isPending={setUserTierMutation.isPending}
      />
    </div>
  );
}

// ─── Suppliers Tab ───────────────────────────────────────────────────────────

interface SupplierDetailPanelProps {
  supplierId: number;
  onClose: () => void;
  onApprove: (supplierId: number, notes: string) => void;
  onReject: (supplierId: number, notes: string) => void;
  isApproving: boolean;
  isRejecting: boolean;
}

function SupplierDetailPanel({
  supplierId,
  onClose,
  onApprove,
  onReject,
  isApproving,
  isRejecting,
}: SupplierDetailPanelProps) {
  const [notes, setNotes] = useState('');
  const { data: supplier, isLoading } = trpc.admin.getSupplierDetail.useQuery({ supplierId });

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-2xl border-gray-800 bg-gray-900 text-white">
        <DialogHeader>
          <DialogTitle>Supplier Detail</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-3 py-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        ) : supplier ? (
          <div className="max-h-[60vh] overflow-y-auto pr-1 space-y-5">
            {/* Status */}
            <div className="flex items-center gap-3">
              {verificationBadge(supplier.verificationStatus)}
              {supplier.isPremium && (
                <span className="inline-flex items-center rounded-md border border-amber-500/30 bg-amber-500/20 px-2 py-0.5 text-xs font-medium text-amber-400">
                  Premium
                </span>
              )}
            </div>

            {/* Core info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500">Company Name</p>
                <p className="mt-0.5 font-medium">{supplier.companyName}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Email</p>
                <p className="mt-0.5">{supplier.email}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Phone</p>
                <p className="mt-0.5">{supplier.phone ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Location</p>
                <p className="mt-0.5">{supplier.location ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Website</p>
                {supplier.website ? (
                  <a
                    href={supplier.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-0.5 text-emerald-400 hover:underline flex items-center gap-1"
                  >
                    {supplier.website}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                ) : (
                  <p className="mt-0.5 text-gray-500">—</p>
                )}
              </div>
              <div>
                <p className="text-xs text-gray-500">Sustainability Score</p>
                <p className="mt-0.5">{String(supplier.sustainabilityScore ?? '—')}</p>
              </div>
            </div>

            {/* Description */}
            {supplier.description && (
              <div>
                <p className="text-xs text-gray-500">Description</p>
                <p className="mt-1 text-sm text-gray-300">{supplier.description}</p>
              </div>
            )}

            {/* Certifications */}
            {Array.isArray(supplier.certifications) && supplier.certifications.length > 0 && (
              <div>
                <p className="text-xs text-gray-500 mb-2">Certifications</p>
                <div className="flex flex-wrap gap-2">
                  {(supplier.certifications as string[]).map((cert) => (
                    <Badge key={cert} variant="secondary">
                      {cert}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs text-gray-500">Registered</p>
                <p className="mt-0.5 text-gray-300">{formatDate(supplier.createdAt)}</p>
              </div>
              {supplier.verifiedAt && (
                <div>
                  <p className="text-xs text-gray-500">Verified At</p>
                  <p className="mt-0.5 text-gray-300">{formatDate(supplier.verifiedAt)}</p>
                </div>
              )}
            </div>

            {/* Action notes */}
            {supplier.verificationStatus === 'pending' && (
              <div>
                <p className="text-xs text-gray-500 mb-1.5">Notes (sent to supplier)</p>
                <Textarea
                  placeholder="Optional message to the supplier…"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="border-gray-700 bg-gray-800 text-white placeholder:text-gray-600 focus:border-emerald-500"
                  rows={3}
                />
              </div>
            )}
          </div>
        ) : (
          <p className="py-8 text-center text-gray-500">Supplier not found.</p>
        )}

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            className="border-gray-700 text-gray-300 hover:bg-gray-800"
            onClick={onClose}
          >
            Close
          </Button>
          {supplier?.verificationStatus === 'pending' && (
            <>
              <Button
                className="border-red-700 bg-red-900/30 text-red-400 hover:bg-red-900/50"
                variant="outline"
                disabled={isRejecting}
                onClick={() => onReject(supplierId, notes)}
              >
                <XCircle className="mr-2 h-4 w-4" />
                {isRejecting ? 'Rejecting…' : 'Reject'}
              </Button>
              <Button
                className="bg-emerald-600 text-white hover:bg-emerald-500"
                disabled={isApproving}
                onClick={() => onApprove(supplierId, notes)}
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                {isApproving ? 'Approving…' : 'Approve'}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SuppliersTab() {
  const { data: allSuppliers, isLoading, refetch } = trpc.admin.getAllSuppliers.useQuery();
  const { data: stats, isLoading: statsLoading } = trpc.admin.getSupplierStats.useQuery();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const approveSupplierMutation = trpc.admin.approveSupplier.useMutation({
    onSuccess: () => {
      toast.success('Supplier approved and notified via email');
      void refetch();
      setExpandedId(null);
    },
    onError: (err) => toast.error(err.message ?? 'Approval failed'),
  });

  const rejectSupplierMutation = trpc.admin.rejectSupplier.useMutation({
    onSuccess: () => {
      toast.success('Supplier rejected and notified via email');
      void refetch();
      setExpandedId(null);
    },
    onError: (err) => toast.error(err.message ?? 'Rejection failed'),
  });

  const filtered = (allSuppliers ?? []).filter((s) => {
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      s.companyName.toLowerCase().includes(q) ||
      s.email.toLowerCase().includes(q) ||
      (s.location ?? '').toLowerCase().includes(q);
    const matchesStatus =
      statusFilter === 'all' || (s.verificationStatus ?? 'pending') === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-5">
      {/* Stats row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'Total', value: stats?.total ?? 0, color: 'text-white' },
          { label: 'Pending', value: stats?.pending ?? 0, color: 'text-amber-400' },
          { label: 'Approved', value: stats?.approved ?? 0, color: 'text-emerald-400' },
          { label: 'Rejected', value: stats?.rejected ?? 0, color: 'text-red-400' },
        ].map(({ label, value, color }) => (
          <Card key={label} className="border-gray-800 bg-gray-900">
            <CardContent className="py-4 px-5">
              <p className="text-xs text-gray-500">{label}</p>
              {statsLoading ? (
                <Skeleton className="mt-1 h-7 w-12" />
              ) : (
                <p className={`text-2xl font-bold ${color}`}>{value}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <Input
            placeholder="Search suppliers…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border-gray-700 bg-gray-800 pl-9 text-white placeholder:text-gray-500 focus:border-emerald-500"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40 border-gray-700 bg-gray-800 text-white">
            <ListFilter className="mr-2 h-4 w-4 text-gray-400" />
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent className="border-gray-700 bg-gray-900 text-white">
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="sm"
          className="border-gray-700 bg-gray-800 text-gray-400 hover:text-white"
          onClick={() => void refetch()}
        >
          <RefreshCcw className="h-4 w-4" />
        </Button>
        <span className="text-sm text-gray-500">{filtered.length} suppliers</span>
      </div>

      {/* Table */}
      <Card className="border-gray-800 bg-gray-900">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-3 p-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-gray-800 hover:bg-transparent">
                  <TableHead className="text-gray-400">Company</TableHead>
                  <TableHead className="text-gray-400">Email</TableHead>
                  <TableHead className="text-gray-400">Location</TableHead>
                  <TableHead className="text-gray-400">Status</TableHead>
                  <TableHead className="text-gray-400">Registered</TableHead>
                  <TableHead className="text-gray-400">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-gray-500">
                      No suppliers match your filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((s) => (
                    <TableRow key={s.id} className="border-gray-800 hover:bg-gray-800/50">
                      <TableCell className="font-medium text-white">{s.companyName}</TableCell>
                      <TableCell className="text-gray-300 text-sm">{s.email}</TableCell>
                      <TableCell className="text-gray-400 text-sm">{s.location ?? '—'}</TableCell>
                      <TableCell>{verificationBadge(s.verificationStatus)}</TableCell>
                      <TableCell className="text-gray-400 text-sm">
                        {formatDate(s.createdAt)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-gray-700 bg-gray-800 text-xs text-gray-300 hover:bg-gray-700 hover:text-white"
                            onClick={() => setExpandedId(s.id)}
                          >
                            <Eye className="mr-1.5 h-3 w-3" />
                            View
                          </Button>
                          {s.verificationStatus === 'pending' && (
                            <>
                              <Button
                                size="sm"
                                className="border-emerald-700/40 bg-emerald-900/30 text-xs text-emerald-400 hover:bg-emerald-900/50"
                                variant="outline"
                                disabled={approveSupplierMutation.isPending}
                                onClick={() => {
                                  if (
                                    window.confirm(
                                      `Approve ${s.companyName}? An email will be sent.`
                                    )
                                  ) {
                                    approveSupplierMutation.mutate({
                                      supplierId: s.id,
                                    });
                                  }
                                }}
                              >
                                <CheckCircle className="mr-1 h-3 w-3" />
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-red-700/40 bg-red-900/30 text-xs text-red-400 hover:bg-red-900/50"
                                onClick={() => setExpandedId(s.id)}
                              >
                                <XCircle className="mr-1 h-3 w-3" />
                                Reject
                              </Button>
                            </>
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

      {/* Detail modal */}
      {expandedId !== null && (
        <SupplierDetailPanel
          supplierId={expandedId}
          onClose={() => setExpandedId(null)}
          onApprove={(id, notes) => approveSupplierMutation.mutate({ supplierId: id, notes })}
          onReject={(id, notes) =>
            rejectSupplierMutation.mutate({ supplierId: id, notes })
          }
          isApproving={approveSupplierMutation.isPending}
          isRejecting={rejectSupplierMutation.isPending}
        />
      )}
    </div>
  );
}

// ─── System Tab ──────────────────────────────────────────────────────────────

function SystemTab() {
  const [seedMaterialsStatus, setSeedMaterialsStatus] = useState<
    'idle' | 'loading' | 'success' | 'error'
  >('idle');
  const [seedAssembliesStatus, setSeedAssembliesStatus] = useState<
    'idle' | 'loading' | 'success' | 'error'
  >('idle');
  const [seedMessage, setSeedMessage] = useState('');

  // Probe tRPC health by running a quick admin query
  const { data: statsData, isLoading: statsLoading, isError: statsError } =
    trpc.admin.getSupplierStats.useQuery();

  const triggerSeed = async (endpoint: string, type: 'materials' | 'assemblies') => {
    const setStatus =
      type === 'materials' ? setSeedMaterialsStatus : setSeedAssembliesStatus;
    setStatus('loading');
    setSeedMessage('');
    try {
      const res = await fetch(endpoint, { method: 'POST' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as { message?: string };
      setStatus('success');
      setSeedMessage(json.message ?? 'Seed completed.');
      toast.success(`${type === 'materials' ? 'Materials' : 'Assemblies'} seeded successfully`);
    } catch (err) {
      setStatus('error');
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setSeedMessage(msg);
      toast.error(`Seed failed: ${msg}`);
    }
  };

  const dbStatus = statsLoading
    ? 'Checking…'
    : statsError
    ? 'Unavailable'
    : `OK — ${statsData?.total ?? 0} suppliers`;
  const dbColor = statsLoading
    ? 'text-gray-400'
    : statsError
    ? 'text-red-400'
    : 'text-emerald-400';

  return (
    <div className="space-y-6">
      {/* Environment Info */}
      <Card className="border-gray-800 bg-gray-900">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-semibold text-white">
            <Server className="h-4 w-4 text-gray-400" />
            Environment
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-md border border-gray-800 bg-gray-800/50 p-4">
              <p className="text-xs text-gray-500">NODE_ENV</p>
              <p className="mt-1 font-mono text-sm text-emerald-400">
                {import.meta.env.MODE ?? 'unknown'}
              </p>
            </div>
            <div className="rounded-md border border-gray-800 bg-gray-800/50 p-4">
              <p className="text-xs text-gray-500">Database (via tRPC)</p>
              <p className={`mt-1 font-mono text-sm ${dbColor}`}>{dbStatus}</p>
            </div>
            <div className="rounded-md border border-gray-800 bg-gray-800/50 p-4">
              <p className="text-xs text-gray-500">App Version</p>
              <p className="mt-1 font-mono text-sm text-gray-300">
                {import.meta.env.VITE_APP_VERSION ?? '—'}
              </p>
            </div>
            <div className="rounded-md border border-gray-800 bg-gray-800/50 p-4">
              <p className="text-xs text-gray-500">API Base URL</p>
              <p className="mt-1 font-mono text-sm text-gray-300">
                {import.meta.env.VITE_API_URL ?? '/api'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Links */}
      <Card className="border-gray-800 bg-gray-900">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-semibold text-white">
            <Zap className="h-4 w-4 text-gray-400" />
            Admin Actions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <Link href="/admin/suppliers">
              <Button
                variant="outline"
                size="sm"
                className="border-gray-700 bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white"
              >
                <Building2 className="mr-2 h-4 w-4" />
                Supplier Dashboard
                <ExternalLink className="ml-2 h-3 w-3" />
              </Button>
            </Link>
            <Link href="/admin/verification-queue">
              <Button
                variant="outline"
                size="sm"
                className="border-gray-700 bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white"
              >
                <Clock className="mr-2 h-4 w-4" />
                Verification Queue
                <ExternalLink className="ml-2 h-3 w-3" />
              </Button>
            </Link>
          </div>

          {seedMessage && (
            <div className="rounded-md border border-gray-700 bg-gray-800 p-3">
              <p className="font-mono text-xs text-gray-300">{seedMessage}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-red-900/50 bg-gray-900">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-semibold text-red-400">
            <AlertTriangle className="h-4 w-4" />
            Danger Zone
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-400">
            These actions modify or populate database data. Use with caution — they cannot be undone
            without a database restore.
          </p>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {/* Seed Materials */}
            <div className="rounded-md border border-gray-800 bg-gray-800/50 p-4">
              <p className="font-medium text-white text-sm">Seed Materials</p>
              <p className="mt-1 text-xs text-gray-500 mb-3">
                POST /api/admin/seed-materials — populates the materials catalog with sample data.
              </p>
              <Button
                size="sm"
                variant="outline"
                className="border-amber-700/40 bg-amber-900/20 text-amber-400 hover:bg-amber-900/40"
                disabled={seedMaterialsStatus === 'loading'}
                onClick={() => void triggerSeed('/api/admin/seed-materials', 'materials')}
              >
                {seedMaterialsStatus === 'loading' ? (
                  <>
                    <RefreshCcw className="mr-2 h-3.5 w-3.5 animate-spin" />
                    Seeding…
                  </>
                ) : seedMaterialsStatus === 'success' ? (
                  <>
                    <CheckCircle className="mr-2 h-3.5 w-3.5 text-emerald-400" />
                    Done
                  </>
                ) : (
                  <>
                    <Zap className="mr-2 h-3.5 w-3.5" />
                    Seed Materials
                  </>
                )}
              </Button>
            </div>

            {/* Seed Assemblies */}
            <div className="rounded-md border border-gray-800 bg-gray-800/50 p-4">
              <p className="font-medium text-white text-sm">Seed Assemblies</p>
              <p className="mt-1 text-xs text-gray-500 mb-3">
                POST /api/admin/seed-assemblies — populates the assemblies catalog with sample data.
              </p>
              <Button
                size="sm"
                variant="outline"
                className="border-amber-700/40 bg-amber-900/20 text-amber-400 hover:bg-amber-900/40"
                disabled={seedAssembliesStatus === 'loading'}
                onClick={() => void triggerSeed('/api/admin/seed-assemblies', 'assemblies')}
              >
                {seedAssembliesStatus === 'loading' ? (
                  <>
                    <RefreshCcw className="mr-2 h-3.5 w-3.5 animate-spin" />
                    Seeding…
                  </>
                ) : seedAssembliesStatus === 'success' ? (
                  <>
                    <CheckCircle className="mr-2 h-3.5 w-3.5 text-emerald-400" />
                    Done
                  </>
                ) : (
                  <>
                    <Zap className="mr-2 h-3.5 w-3.5" />
                    Seed Assemblies
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Access Denied ───────────────────────────────────────────────────────────

function AccessDenied() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <div className="rounded-full border border-red-500/30 bg-red-500/10 p-5">
        <ShieldAlert className="h-10 w-10 text-red-400" />
      </div>
      <h2 className="text-2xl font-bold text-white">Access Denied</h2>
      <p className="max-w-sm text-gray-400">
        You don&apos;t have admin privileges. This page is restricted to administrators only.
      </p>
      <Link href="/">
        <Button
          variant="outline"
          className="mt-2 border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white"
        >
          Back to Home
        </Button>
      </Link>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const { user, isLoading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');

  // Loading state while auth resolves
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-950">
        <Header />
        <main className="container mx-auto max-w-7xl px-4 py-10">
          <div className="space-y-6">
            <Skeleton className="h-10 w-64" />
            <div className="grid grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-28 w-full" />
              ))}
            </div>
            <Skeleton className="h-72 w-full" />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Security: deny non-admins
  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gray-950">
        <Header />
        <main className="container mx-auto max-w-7xl px-4 py-10">
          <AccessDenied />
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950">
      <Header />

      <main className="container mx-auto max-w-7xl px-4 py-8">
        {/* Page header */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <LayoutDashboard className="h-5 w-5 text-emerald-400" />
              <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
            </div>
            <p className="text-sm text-gray-400">
              GreenChainz platform administration &mdash; logged in as{' '}
              <span className="text-emerald-400">{user.email}</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400">
              <User className="h-3 w-3" />
              Admin
            </span>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6 border border-gray-800 bg-gray-900 p-1">
            <TabsTrigger
              value="overview"
              className="data-[state=active]:bg-gray-800 data-[state=active]:text-emerald-400 text-gray-400"
            >
              <LayoutDashboard className="mr-1.5 h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger
              value="users"
              className="data-[state=active]:bg-gray-800 data-[state=active]:text-emerald-400 text-gray-400"
            >
              <Users className="mr-1.5 h-4 w-4" />
              Users
            </TabsTrigger>
            <TabsTrigger
              value="suppliers"
              className="data-[state=active]:bg-gray-800 data-[state=active]:text-emerald-400 text-gray-400"
            >
              <Building2 className="mr-1.5 h-4 w-4" />
              Suppliers
            </TabsTrigger>
            <TabsTrigger
              value="system"
              className="data-[state=active]:bg-gray-800 data-[state=active]:text-emerald-400 text-gray-400"
            >
              <Server className="mr-1.5 h-4 w-4" />
              System
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <OverviewTab />
          </TabsContent>

          <TabsContent value="users">
            <UsersTab />
          </TabsContent>

          <TabsContent value="suppliers">
            <SuppliersTab />
          </TabsContent>

          <TabsContent value="system">
            <SystemTab />
          </TabsContent>
        </Tabs>
      </main>

      <Footer />
    </div>
  );
}
