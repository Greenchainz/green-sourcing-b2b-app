import { useMemo, useState } from "react";
import { Link } from "wouter";
import { toast } from "sonner";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Activity,
  Database,
  Mail,
  RefreshCw,
  Rocket,
  Search,
  ShieldAlert,
  User,
} from "lucide-react";

type SortDirection = "asc" | "desc";

const SCRAPER_OPTIONS = [
  { name: "supplier-contacts", label: "Supplier contacts scraper" },
  { name: "buyer-contacts", label: "Buyer contacts scraper" },
  { name: "drip-sequences", label: "Drip sequence runner" },
  { name: "salesforce-sync", label: "Salesforce lead sync" },
] as const;

function formatDateTime(value: Date | string | null | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}

function AccessDenied() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <div className="rounded-full border border-red-500/30 bg-red-500/10 p-5">
        <ShieldAlert className="h-10 w-10 text-red-400" />
      </div>
      <h2 className="text-2xl font-bold text-white">Access Denied</h2>
      <p className="max-w-sm text-gray-400">
        This page is restricted to founder/admin accounts.
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

export default function IntelligenceDashboard() {
  const { user, isLoading: authLoading } = useAuth();
  const [leadSearch, setLeadSearch] = useState("");
  const [sequenceSearch, setSequenceSearch] = useState("");
  const [leadSort, setLeadSort] = useState<{ key: "createdAt" | "company" | "name"; direction: SortDirection }>({
    key: "createdAt",
    direction: "desc",
  });
  const [sequenceSort, setSequenceSort] = useState<{ key: "sentAt" | "step" | "status"; direction: SortDirection }>({
    key: "sentAt",
    direction: "desc",
  });
  const [selectedScraper, setSelectedScraper] = useState<string>(SCRAPER_OPTIONS[0].name);
  const [isTriggering, setIsTriggering] = useState(false);

  const leadsQuery = trpc.admin.listIntelligenceLeads.useQuery(undefined, { enabled: !!user });
  const sequencesQuery = trpc.admin.listIntelligenceEmailSequences.useQuery(undefined, { enabled: !!user });
  const scrapersQuery = trpc.admin.listIntelligenceScraperStatus.useQuery(undefined, { enabled: !!user });

  const filteredLeads = useMemo(() => {
    const leads = leadsQuery.data ?? [];
    const q = leadSearch.trim().toLowerCase();
    const searched = q
      ? leads.filter((lead) =>
          [lead.name, lead.email, lead.company, lead.role, lead.category, lead.sfLeadId]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(q))
        )
      : leads;

    return [...searched].sort((a, b) => {
      const aValue = a[leadSort.key] ?? "";
      const bValue = b[leadSort.key] ?? "";
      const sortValue =
        leadSort.key === "createdAt"
          ? new Date(String(aValue)).getTime() - new Date(String(bValue)).getTime()
          : String(aValue).localeCompare(String(bValue));
      return leadSort.direction === "asc" ? sortValue : -sortValue;
    });
  }, [leadsQuery.data, leadSearch, leadSort]);

  const filteredSequences = useMemo(() => {
    const sequences = sequencesQuery.data ?? [];
    const q = sequenceSearch.trim().toLowerCase();
    const searched = q
      ? sequences.filter((sequence) =>
          [sequence.contactEmail, sequence.status, sequence.step]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(q))
        )
      : sequences;

    return [...searched].sort((a, b) => {
      if (sequenceSort.key === "step") {
        const sortValue = a.step - b.step;
        return sequenceSort.direction === "asc" ? sortValue : -sortValue;
      }
      if (sequenceSort.key === "status") {
        const sortValue = String(a.status).localeCompare(String(b.status));
        return sequenceSort.direction === "asc" ? sortValue : -sortValue;
      }
      const aTime = a.sentAt ? new Date(String(a.sentAt)).getTime() : 0;
      const bTime = b.sentAt ? new Date(String(b.sentAt)).getTime() : 0;
      const sortValue = aTime - bTime;
      return sequenceSort.direction === "asc" ? sortValue : -sortValue;
    });
  }, [sequencesQuery.data, sequenceSearch, sequenceSort]);

  const toggleLeadSort = (key: "createdAt" | "company" | "name") => {
    setLeadSort((current) =>
      current.key === key
        ? { key, direction: current.direction === "asc" ? "desc" : "asc" }
        : { key, direction: "asc" }
    );
  };

  const toggleSequenceSort = (key: "sentAt" | "step" | "status") => {
    setSequenceSort((current) =>
      current.key === key
        ? { key, direction: current.direction === "asc" ? "desc" : "asc" }
        : { key, direction: "asc" }
    );
  };

  const triggerScraper = async () => {
    setIsTriggering(true);
    try {
      const response = await fetch("/api/intelligence/trigger", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scraperName: selectedScraper }),
      });
      const body = (await response.json()) as { error?: string; detail?: string };
      if (!response.ok) {
        throw new Error(body.detail ?? body.error ?? "Failed to trigger scraper");
      }
      toast.success(`${selectedScraper} triggered`);
      await scrapersQuery.refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to trigger scraper");
    } finally {
      setIsTriggering(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-950">
        <Header />
        <main className="container mx-auto max-w-7xl px-4 py-10">
          <div className="space-y-6">
            <Skeleton className="h-10 w-80" />
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!user || user.role !== "admin") {
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
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <div className="mb-1 flex items-center gap-2">
              <Database className="h-5 w-5 text-emerald-400" />
              <h1 className="text-2xl font-bold text-white">Intelligence Dashboard</h1>
            </div>
            <p className="text-sm text-gray-400">
              Founder-only operations view for supplier/buyer lead intelligence.
            </p>
          </div>
          <Link href="/admin">
            <Button variant="outline" className="border-gray-700 text-gray-200 hover:bg-gray-800">
              Back to Admin
            </Button>
          </Link>
        </div>

        <Card className="mb-6 border-gray-800 bg-gray-900">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-white">
              <Rocket className="h-4 w-4 text-emerald-400" />
              Trigger scraper
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Select value={selectedScraper} onValueChange={setSelectedScraper}>
              <SelectTrigger className="w-full border-gray-700 bg-gray-950 text-gray-100 sm:w-80">
                <SelectValue placeholder="Select scraper" />
              </SelectTrigger>
              <SelectContent>
                {SCRAPER_OPTIONS.map((scraper) => (
                  <SelectItem key={scraper.name} value={scraper.name}>
                    {scraper.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button className="gap-1.5" onClick={triggerScraper} disabled={isTriggering}>
              <RefreshCw className={`h-4 w-4 ${isTriggering ? "animate-spin" : ""}`} />
              {isTriggering ? "Triggering…" : "Trigger now"}
            </Button>
          </CardContent>
        </Card>

        <Card className="mb-6 border-gray-800 bg-gray-900">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-white">
              <Activity className="h-4 w-4 text-emerald-400" />
              Scraper status
            </CardTitle>
          </CardHeader>
          <CardContent>
            {scrapersQuery.isLoading ? (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={index} className="h-24 w-full" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {(scrapersQuery.data ?? SCRAPER_OPTIONS).map((scraper) => {
                  const scraperName = "scraperName" in scraper ? scraper.scraperName : scraper.name;
                  const scraperLabel = scraper.label;
                  const status = "status" in scraper ? scraper.status : null;
                  const lastRunAt = "lastRunAt" in scraper ? scraper.lastRunAt : null;
                  return (
                  <div
                    key={scraperName}
                    className="rounded-md border border-gray-700 bg-gray-950 p-4"
                  >
                    <p className="text-sm font-semibold text-white">{scraperLabel}</p>
                    <p className="mt-1 text-xs text-gray-400">
                      Last run: {formatDateTime(lastRunAt)}
                    </p>
                    <div className="mt-2">
                      <Badge variant="outline" className="border-gray-700 text-gray-300">
                        {status ?? "unknown"}
                      </Badge>
                    </div>
                  </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="mb-6 border-gray-800 bg-gray-900">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-white">
              <User className="h-4 w-4 text-emerald-400" />
              Leads discovered
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="relative max-w-sm">
              <Search className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                value={leadSearch}
                onChange={(event) => setLeadSearch(event.target.value)}
                placeholder="Search leads"
                className="border-gray-700 bg-gray-950 pl-8 text-gray-100"
              />
            </div>
            {leadsQuery.isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 7 }).map((_, index) => (
                  <Skeleton key={index} className="h-10 w-full" />
                ))}
              </div>
            ) : (
              <div className="rounded-md border border-gray-700">
                <Table>
                  <TableHeader>
                    <TableRow className="border-gray-800 hover:bg-transparent">
                      <TableHead className="cursor-pointer text-gray-300" onClick={() => toggleLeadSort("name")}>
                        Name
                      </TableHead>
                      <TableHead className="text-gray-300">Email</TableHead>
                      <TableHead className="cursor-pointer text-gray-300" onClick={() => toggleLeadSort("company")}>
                        Company
                      </TableHead>
                      <TableHead className="text-gray-300">Role</TableHead>
                      <TableHead className="text-gray-300">Category</TableHead>
                      <TableHead className="text-gray-300">SF Lead ID</TableHead>
                      <TableHead className="cursor-pointer text-gray-300" onClick={() => toggleLeadSort("createdAt")}>
                        Created
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLeads.map((lead) => (
                      <TableRow key={lead.id} className="border-gray-800">
                        <TableCell className="text-gray-100">{lead.name ?? "—"}</TableCell>
                        <TableCell className="text-gray-300">{lead.email ?? "—"}</TableCell>
                        <TableCell className="text-gray-300">{lead.company ?? "—"}</TableCell>
                        <TableCell className="text-gray-300">{lead.role ?? "—"}</TableCell>
                        <TableCell className="text-gray-300">{lead.category ?? "—"}</TableCell>
                        <TableCell className="font-mono text-xs text-gray-300">{lead.sfLeadId ?? "—"}</TableCell>
                        <TableCell className="text-gray-300">{formatDateTime(lead.createdAt)}</TableCell>
                      </TableRow>
                    ))}
                    {filteredLeads.length === 0 && (
                      <TableRow className="border-gray-800">
                        <TableCell colSpan={7} className="py-6 text-center text-gray-400">
                          No leads found.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-gray-800 bg-gray-900">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-white">
              <Mail className="h-4 w-4 text-emerald-400" />
              Email sequences
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="relative max-w-sm">
              <Search className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                value={sequenceSearch}
                onChange={(event) => setSequenceSearch(event.target.value)}
                placeholder="Search sequence email/status"
                className="border-gray-700 bg-gray-950 pl-8 text-gray-100"
              />
            </div>
            {sequencesQuery.isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 7 }).map((_, index) => (
                  <Skeleton key={index} className="h-10 w-full" />
                ))}
              </div>
            ) : (
              <div className="rounded-md border border-gray-700">
                <Table>
                  <TableHeader>
                    <TableRow className="border-gray-800 hover:bg-transparent">
                      <TableHead className="text-gray-300">Contact email</TableHead>
                      <TableHead className="cursor-pointer text-gray-300" onClick={() => toggleSequenceSort("step")}>
                        Step
                      </TableHead>
                      <TableHead className="cursor-pointer text-gray-300" onClick={() => toggleSequenceSort("status")}>
                        Status
                      </TableHead>
                      <TableHead className="cursor-pointer text-gray-300" onClick={() => toggleSequenceSort("sentAt")}>
                        Sent at
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSequences.map((sequence) => (
                      <TableRow key={sequence.id} className="border-gray-800">
                        <TableCell className="text-gray-300">{sequence.contactEmail ?? "—"}</TableCell>
                        <TableCell className="text-gray-300">{sequence.step}</TableCell>
                        <TableCell className="text-gray-300">{sequence.status}</TableCell>
                        <TableCell className="text-gray-300">{formatDateTime(sequence.sentAt)}</TableCell>
                      </TableRow>
                    ))}
                    {filteredSequences.length === 0 && (
                      <TableRow className="border-gray-800">
                        <TableCell colSpan={4} className="py-6 text-center text-gray-400">
                          No sequences found.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
