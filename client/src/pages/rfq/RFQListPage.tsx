/**
 * RFQListPage — all architect RFQs in a filterable table
 * Route: /rfqs
 */
import { useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Clock,
  CheckCircle,
  XCircle,
  Plus,
  Package,
  Search,
  Ban,
  ChevronRight,
} from "lucide-react";

// ── Status helpers ─────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  pending:   { label: "Pending",   icon: Clock,        cls: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400" },
  accepted:  { label: "Accepted",  icon: CheckCircle,  cls: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"   },
  declined:  { label: "Declined",  icon: XCircle,      cls: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"           },
  fulfilled: { label: "Fulfilled", icon: CheckCircle,  cls: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"       },
  cancelled: { label: "Cancelled", icon: Ban,          cls: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"          },
} as const;

type StatusKey = keyof typeof STATUS_CONFIG;

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status as StatusKey] ?? STATUS_CONFIG.pending;
  const Icon = cfg.icon;
  return (
    <Badge className={`flex items-center gap-1 border-0 text-xs whitespace-nowrap ${cfg.cls}`}>
      <Icon className="w-3 h-3" />{cfg.label}
    </Badge>
  );
}

// ── Resolve display status from raw row ────────────────────────────────────────

function resolveStatus(rfq: { status: string; specs?: string | null }): string {
  if (rfq.specs) {
    try {
      const parsed = JSON.parse(rfq.specs);
      if (parsed?.cancelledByArchitect) return "cancelled";
    } catch { /* not JSON */ }
  }
  return rfq.status;
}

function resolveProjectName(rfq: { materialType: string; specs?: string | null }): string {
  if (rfq.specs) {
    try {
      const parsed = JSON.parse(rfq.specs);
      if (parsed?.projectInfo?.projectName) return parsed.projectInfo.projectName;
    } catch { /* not JSON */ }
  }
  return rfq.materialType;
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function RFQListPage() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const { data: rfqs = [], isLoading } = trpc.rfqRequests.listMine.useQuery(undefined, {
    staleTime: 30_000,
  });

  // Apply client-side filter + resolve display status
  const displayed = rfqs
    .map((r) => ({ ...r, displayStatus: resolveStatus(r), projectName: resolveProjectName(r) }))
    .filter((r) => {
      if (statusFilter !== "all" && r.displayStatus !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          r.projectName.toLowerCase().includes(q) ||
          (r.supplierName ?? "").toLowerCase().includes(q)
        );
      }
      return true;
    });

  const counts = rfqs.reduce<Record<string, number>>((acc, r) => {
    const s = resolveStatus(r);
    acc[s] = (acc[s] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <div className="container max-w-4xl py-8 flex-1 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">My RFQs</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{rfqs.length} total requests</p>
          </div>
          <Link href="/rfq/new">
            <Button className="bg-green-600 hover:bg-green-700">
              <Plus className="w-4 h-4 mr-1.5" /> New RFQ
            </Button>
          </Link>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by project or supplier…"
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses ({rfqs.length})</SelectItem>
              {(["pending", "accepted", "declined", "fulfilled", "cancelled"] as StatusKey[]).map((s) =>
                counts[s] ? (
                  <SelectItem key={s} value={s}>
                    {STATUS_CONFIG[s].label} ({counts[s]})
                  </SelectItem>
                ) : null
              )}
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}
          </div>
        ) : displayed.length === 0 ? (
          <div className="py-20 text-center text-muted-foreground">
            <Package className="w-10 h-10 mx-auto mb-3 opacity-30" />
            {rfqs.length === 0 ? (
              <>
                <p>No RFQs yet.</p>
                <Link href="/rfq/new">
                  <Button size="sm" className="mt-3 bg-green-600 hover:bg-green-700">
                    Send your first RFQ
                  </Button>
                </Link>
              </>
            ) : (
              <p>No results for current filters.</p>
            )}
          </div>
        ) : (
          <div className="rounded-lg border overflow-hidden">
            {/* Table header */}
            <div className="hidden sm:grid grid-cols-[1fr_1fr_auto_auto] gap-4 px-4 py-2 bg-muted/50 text-xs text-muted-foreground font-medium uppercase tracking-wide">
              <span>Project / Material</span>
              <span>Supplier</span>
              <span>Date</span>
              <span>Status</span>
            </div>

            {/* Rows */}
            <div className="divide-y">
              {displayed.map((rfq) => (
                <Link key={rfq.id} href={`/rfqs/${rfq.id}`}>
                  <div className="flex sm:grid sm:grid-cols-[1fr_1fr_auto_auto] gap-3 sm:gap-4 items-center px-4 py-3 hover:bg-muted/40 transition-colors cursor-pointer group">
                    {/* Project */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{rfq.projectName}</p>
                      <p className="text-xs text-muted-foreground truncate sm:hidden">
                        {rfq.supplierName ?? `Supplier #${rfq.supplierId}`}
                      </p>
                    </div>

                    {/* Supplier — hidden on mobile (shown inline above) */}
                    <p className="hidden sm:block text-sm text-muted-foreground truncate">
                      {rfq.supplierName ?? `Supplier #${rfq.supplierId}`}
                    </p>

                    {/* Date */}
                    <p className="hidden sm:block text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(rfq.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </p>

                    {/* Status + chevron */}
                    <div className="flex items-center gap-2 shrink-0">
                      <StatusBadge status={rfq.displayStatus} />
                      <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity hidden sm:block" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
