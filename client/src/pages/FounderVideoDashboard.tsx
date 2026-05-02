import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ChevronDown,
  ChevronRight,
  Eye,
  Video,
  TrendingUp,
  MailOpen,
  AlertCircle,
  Plus,
  ArrowLeft,
} from "lucide-react";

function fmt(date: Date | string | null | undefined): string {
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

function fmtSec(sec: number | null | undefined): string {
  if (sec == null) return "—";
  if (sec < 60) return `${sec}s`;
  return `${Math.floor(sec / 60)}m ${sec % 60}s`;
}

function WatchBar({ pct }: { pct: number }) {
  const color =
    pct === 0 ? "bg-slate-200 dark:bg-slate-700" : pct < 40 ? "bg-amber-400" : pct < 75 ? "bg-blue-400" : "bg-green-500";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs tabular-nums w-8 text-right text-muted-foreground">{pct}%</span>
    </div>
  );
}

type Video = NonNullable<ReturnType<typeof trpc.founderVideo.analytics.useQuery>["data"]>["videos"][number];

function VideoRow({ v }: { v: Video }) {
  const [open, setOpen] = useState(false);
  const hasViews = v.viewCount > 0;

  return (
    <Card className={hasViews ? "" : "opacity-70"}>
      <CardHeader className="pb-2">
        <div className="flex items-start gap-3">
          <button
            className="mt-0.5 text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => hasViews && setOpen((o) => !o)}
            disabled={!hasViews}
            aria-label={open ? "Collapse sessions" : "Expand sessions"}
          >
            {hasViews ? (
              open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4 opacity-30" />
            )}
          </button>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <CardTitle className="text-base truncate">{v.subject}</CardTitle>
                <p className="text-sm text-muted-foreground truncate">
                  {v.recipientName} · {v.recipientEmail}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {!hasViews && <Badge variant="outline" className="text-xs">Not opened</Badge>}
                {hasViews && (
                  <Badge variant="secondary" className="text-xs gap-1">
                    <Eye className="w-3 h-3" />
                    {v.viewCount} {v.viewCount === 1 ? "view" : "views"}
                  </Badge>
                )}
              </div>
            </div>

            <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span>Duration: {fmtSec(v.durationSec)}</span>
              <span>Sent: {fmt(v.createdAt)}</span>
              {hasViews && <span>First watch: {fmt(v.firstWatchedAt)}</span>}
              {hasViews && <span>Last watch: {fmt(v.lastWatchedAt)}</span>}
            </div>

            {hasViews && (
              <div className="mt-2">
                <p className="text-xs text-muted-foreground mb-1">Avg watch-through</p>
                <WatchBar pct={v.watchThroughPct} />
              </div>
            )}
          </div>
        </div>
      </CardHeader>

      {open && hasViews && (
        <CardContent className="pt-0 pl-10">
          <div className="border rounded-md overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-3 py-2 font-medium text-muted-foreground">When</th>
                  <th className="text-left px-3 py-2 font-medium text-muted-foreground">Watched</th>
                  <th className="text-left px-3 py-2 font-medium text-muted-foreground w-40">Watch-through</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {v.sessions.map((s, i) => (
                  <tr key={i} className="hover:bg-muted/30 transition-colors">
                    <td className="px-3 py-2 text-muted-foreground">{fmt(s.viewedAt)}</td>
                    <td className="px-3 py-2">{fmtSec(s.durationWatchedSec)}</td>
                    <td className="px-3 py-2">
                      {s.pct != null ? <WatchBar pct={s.pct} /> : <span className="text-muted-foreground">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

export default function FounderVideoDashboard() {
  const [, navigate] = useLocation();
  const { data, isLoading, error } = trpc.founderVideo.analytics.useQuery();

  return (
    <div className="container mx-auto max-w-5xl py-8 px-4">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/admin/founder-videos")}>
            <ArrowLeft className="w-4 h-4 mr-1" />
            Videos
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Video Analytics</h1>
            <p className="text-muted-foreground text-sm">Engagement across all sent videos.</p>
          </div>
        </div>
        <Button onClick={() => navigate("/admin/founder-videos/new")}>
          <Plus className="w-4 h-4 mr-2" />
          New Video
        </Button>
      </div>

      {isLoading && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i}><CardContent className="py-6 h-20 animate-pulse bg-muted/50 rounded" /></Card>
          ))}
        </div>
      )}

      {error && (
        <Card className="mb-6">
          <CardContent className="py-6 flex items-start gap-2 text-red-700 dark:text-red-300">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{error.message}</span>
          </CardContent>
        </Card>
      )}

      {data && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardContent className="py-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Video className="w-4 h-4" />
                  <span className="text-xs font-medium uppercase tracking-wide">Sent</span>
                </div>
                <p className="text-3xl font-bold">{data.summary.totalVideos}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <MailOpen className="w-4 h-4" />
                  <span className="text-xs font-medium uppercase tracking-wide">Opened</span>
                </div>
                <p className="text-3xl font-bold">{data.summary.openedCount}</p>
                {data.summary.totalVideos > 0 && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {Math.round((data.summary.openedCount / data.summary.totalVideos) * 100)}% open rate
                  </p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Eye className="w-4 h-4" />
                  <span className="text-xs font-medium uppercase tracking-wide">Total Views</span>
                </div>
                <p className="text-3xl font-bold">{data.summary.totalViews}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <TrendingUp className="w-4 h-4" />
                  <span className="text-xs font-medium uppercase tracking-wide">Avg Watch</span>
                </div>
                <p className="text-3xl font-bold">{data.summary.overallAvgPct}%</p>
                <p className="text-xs text-muted-foreground mt-0.5">of video watched</p>
              </CardContent>
            </Card>
          </div>

          {data.videos.length === 0 && (
            <Card>
              <CardContent className="py-16 text-center">
                <p className="text-muted-foreground mb-4">No sent videos yet. Record your first one!</p>
                <Button onClick={() => navigate("/admin/founder-videos/new")}>
                  <Plus className="w-4 h-4 mr-2" />
                  New Video
                </Button>
              </CardContent>
            </Card>
          )}

          {data.videos.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Click the arrow on any row to see individual watch sessions.
              </p>
              {data.videos.map((v) => (
                <VideoRow key={v.id} v={v} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
