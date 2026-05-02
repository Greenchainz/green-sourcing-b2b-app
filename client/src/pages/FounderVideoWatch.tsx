import { useEffect, useRef, useState } from "react";
import { useRoute } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Leaf, AlertCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";

/**
 * Public watch page at /v/:token — no auth required.
 * Plays the video, fires a view beacon at 50% playback.
 */
export default function FounderVideoWatch() {
  const [, params] = useRoute<{ token: string }>("/v/:token");
  const token = params?.token ?? "";

  const beaconFiredRef = useRef(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [progressShown, setProgressShown] = useState(false);

  const watchQuery = trpc.founderVideo.publicGet.useQuery(
    { token },
    { enabled: token.length > 0, retry: false },
  );

  const logViewMutation = trpc.founderVideo.publicLogView.useMutation();

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !watchQuery.data) return;

    function onTimeUpdate(): void {
      if (!video) return;
      const watched = video.currentTime;
      const total = video.duration;
      if (!total || beaconFiredRef.current) return;

      if (watched / total >= 0.5) {
        beaconFiredRef.current = true;
        logViewMutation.mutate({
          token,
          durationWatchedSec: Math.floor(watched),
        });
      }

      if (watched >= 5 && !progressShown) setProgressShown(true);
    }

    video.addEventListener("timeupdate", onTimeUpdate);
    return () => video.removeEventListener("timeupdate", onTimeUpdate);
  }, [watchQuery.data, token, logViewMutation, progressShown]);

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-6 flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
            <p>No share token in the URL.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (watchQuery.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <p className="text-muted-foreground">Loading video…</p>
      </div>
    );
  }

  if (watchQuery.error || !watchQuery.data) {
    const msg = watchQuery.error?.message ?? "This video could not be loaded.";
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-6">
            <div className="flex items-start gap-2 mb-3">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
              <p className="font-medium">Video unavailable</p>
            </div>
            <p className="text-sm text-muted-foreground">{msg}</p>
            <p className="text-sm text-muted-foreground mt-2">
              The link may have expired, or the video was removed.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const v = watchQuery.data;

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white dark:from-emerald-950/20 dark:to-background">
      <header className="border-b bg-white/80 dark:bg-background/80 backdrop-blur">
        <div className="container mx-auto max-w-3xl px-4 py-3 flex items-center gap-2">
          <Leaf className="w-5 h-5 text-emerald-600" />
          <span className="font-semibold">GreenChainz</span>
          <span className="text-muted-foreground text-sm ml-auto">A personal video</span>
        </div>
      </header>

      <main className="container mx-auto max-w-3xl px-4 py-6">
        <div className="mb-4">
          <p className="text-sm text-muted-foreground">For {v.recipientName}</p>
          <h1 className="text-2xl font-bold">{v.subject}</h1>
        </div>

        <Card className="overflow-hidden mb-4">
          <video
            ref={videoRef}
            src={v.videoUrl}
            controls
            autoPlay
            playsInline
            className="w-full bg-black aspect-video"
          />
        </Card>

        {v.note && (
          <Card className="mb-4">
            <CardContent className="p-4">
              <p className="text-sm whitespace-pre-wrap">{v.note}</p>
            </CardContent>
          </Card>
        )}

        {v.transcript && (
          <details className="mb-6">
            <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground py-2">
              Show transcript
            </summary>
            <Card className="mt-2">
              <CardContent className="p-4 text-sm whitespace-pre-wrap leading-relaxed">
                {v.transcript}
              </CardContent>
            </Card>
          </details>
        )}

        <div className="text-center text-sm text-muted-foreground py-6 border-t">
          <p>
            Want to talk?{" "}
            <a
              href="https://greenchainz.com"
              className="text-emerald-700 dark:text-emerald-400 hover:underline font-medium"
            >
              greenchainz.com
            </a>
          </p>
        </div>
      </main>
    </div>
  );
}
