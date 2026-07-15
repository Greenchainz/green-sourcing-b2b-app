import { useState, useMemo, useCallback, useEffect } from 'react';
import { Link, useLocation, useSearch } from 'wouter';
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
import { ScrollArea } from '@/components/ui/scroll-area';

import {
  Users,
  Building2,
  Activity,
  Clock,
  CreditCard,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Search,
  Mail,
  Eye,
  ShieldAlert,
  RefreshCcw,
  ChevronDown,
  Rocket,
  Server,
  Zap,
  ExternalLink,
  User,
  LayoutDashboard,
  ListFilter,
  Package,
  Leaf,
  Download,
  Trash2,
  ShieldCheck,
  BarChart3,
  TrendingUp,
  Video,
  Bot,
  FolderOpen,
  Database,
  Upload,
  FileText,
  Send,
} from 'lucide-react';

// ─── Type definitions ────────────────────────────────────────────────────────

type UserRole = 'user' | 'admin' | 'buyer' | 'supplier';
type UserTier = 'free' | 'standard' | 'premium';
type SortDirection = 'asc' | 'desc';
type ChatRole = 'user' | 'assistant';

const INTELLIGENCE_SCRAPER_OPTIONS = [
  { name: 'supplier-contacts', label: 'Supplier contacts scraper' },
  { name: 'buyer-contacts', label: 'Buyer contacts scraper' },
  { name: 'drip-sequences', label: 'Drip sequence runner' },
  { name: 'salesforce-sync', label: 'Salesforce lead sync' },
] as const;

interface AdminUser {
  id: number;
  name: string | null;
  email: string | null;
  role: string;
  createdAt: Date | string | null;
  lastSignedIn: Date | string | null;
  tier: string;
  subscriptionStatus: string;
}

interface IntelligenceChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: number;
}

interface SharePointItem {
  id: string;
  name: string;
  webUrl: string | null;
  size: number | null;
  lastModifiedAt: string | null;
  type: 'folder' | 'file';
  childCount: number | null;
}

interface FabricOverviewResponse {
  configured: boolean;
  counts: {
    suppliers: number;
    rfqs: number;
    leads: number;
  };
  workspace: { id: string } | null;
  items: Array<{
    id: string | null;
    name: string;
    type: string;
    description: string | null;
  }>;
  message?: string;
}

interface WorkIqResponse {
  source: 'delegated' | 'app';
  insights: {
    meetingHours: number | null;
    focusTimeHours: number | null;
    collaborationHours: number | null;
    topCollaborators: string[];
  };
  activityStatistics: unknown[];
  reportStatus: 'ok' | 'unavailable';
  reportPreview: Array<Record<string, string>>;
}

// ─── Helper utilities ────────────────────────────────────────────────────────

function formatDate(d: Date | string | number | null | undefined): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatDateTime(d: Date | string | number | null | undefined): string {
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
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${map[role] ?? map.user
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
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${map[tier] ?? map.free
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
          <Link href="/admin?tab=users">
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
          <Link href="/admin/verification">
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

  const deleteUserMutation = trpc.admin.deleteUser.useMutation({
    onSuccess: () => {
      toast.success('User deleted');
      void refetch();
    },
    onError: (err) => {
      toast.error(err.message ?? 'Failed to delete user');
    },
  });

  const filtered = (allUsers ?? []).filter((u) => {
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      (u.name ?? '').toLowerCase().includes(q) ||
      (u.email ?? '').toLowerCase().includes(q) ||
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
                          {u.role !== 'admin' && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-red-700/40 bg-red-900/20 text-xs text-red-400 hover:bg-red-900/40 hover:text-red-300"
                              disabled={deleteUserMutation.isPending}
                              title="Delete user"
                              onClick={() => {
                                if (
                                  window.confirm(
                                    `Delete ${u.name ?? u.email}? This permanently removes the account and cannot be undone.`
                                  )
                                ) {
                                  deleteUserMutation.mutate({ userId: u.id });
                                }
                              }}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
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
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = trpc.admin.getSupplierStats.useQuery();
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

  const deleteSupplierMutation = trpc.admin.deleteSupplier.useMutation({
    onSuccess: () => {
      toast.success('Supplier deleted');
      void refetch();
      void refetchStats();
      setExpandedId(null);
    },
    onError: (err) => toast.error(err.message ?? 'Failed to delete supplier'),
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
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-red-700/40 bg-red-900/20 text-xs text-red-400 hover:bg-red-900/40 hover:text-red-300"
                            disabled={deleteSupplierMutation.isPending}
                            title="Delete supplier"
                            onClick={() => {
                              if (
                                window.confirm(
                                  `Delete ${s.companyName}? This permanently removes the supplier record and cannot be undone.`
                                )
                              ) {
                                deleteSupplierMutation.mutate({ supplierId: s.id });
                              }
                            }}
                          >
                            <Trash2 className="mr-1 h-3 w-3" />
                            Delete
                          </Button>
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

// ─── Catalog Tab ─────────────────────────────────────────────────────────────

const EC3_CATEGORIES = [
  "Concrete", "Steel", "RebarSteel", "Aluminium", "Insulation", "BoardInsulation",
  "Gypsum", "Masonry", "Glass", "CurtainWalls", "Windows", "MembraneRoofing",
  "PrecastConcrete", "MassTimber", "NonStructuralWood", "Flooring", "Carpet",
  "WoodFlooring", "CeramicTile", "Cladding", "PaintByArea", "UtilityPiping",
  "DuctsAndDuctwork", "ColdFormedSteelFraming", "SprayAppliedInsulation",
  "DampproofingAndWaterproofing", "CeilingPanel", "Cement",
] as const;

function CatalogTab() {
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } =
    trpc.admin.getCatalogStats.useQuery();

  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [matOffset, setMatOffset] = useState(0);
  const MAT_PAGE = 50;

  const { data: matData, isLoading: matLoading, refetch: refetchMats } =
    trpc.admin.searchMaterials.useQuery(
      { search: search || undefined, category: catFilter || undefined, limit: MAT_PAGE, offset: matOffset },
      { placeholderData: (p) => p }
    );

  const [ec3Category, setEc3Category] = useState<string>('Concrete');
  const [ec3Limit, setEc3Limit] = useState(100);
  const ec3Import = trpc.admin.triggerEC3Import.useMutation({
    onSuccess: (data) => {
      toast.success(`EC3 import done — ${data.created} new ${data.category} materials added`);
      void refetchStats();
      void refetchMats();
    },
    onError: (err) => toast.error(`EC3 import failed: ${err.message}`),
  });

  const deleteMat = trpc.admin.deleteMaterial.useMutation({
    onSuccess: () => { toast.success('Material deleted'); void refetchMats(); void refetchStats(); },
    onError: (err) => toast.error(err.message),
  });

  const verifyMat = trpc.admin.setMaterialVerified.useMutation({
    onSuccess: () => { toast.success('Updated'); void refetchMats(); },
    onError: (err) => toast.error(err.message),
  });

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'Total Materials', value: stats?.total ?? 0, color: 'text-white', icon: <Package className="h-5 w-5 text-emerald-400" />, accent: 'bg-emerald-500/10' },
          { label: 'With EPD', value: stats?.withEpd ?? 0, color: 'text-emerald-400', icon: <ShieldCheck className="h-5 w-5 text-emerald-400" />, accent: 'bg-emerald-500/10' },
          { label: 'With GWP Data', value: stats?.withGwp ?? 0, color: 'text-blue-400', icon: <Leaf className="h-5 w-5 text-blue-400" />, accent: 'bg-blue-500/10' },
          { label: 'Admin-Verified', value: stats?.verified ?? 0, color: 'text-amber-400', icon: <BarChart3 className="h-5 w-5 text-amber-400" />, accent: 'bg-amber-500/10' },
        ].map(({ label, value, color, icon, accent }) => (
          <Card key={label} className="border-gray-800 bg-gray-900">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-gray-400">{label}</p>
                  {statsLoading ? (
                    <Skeleton className="mt-1 h-8 w-16" />
                  ) : (
                    <p className={`text-2xl font-bold ${color}`}>{value.toLocaleString()}</p>
                  )}
                </div>
                <div className={`rounded-lg p-2.5 ${accent}`}>{icon}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Category breakdown */}
      <Card className="border-gray-800 bg-gray-900">
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-gray-400" />
            Category Breakdown
          </CardTitle>
          <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white h-7 w-7 p-0"
            onClick={() => void refetchStats()}>
            <RefreshCcw className="h-3.5 w-3.5" />
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-h-64 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-gray-800 hover:bg-transparent">
                  <TableHead className="text-gray-400 text-xs">Category</TableHead>
                  <TableHead className="text-gray-400 text-xs text-right">Materials</TableHead>
                  <TableHead className="text-gray-400 text-xs text-right">EPD</TableHead>
                  <TableHead className="text-gray-400 text-xs text-right">EPD%</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {statsLoading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={4}><Skeleton className="h-5 w-full" /></TableCell>
                    </TableRow>
                  ))
                ) : (stats?.byCategory ?? []).map((row) => (
                  <TableRow key={row.category} className="border-gray-800 hover:bg-gray-800/40 cursor-pointer"
                    onClick={() => { setCatFilter(row.category); setMatOffset(0); }}>
                    <TableCell className="text-gray-200 text-xs py-2">{row.category}</TableCell>
                    <TableCell className="text-right text-xs py-2 text-gray-300">{row.total}</TableCell>
                    <TableCell className="text-right text-xs py-2 text-emerald-400">{row.epd}</TableCell>
                    <TableCell className="text-right text-xs py-2 text-gray-500">
                      {row.total > 0 ? `${Math.round((row.epd / row.total) * 100)}%` : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* EC3 Import */}
      <Card className="border-gray-800 bg-gray-900">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold text-white">
            <Download className="h-4 w-4 text-blue-400" />
            EC3 Live Import
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-gray-400">
            Pull verified EPD data directly from Building Transparency (EC3). Only imports new materials — existing records are updated in place.
          </p>
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <p className="text-xs text-gray-500 mb-1">Category</p>
              <Select value={ec3Category} onValueChange={setEc3Category}>
                <SelectTrigger className="w-56 border-gray-700 bg-gray-800 text-white text-xs h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-gray-700 bg-gray-900 text-white max-h-72">
                  {EC3_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Limit</p>
              <Select value={String(ec3Limit)} onValueChange={(v) => setEc3Limit(Number(v))}>
                <SelectTrigger className="w-24 border-gray-700 bg-gray-800 text-white text-xs h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-gray-700 bg-gray-900 text-white">
                  {[50, 100, 200, 500].map((n) => (
                    <SelectItem key={n} value={String(n)} className="text-xs">{n}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              size="sm"
              className="bg-blue-700 hover:bg-blue-600 text-white h-8 text-xs"
              disabled={ec3Import.isPending}
              onClick={() => ec3Import.mutate({ category: ec3Category, limit: ec3Limit })}
            >
              {ec3Import.isPending ? (
                <><RefreshCcw className="mr-1.5 h-3.5 w-3.5 animate-spin" />Importing…</>
              ) : (
                <><Download className="mr-1.5 h-3.5 w-3.5" />Import from EC3</>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Materials browser */}
      <Card className="border-gray-800 bg-gray-900">
        <CardHeader className="pb-3 flex flex-row items-center justify-between flex-wrap gap-3">
          <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
            <Package className="h-4 w-4 text-gray-400" />
            Materials Browser
            {matData && <span className="text-xs font-normal text-gray-500 ml-1">({matData.total.toLocaleString()} results)</span>}
          </CardTitle>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-500" />
              <Input
                placeholder="Search materials…"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setMatOffset(0); }}
                className="border-gray-700 bg-gray-800 pl-8 text-white placeholder:text-gray-600 h-8 text-xs w-44"
              />
            </div>
            <Select value={catFilter || 'all'} onValueChange={(v) => { setCatFilter(v === 'all' ? '' : v); setMatOffset(0); }}>
              <SelectTrigger className="w-40 border-gray-700 bg-gray-800 text-white h-8 text-xs">
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent className="border-gray-700 bg-gray-900 text-white max-h-72">
                <SelectItem value="all" className="text-xs">All categories</SelectItem>
                {EC3_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {(search || catFilter) && (
              <Button variant="ghost" size="sm" className="h-8 text-gray-400 hover:text-white text-xs px-2"
                onClick={() => { setSearch(''); setCatFilter(''); setMatOffset(0); }}>
                <XCircle className="h-3.5 w-3.5 mr-1" />Clear
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {matLoading ? (
            <div className="p-6 space-y-2">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-9 w-full" />)}
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-800 hover:bg-transparent">
                    <TableHead className="text-gray-400 text-xs">ID</TableHead>
                    <TableHead className="text-gray-400 text-xs">Name</TableHead>
                    <TableHead className="text-gray-400 text-xs">Category</TableHead>
                    <TableHead className="text-gray-400 text-xs">EPD</TableHead>
                    <TableHead className="text-gray-400 text-xs">GWP</TableHead>
                    <TableHead className="text-gray-400 text-xs">Source</TableHead>
                    <TableHead className="text-gray-400 text-xs">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(matData?.items ?? []).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="py-8 text-center text-gray-500 text-sm">
                        No materials found.
                      </TableCell>
                    </TableRow>
                  ) : (matData?.items ?? []).map((m) => (
                    <TableRow key={m.id} className="border-gray-800 hover:bg-gray-800/40">
                      <TableCell className="text-gray-500 text-xs font-mono py-2">#{m.id}</TableCell>
                      <TableCell className="text-gray-200 text-xs py-2 max-w-[200px] truncate">{m.name}</TableCell>
                      <TableCell className="py-2">
                        <Badge variant="secondary" className="text-[10px] px-1.5">{m.category}</Badge>
                      </TableCell>
                      <TableCell className="py-2">
                        {m.hasEpd ? (
                          <span className="text-emerald-400 text-[10px] font-medium">✓ EPD</span>
                        ) : (
                          <span className="text-gray-600 text-[10px]">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-gray-400 text-xs py-2 font-mono">
                        {m.gwpValue ? Number(m.gwpValue).toFixed(1) : '—'}
                      </TableCell>
                      <TableCell className="text-gray-500 text-[10px] py-2">{m.dataSource ?? '—'}</TableCell>
                      <TableCell className="py-2">
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            title={m.verified ? 'Unverify' : 'Mark verified'}
                            className={`h-6 w-6 p-0 ${m.verified ? 'text-emerald-400 hover:text-gray-400' : 'text-gray-600 hover:text-emerald-400'}`}
                            onClick={() => verifyMat.mutate({ id: m.id, verified: !m.verified })}
                          >
                            <ShieldCheck className="h-3.5 w-3.5" />
                          </Button>
                          <a href={`/materials/${m.id}`} target="_blank" rel="noreferrer" aria-label={`Open ${m.name}`} title={`Open ${m.name}`}>
                            <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-gray-600 hover:text-white">
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                          </a>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0 text-gray-600 hover:text-red-400"
                            onClick={() => {
                              if (window.confirm(`Delete "${m.name}"? This cannot be undone.`)) {
                                deleteMat.mutate({ id: m.id });
                              }
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {/* Pagination */}
              {(matData?.total ?? 0) > MAT_PAGE && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-gray-800">
                  <span className="text-xs text-gray-500">
                    {matOffset + 1}–{Math.min(matOffset + MAT_PAGE, matData?.total ?? 0)} of {matData?.total?.toLocaleString()}
                  </span>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" disabled={matOffset === 0}
                      className="h-7 text-xs border-gray-700 bg-gray-800 text-gray-300"
                      onClick={() => setMatOffset(Math.max(0, matOffset - MAT_PAGE))}>
                      Previous
                    </Button>
                    <Button size="sm" variant="outline"
                      disabled={matOffset + MAT_PAGE >= (matData?.total ?? 0)}
                      className="h-7 text-xs border-gray-700 bg-gray-800 text-gray-300"
                      onClick={() => setMatOffset(matOffset + MAT_PAGE)}>
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Intelligence Tabs ────────────────────────────────────────────────────────

function LeadsTab() {
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<{ key: 'name' | 'company' | 'createdAt'; direction: SortDirection }>({
    key: 'createdAt',
    direction: 'desc',
  });
  const { data, isLoading } = trpc.admin.listIntelligenceLeads.useQuery();

  const filtered = useMemo(() => {
    const rows = data ?? [];
    const q = search.trim().toLowerCase();
    const searched = q
      ? rows.filter((row) =>
        [row.name, row.email, row.company, row.role, row.category, row.sfLeadId]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(q))
      )
      : rows;

    return [...searched].sort((a, b) => {
      const av = a[sort.key] ?? '';
      const bv = b[sort.key] ?? '';
      const cmp = sort.key === 'createdAt'
        ? new Date(String(av)).getTime() - new Date(String(bv)).getTime()
        : String(av).localeCompare(String(bv));
      return sort.direction === 'asc' ? cmp : -cmp;
    });
  }, [data, search, sort]);

  const toggleSort = (key: 'name' | 'company' | 'createdAt') => {
    setSort((current) =>
      current.key === key
        ? { key, direction: current.direction === 'asc' ? 'desc' : 'asc' }
        : { key, direction: 'asc' }
    );
  };

  return (
    <Card className="border-gray-800 bg-gray-900">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-semibold text-white">
          <Users className="h-4 w-4 text-gray-400" />
          Leads discovered
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="relative max-w-sm">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-500" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search leads…"
            className="h-8 border-gray-700 bg-gray-800 pl-8 text-xs text-white placeholder:text-gray-600"
          />
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-9 w-full" />)}
          </div>
        ) : (
          <div className="rounded-md border border-gray-800">
            <Table>
              <TableHeader>
                <TableRow className="border-gray-800 hover:bg-transparent">
                  <TableHead className="cursor-pointer text-gray-400 text-xs" onClick={() => toggleSort('name')}>Name</TableHead>
                  <TableHead className="text-gray-400 text-xs">Email</TableHead>
                  <TableHead className="cursor-pointer text-gray-400 text-xs" onClick={() => toggleSort('company')}>Company</TableHead>
                  <TableHead className="text-gray-400 text-xs">Role</TableHead>
                  <TableHead className="text-gray-400 text-xs">Category</TableHead>
                  <TableHead className="text-gray-400 text-xs">SF Lead ID</TableHead>
                  <TableHead className="cursor-pointer text-gray-400 text-xs" onClick={() => toggleSort('createdAt')}>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center text-gray-500 text-sm">No leads found.</TableCell>
                  </TableRow>
                ) : filtered.map((row) => (
                  <TableRow key={row.id} className="border-gray-800 hover:bg-gray-800/40">
                    <TableCell className="text-xs text-gray-200 py-2">{row.name ?? '—'}</TableCell>
                    <TableCell className="text-xs text-gray-400 py-2">{row.email ?? '—'}</TableCell>
                    <TableCell className="text-xs text-gray-300 py-2">{row.company ?? '—'}</TableCell>
                    <TableCell className="text-xs text-gray-400 py-2">{row.role ?? '—'}</TableCell>
                    <TableCell className="text-xs text-gray-400 py-2">{row.category ?? '—'}</TableCell>
                    <TableCell className="text-[10px] font-mono text-gray-500 py-2">{row.sfLeadId ?? '—'}</TableCell>
                    <TableCell className="text-xs text-gray-500 py-2">{formatDateTime(row.createdAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function OutreachTab() {
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<{ key: 'step' | 'status' | 'sentAt'; direction: SortDirection }>({
    key: 'sentAt',
    direction: 'desc',
  });
  const { data, isLoading } = trpc.admin.listIntelligenceEmailSequences.useQuery();

  const filtered = useMemo(() => {
    const rows = data ?? [];
    const q = search.trim().toLowerCase();
    const searched = q
      ? rows.filter((row) =>
        [row.contactEmail, row.status, row.step]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(q))
      )
      : rows;

    return [...searched].sort((a, b) => {
      if (sort.key === 'step') {
        return sort.direction === 'asc' ? a.step - b.step : b.step - a.step;
      }
      if (sort.key === 'status') {
        const cmp = String(a.status).localeCompare(String(b.status));
        return sort.direction === 'asc' ? cmp : -cmp;
      }
      const at = a.sentAt ? new Date(String(a.sentAt)).getTime() : 0;
      const bt = b.sentAt ? new Date(String(b.sentAt)).getTime() : 0;
      return sort.direction === 'asc' ? at - bt : bt - at;
    });
  }, [data, search, sort]);

  const toggleSort = (key: 'step' | 'status' | 'sentAt') => {
    setSort((current) =>
      current.key === key
        ? { key, direction: current.direction === 'asc' ? 'desc' : 'asc' }
        : { key, direction: 'asc' }
    );
  };

  return (
    <Card className="border-gray-800 bg-gray-900">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-semibold text-white">
          <Mail className="h-4 w-4 text-gray-400" />
          Outreach sequences
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="relative max-w-sm">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-500" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search outreach…"
            className="h-8 border-gray-700 bg-gray-800 pl-8 text-xs text-white placeholder:text-gray-600"
          />
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-9 w-full" />)}
          </div>
        ) : (
          <div className="rounded-md border border-gray-800">
            <Table>
              <TableHeader>
                <TableRow className="border-gray-800 hover:bg-transparent">
                  <TableHead className="text-gray-400 text-xs">Contact email</TableHead>
                  <TableHead className="cursor-pointer text-gray-400 text-xs" onClick={() => toggleSort('step')}>Step</TableHead>
                  <TableHead className="cursor-pointer text-gray-400 text-xs" onClick={() => toggleSort('status')}>Status</TableHead>
                  <TableHead className="cursor-pointer text-gray-400 text-xs" onClick={() => toggleSort('sentAt')}>Sent at</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-8 text-center text-gray-500 text-sm">No outreach rows found.</TableCell>
                  </TableRow>
                ) : filtered.map((row) => (
                  <TableRow key={row.id} className="border-gray-800 hover:bg-gray-800/40">
                    <TableCell className="text-xs text-gray-300 py-2">{row.contactEmail ?? '—'}</TableCell>
                    <TableCell className="text-xs text-gray-400 py-2">{row.step}</TableCell>
                    <TableCell className="text-xs text-gray-300 py-2">{row.status}</TableCell>
                    <TableCell className="text-xs text-gray-500 py-2">{formatDateTime(row.sentAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ScrapersTab() {
  const [selectedScraper, setSelectedScraper] = useState<string>(INTELLIGENCE_SCRAPER_OPTIONS[0].name);
  const [isTriggering, setIsTriggering] = useState(false);
  const { data, isLoading, refetch } = trpc.admin.listIntelligenceScraperStatus.useQuery();

  const triggerScraper = async () => {
    setIsTriggering(true);
    try {
      const res = await fetch('/api/intelligence/trigger', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scraperName: selectedScraper }),
      });
      const body = (await res.json()) as { error?: string; detail?: string };
      if (!res.ok) {
        throw new Error(body.detail ?? body.error ?? 'Failed to trigger scraper');
      }
      toast.success(`${selectedScraper} triggered`);
      await refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to trigger scraper');
    } finally {
      setIsTriggering(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-gray-800 bg-gray-900">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-semibold text-white">
            <Rocket className="h-4 w-4 text-gray-400" />
            Trigger scraper
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Select value={selectedScraper} onValueChange={setSelectedScraper}>
            <SelectTrigger className="w-full border-gray-700 bg-gray-800 text-white text-xs sm:w-72">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="border-gray-700 bg-gray-900 text-white">
              {INTELLIGENCE_SCRAPER_OPTIONS.map((scraper) => (
                <SelectItem key={scraper.name} value={scraper.name} className="text-xs">{scraper.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" disabled={isTriggering} onClick={triggerScraper}>
            {isTriggering ? (
              <><RefreshCcw className="mr-1.5 h-3.5 w-3.5 animate-spin" />Triggering…</>
            ) : (
              <><Rocket className="mr-1.5 h-3.5 w-3.5" />Trigger now</>
            )}
          </Button>
        </CardContent>
      </Card>

      <Card className="border-gray-800 bg-gray-900">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-semibold text-white">
            <Activity className="h-4 w-4 text-gray-400" />
            Scraper run history
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-9 w-full" />)}
            </div>
          ) : (
            <div className="rounded-md border border-gray-800">
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-800 hover:bg-transparent">
                    <TableHead className="text-gray-400 text-xs">Scraper</TableHead>
                    <TableHead className="text-gray-400 text-xs">Status</TableHead>
                    <TableHead className="text-gray-400 text-xs">Last run</TableHead>
                    <TableHead className="text-gray-400 text-xs">Completed</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(data ?? []).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="py-8 text-center text-gray-500 text-sm">No scraper history found.</TableCell>
                    </TableRow>
                  ) : (data ?? []).map((row) => (
                    <TableRow key={row.scraperName} className="border-gray-800 hover:bg-gray-800/40">
                      <TableCell className="text-xs text-gray-200 py-2">{row.label}</TableCell>
                      <TableCell className="text-xs py-2">
                        <Badge variant="secondary" className="text-[10px] px-1.5">
                          {row.status ?? 'unknown'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-gray-400 py-2">{formatDateTime(row.lastRunAt)}</TableCell>
                      <TableCell className="text-xs text-gray-500 py-2">{formatDateTime(row.completedAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function AIChatTab() {
  const [messages, setMessages] = useState<IntelligenceChatMessage[]>([
    {
      id: 'seed-assistant-message',
      role: 'assistant',
      content: 'I am your GreenChainz dashboard copilot. Ask about lead strategy, supplier onboarding, outreach, or growth decisions.',
      createdAt: Date.now(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);

  const sendMessage = async () => {
    const trimmed = input.trim();
    if (!trimmed || isSending) return;

    const userMessage: IntelligenceChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: trimmed,
      createdAt: Date.now(),
    };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput('');
    setIsSending(true);

    try {
      const response = await fetch('/api/admin/intelligence/ai-chat', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: nextMessages.map((message) => ({
            role: message.role,
            content: message.content,
          })),
        }),
      });
      const body = (await response.json()) as { reply?: string; error?: string; detail?: string };
      if (!response.ok || !body.reply) {
        throw new Error(body.detail ?? body.error ?? 'AI chat request failed');
      }
      setMessages((current) => [
        ...current,
        {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: body.reply!,
          createdAt: Date.now(),
        },
      ]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'AI chat request failed');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Card className="border-gray-800 bg-gray-900">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-semibold text-white">
          <Bot className="h-4 w-4 text-gray-400" />
          AI founder copilot
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <ScrollArea className="h-[420px] rounded-md border border-gray-800 bg-gray-950/40 p-3">
          <div className="space-y-3">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`max-w-[88%] rounded-md px-3 py-2 text-sm ${message.role === 'user'
                    ? 'ml-auto bg-emerald-500/15 text-emerald-100 border border-emerald-500/30'
                    : 'mr-auto bg-gray-800 text-gray-100 border border-gray-700'
                  }`}
              >
                <p className="whitespace-pre-wrap">{message.content}</p>
                <p className="mt-1 text-[10px] text-gray-400">{formatDateTime(message.createdAt)}</p>
              </div>
            ))}
          </div>
        </ScrollArea>
        <div className="space-y-2">
          <Textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Ask about leads, RFQs, supplier conversion, or growth priorities…"
            className="min-h-[90px] border-gray-700 bg-gray-800 text-sm text-white placeholder:text-gray-500"
          />
          <div className="flex justify-end">
            <Button size="sm" onClick={sendMessage} disabled={isSending || input.trim().length === 0}>
              {isSending ? (
                <><RefreshCcw className="mr-1.5 h-3.5 w-3.5 animate-spin" />Sending…</>
              ) : (
                <><Send className="mr-1.5 h-3.5 w-3.5" />Send</>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SharePointTab() {
  const [path, setPath] = useState('');
  const [items, setItems] = useState<SharePointItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadFiles = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const search = path.trim() ? `?path=${encodeURIComponent(path.trim())}` : '';
      const response = await fetch(`/api/admin/intelligence/sharepoint/files${search}`, {
        credentials: 'include',
      });
      const body = (await response.json()) as { items?: SharePointItem[]; error?: string; detail?: string };
      if (!response.ok) {
        throw new Error(body.detail ?? body.error ?? 'Failed to load SharePoint files');
      }
      setItems(body.items ?? []);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : 'Failed to load SharePoint files');
    } finally {
      setIsLoading(false);
    }
  }, [path]);

  useEffect(() => {
    void loadFiles();
  }, [loadFiles]);

  const uploadFile = async () => {
    if (!selectedFile) {
      toast.error('Choose a file before uploading');
      return;
    }
    setIsUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      if (path.trim()) formData.append('path', path.trim());

      const response = await fetch('/api/admin/intelligence/sharepoint/upload', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      const body = (await response.json()) as { success?: boolean; error?: string; detail?: string };
      if (!response.ok || !body.success) {
        throw new Error(body.detail ?? body.error ?? 'SharePoint upload failed');
      }
      setSelectedFile(null);
      toast.success('Document uploaded to SharePoint');
      await loadFiles();
    } catch (uploadError) {
      const message = uploadError instanceof Error ? uploadError.message : 'SharePoint upload failed';
      setError(message);
      toast.error(message);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-gray-800 bg-gray-900">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-semibold text-white">
            <FolderOpen className="h-4 w-4 text-gray-400" />
            SharePoint documents
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              value={path}
              onChange={(event) => setPath(event.target.value)}
              placeholder="Folder path (optional), e.g. leads/2026"
              className="border-gray-700 bg-gray-800 text-sm text-white placeholder:text-gray-600"
            />
            <Button size="sm" variant="outline" className="border-gray-700 bg-gray-800 text-gray-300 hover:bg-gray-700" onClick={() => void loadFiles()}>
              Refresh
            </Button>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Input
              type="file"
              onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
              className="border-gray-700 bg-gray-800 text-xs text-gray-300 file:border-0 file:bg-gray-700 file:text-gray-200"
            />
            <Button size="sm" onClick={uploadFile} disabled={isUploading || !selectedFile}>
              {isUploading ? (
                <><RefreshCcw className="mr-1.5 h-3.5 w-3.5 animate-spin" />Uploading…</>
              ) : (
                <><Upload className="mr-1.5 h-3.5 w-3.5" />Upload</>
              )}
            </Button>
          </div>
          {error ? (
            <div className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">{error}</div>
          ) : null}
        </CardContent>
      </Card>

      <Card className="border-gray-800 bg-gray-900">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-white">Files</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-9 w-full" />)}
            </div>
          ) : (
            <div className="rounded-md border border-gray-800">
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-800 hover:bg-transparent">
                    <TableHead className="text-gray-400 text-xs">Name</TableHead>
                    <TableHead className="text-gray-400 text-xs">Type</TableHead>
                    <TableHead className="text-gray-400 text-xs">Size</TableHead>
                    <TableHead className="text-gray-400 text-xs">Modified</TableHead>
                    <TableHead className="text-gray-400 text-xs">Open</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-8 text-center text-gray-500 text-sm">No SharePoint items found.</TableCell>
                    </TableRow>
                  ) : items.map((item) => (
                    <TableRow key={item.id} className="border-gray-800 hover:bg-gray-800/40">
                      <TableCell className="text-xs text-gray-200 py-2">{item.name}</TableCell>
                      <TableCell className="text-xs text-gray-400 py-2">{item.type}</TableCell>
                      <TableCell className="text-xs text-gray-400 py-2">
                        {item.size !== null ? `${Math.max(1, Math.round(item.size / 1024))} KB` : '—'}
                      </TableCell>
                      <TableCell className="text-xs text-gray-500 py-2">{formatDateTime(item.lastModifiedAt)}</TableCell>
                      <TableCell className="text-xs py-2">
                        {item.webUrl ? (
                          <a href={item.webUrl} target="_blank" rel="noreferrer" className="text-emerald-400 hover:text-emerald-300 underline-offset-4 hover:underline">
                            Open
                          </a>
                        ) : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function FabricTab() {
  const [data, setData] = useState<FabricOverviewResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadOverview = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/intelligence/fabric/overview', {
        credentials: 'include',
      });
      const body = (await response.json()) as FabricOverviewResponse & { error?: string; detail?: string };
      if (!response.ok) {
        throw new Error(body.detail ?? body.error ?? 'Failed to load Fabric overview');
      }
      setData(body);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : 'Failed to load Fabric overview');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

  return (
    <div className="space-y-6">
      <Card className="border-gray-800 bg-gray-900">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-semibold text-white">
            <Database className="h-4 w-4 text-gray-400" />
            Fabric data sync
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-3">
            <Button size="sm" variant="outline" className="border-gray-700 bg-gray-800 text-gray-300 hover:bg-gray-700" onClick={() => void loadOverview()}>
              Refresh
            </Button>
            {data?.configured ? (
              <Badge className="border-emerald-500/30 bg-emerald-500/10 text-emerald-300">Fabric configured</Badge>
            ) : (
              <Badge className="border-amber-500/30 bg-amber-500/10 text-amber-300">Configuration needed</Badge>
            )}
          </div>
          {error ? (
            <div className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">{error}</div>
          ) : null}
          {data?.message ? (
            <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">{data.message}</div>
          ) : null}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <KpiCard
              title="Suppliers"
              value={data?.counts.suppliers ?? 0}
              icon={<Building2 className="h-5 w-5 text-blue-300" />}
              accent="bg-blue-500/10"
              loading={isLoading}
            />
            <KpiCard
              title="RFQs"
              value={data?.counts.rfqs ?? 0}
              icon={<FileText className="h-5 w-5 text-purple-300" />}
              accent="bg-purple-500/10"
              loading={isLoading}
            />
            <KpiCard
              title="Leads"
              value={data?.counts.leads ?? 0}
              icon={<Users className="h-5 w-5 text-emerald-300" />}
              accent="bg-emerald-500/10"
              loading={isLoading}
            />
          </div>
          {data?.workspace?.id ? (
            <p className="text-xs text-gray-500">Workspace: <span className="font-mono">{data.workspace.id}</span></p>
          ) : null}
        </CardContent>
      </Card>

      <Card className="border-gray-800 bg-gray-900">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-white">Workspace items</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-9 w-full" />)}
            </div>
          ) : (
            <div className="rounded-md border border-gray-800">
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-800 hover:bg-transparent">
                    <TableHead className="text-gray-400 text-xs">Name</TableHead>
                    <TableHead className="text-gray-400 text-xs">Type</TableHead>
                    <TableHead className="text-gray-400 text-xs">Description</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(data?.items ?? []).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="py-8 text-center text-gray-500 text-sm">No Fabric items available.</TableCell>
                    </TableRow>
                  ) : (data?.items ?? []).map((item) => (
                    <TableRow key={`${item.id ?? item.name}-${item.type}`} className="border-gray-800 hover:bg-gray-800/40">
                      <TableCell className="text-xs text-gray-200 py-2">{item.name}</TableCell>
                      <TableCell className="text-xs text-gray-400 py-2">{item.type}</TableCell>
                      <TableCell className="text-xs text-gray-500 py-2">{item.description ?? '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function WorkIQTab() {
  const [data, setData] = useState<WorkIqResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadWorkIq = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/workiq', {
        credentials: 'include',
      });
      const body = (await response.json()) as WorkIqResponse & { error?: string; detail?: string };
      if (!response.ok) {
        throw new Error(body.detail ?? body.error ?? 'Failed to load WorkIQ insights');
      }
      setData(body);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : 'Failed to load WorkIQ insights');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadWorkIq();
  }, [loadWorkIq]);

  const reportColumns = data?.reportPreview[0] ? Object.keys(data.reportPreview[0]).slice(0, 6) : [];

  return (
    <div className="space-y-6">
      <Card className="border-gray-800 bg-gray-900">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-semibold text-white">
            <BarChart3 className="h-4 w-4 text-gray-400" />
            WorkIQ productivity insights
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <Button
              size="sm"
              variant="outline"
              className="border-gray-700 bg-gray-800 text-gray-300 hover:bg-gray-700"
              onClick={() => void loadWorkIq()}
            >
              Refresh
            </Button>
            {data ? (
              <Badge className="border-emerald-500/30 bg-emerald-500/10 text-emerald-300">
                Token mode: {data.source}
              </Badge>
            ) : null}
          </div>

          {error ? (
            <div className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">{error}</div>
          ) : null}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <KpiCard
              title="Meeting hours"
              value={data?.insights.meetingHours ?? '—'}
              icon={<Clock className="h-5 w-5 text-amber-300" />}
              accent="bg-amber-500/10"
              loading={isLoading}
            />
            <KpiCard
              title="Focus time"
              value={data?.insights.focusTimeHours ?? '—'}
              icon={<Leaf className="h-5 w-5 text-emerald-300" />}
              accent="bg-emerald-500/10"
              loading={isLoading}
            />
            <KpiCard
              title="Collaboration load"
              value={data?.insights.collaborationHours ?? '—'}
              icon={<Users className="h-5 w-5 text-blue-300" />}
              accent="bg-blue-500/10"
              loading={isLoading}
            />
          </div>

          <div className="rounded-md border border-gray-800 bg-gray-950/40 p-3">
            <p className="text-xs font-medium text-gray-300">Top collaborators</p>
            {(data?.insights.topCollaborators?.length ?? 0) === 0 ? (
              <p className="mt-1 text-xs text-gray-500">No collaborator insights were returned for this tenant/user.</p>
            ) : (
              <div className="mt-2 flex flex-wrap gap-2">
                {data?.insights.topCollaborators.map((name) => (
                  <Badge key={name} variant="secondary" className="text-[11px]">{name}</Badge>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="border-gray-800 bg-gray-900">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-white">M365 App usage (D7 preview)</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-9 w-full" />)}
            </div>
          ) : data?.reportStatus !== 'ok' ? (
            <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
              M365 report data is currently unavailable for this app registration or tenant permissions.
            </div>
          ) : (
            <div className="rounded-md border border-gray-800">
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-800 hover:bg-transparent">
                    {reportColumns.map((column) => (
                      <TableHead key={column} className="text-gray-400 text-xs">{column}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.reportPreview.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={Math.max(1, reportColumns.length)} className="py-8 text-center text-gray-500 text-sm">
                        No report rows available.
                      </TableCell>
                    </TableRow>
                  ) : data.reportPreview.map((row, index) => (
                    <TableRow key={`report-row-${index}`} className="border-gray-800 hover:bg-gray-800/40">
                      {reportColumns.map((column) => (
                        <TableCell key={`${index}-${column}`} className="text-xs text-gray-300 py-2">
                          {row[column] || '—'}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── System Tab ──────────────────────────────────────────────────────────────

function SystemTab() {
  const clearTestUsers = trpc.admin.clearTestUsers.useMutation({
    onSuccess: (res) => {
      toast.success(
        res.count > 0
          ? `Cleared ${res.count} test user${res.count === 1 ? '' : 's'}`
          : 'No test users found to clear'
      );
    },
    onError: (err) => toast.error(err.message ?? 'Failed to clear test users'),
  });

  return (
    <div className="space-y-6">
      {/* Data Maintenance */}
      <Card className="border-gray-800 bg-gray-900">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-semibold text-white">
            <Trash2 className="h-4 w-4 text-gray-400" />
            Data Maintenance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-white">Clear test users</p>
              <p className="text-xs text-gray-500">
                Removes internal test accounts (openId matching <code className="text-gray-400">test-*-gcz-internal</code>). Real users are never touched.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="border-red-700/40 bg-red-900/20 text-red-400 hover:bg-red-900/40 hover:text-red-300"
              disabled={clearTestUsers.isPending}
              onClick={() => {
                if (window.confirm('Delete all internal test users? This cannot be undone.')) {
                  clearTestUsers.mutate();
                }
              }}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {clearTestUsers.isPending ? 'Clearing…' : 'Clear Test Users'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Quick Links */}
      <Card className="border-gray-800 bg-gray-900">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-semibold text-white">
            <Zap className="h-4 w-4 text-gray-400" />
            Platform Links
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Link href="/admin/suppliers">
              <Button variant="outline" size="sm" className="border-gray-700 bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white">
                <Building2 className="mr-2 h-4 w-4" />Supplier Dashboard
                <ExternalLink className="ml-2 h-3 w-3" />
              </Button>
            </Link>
            <Link href="/admin/verification">
              <Button variant="outline" size="sm" className="border-gray-700 bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white">
                <Clock className="mr-2 h-4 w-4" />Verification Queue
                <ExternalLink className="ml-2 h-3 w-3" />
              </Button>
            </Link>
            <Link href="/admin/concierge">
              <Button variant="outline" size="sm" className="border-green-800 bg-green-950 text-green-300 hover:bg-green-900 hover:text-white">
                <Zap className="mr-2 h-4 w-4" />Concierge Routing
                <ExternalLink className="ml-2 h-3 w-3" />
              </Button>
            </Link>
            <Link href="/admin/crm">
              <Button variant="outline" size="sm" className="border-gray-700 bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white">
                <TrendingUp className="mr-2 h-4 w-4" />CRM Pipeline
                <ExternalLink className="ml-2 h-3 w-3" />
              </Button>
            </Link>
            <Link href="/admin/founder-videos">
              <Button variant="outline" size="sm" className="border-blue-800 bg-blue-950 text-blue-300 hover:bg-blue-900 hover:text-white">
                <Video className="mr-2 h-4 w-4" />Founder Videos
                <ExternalLink className="ml-2 h-3 w-3" />
              </Button>
            </Link>
            <Link href="/admin/founder-videos/analytics">
              <Button variant="outline" size="sm" className="border-blue-800 bg-blue-950 text-blue-300 hover:bg-blue-900 hover:text-white">
                <BarChart3 className="mr-2 h-4 w-4" />Video Analytics
                <ExternalLink className="ml-2 h-3 w-3" />
              </Button>
            </Link>
            <Link href="/materials">
              <Button variant="outline" size="sm" className="border-gray-700 bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white">
                <Package className="mr-2 h-4 w-4" />Materials Catalog
                <ExternalLink className="ml-2 h-3 w-3" />
              </Button>
            </Link>
            <Link href="/manufacturers">
              <Button variant="outline" size="sm" className="border-gray-700 bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white">
                <Building2 className="mr-2 h-4 w-4" />Supplier Spotlight
                <ExternalLink className="ml-2 h-3 w-3" />
              </Button>
            </Link>
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
  const [, navigate] = useLocation();
  const searchStr = useSearch();
  const activeTab = useMemo(
    () => new URLSearchParams(searchStr).get('tab') ?? 'overview',
    [searchStr],
  );

  const setActiveTab = useCallback(
    (tab: string) => {
      navigate(`/admin?tab=${tab}`);
    },
    [navigate],
  );

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
              value="catalog"
              className="data-[state=active]:bg-gray-800 data-[state=active]:text-emerald-400 text-gray-400"
            >
              <Package className="mr-1.5 h-4 w-4" />
              Catalog
            </TabsTrigger>
            <TabsTrigger
              value="leads"
              className="data-[state=active]:bg-gray-800 data-[state=active]:text-emerald-400 text-gray-400"
            >
              <Users className="mr-1.5 h-4 w-4" />
              Leads
            </TabsTrigger>
            <TabsTrigger
              value="outreach"
              className="data-[state=active]:bg-gray-800 data-[state=active]:text-emerald-400 text-gray-400"
            >
              <Mail className="mr-1.5 h-4 w-4" />
              Outreach
            </TabsTrigger>
            <TabsTrigger
              value="scrapers"
              className="data-[state=active]:bg-gray-800 data-[state=active]:text-emerald-400 text-gray-400"
            >
              <Activity className="mr-1.5 h-4 w-4" />
              Scrapers
            </TabsTrigger>
            <TabsTrigger
              value="ai-chat"
              className="data-[state=active]:bg-gray-800 data-[state=active]:text-emerald-400 text-gray-400"
            >
              <Bot className="mr-1.5 h-4 w-4" />
              AI Chat
            </TabsTrigger>
            <TabsTrigger
              value="sharepoint"
              className="data-[state=active]:bg-gray-800 data-[state=active]:text-emerald-400 text-gray-400"
            >
              <FolderOpen className="mr-1.5 h-4 w-4" />
              SharePoint
            </TabsTrigger>
            <TabsTrigger
              value="fabric"
              className="data-[state=active]:bg-gray-800 data-[state=active]:text-emerald-400 text-gray-400"
            >
              <Database className="mr-1.5 h-4 w-4" />
              Fabric
            </TabsTrigger>
            <TabsTrigger
              value="workiq"
              className="data-[state=active]:bg-gray-800 data-[state=active]:text-emerald-400 text-gray-400"
            >
              <BarChart3 className="mr-1.5 h-4 w-4" />
              WorkIQ
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

          <TabsContent value="catalog">
            <CatalogTab />
          </TabsContent>

          <TabsContent value="leads">
            <LeadsTab />
          </TabsContent>

          <TabsContent value="outreach">
            <OutreachTab />
          </TabsContent>

          <TabsContent value="scrapers">
            <ScrapersTab />
          </TabsContent>

          <TabsContent value="ai-chat">
            <AIChatTab />
          </TabsContent>

          <TabsContent value="sharepoint">
            <SharePointTab />
          </TabsContent>

          <TabsContent value="fabric">
            <FabricTab />
          </TabsContent>

          <TabsContent value="workiq">
            <WorkIQTab />
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
