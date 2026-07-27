/**
 * Concierge Routing Dashboard — /admin/concierge
 *
 * The "Ghost RFQ" control panel. Jerit picks a project, picks a material type,
 * sees matched suppliers, picks an architect, and fires a warm intro email —
 * all in one view. Every send is logged in the Sent Log tab.
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MaterialTypeahead } from "@/components/ui/typeahead-variants";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Send,
  Search,
  Building2,
  MapPin,
  Mail,
  CheckCircle2,
  Clock,
  TrendingUp,
  Zap,
  ChevronRight,
  RefreshCw,
  MessageSquare,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Project = {
  id: number;
  projectName: string;
  projectLocation: string | null;
  projectType: string | null;
  status: string | null;
  dueDate: Date | null;
  createdAt: Date;
};

type MatchedSupplier = {
  id: number;
  companyName: string;
  email: string | null;
  city: string | null;
  state: string | null;
  materialTypes: string[] | null;
  matchScore: number;
  outreachSentAt: Date | null;
};

type ArchitectLead = {
  id: number;
  fullName: string | null;
  title: string | null;
  email: string | null;
  company: string;
  city: string | null;
  state: string | null;
  role: string;
};

// ─── Stats Header ─────────────────────────────────────────────────────────────

function StatsHeader() {
  const { data, isLoading } = trpc.concierge.stats.useQuery();

  const stats = [
    {
      label: "Total Sent",
      value: data?.totalSent ?? 0,
      icon: Send,
      color: "text-blue-600",
    },
    {
      label: "Replies",
      value: data?.totalReplied ?? 0,
      icon: MessageSquare,
      color: "text-green-600",
    },
    {
      label: "Reply Rate",
      value: `${data?.replyRate ?? 0}%`,
      icon: TrendingUp,
      color: "text-indigo-600",
    },
    {
      label: "This Week",
      value: data?.sentThisWeek ?? 0,
      icon: Zap,
      color: "text-amber-600",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      {stats.map((s) => (
        <Card key={s.label}>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">{s.label}</p>
                {isLoading ? (
                  <Skeleton className="h-7 w-12 mt-1" />
                ) : (
                  <p className="text-2xl font-bold">{s.value}</p>
                )}
              </div>
              <s.icon className={cn("h-8 w-8 opacity-80", s.color)} />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ─── Project Picker ───────────────────────────────────────────────────────────

function ProjectPicker({
  selected,
  onSelect,
}: {
  selected: Project | null;
  onSelect: (p: Project) => void;
}) {
  const [search, setSearch] = useState("");
  const { data, isLoading } = trpc.concierge.listProjects.useQuery({
    limit: 50,
    offset: 0,
  });

  const filtered = (data ?? []).filter(
    (p) =>
      !search ||
      p.projectName.toLowerCase().includes(search.toLowerCase()) ||
      (p.projectLocation ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="relative mb-3">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search projects…"
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
        {isLoading
          ? Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-lg" />
            ))
          : filtered.map((p) => (
              <button
                key={p.id}
                onClick={() => onSelect(p)}
                className={cn(
                  "w-full text-left rounded-lg border px-4 py-3 transition-colors hover:bg-muted/50",
                  selected?.id === p.id
                    ? "border-green-500 bg-green-50"
                    : "border-border"
                )}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{p.projectName}</p>
                    {p.projectLocation && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <MapPin className="h-3 w-3" />
                        {p.projectLocation}
                      </p>
                    )}
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {p.status ?? "draft"}
                  </Badge>
                </div>
              </button>
            ))}
        {!isLoading && filtered.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-6">
            No projects found. Add RFQs to see them here.
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Supplier Match Cards ─────────────────────────────────────────────────────

function SupplierMatchCards({
  materialType,
  onSelect,
  selected,
}: {
  materialType: string;
  onSelect: (s: MatchedSupplier) => void;
  selected: MatchedSupplier | null;
}) {
  const { data, isLoading, refetch } = trpc.concierge.matchSuppliers.useQuery(
    { materialType, limit: 10 },
    { enabled: materialType.length > 2, placeholderData: prev => prev }
  );

  if (!materialType || materialType.length < 3) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        Enter a material type above to see matched suppliers.
      </p>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-muted-foreground">
          {isLoading ? "Matching…" : `${data?.length ?? 0} suppliers matched`}
        </p>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => refetch()}
          className="h-7 px-2"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </Button>
      </div>
      <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-lg" />
            ))
          : (data ?? []).map((s) => (
              <button
                key={s.id}
                onClick={() => onSelect(s)}
                className={cn(
                  "w-full text-left rounded-lg border px-4 py-3 transition-colors hover:bg-muted/50",
                  selected?.id === s.id
                    ? "border-green-500 bg-green-50"
                    : "border-border"
                )}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{s.companyName}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {[s.city, s.state].filter(Boolean).join(", ")}
                      {s.outreachSentAt && (
                        <span className="ml-2 text-amber-600">
                          · outreach sent
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="text-right">
                    <span
                      className={cn(
                        "text-xs font-bold px-2 py-0.5 rounded-full",
                        s.matchScore >= 70
                          ? "bg-green-100 text-green-700"
                          : s.matchScore >= 40
                          ? "bg-amber-100 text-amber-700"
                          : "bg-slate-100 text-slate-600"
                      )}
                    >
                      {s.matchScore}% match
                    </span>
                  </div>
                </div>
              </button>
            ))}
        {!isLoading && (data ?? []).length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-6">
            No suppliers matched. Try a broader material type.
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Architect Picker ─────────────────────────────────────────────────────────

function ArchitectPicker({
  selected,
  onSelect,
}: {
  selected: ArchitectLead | null;
  onSelect: (a: ArchitectLead) => void;
}) {
  const [search, setSearch] = useState("");
  const { data, isLoading } = trpc.concierge.findArchitectLeads.useQuery(
    {
      search: search.length > 1 ? search : undefined,
      limit: 20,
    },
    { placeholderData: prev => prev }
  );

  return (
    <div>
      <div className="relative mb-3">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search architects by name, firm, or email…"
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-lg" />
            ))
          : (data ?? []).map((a) => (
              <button
                key={a.id}
                onClick={() => onSelect(a)}
                className={cn(
                  "w-full text-left rounded-lg border px-4 py-3 transition-colors hover:bg-muted/50",
                  selected?.id === a.id
                    ? "border-green-500 bg-green-50"
                    : "border-border"
                )}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">
                      {a.fullName ?? a.company}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {a.title ? `${a.title} · ` : ""}
                      {a.company}
                      {a.email && (
                        <span className="ml-2 text-blue-600">{a.email}</span>
                      )}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-xs capitalize">
                    {a.role.replace("_", " ")}
                  </Badge>
                </div>
              </button>
            ))}
        {!isLoading && (data ?? []).length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-6">
            No leads found. Run the scraper to populate architect leads.
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Send Confirm Dialog ──────────────────────────────────────────────────────

function SendConfirmDialog({
  open,
  onClose,
  project,
  supplier,
  architect,
  materialType,
  onConfirm,
  isSending,
}: {
  open: boolean;
  onClose: () => void;
  project: Project | null;
  supplier: MatchedSupplier | null;
  architect: ArchitectLead | null;
  materialType: string;
  onConfirm: (note: string) => void;
  isSending: boolean;
}) {
  const [note, setNote] = useState("");

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Confirm Warm Intro</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="rounded-lg bg-muted/50 p-4 space-y-2 text-sm">
            <div className="flex gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <span className="font-medium">Project: </span>
                {project?.projectName}
                {project?.projectLocation && ` · ${project.projectLocation}`}
              </div>
            </div>
            <div className="flex gap-2">
              <Zap className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <span className="font-medium">Material: </span>
                {materialType}
              </div>
            </div>
            <div className="flex gap-2">
              <Building2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
              <div>
                <span className="font-medium">Supplier: </span>
                {supplier?.companyName}
                <span className="ml-2 text-xs text-muted-foreground">
                  ({supplier?.matchScore}% match)
                </span>
              </div>
            </div>
            <div className="flex gap-2">
              <Mail className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
              <div>
                <span className="font-medium">To: </span>
                {architect?.fullName ?? architect?.company} —{" "}
                <span className="text-blue-600">{architect?.email}</span>
              </div>
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">
              Optional note to append to the email
            </label>
            <Textarea
              placeholder="e.g. 'This supplier is available for a site visit in Q2.'"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSending}>
            Cancel
          </Button>
          <Button
            onClick={() => onConfirm(note)}
            disabled={isSending}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            {isSending ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Sending…
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Send Warm Intro
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Sent Log ─────────────────────────────────────────────────────────────────

function SentLog() {
  const { data, isLoading, refetch } = trpc.concierge.listSentRoutes.useQuery(
    {
      limit: 50,
      offset: 0,
    },
    { placeholderData: prev => prev }
  );
  const markReplied = trpc.concierge.markReplied.useMutation({
    onSuccess: () => {
      toast.success("Marked as replied");
      refetch();
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (!data?.length) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <Send className="h-10 w-10 mx-auto mb-3 opacity-30" />
        <p className="text-sm">No warm intros sent yet.</p>
        <p className="text-xs mt-1">
          Use the Routing tab to send your first intro.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {data.map((r) => (
        <div
          key={r.id}
          className="rounded-lg border px-4 py-3 flex items-start justify-between gap-4"
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-sm truncate">
                {r.projectName}
              </span>
              {r.projectLocation && (
                <span className="text-xs text-muted-foreground">
                  · {r.projectLocation}
                </span>
              )}
              {r.architectReplied ? (
                <Badge className="bg-green-100 text-green-700 border-0 text-xs">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Replied
                </Badge>
              ) : (
                <Badge variant="outline" className="text-xs">
                  <Clock className="h-3 w-3 mr-1" />
                  Awaiting
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              <span className="text-blue-600">{r.architectEmail}</span>
              {r.architectCompany && ` · ${r.architectCompany}`}
              {" → "}
              <span className="font-medium">{r.supplierName}</span>
              {" · "}
              {new Date(r.sentAt).toLocaleDateString()}
            </p>
            {(r.materialTypes as string[])?.length > 0 && (
              <p className="text-xs text-muted-foreground mt-0.5">
                Material:{" "}
                {(r.materialTypes as string[]).join(", ")}
              </p>
            )}
          </div>
          {!r.architectReplied && (
            <Button
              size="sm"
              variant="outline"
              className="shrink-0 h-8 text-xs"
              onClick={() => markReplied.mutate({ routeId: r.id })}
              disabled={markReplied.isPending}
            >
              Mark Replied
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ConciergeDashboard() {
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [materialType, setMaterialType] = useState("");
  const [selectedSupplier, setSelectedSupplier] =
    useState<MatchedSupplier | null>(null);
  const [selectedArchitect, setSelectedArchitect] =
    useState<ArchitectLead | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  const sendIntro = trpc.concierge.sendWarmIntro.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      setShowConfirm(false);
      // Reset selections after send
      setSelectedSupplier(null);
      setSelectedArchitect(null);
    },
    onError: (err) => {
      toast.error(`Failed: ${err.message}`);
    },
  });

  const canSend =
    selectedProject &&
    materialType.length > 2 &&
    selectedSupplier &&
    selectedArchitect?.email;

  function handleSend(note: string) {
    if (!canSend) return;
    sendIntro.mutate({
      rfqId: selectedProject!.id,
      projectName: selectedProject!.projectName,
      projectLocation: selectedProject!.projectLocation ?? undefined,
      materialType,
      architectEmail: selectedArchitect!.email!,
      architectName: selectedArchitect!.fullName ?? undefined,
      architectCompany: selectedArchitect!.company,
      supplierId: selectedSupplier!.id,
      supplierName: selectedSupplier!.companyName,
      supplierEmail: selectedSupplier!.email ?? undefined,
      adminNote: note || undefined,
    });
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Zap className="h-6 w-6 text-green-600" />
          Concierge Routing
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Pick a project → match a supplier → send a warm intro to an architect.
          Creates the illusion of a live marketplace.
        </p>
      </div>

      <StatsHeader />

      <Tabs defaultValue="route">
        <TabsList className="mb-6">
          <TabsTrigger value="route">
            <Send className="h-4 w-4 mr-2" />
            Route an Intro
          </TabsTrigger>
          <TabsTrigger value="log">
            <Clock className="h-4 w-4 mr-2" />
            Sent Log
          </TabsTrigger>
        </TabsList>

        {/* ── Routing Tab ── */}
        <TabsContent value="route">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Step 1: Project */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <span className="bg-green-600 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center font-bold">
                    1
                  </span>
                  Pick a Project
                </CardTitle>
                <CardDescription className="text-xs">
                  Select from your RFQ list or scraped public projects.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ProjectPicker
                  selected={selectedProject}
                  onSelect={(p) => {
                    setSelectedProject(p);
                    setSelectedSupplier(null);
                  }}
                />
              </CardContent>
            </Card>

            {/* Step 2: Material + Supplier */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <span className="bg-green-600 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center font-bold">
                    2
                  </span>
                  Match a Supplier
                </CardTitle>
                <CardDescription className="text-xs">
                  Enter a material type to see matched suppliers from your DB.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <MaterialTypeahead
                  placeholder="e.g. cast-in-place concrete, TPO roofing…"
                  value={materialType}
                  onChange={(v) => { setMaterialType(v); setSelectedSupplier(null); }}
                  onSelect={(item) => { setMaterialType(item.label); setSelectedSupplier(null); }}
                  clearable
                  className="mb-4"
                />
                <SupplierMatchCards
                  materialType={materialType}
                  selected={selectedSupplier}
                  onSelect={setSelectedSupplier}
                />
              </CardContent>
            </Card>

            {/* Step 3: Architect + Send */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <span className="bg-green-600 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center font-bold">
                    3
                  </span>
                  Send to Architect
                </CardTitle>
                <CardDescription className="text-xs">
                  Pick an architect lead to receive the warm intro email.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ArchitectPicker
                  selected={selectedArchitect}
                  onSelect={setSelectedArchitect}
                />

                {/* Summary + Send Button */}
                <div className="mt-4 pt-4 border-t">
                  <div className="space-y-1 text-xs text-muted-foreground mb-4">
                    <div className="flex items-center gap-1.5">
                      {selectedProject ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                      ) : (
                        <div className="h-3.5 w-3.5 rounded-full border border-muted-foreground/40" />
                      )}
                      <span className={selectedProject ? "text-foreground" : ""}>
                        {selectedProject?.projectName ?? "No project selected"}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {selectedSupplier ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                      ) : (
                        <div className="h-3.5 w-3.5 rounded-full border border-muted-foreground/40" />
                      )}
                      <span className={selectedSupplier ? "text-foreground" : ""}>
                        {selectedSupplier?.companyName ?? "No supplier selected"}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {selectedArchitect ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                      ) : (
                        <div className="h-3.5 w-3.5 rounded-full border border-muted-foreground/40" />
                      )}
                      <span className={selectedArchitect ? "text-foreground" : ""}>
                        {selectedArchitect?.email ?? "No architect selected"}
                      </span>
                    </div>
                  </div>

                  <Button
                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                    disabled={!canSend}
                    onClick={() => setShowConfirm(true)}
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Send Warm Intro
                    <ChevronRight className="h-4 w-4 ml-auto" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── Sent Log Tab ── */}
        <TabsContent value="log">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Sent Intros</CardTitle>
              <CardDescription className="text-xs">
                Every warm intro sent. Mark as replied when the architect
                responds so you can track conversion.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SentLog />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Confirm Dialog */}
      <SendConfirmDialog
        open={showConfirm}
        onClose={() => setShowConfirm(false)}
        project={selectedProject}
        supplier={selectedSupplier}
        architect={selectedArchitect}
        materialType={materialType}
        onConfirm={handleSend}
        isSending={sendIntro.isPending}
      />
    </div>
  );
}
