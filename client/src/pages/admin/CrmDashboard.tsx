import { useState } from "react";
import DOMPurify from "dompurify";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Users,
  Building2,
  Mail,
  TrendingUp,
  TrendingDown,
  Activity,
  RefreshCw,
  Send,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Zap,
  Layers,
  Eye,
  Rocket,
  Tag,
  Gift,
  Trash2,
  Crown,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ─── Stage config ─────────────────────────────────────────────────────────────

const STAGES = [
  { key: "prospect",  label: "Prospect",  color: "bg-slate-400" },
  { key: "contacted", label: "Contacted", color: "bg-blue-400" },
  { key: "engaged",   label: "Engaged",   color: "bg-indigo-500" },
  { key: "claimed",   label: "Claimed",   color: "bg-purple-500" },
  { key: "trial",     label: "Trial",     color: "bg-amber-500" },
  { key: "paying",    label: "Paying",    color: "bg-green-500" },
  { key: "churned",   label: "Churned",   color: "bg-red-400" },
  { key: "dead",      label: "Dead",      color: "bg-zinc-400" },
] as const;

type Stage = typeof STAGES[number]["key"];

function StageBadge({ stage }: { stage: string }) {
  const config = STAGES.find((s) => s.key === stage);
  return (
    <span
      className={cn(
        "inline-block px-2 py-0.5 rounded-full text-white text-xs font-medium",
        config?.color ?? "bg-slate-400"
      )}
    >
      {config?.label ?? stage}
    </span>
  );
}

// ─── Pipeline Summary Cards ───────────────────────────────────────────────────

function PipelineSummary() {
  const { data, isLoading } = trpc.crm.pipeline.summary.useQuery();

  if (isLoading) {
    return (
      <div className="grid grid-cols-4 gap-3">
        {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-20" />)}
      </div>
    );
  }

  const chartData = STAGES.map((s) => ({
    stage: s.label,
    total: data?.[s.key]?.total ?? 0,
    supplier: data?.[s.key]?.supplier ?? 0,
    architect_firm: data?.[s.key]?.architect_firm ?? 0,
  }));

  const totalContacts = chartData.reduce((sum, d) => sum + d.total, 0);
  const paying = data?.paying?.total ?? 0;
  const engaged = (data?.engaged?.total ?? 0) + (data?.claimed?.total ?? 0) + (data?.trial?.total ?? 0);

  return (
    <div className="space-y-4">
      {/* KPI row */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-2xl font-bold">{totalContacts}</p>
            <p className="text-xs text-muted-foreground">Total Contacts</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-2xl font-bold text-green-600">{paying}</p>
            <p className="text-xs text-muted-foreground">Paying</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-2xl font-bold text-indigo-600">{engaged}</p>
            <p className="text-xs text-muted-foreground">Engaged / Claimed / Trial</p>
          </CardContent>
        </Card>
      </div>

      {/* Funnel chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Pipeline Funnel</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 24 }}>
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="stage" tick={{ fontSize: 11 }} width={68} />
                <Tooltip />
                <Bar dataKey="supplier" stackId="a" fill="#16a34a" name="Supplier" />
                <Bar dataKey="architect_firm" stackId="a" fill="#2563eb" name="Firm" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Contact List ─────────────────────────────────────────────────────────────

function ContactList() {
  const [stage, setStage] = useState<string | undefined>(undefined);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [offset, setOffset] = useState(0);
  const LIMIT = 25;

  const enrollMutation = trpc.crm.outreach.enroll.useMutation({
    onSuccess: () => toast.success("Enrolled in claim-profile sequence"),
    onError: (e) => toast.error(e.message),
  });

  const updateStageMutation = trpc.crm.contacts.updateStage.useMutation({
    onSuccess: () => { toast.success("Stage updated"); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const { data, isLoading, refetch } = trpc.crm.contacts.list.useQuery(
    {
      stage: stage as any,
      search: debouncedSearch || undefined,
      limit: LIMIT,
      offset,
    },
    { placeholderData: prev => prev }
  );

  return (
    <div className="space-y-3">
      {/* Filters */}
      <div className="flex gap-2">
        <Input
          placeholder="Search company, contact, email…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            clearTimeout((window as any).__searchTimer);
            (window as any).__searchTimer = setTimeout(() => {
              setDebouncedSearch(e.target.value);
              setOffset(0);
            }, 400);
          }}
          className="max-w-xs"
        />
        <Select value={stage ?? "all"} onValueChange={(v) => { setStage(v === "all" ? undefined : v); setOffset(0); }}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="All stages" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All stages</SelectItem>
            {STAGES.map((s) => (
              <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground self-center">
          {data?.total ?? "…"} contacts
        </span>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-2">
          {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-12" />)}
        </div>
      ) : (
        <div className="rounded-md border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-3 py-2 font-medium">Company</th>
                <th className="text-left px-3 py-2 font-medium">Category</th>
                <th className="text-left px-3 py-2 font-medium">Readiness</th>
                <th className="text-left px-3 py-2 font-medium">Stage</th>
                <th className="text-left px-3 py-2 font-medium">Last Contact</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {(data?.contacts ?? []).map((c) => (
                <tr key={c.id} className="border-t hover:bg-muted/30 transition-colors">
                  <td className="px-3 py-2">
                    <div className="font-medium">{c.companyName}</div>
                    {c.email && <div className="text-xs text-muted-foreground">{c.email}</div>}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground text-xs">{c.category ?? "—"}</td>
                  <td className="px-3 py-2">
                    {c.readinessLevel ? (
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-xs",
                          c.readinessLevel === "high" && "border-green-500 text-green-700",
                          c.readinessLevel === "medium" && "border-amber-500 text-amber-700",
                          c.readinessLevel === "low" && "border-slate-400 text-slate-600",
                        )}
                      >
                        {c.readinessLevel}
                      </Badge>
                    ) : "—"}
                  </td>
                  <td className="px-3 py-2">
                    <Select
                      value={c.stage}
                      onValueChange={(v) => updateStageMutation.mutate({ id: c.id, stage: v as Stage })}
                    >
                      <SelectTrigger className="h-6 text-xs w-28 border-none bg-transparent p-0">
                        <StageBadge stage={c.stage} />
                      </SelectTrigger>
                      <SelectContent>
                        {STAGES.map((s) => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">
                    {c.lastContactedAt
                      ? new Date(c.lastContactedAt).toLocaleDateString()
                      : "Never"}
                  </td>
                  <td className="px-3 py-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs gap-1"
                      disabled={!c.email || enrollMutation.isPending}
                      onClick={() => enrollMutation.mutate({ contactId: c.id })}
                      title={c.email ? "Enroll in claim-profile sequence" : "No email on file"}
                    >
                      <Send className="w-3 h-3" />
                      Enroll
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      <div className="flex gap-2 justify-end">
        <Button size="sm" variant="outline" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - LIMIT))}>
          Previous
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={!data || offset + LIMIT >= data.total}
          onClick={() => setOffset(offset + LIMIT)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}

// ─── Price Intelligence ───────────────────────────────────────────────────────

function PriceIntelligence() {
  const { data, isLoading, refetch } = trpc.crm.prices.latest.useQuery();
  const triggerFred = trpc.crm.scrapers.triggerFred.useMutation({
    onSuccess: () => { toast.success("FRED scrape triggered"); setTimeout(() => refetch(), 3000); },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-semibold">Latest PPI by Category (FRED)</h3>
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5"
          onClick={() => triggerFred.mutate()}
          disabled={triggerFred.isPending}
        >
          <RefreshCw className={cn("w-3.5 h-3.5", triggerFred.isPending && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {(data ?? []).map((row) => {
            const yoy = row.yoy_change_pct ? parseFloat(row.yoy_change_pct) : null;
            const up = yoy != null && yoy > 0;
            const down = yoy != null && yoy < 0;
            return (
              <Card key={row.id} className="p-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-sm">{row.category}</p>
                    <p className="text-xs text-muted-foreground">{row.series_name}</p>
                    <p className="text-xs text-muted-foreground">{row.period}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">{parseFloat(row.value).toFixed(1)}</p>
                    {yoy != null && (
                      <div className={cn("flex items-center gap-0.5 text-xs justify-end", up && "text-red-600", down && "text-green-600")}>
                        {up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {up ? "+" : ""}{yoy.toFixed(1)}% YoY
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
          {!data?.length && (
            <p className="text-sm text-muted-foreground col-span-2 text-center py-8">
              No price data yet. Click Refresh to pull from FRED.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Activity Feed ────────────────────────────────────────────────────────────

function ActivityFeed() {
  const { data, isLoading } = trpc.crm.pipeline.recentActivity.useQuery({ limit: 30 });

  const EVENT_ICONS: Record<string, any> = {
    email_sent: Send,
    email_opened: Mail,
    replied: CheckCircle2,
    profile_claimed: Zap,
    status_changed: Activity,
    note_added: AlertCircle,
    converted_paying: CheckCircle2,
  };

  return (
    <div className="space-y-2">
      {isLoading
        ? [...Array(8)].map((_, i) => <Skeleton key={i} className="h-10" />)
        : (data ?? []).map(({ event, contactName }) => {
            const Icon = EVENT_ICONS[event.eventType] ?? Activity;
            return (
              <div key={event.id} className="flex items-start gap-3 py-2 border-b last:border-0">
                <Icon className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm">
                    <span className="font-medium">{contactName}</span>
                    {" — "}
                    <span className="text-muted-foreground">{event.eventType.replace(/_/g, " ")}</span>
                    {event.subject && <span className="text-muted-foreground"> · {event.subject}</span>}
                  </p>
                  {event.notes && <p className="text-xs text-muted-foreground truncate">{event.notes}</p>}
                </div>
                <div className="text-xs text-muted-foreground shrink-0">
                  {new Date(event.createdAt).toLocaleDateString()}
                </div>
              </div>
            );
          })}
    </div>
  );
}

// ─── Scraper Health ───────────────────────────────────────────────────────────

function ScraperHealth() {
  const { data, isLoading } = trpc.crm.scrapers.recentRuns.useQuery({ limit: 15 });
  const triggerDrip = trpc.crm.scrapers.triggerOutreachDrip.useMutation({
    onSuccess: () => toast.success("Outreach drip triggered"),
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Button size="sm" variant="outline" className="gap-1.5" onClick={() => triggerDrip.mutate()} disabled={triggerDrip.isPending}>
          <Send className={cn("w-3.5 h-3.5", triggerDrip.isPending && "animate-spin")} />
          Run Outreach Drip Now
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
      ) : (
        <div className="rounded-md border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-3 py-2 font-medium">Scraper</th>
                <th className="text-left px-3 py-2 font-medium">Status</th>
                <th className="text-left px-3 py-2 font-medium">Created</th>
                <th className="text-left px-3 py-2 font-medium">Updated</th>
                <th className="text-left px-3 py-2 font-medium">Duration</th>
                <th className="text-left px-3 py-2 font-medium">Started</th>
              </tr>
            </thead>
            <tbody>
              {(data ?? []).map((run) => (
                <tr key={run.id} className="border-t">
                  <td className="px-3 py-2 font-mono text-xs">{run.scraperName}</td>
                  <td className="px-3 py-2">
                    <span className={cn(
                      "inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full",
                      run.status === "success" && "bg-green-50 text-green-700",
                      run.status === "error" && "bg-red-50 text-red-700",
                      run.status === "running" && "bg-blue-50 text-blue-700",
                    )}>
                      {run.status === "success" && <CheckCircle2 className="w-3 h-3" />}
                      {run.status === "error" && <XCircle className="w-3 h-3" />}
                      {run.status === "running" && <RefreshCw className="w-3 h-3 animate-spin" />}
                      {run.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{run.recordsCreated ?? 0}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{run.recordsUpdated ?? 0}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">
                    {run.durationMs ? `${(run.durationMs / 1000).toFixed(1)}s` : "—"}
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">
                    {new Date(run.startedAt).toLocaleString()}
                  </td>
                </tr>
              ))}
              {!data?.length && (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-sm text-muted-foreground">
                    No scraper runs yet — FRED runs 30s after server boot.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Outreach Command Center ──────────────────────────────────────────────────

const LAYERS = [
  { id: "L1", label: "L1 · Liability & Code Compliance",    category: "concrete",    color: "bg-rose-500"    },
  { id: "L2", label: "L2 · ROI & Whole Life Cost",          category: "insulation",  color: "bg-orange-500"  },
  { id: "L3", label: "L3 · Schedule & Labor Productivity",  category: "framing",     color: "bg-amber-500"   },
  { id: "L4", label: "L4 · Total Cost of Ownership",        category: "flooring",    color: "bg-yellow-500"  },
  { id: "L5", label: "L5 · Scope 3 & ESG Reporting",        category: "steel",       color: "bg-green-500"   },
  { id: "L6", label: "L6 · Infection Control & Durability", category: "glass",       color: "bg-teal-500"    },
  { id: "L7", label: "L7 · LEED Docs & Cooperative",        category: "timber",      color: "bg-blue-500"    },
] as const;

type LayerId = typeof LAYERS[number]["id"];

function OutreachCommandCenter() {
  // ── Backfill ──────────────────────────────────────────────────────────────
  const backfill = trpc.admin.backfillOutreachLayers.useMutation({
    onSuccess: (r) => toast.success(`Tagged ${r.updated} / ${r.total} contacts with procurement layers`),
    onError: (e) => toast.error(e.message),
  });

  // ── Batch enroll ──────────────────────────────────────────────────────────
  const [batchStage, setBatchStage] = useState<string>("prospect");
  const [batchReadiness, setBatchReadiness] = useState<string>("all");
  const [batchCategory, setBatchCategory] = useState<string>("");

  const enrollBatch = trpc.crm.outreach.enrollBatch.useMutation({
    onSuccess: (r) => toast.success(`Enrolled ${r.enrolled} contacts`),
    onError: (e) => toast.error(e.message),
  });

  const handleBatchEnroll = () => {
    enrollBatch.mutate({
      filters: {
        stage: batchStage !== "all" ? (batchStage as any) : undefined,
        readinessLevel: batchReadiness !== "all" ? (batchReadiness as any) : undefined,
        category: batchCategory || undefined,
      },
    });
  };

  // ── Email preview ─────────────────────────────────────────────────────────
  const [previewLayer, setPreviewLayer] = useState<LayerId>("L1");
  const [previewStep, setPreviewStep] = useState<1 | 2 | 3>(1);
  const [previewCompany, setPreviewCompany] = useState("Acme Concrete");
  const [previewCategory, setPreviewCategory] = useState("concrete");
  const [showPreview, setShowPreview] = useState(false);

  const preview = trpc.admin.previewOutreachEmail.useQuery(
    { layer: previewLayer, step: previewStep, companyName: previewCompany, category: previewCategory },
    { enabled: showPreview && !!previewCompany && !!previewCategory }
  );

  return (
    <div className="space-y-6">

      {/* 1 — Setup */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Tag className="w-4 h-4 text-primary" />
            Step 1 — Tag Procurement Layers
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Auto-detect L1–L7 for every contact that hasn't been tagged yet. Run once after importing contacts.
          </p>
        </CardHeader>
        <CardContent className="flex items-center gap-4">
          <Button
            variant="outline"
            className="gap-1.5"
            onClick={() => backfill.mutate()}
            disabled={backfill.isPending}
          >
            <Layers className={cn("w-4 h-4", backfill.isPending && "animate-spin")} />
            {backfill.isPending ? "Tagging…" : "Backfill Layers"}
          </Button>
          {backfill.data && (
            <span className="text-sm text-muted-foreground">
              Last run: tagged <strong>{backfill.data.updated}</strong> of {backfill.data.total} contacts
            </span>
          )}
        </CardContent>
      </Card>

      {/* 2 — Layer reference */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Rocket className="w-4 h-4 text-primary" />
            Step 2 — Enroll by Segment
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Filter contacts and enroll them in the claim-profile drip sequence. Only contacts with an email are enrolled.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            {/* Stage filter */}
            <div className="space-y-1">
              <label className="text-xs font-medium">Stage</label>
              <Select value={batchStage} onValueChange={setBatchStage}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All stages</SelectItem>
                  {STAGES.map((s) => (
                    <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Readiness filter */}
            <div className="space-y-1">
              <label className="text-xs font-medium">Readiness</label>
              <Select value={batchReadiness} onValueChange={setBatchReadiness}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any readiness</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Category filter */}
            <div className="space-y-1">
              <label className="text-xs font-medium">Category (keyword)</label>
              <Input
                placeholder="e.g. concrete, steel, timber"
                value={batchCategory}
                onChange={(e) => setBatchCategory(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
          </div>

          <Button
            className="gap-1.5"
            onClick={handleBatchEnroll}
            disabled={enrollBatch.isPending}
          >
            <Send className={cn("w-4 h-4", enrollBatch.isPending && "animate-spin")} />
            {enrollBatch.isPending ? "Enrolling…" : "Enroll Matching Contacts"}
          </Button>

          {enrollBatch.data && (
            <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-md px-3 py-2">
              <CheckCircle2 className="w-4 h-4" />
              Enrolled {enrollBatch.data.enrolled} contacts in the claim-profile sequence
            </div>
          )}

          {/* Quick layer tiles */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-2">
            {LAYERS.map((l) => (
              <button
                key={l.id}
                onClick={() => {
                  setBatchCategory(l.category);
                  setBatchStage("prospect");
                  setBatchReadiness("all");
                }}
                className="text-left p-2 rounded-lg border border-border hover:bg-accent/50 transition-colors"
              >
                <div className={cn("w-2 h-2 rounded-full mb-1 inline-block", l.color)} />
                <p className="text-xs font-medium leading-tight">{l.label}</p>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 3 — Email preview */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Eye className="w-4 h-4 text-primary" />
            Step 3 — Preview Layer Email
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Generate a preview of any layer × step combination before enrolling.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium">Layer</label>
              <Select value={previewLayer} onValueChange={(v) => { setPreviewLayer(v as LayerId); setShowPreview(false); }}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LAYERS.map((l) => (
                    <SelectItem key={l.id} value={l.id}>{l.id}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium">Step</label>
              <Select value={String(previewStep)} onValueChange={(v) => { setPreviewStep(Number(v) as 1|2|3); setShowPreview(false); }}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Step 1 — Intro</SelectItem>
                  <SelectItem value="2">Step 2 — Follow-up</SelectItem>
                  <SelectItem value="3">Step 3 — Last call</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium">Sample Company</label>
              <Input
                value={previewCompany}
                onChange={(e) => { setPreviewCompany(e.target.value); setShowPreview(false); }}
                className="h-8 text-xs"
                placeholder="Acme Concrete"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium">Category</label>
              <Input
                value={previewCategory}
                onChange={(e) => { setPreviewCategory(e.target.value); setShowPreview(false); }}
                className="h-8 text-xs"
                placeholder="concrete"
              />
            </div>
          </div>

          <Button
            variant="outline"
            className="gap-1.5"
            onClick={() => setShowPreview(true)}
            disabled={!previewCompany || !previewCategory}
          >
            <Eye className="w-4 h-4" />
            Preview Email
          </Button>

          {showPreview && (
            <div className="border border-border rounded-lg overflow-hidden">
              {preview.isLoading && (
                <div className="p-6 space-y-2">
                  <Skeleton className="h-5 w-64" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                  <Skeleton className="h-4 w-4/6" />
                </div>
              )}
              {preview.error && (
                <div className="p-4 flex items-center gap-2 text-sm text-destructive">
                  <AlertCircle className="w-4 h-4" />
                  {preview.error.message}
                </div>
              )}
              {preview.data && (
                <>
                  <div className="px-4 py-2 bg-muted/50 border-b flex items-center justify-between">
                    <div className="text-xs">
                      <span className="font-medium">Subject: </span>
                      <span className="text-muted-foreground">{preview.data.subject}</span>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {previewLayer} · Step {previewStep}
                    </Badge>
                  </div>
                  <div
                    className="p-4 text-sm max-h-96 overflow-y-auto prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(preview.data.html) }}
                  />
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Promo Grants ─────────────────────────────────────────────────────────────

function PromoGrants() {
  const [email, setEmail] = useState("");
  const [tier, setTier] = useState<"premium" | "standard">("premium");
  const [note, setNote] = useState("");
  const [expiresAt, setExpiresAt] = useState(""); // YYYY-MM-DD

  const { data: promos, isLoading, refetch } = trpc.admin.listPromos.useQuery();

  const grant = trpc.admin.grantPromo.useMutation({
    onSuccess: (r) => {
      toast.success(`${r.tier} granted to ${email}`);
      setEmail("");
      setNote("");
      setExpiresAt("");
      void refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const revoke = trpc.admin.revokePromo.useMutation({
    onSuccess: () => { toast.success("Promo revoked"); void refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const handleGrant = () => {
    if (!email) return;
    grant.mutate({
      email,
      tier,
      note: note || undefined,
      expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined,
    });
  };

  return (
    <div className="space-y-6">
      {/* Grant form */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Gift className="w-4 h-4 text-primary" />
            Grant Promo Access
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Give anyone premium (or standard) access for free. No billing required.
            The user must already have a GreenChainz account.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1 md:col-span-1">
              <label className="text-xs font-medium">User Email</label>
              <Input
                placeholder="architect@firm.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-8 text-sm"
                type="email"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium">Tier</label>
              <Select value={tier} onValueChange={(v) => setTier(v as "premium" | "standard")}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="premium">Premium — Unlimited everything</SelectItem>
                  <SelectItem value="standard">Standard — 50 msg/mo, 10hr video</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium">Expires (optional)</label>
              <Input
                type="date"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                className="h-8 text-sm"
                min={new Date().toISOString().split("T")[0]}
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium">Internal Note (optional)</label>
            <Input
              placeholder="e.g. Early adopter — Smith & Associates"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="h-8 text-sm"
            />
          </div>

          <Button
            onClick={handleGrant}
            disabled={!email || grant.isPending}
            className="gap-1.5"
          >
            <Crown className={cn("w-4 h-4", grant.isPending && "animate-spin")} />
            {grant.isPending ? "Granting…" : `Grant ${tier === "premium" ? "Premium" : "Standard"}`}
          </Button>
        </CardContent>
      </Card>

      {/* Active promos table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            Active Promo Grants
            {promos && promos.filter(p => p.status === "active").length > 0 && (
              <Badge className="bg-primary/10 text-primary border-primary/20">
                {promos.filter(p => p.status === "active").length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
          ) : !promos?.length ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              No promo grants yet. Use the form above to give someone free premium access.
            </p>
          ) : (
            <div className="rounded-md border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium">User</th>
                    <th className="text-left px-3 py-2 font-medium">Tier</th>
                    <th className="text-left px-3 py-2 font-medium">Status</th>
                    <th className="text-left px-3 py-2 font-medium">Granted</th>
                    <th className="text-left px-3 py-2 font-medium">Expires</th>
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {promos.map((p) => (
                    <tr key={p.id} className="border-t hover:bg-muted/30 transition-colors">
                      <td className="px-3 py-2">
                        <div className="font-medium">{p.name ?? "—"}</div>
                        <div className="text-xs text-muted-foreground">{p.email}</div>
                      </td>
                      <td className="px-3 py-2">
                        <Badge className={cn(
                          "text-xs",
                          p.tier === "premium" && "bg-purple-100 text-purple-800 border-purple-200",
                          p.tier === "standard" && "bg-blue-100 text-blue-800 border-blue-200",
                        )}>
                          <Crown className="w-3 h-3 mr-1" />
                          {p.tier}
                        </Badge>
                      </td>
                      <td className="px-3 py-2">
                        <span className={cn(
                          "inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full",
                          p.status === "active" ? "bg-green-50 text-green-700" : "bg-zinc-100 text-zinc-500"
                        )}>
                          {p.status === "active"
                            ? <CheckCircle2 className="w-3 h-3" />
                            : <XCircle className="w-3 h-3" />}
                          {p.status}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">
                        {new Date(p.startDate).toLocaleDateString()}
                      </td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">
                        {p.endDate ? new Date(p.endDate).toLocaleDateString() : "Never"}
                      </td>
                      <td className="px-3 py-2">
                        {p.status === "active" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs gap-1 text-destructive hover:text-destructive"
                            disabled={revoke.isPending}
                            onClick={() => p.email && revoke.mutate({ email: p.email })}
                          >
                            <Trash2 className="w-3 h-3" />
                            Revoke
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CrmDashboard() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">CRM & Outreach</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Pipeline management, price intelligence, and outreach automation.
        </p>
      </div>

      <Tabs defaultValue="pipeline">
        <TabsList>
          <TabsTrigger value="pipeline" className="gap-1.5">
            <Users className="w-4 h-4" /> Pipeline
          </TabsTrigger>
          <TabsTrigger value="contacts" className="gap-1.5">
            <Building2 className="w-4 h-4" /> Contacts
          </TabsTrigger>
          <TabsTrigger value="prices" className="gap-1.5">
            <TrendingUp className="w-4 h-4" /> Price Intel
          </TabsTrigger>
          <TabsTrigger value="activity" className="gap-1.5">
            <Activity className="w-4 h-4" /> Activity
          </TabsTrigger>
          <TabsTrigger value="scrapers" className="gap-1.5">
            <RefreshCw className="w-4 h-4" /> Scrapers
          </TabsTrigger>
          <TabsTrigger value="outreach" className="gap-1.5">
            <Rocket className="w-4 h-4" /> Outreach
          </TabsTrigger>
          <TabsTrigger value="promos" className="gap-1.5">
            <Gift className="w-4 h-4" /> Promos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pipeline" className="mt-4">
          <PipelineSummary />
        </TabsContent>

        <TabsContent value="contacts" className="mt-4">
          <ContactList />
        </TabsContent>

        <TabsContent value="prices" className="mt-4">
          <PriceIntelligence />
        </TabsContent>

        <TabsContent value="activity" className="mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <ActivityFeed />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="scrapers" className="mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Scraper Runs</CardTitle>
            </CardHeader>
            <CardContent>
              <ScraperHealth />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="outreach" className="mt-4">
          <OutreachCommandCenter />
        </TabsContent>

        <TabsContent value="promos" className="mt-4">
          <PromoGrants />
        </TabsContent>
      </Tabs>
    </div>
  );
}
