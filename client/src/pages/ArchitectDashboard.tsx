import { useEffect, useState, useRef } from "react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/contexts/AuthContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Building2,
  Search,
  Plus,
  Clock,
  CheckCircle,
  XCircle,
  ArrowRight,
  MapPin,
  Leaf,
  Package,
  FolderOpen,
  Bookmark,
  CalendarDays,
  Layers,
  Wind,
  X,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Project {
  id: string;
  name: string;
  materials: { id: number; name: string; gwpValue: number }[];
  createdAt: string;
}

interface SavedMaterial {
  id: number;
  name: string;
  gwpValue: number;
}

// ── localStorage helpers ───────────────────────────────────────────────────────

const PROJECTS_KEY = "gc_projects";
const SAVED_KEY = "gc_saved_materials";

function loadProjects(): Project[] {
  try {
    return JSON.parse(localStorage.getItem(PROJECTS_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function saveProjects(projects: Project[]) {
  localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
}

function loadSavedMaterials(): SavedMaterial[] {
  try {
    return JSON.parse(localStorage.getItem(SAVED_KEY) ?? "[]");
  } catch {
    return [];
  }
}

// ── Status badge ──────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  pending:   { label: "Pending",  icon: Clock,        cls: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400" },
  accepted:  { label: "Accepted", icon: CheckCircle,  cls: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"   },
  declined:  { label: "Declined", icon: XCircle,      cls: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"           },
  fulfilled: { label: "Fulfilled",icon: CheckCircle,  cls: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"       },
} as const;

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.pending;
  const Icon = cfg.icon;
  return (
    <Badge className={`flex items-center gap-1 border-0 text-xs font-medium ${cfg.cls}`}>
      <Icon className="w-3 h-3" />
      {cfg.label}
    </Badge>
  );
}

// ── My Projects section ───────────────────────────────────────────────────────

function MyProjects() {
  const [projects, setProjects] = useState<Project[]>(loadProjects);
  const [showForm, setShowForm] = useState(false);
  const [newName, setNewName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (showForm) inputRef.current?.focus();
  }, [showForm]);

  function handleAdd() {
    const trimmed = newName.trim();
    if (!trimmed) return;
    const project: Project = {
      id: crypto.randomUUID(),
      name: trimmed,
      materials: [],
      createdAt: new Date().toISOString(),
    };
    const updated = [project, ...projects];
    setProjects(updated);
    saveProjects(updated);
    setNewName("");
    setShowForm(false);
  }

  function handleDelete(id: string) {
    const updated = projects.filter((p) => p.id !== id);
    setProjects(updated);
    saveProjects(updated);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <FolderOpen className="w-5 h-5 text-green-600" />
          My Projects
        </h2>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setShowForm((v) => !v)}
        >
          {showForm ? (
            <><X className="w-3.5 h-3.5 mr-1" /> Cancel</>
          ) : (
            <><Plus className="w-3.5 h-3.5 mr-1" /> Add Project</>
          )}
        </Button>
      </div>

      {/* Inline add form */}
      {showForm && (
        <Card className="border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20">
          <CardContent className="py-4 px-4">
            <p className="text-sm font-medium mb-2 text-green-800 dark:text-green-300">New Project</p>
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAdd();
                  if (e.key === "Escape") { setShowForm(false); setNewName(""); }
                }}
                placeholder="Project name"
                className="flex-1 h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
              <Button
                size="sm"
                className="bg-green-700 hover:bg-green-800 text-white"
                onClick={handleAdd}
                disabled={!newName.trim()}
              >
                Create
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Project list */}
      {projects.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            <FolderOpen className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No projects yet.</p>
            <p className="text-xs mt-1 opacity-70">Create a project to start tracking materials and embodied carbon.</p>
            <Button
              size="sm"
              className="mt-3 bg-green-700 hover:bg-green-800 text-white"
              onClick={() => setShowForm(true)}
            >
              Create your first project
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {projects.map((project) => {
            const totalGwp = project.materials.reduce((sum, m) => sum + (m.gwpValue ?? 0), 0);
            return (
              <Card key={project.id} className="hover:shadow-sm transition-shadow group">
                <CardContent className="py-3 px-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{project.name}</p>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Layers className="w-3 h-3" />
                          {project.materials.length} material{project.materials.length !== 1 ? "s" : ""}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Wind className="w-3 h-3 text-green-500" />
                          {totalGwp > 0 ? `${totalGwp.toFixed(1)} kg CO₂e` : "—"}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <CalendarDays className="w-3 h-3" />
                          {new Date(project.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDelete(project.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-red-500 p-1 rounded"
                      title="Delete project"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Saved Materials section ───────────────────────────────────────────────────

function SavedMaterials() {
  const [materials] = useState<SavedMaterial[]>(loadSavedMaterials);

  if (materials.length === 0) {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Bookmark className="w-5 h-5 text-green-600" />
          Saved Materials
        </h2>
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <Bookmark className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No saved materials yet.</p>
            <p className="text-xs mt-1 opacity-70">Save materials from any product page to compare them here.</p>
            <Link href="/search">
              <Button size="sm" variant="outline" className="mt-3">
                <Search className="w-3.5 h-3.5 mr-1" /> Browse Materials
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Bookmark className="w-5 h-5 text-green-600" />
          Saved Materials
        </h2>
        <Badge variant="outline" className="text-xs">
          {materials.length}
        </Badge>
      </div>
      <div
        className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent"
        style={{ scrollbarWidth: "thin" }}
      >
        {materials.map((mat) => (
          <Card
            key={mat.id}
            className="shrink-0 w-40 hover:shadow-sm transition-shadow border-green-100 dark:border-green-900/40"
          >
            <CardContent className="py-3 px-3">
              <div className="w-7 h-7 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-2">
                <Leaf className="w-3.5 h-3.5 text-green-600" />
              </div>
              <p className="text-xs font-medium leading-tight line-clamp-2 mb-1">{mat.name}</p>
              <p className="text-xs text-muted-foreground flex items-center gap-0.5">
                <Wind className="w-3 h-3 text-green-500 shrink-0" />
                {mat.gwpValue != null ? `${mat.gwpValue.toFixed(1)} kg CO₂e` : "—"}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ArchitectDashboard() {
  const { user, isLoading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const [projects] = useState<Project[]>(loadProjects);

  // Redirect suppliers to their dashboard
  useEffect(() => {
    if (!authLoading && user?.role === "supplier") {
      navigate("/supplier/dashboard");
    }
  }, [user, authLoading, navigate]);

  const { data: profile, isLoading: profileLoading } = trpc.architect.getMyProfile.useQuery(undefined, {
    enabled: user?.role === "architect",
    staleTime: 60_000,
  });

  const { data: rfqs = [], isLoading: rfqsLoading } = trpc.rfqRequests.listMine.useQuery(undefined, {
    enabled: !!user,
    staleTime: 30_000,
  });

  const profileState = profile?.state ?? "";
  const { data: nearbySuppliers = [], isLoading: suppliersLoading } =
    trpc.location.suppliersByState.useQuery(
      { state: profileState },
      { enabled: profileState.length === 2, staleTime: 5 * 60_000 }
    );

  if (authLoading || profileLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <div className="container max-w-6xl py-8 flex-1 space-y-6">
          <Skeleton className="h-24 w-full rounded-xl" />
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-24 rounded-lg" />)}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-3">
              {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 rounded-lg" />)}
            </div>
            <Skeleton className="h-64 rounded-xl" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Skeleton className="h-64 rounded-xl" />
            <Skeleton className="h-64 rounded-xl" />
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const firstName = profile?.firstName ?? user?.name?.split(" ")[0] ?? "there";
  const firmName = profile?.firmName ?? "";
  const activeRfqs = rfqs.filter((r) => r.status === "pending");
  const displaySuppliers = nearbySuppliers.slice(0, 6);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <div className="container max-w-6xl py-8 flex-1 space-y-8">

        {/* ── Welcome bar ─────────────────────────────────────────────────── */}
        <div className="rounded-xl bg-gradient-to-br from-green-600 to-emerald-700 p-6 text-white">
          <p className="text-green-100 text-sm mb-1">Welcome back</p>
          <h1 className="text-2xl font-bold">{firstName}{firmName ? ` · ${firmName}` : ""}</h1>
          <p className="text-green-100 text-sm mt-1">
            {activeRfqs.length === 0
              ? "No open requests — start sourcing sustainable materials."
              : `You have ${activeRfqs.length} open RFQ${activeRfqs.length === 1 ? "" : "s"} awaiting supplier response.`}
          </p>
          <div className="flex flex-wrap gap-3 mt-4">
            <Link href="/search">
              <Button size="sm" variant="secondary" className="bg-white/20 hover:bg-white/30 text-white border-0">
                <Search className="w-4 h-4 mr-1.5" /> Search Materials
              </Button>
            </Link>
            <Link href="/rfq/new">
              <Button size="sm" variant="secondary" className="bg-white/20 hover:bg-white/30 text-white border-0">
                <Plus className="w-4 h-4 mr-1.5" /> New RFQ
              </Button>
            </Link>
            <Link href="/architect/onboarding">
              <Button size="sm" variant="secondary" className="bg-white/10 hover:bg-white/20 text-white border-0">
                Edit Profile
              </Button>
            </Link>
          </div>
        </div>

        {/* ── Stat cards ──────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: "Total RFQs",       value: rfqs.length,                                 icon: Package,    color: "text-blue-500" },
            { label: "Open",             value: activeRfqs.length,                           icon: Clock,      color: "text-yellow-500" },
            { label: "Accepted",         value: rfqs.filter(r => r.status === "accepted").length, icon: CheckCircle, color: "text-green-500" },
            { label: "Nearby Suppliers", value: nearbySuppliers.length,                      icon: Building2,  color: "text-purple-500" },
            { label: "Projects",         value: projects.length,                             icon: FolderOpen, color: "text-emerald-500" },
          ].map(({ label, value, icon: Icon, color }) => (
            <Card key={label}>
              <CardContent className="py-4 px-5 flex items-center gap-3">
                <Icon className={`w-8 h-8 shrink-0 ${color}`} />
                <div>
                  <p className="text-2xl font-bold">{value}</p>
                  <p className="text-xs text-muted-foreground">{label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* ── Three-column row: Projects (2 cols) + Saved Materials (1 col) ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <MyProjects />
          </div>
          <div>
            <SavedMaterials />
          </div>
        </div>

        {/* ── Two-column row: RFQs + Nearby Suppliers ─────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

          {/* ── Active RFQs ───────────────────────────────────────────────── */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">My Requests</h2>
              <Link href="/rfq/new">
                <Button size="sm" variant="outline">
                  <Plus className="w-3.5 h-3.5 mr-1" /> New RFQ
                </Button>
              </Link>
            </div>

            {rfqsLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 rounded-lg" />)}
              </div>
            ) : rfqs.length === 0 ? (
              <Card>
                <CardContent className="py-10 text-center text-muted-foreground">
                  <Package className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No RFQs yet.</p>
                  <Link href="/rfq/new">
                    <Button size="sm" className="mt-3 bg-green-700 hover:bg-green-800 text-white">
                      Send your first request
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {rfqs.slice(0, 8).map((rfq) => (
                  <Card key={rfq.id} className="hover:shadow-sm transition-shadow">
                    <CardContent className="py-3 px-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{rfq.materialType}</p>
                          <p className="text-xs text-muted-foreground">
                            {rfq.supplierName ?? `Supplier #${rfq.supplierId}`} · Qty {rfq.quantity}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {new Date(rfq.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <StatusBadge status={rfq.status} />
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {rfqs.length > 8 && (
                  <Link href="/rfq-dashboard">
                    <Button variant="ghost" size="sm" className="w-full text-muted-foreground">
                      View all {rfqs.length} requests <ArrowRight className="w-3.5 h-3.5 ml-1" />
                    </Button>
                  </Link>
                )}
              </div>
            )}
          </div>

          {/* ── Nearby Suppliers ──────────────────────────────────────────── */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                {profileState ? `Suppliers in ${profileState}` : "Verified Suppliers"}
              </h2>
              <Link href="/search">
                <Button size="sm" variant="outline">
                  <Search className="w-3.5 h-3.5 mr-1" /> Browse
                </Button>
              </Link>
            </div>

            {!profileState ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  <MapPin className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Complete your profile to see local suppliers.</p>
                  <Link href="/architect/onboarding">
                    <Button size="sm" className="mt-3" variant="outline">Complete Profile</Button>
                  </Link>
                </CardContent>
              </Card>
            ) : suppliersLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-lg" />)}
              </div>
            ) : displaySuppliers.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  <Building2 className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No verified suppliers in {profileState} yet.</p>
                  <Link href="/search">
                    <Button size="sm" className="mt-3" variant="outline">Search all suppliers</Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {displaySuppliers.map((s) => (
                  <Card key={s.id} className="hover:shadow-sm transition-shadow">
                    <CardContent className="py-3 px-4">
                      <div className="flex items-start gap-2">
                        <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center shrink-0">
                          <Building2 className="w-4 h-4 text-green-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{s.companyName}</p>
                          {s.sustainabilityScore != null && (
                            <div className="flex items-center gap-1 mt-0.5">
                              <Leaf className="w-3 h-3 text-green-500" />
                              <span className="text-xs text-muted-foreground">
                                Score {s.sustainabilityScore}
                              </span>
                            </div>
                          )}
                          {s.isPremium && (
                            <Badge className="mt-1 text-xs bg-amber-100 text-amber-700 border-0 dark:bg-amber-900/30 dark:text-amber-400">
                              Premium
                            </Badge>
                          )}
                        </div>
                      </div>
                      <Link href={`/rfq/new?supplierId=${s.id}`}>
                        <Button size="sm" variant="outline" className="w-full mt-3 text-xs h-7">
                          Request Quote
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>

      <Footer />
    </div>
  );
}
