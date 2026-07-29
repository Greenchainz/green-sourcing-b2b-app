import { useState } from "react";
import { Trash2, Plus, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import Header from "../../components/Header";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { trpc } from "../../lib/trpc";

// Accept full YouTube URLs or bare video IDs.
function parseYoutubeId(input: string): string {
  const m = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([A-Za-z0-9_-]{11})/.exec(input);
  return m ? m[1] : input.trim().slice(0, 20);
}

export default function AboutVideos() {
  const [urlInput, setUrlInput] = useState("");
  const [titleInput, setTitleInput] = useState("");

  const utils = trpc.useUtils();
  const videosQuery = trpc.founderVideo.aboutVideos.useQuery();
  const videos = videosQuery.data?.videos ?? [];

  const addMutation = trpc.founderVideo.addAboutVideo.useMutation({
    onSuccess: () => {
      void utils.founderVideo.aboutVideos.invalidate();
      setUrlInput("");
      setTitleInput("");
      toast.success("Video added to About page");
    },
    onError: (err) => toast.error(err.message),
  });

  const removeMutation = trpc.founderVideo.removeAboutVideo.useMutation({
    onSuccess: () => {
      void utils.founderVideo.aboutVideos.invalidate();
      toast.success("Video removed");
    },
    onError: (err) => toast.error(err.message),
  });

  function handleAdd() {
    const youtubeId = parseYoutubeId(urlInput);
    if (youtubeId.length < 6) {
      toast.error("Paste a valid YouTube URL or video ID");
      return;
    }
    addMutation.mutate({ youtubeId, title: titleInput.trim(), sortOrder: videos.length });
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container py-10 max-w-2xl space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">About Page Videos</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Add or remove YouTube videos shown in the Founder section on /about.
            Tip: set videos to <strong>Unlisted</strong> on YouTube so they only play here.
          </p>
        </div>

        {/* Add form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Add a video</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              placeholder="YouTube URL or video ID  e.g. https://youtu.be/dQw4w9WgXcQ"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }}
            />
            <Input
              placeholder="Label (optional)  e.g. Founder intro — why GreenChainz exists"
              value={titleInput}
              onChange={(e) => setTitleInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }}
            />
            <Button
              onClick={handleAdd}
              disabled={addMutation.isPending || urlInput.trim() === ""}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Add video
            </Button>
          </CardContent>
        </Card>

        {/* Current videos */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Current videos ({videos.length})
          </h2>
          {videosQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : videos.length === 0 ? (
            <p className="text-sm text-muted-foreground">No videos yet. Add one above.</p>
          ) : (
            videos.map((v) => (
              <Card key={v.id} className="flex items-center gap-3 p-3">
                <img
                  src={`https://img.youtube.com/vi/${v.youtubeId}/default.jpg`}
                  alt=""
                  className="h-14 w-20 shrink-0 rounded object-cover bg-secondary"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{v.title || v.youtubeId}</p>
                  <a
                    href={`https://youtu.be/${v.youtubeId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    {v.youtubeId}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0 text-destructive hover:bg-destructive/10"
                  disabled={removeMutation.isPending}
                  onClick={() => removeMutation.mutate({ id: v.id })}
                  aria-label="Remove video"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </Card>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
