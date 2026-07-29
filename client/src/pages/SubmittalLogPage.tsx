import { useMemo, useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const STATUS_OPTIONS = [
  "all",
  "draft",
  "submitted",
  "approved_as_noted",
  "revise_and_resubmit",
  "rejected",
  "closed",
] as const;

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  submitted: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  approved_as_noted: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  revise_and_resubmit: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  rejected: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  closed: "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
};

function formatStatus(status: string) {
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function SubmittalLogPage() {
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_OPTIONS)[number]>("all");
  const [selectedSubmittalId, setSelectedSubmittalId] = useState<number | null>(null);

  const status = statusFilter === "all" ? undefined : statusFilter;
  const listQuery = trpc.submittals.listMine.useQuery(
    { status, limit: 200 },
    { placeholderData: prev => prev }
  );
  const detailQuery = trpc.submittals.getById.useQuery(
    { submittalId: selectedSubmittalId ?? 0 },
    { enabled: selectedSubmittalId !== null },
  );

  const rows = useMemo(() => listQuery.data ?? [], [listQuery.data]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="max-w-6xl mx-auto w-full px-4 py-8 space-y-6 flex-1">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Submittal Log</h1>
            <p className="text-sm text-muted-foreground">
              Lightweight construction administration tracking for substitutions and RFQs.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="submittal-status" className="text-sm text-muted-foreground">
              Status
            </label>
            <select
              id="submittal-status"
              className="h-10 rounded-md border bg-background px-3 text-sm"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as (typeof STATUS_OPTIONS)[number]);
                setSelectedSubmittalId(null);
              }}
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option === "all" ? "All statuses" : formatStatus(option)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Submittals</CardTitle>
          </CardHeader>
          <CardContent>
            {listQuery.isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            ) : rows.length === 0 ? (
              <p className="text-sm text-muted-foreground">No submittals found for the selected filter.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Submittal #</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>MasterFormat</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ball in Court</TableHead>
                    <TableHead>Due</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow
                      key={row.id}
                      className="cursor-pointer"
                      onClick={() => setSelectedSubmittalId(row.id)}
                    >
                      <TableCell className="font-medium">{row.submittalNumber}</TableCell>
                      <TableCell>{row.title}</TableCell>
                      <TableCell>{row.masterformatCode || row.specSection || "—"}</TableCell>
                      <TableCell>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[row.status] ?? STATUS_STYLES.draft}`}>
                          {formatStatus(row.status)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{formatStatus(row.ballInCourt)}</Badge>
                      </TableCell>
                      <TableCell>{row.dueAt ? new Date(row.dueAt).toLocaleDateString() : "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {selectedSubmittalId !== null && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Submittal Detail</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {detailQuery.isLoading ? (
                <Skeleton className="h-20 w-full" />
              ) : detailQuery.data ? (
                <>
                  <p><span className="font-semibold">Title:</span> {detailQuery.data.submittal.title}</p>
                  <p><span className="font-semibold">Description:</span> {detailQuery.data.submittal.description || "—"}</p>
                  <p><span className="font-semibold">Related RFQ:</span> {detailQuery.data.submittal.relatedRfqId || "—"}</p>
                  <p><span className="font-semibold">Related Swap Validation:</span> {detailQuery.data.submittal.relatedSwapValidationId || "—"}</p>
                  <p><span className="font-semibold">Items:</span> {detailQuery.data.items.length}</p>
                </>
              ) : (
                <p className="text-muted-foreground">Unable to load submittal details.</p>
              )}
            </CardContent>
          </Card>
        )}
      </main>
      <Footer />
    </div>
  );
}
