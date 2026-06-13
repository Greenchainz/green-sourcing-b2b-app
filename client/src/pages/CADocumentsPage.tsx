import { useMemo, useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

const TYPE_OPTIONS = ["all", "rfi", "change_request"] as const;
const STATUS_OPTIONS = ["all", "draft", "open", "answered", "pending_approval", "approved", "rejected", "closed"] as const;
const BALL_IN_COURT_OPTIONS = ["buyer", "architect", "supplier"] as const;

type CaType = "rfi" | "change_request";
type CaStatus = Exclude<(typeof STATUS_OPTIONS)[number], "all">;

function formatLabel(value: string): string {
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function CADocumentsPage() {
  const utils = trpc.useUtils();
  const [typeFilter, setTypeFilter] = useState<(typeof TYPE_OPTIONS)[number]>("all");
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_OPTIONS)[number]>("all");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [createType, setCreateType] = useState<CaType>("rfi");
  const [createNumber, setCreateNumber] = useState("");
  const [createTitle, setCreateTitle] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  const [createQuestion, setCreateQuestion] = useState("");
  const [createResolution, setCreateResolution] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [nextStatus, setNextStatus] = useState<CaStatus>("open");
  const [nextBallInCourt, setNextBallInCourt] = useState<(typeof BALL_IN_COURT_OPTIONS)[number]>("architect");
  const [officialResponse, setOfficialResponse] = useState("");

  const listQuery = trpc.caDocuments.listMine.useQuery({
    type: typeFilter === "all" ? undefined : typeFilter,
    status: statusFilter === "all" ? undefined : statusFilter,
    limit: 150,
  });
  const detailQuery = trpc.caDocuments.getById.useQuery(
    { documentId: selectedId ?? 0 },
    { enabled: selectedId !== null },
  );

  const createMutation = trpc.caDocuments.create.useMutation({
    onSuccess: async ({ documentId }) => {
      await utils.caDocuments.listMine.invalidate();
      setSelectedId(documentId);
      setCreateNumber("");
      setCreateTitle("");
      setCreateDescription("");
      setCreateQuestion("");
      setCreateResolution("");
      toast.success("CA document created");
    },
    onError: (error) => toast.error(error.message),
  });

  const updateStatusMutation = trpc.caDocuments.updateStatus.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.caDocuments.listMine.invalidate(),
        selectedId != null ? utils.caDocuments.getById.invalidate({ documentId: selectedId }) : Promise.resolve(),
      ]);
      setOfficialResponse("");
      toast.success("Status updated");
    },
    onError: (error) => toast.error(error.message),
  });

  const addMessageMutation = trpc.caDocuments.addMessage.useMutation({
    onSuccess: async () => {
      if (selectedId != null) {
        await utils.caDocuments.getById.invalidate({ documentId: selectedId });
      }
      setNewMessage("");
      toast.success("Message added");
    },
    onError: (error) => toast.error(error.message),
  });

  const rows = useMemo(() => listQuery.data ?? [], [listQuery.data]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="max-w-7xl mx-auto w-full px-4 py-8 space-y-6 flex-1">
        <div>
          <h1 className="text-2xl font-bold">Construction Admin Documents</h1>
          <p className="text-sm text-muted-foreground">
            Manage RFI and change-request workflows tied to your submittals and RFQs.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Create Document</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Type</label>
                <select
                  className="h-9 w-full rounded-md border bg-background px-2 text-sm"
                  value={createType}
                  onChange={(e) => setCreateType(e.target.value as CaType)}
                >
                  <option value="rfi">RFI</option>
                  <option value="change_request">Change Request</option>
                </select>
              </div>
              <Input
                placeholder="Document number (e.g., RFI-001)"
                value={createNumber}
                onChange={(e) => setCreateNumber(e.target.value)}
              />
              <Input
                placeholder="Title"
                value={createTitle}
                onChange={(e) => setCreateTitle(e.target.value)}
              />
              <Textarea
                placeholder="Description (optional)"
                value={createDescription}
                onChange={(e) => setCreateDescription(e.target.value)}
              />
              {createType === "rfi" ? (
                <Textarea
                  placeholder="RFI question"
                  value={createQuestion}
                  onChange={(e) => setCreateQuestion(e.target.value)}
                />
              ) : (
                <Textarea
                  placeholder="Proposed resolution"
                  value={createResolution}
                  onChange={(e) => setCreateResolution(e.target.value)}
                />
              )}
              <Button
                className="w-full"
                onClick={() => {
                  if (!createNumber.trim() || !createTitle.trim()) {
                    toast.error("Document number and title are required");
                    return;
                  }
                  createMutation.mutate({
                    type: createType,
                    documentNumber: createNumber.trim(),
                    title: createTitle.trim(),
                    description: createDescription.trim() || undefined,
                    question: createType === "rfi" ? createQuestion.trim() || undefined : undefined,
                    proposedResolution: createType === "change_request" ? createResolution.trim() || undefined : undefined,
                    status: "draft",
                    ballInCourt: "buyer",
                  });
                }}
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? "Creating..." : "Create"}
              </Button>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <CardTitle className="text-lg">My CA Documents</CardTitle>
              <div className="flex items-center gap-2">
                <select
                  className="h-9 rounded-md border bg-background px-2 text-sm"
                  value={typeFilter}
                  onChange={(e) => {
                    setTypeFilter(e.target.value as (typeof TYPE_OPTIONS)[number]);
                    setSelectedId(null);
                  }}
                >
                  {TYPE_OPTIONS.map((value) => (
                    <option key={value} value={value}>
                      {value === "all" ? "All types" : formatLabel(value)}
                    </option>
                  ))}
                </select>
                <select
                  className="h-9 rounded-md border bg-background px-2 text-sm"
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value as (typeof STATUS_OPTIONS)[number]);
                    setSelectedId(null);
                  }}
                >
                  {STATUS_OPTIONS.map((value) => (
                    <option key={value} value={value}>
                      {value === "all" ? "All statuses" : formatLabel(value)}
                    </option>
                  ))}
                </select>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {listQuery.isLoading ? (
                <>
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </>
              ) : rows.length === 0 ? (
                <p className="text-sm text-muted-foreground">No documents found.</p>
              ) : (
                rows.map((row) => (
                  <button
                    key={row.id}
                    className={`w-full text-left border rounded-md p-3 transition-colors ${
                      selectedId === row.id ? "border-primary bg-primary/5" : "border-border hover:bg-accent/40"
                    }`}
                    onClick={() => {
                      setSelectedId(row.id);
                      setNextStatus(row.status as CaStatus);
                      setNextBallInCourt(row.ballInCourt);
                    }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{row.documentNumber} — {row.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {formatLabel(row.type)} · Updated {new Date(row.updatedAt).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{formatLabel(row.status)}</Badge>
                        <Badge variant="secondary">{formatLabel(row.ballInCourt)}</Badge>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {selectedId !== null && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Document Detail</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {detailQuery.isLoading ? (
                <Skeleton className="h-24 w-full" />
              ) : detailQuery.data ? (
                <>
                  <div className="grid md:grid-cols-2 gap-4 text-sm">
                    <div className="space-y-1">
                      <p><span className="font-semibold">Number:</span> {detailQuery.data.document.documentNumber}</p>
                      <p><span className="font-semibold">Title:</span> {detailQuery.data.document.title}</p>
                      <p><span className="font-semibold">Type:</span> {formatLabel(detailQuery.data.document.type)}</p>
                      <p><span className="font-semibold">Status:</span> {formatLabel(detailQuery.data.document.status)}</p>
                      <p><span className="font-semibold">Ball in court:</span> {formatLabel(detailQuery.data.document.ballInCourt)}</p>
                    </div>
                    <div className="space-y-1">
                      <p><span className="font-semibold">Description:</span> {detailQuery.data.document.description || "—"}</p>
                      <p><span className="font-semibold">Question:</span> {detailQuery.data.document.question || "—"}</p>
                      <p><span className="font-semibold">Resolution:</span> {detailQuery.data.document.proposedResolution || "—"}</p>
                      <p><span className="font-semibold">Official response:</span> {detailQuery.data.document.officialResponse || "—"}</p>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-3 gap-3 items-end">
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">Next status</label>
                      <select
                        className="h-9 w-full rounded-md border bg-background px-2 text-sm"
                        value={nextStatus}
                        onChange={(e) => setNextStatus(e.target.value as CaStatus)}
                      >
                        {STATUS_OPTIONS.filter((s) => s !== "all").map((s) => (
                          <option key={s} value={s}>{formatLabel(s)}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">Ball in court</label>
                      <select
                        className="h-9 w-full rounded-md border bg-background px-2 text-sm"
                        value={nextBallInCourt}
                        onChange={(e) => setNextBallInCourt(e.target.value as (typeof BALL_IN_COURT_OPTIONS)[number])}
                      >
                        {BALL_IN_COURT_OPTIONS.map((value) => (
                          <option key={value} value={value}>{formatLabel(value)}</option>
                        ))}
                      </select>
                    </div>
                    <Button
                      onClick={() =>
                        updateStatusMutation.mutate({
                          documentId: selectedId,
                          status: nextStatus,
                          ballInCourt: nextBallInCourt,
                          officialResponse: officialResponse.trim() || undefined,
                        })
                      }
                      disabled={updateStatusMutation.isPending}
                    >
                      {updateStatusMutation.isPending ? "Saving..." : "Update Status"}
                    </Button>
                  </div>

                  <Textarea
                    placeholder="Optional official response"
                    value={officialResponse}
                    onChange={(e) => setOfficialResponse(e.target.value)}
                  />

                  <div className="border rounded-md p-3 space-y-3">
                    <p className="text-sm font-semibold">Messages</p>
                    {detailQuery.data.messages.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No messages yet.</p>
                    ) : (
                      detailQuery.data.messages.map((message) => (
                        <div key={message.id} className="rounded-md border bg-card/40 p-2">
                          <p className="text-sm whitespace-pre-wrap">{message.message}</p>
                          <p className="text-[11px] text-muted-foreground mt-1">
                            {new Date(message.createdAt).toLocaleString()}
                          </p>
                        </div>
                      ))
                    )}
                    <Textarea
                      placeholder="Add internal note / response context"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                    />
                    <Button
                      variant="outline"
                      onClick={() => {
                        if (!newMessage.trim()) {
                          toast.error("Message is required");
                          return;
                        }
                        addMessageMutation.mutate({
                          documentId: selectedId,
                          message: newMessage.trim(),
                        });
                      }}
                      disabled={addMessageMutation.isPending}
                    >
                      {addMessageMutation.isPending ? "Posting..." : "Add Message"}
                    </Button>
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Unable to load detail.</p>
              )}
            </CardContent>
          </Card>
        )}
      </main>
      <Footer />
    </div>
  );
}

