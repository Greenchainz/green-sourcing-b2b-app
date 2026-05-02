import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Copy, Check, Trash2, Eye, Clock, AlertCircle, BarChart2 } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

function formatRelative(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  const diffMs = Date.now() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 30) return `${diffDay}d ago`;
  return d.toLocaleDateString();
}

export default function FounderVideoList() {
  const [, navigate] = useLocation();
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const listQuery = trpc.founderVideo.list.useQuery();
  const deleteMutation = trpc.founderVideo.delete.useMutation({
    onSuccess: () => {
      void listQuery.refetch();
      toast.success("Video deleted");
    },
    onError: (err) => toast.error(err.message),
  });

  function copyLink(videoId: number, shareUrl: string): void {
    void navigator.clipboard.writeText(shareUrl).then(() => {
      setCopiedId(videoId);
      toast.success("Link copied");
      setTimeout(() => setCopiedId(null), 2000);
    });
  }

  function handleDelete(videoId: number): void {
    if (!confirm("Delete this video? This cannot be undone.")) return;
    deleteMutation.mutate({ videoId });
  }

  return (
    <div className="container mx-auto max-w-5xl py-8 px-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Founder Videos</h1>
          <p className="text-muted-foreground">Async videos sent to suppliers + architects.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate("/admin/founder-videos/analytics")}>
            <BarChart2 className="w-4 h-4 mr-2" />
            Analytics
          </Button>
          <Button onClick={() => navigate("/admin/founder-videos/new")}>
            <Plus className="w-4 h-4 mr-2" />
            New Video
          </Button>
        </div>
      </div>

      {listQuery.isLoading && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">Loading…</CardContent>
        </Card>
      )}

      {listQuery.error && (
        <Card>
          <CardContent className="py-6 flex items-start gap-2 text-red-700 dark:text-red-300">
            <AlertCircle className="w-4 h-4 mt-0.5" />
            <span>{listQuery.error.message}</span>
          </CardContent>
        </Card>
      )}

      {listQuery.data && listQuery.data.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">No videos sent yet.</p>
            <Button onClick={() => navigate("/admin/founder-videos/new")}>
              <Plus className="w-4 h-4 mr-2" />
              Record your first video
            </Button>
          </CardContent>
        </Card>
      )}

      {listQuery.data && listQuery.data.length > 0 && (
        <div className="space-y-3">
          {listQuery.data.map((v) => (
            <Card key={v.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base truncate">{v.subject}</CardTitle>
                    <p className="text-sm text-muted-foreground truncate">
                      To: {v.recipientName} ({v.recipientEmail})
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                    {v.status === "draft" && <Badge variant="outline">Draft</Badge>}
                    {v.status === "ready" && <Badge variant="secondary">Sent</Badge>}
                    {v.transcriptStatus === "pending" && (
                      <Badge variant="outline" className="gap-1">
                        <Clock className="w-3 h-3" />
                        Transcribing
                      </Badge>
                    )}
                    {v.transcriptStatus === "done" && (
                      <Badge variant="outline" className="gap-1 border-green-300 text-green-700 dark:text-green-400">
                        <Check className="w-3 h-3" />
                        Transcribed
                      </Badge>
                    )}
                    {v.transcriptStatus === "failed" && (
                      <Badge variant="destructive">Transcribe failed</Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground mb-3">
                  <span>{v.durationSec}s</span>
                  <span className="flex items-center gap-1">
                    <Eye className="w-3.5 h-3.5" />
                    {v.watchedCount} {v.watchedCount === 1 ? "view" : "views"}
                  </span>
                  <span>Sent {formatRelative(v.createdAt)}</span>
                  {v.lastWatchedAt && <span>Last watched {formatRelative(v.lastWatchedAt)}</span>}
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(v.shareUrl, "_blank")}
                  >
                    Open watch page
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => copyLink(v.id, v.shareUrl)}>
                    {copiedId === v.id ? (
                      <Check className="w-3.5 h-3.5 mr-1.5" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 mr-1.5" />
                    )}
                    Copy link
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(v.id)}
                    disabled={deleteMutation.isPending}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
