import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CarbonWinCard } from "@/components/CarbonWinCard";
import { downloadWinPng } from "@/lib/winCanvas";
import {
  buildWinUrl,
  winShareText,
  type CarbonWinData,
} from "@shared/carbonWin";
import { Download, ExternalLink, Link2, Linkedin, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export interface CarbonWinDialogProps {
  data: CarbonWinData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function shareUrl(data: CarbonWinData): string {
  const origin =
    typeof window !== "undefined" ? window.location.origin : "https://greenchainz.com";
  return buildWinUrl(origin, data);
}

/** Celebration + share modal shown when a lower-carbon win is made. */
export function CarbonWinDialog({ data, open, onOpenChange }: CarbonWinDialogProps) {
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    if (!data) return;
    setDownloading(true);
    try {
      await downloadWinPng(data);
      toast.success("Carbon Win image downloaded");
    } catch {
      toast.error("Could not generate the image. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  const handleCopy = async () => {
    if (!data) return;
    const url = shareUrl(data);
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Share link copied to clipboard");
    } catch {
      window.open(url, "_blank", "noopener,noreferrer");
      toast.error("Clipboard access was blocked — the share page has opened in a new tab so you can copy the URL from there.");
    }
  };

  const handleLinkedIn = () => {
    if (!data) return;
    const url = encodeURIComponent(shareUrl(data));
    window.open(
      `https://www.linkedin.com/sharing/share-offsite/?url=${url}`,
      "_blank",
      "noopener,noreferrer",
    );
  };

  const handleX = () => {
    if (!data) return;
    const url = encodeURIComponent(shareUrl(data));
    const text = encodeURIComponent(winShareText(data));
    window.open(
      `https://twitter.com/intent/tweet?text=${text}&url=${url}`,
      "_blank",
      "noopener,noreferrer",
    );
  };

  const handleOpenPage = () => {
    if (!data) return;
    window.open(shareUrl(data), "_blank", "noopener,noreferrer");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>🎉 You just logged a Carbon Win</DialogTitle>
          <DialogDescription>
            Share the proof. Every post puts your low-carbon choice — and the
            verified supplier — in front of your network.
          </DialogDescription>
        </DialogHeader>

        {data ? <CarbonWinCard data={data} /> : null}

        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Button
            onClick={handleDownload}
            disabled={downloading || !data}
            className="col-span-2 sm:col-span-1"
          >
            {downloading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            Download
          </Button>
          <Button variant="outline" onClick={handleCopy} disabled={!data}>
            <Link2 className="h-4 w-4" />
            Copy link
          </Button>
          <Button variant="outline" onClick={handleLinkedIn} disabled={!data}>
            <Linkedin className="h-4 w-4" />
            LinkedIn
          </Button>
          <Button variant="outline" onClick={handleX} disabled={!data}>
            <span className="text-sm font-bold">𝕏</span>
            Post
          </Button>
        </div>

        <button
          type="button"
          onClick={handleOpenPage}
          disabled={!data}
          className="mt-1 inline-flex items-center justify-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
        >
          <ExternalLink className="h-3 w-3" />
          Preview the public share page
        </button>
      </DialogContent>
    </Dialog>
  );
}

export default CarbonWinDialog;
