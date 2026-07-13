import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { BadgeCheck, Copy, Check, ExternalLink, Sparkles } from "lucide-react";

type BadgeStyle = "flat" | "card";

interface BadgeEmbedDialogProps {
  materialId: number;
  materialName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DIMS: Record<BadgeStyle, { w: number; h: number }> = {
  flat: { w: 252, h: 40 },
  card: { w: 328, h: 132 },
};

/**
 * "Get your badge" modal — lets a supplier grab a copy-paste embed snippet for
 * the live GreenChainz Verified Material Credit Score badge. Every embed markets
 * GreenChainz on the supplier's own site and builds their spec-winning credibility.
 */
export function BadgeEmbedDialog({
  materialId,
  materialName,
  open,
  onOpenChange,
}: BadgeEmbedDialogProps) {
  const [style, setStyle] = useState<BadgeStyle>("flat");
  const [dark, setDark] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const origin = typeof window !== "undefined" ? window.location.origin : "";

  const { badgeUrl, scoreUrl } = useMemo(() => {
    const params = new URLSearchParams();
    if (style !== "flat") params.set("style", style);
    if (dark) params.set("theme", "dark");
    const qs = params.toString();
    return {
      badgeUrl: `${origin}/api/public/badge/material/${materialId}.svg${qs ? `?${qs}` : ""}`,
      scoreUrl: `${origin}/materials/${materialId}/score`,
    };
  }, [origin, materialId, style, dark]);

  const { w, h } = DIMS[style];
  const alt = `GreenChainz Verified — Material Credit Score for ${materialName}`;

  const snippets = useMemo(
    () => ({
      html: `<a href="${scoreUrl}" target="_blank" rel="noopener">\n  <img src="${badgeUrl}" alt="${alt}" width="${w}" height="${h}" />\n</a>`,
      markdown: `[![GreenChainz Verified](${badgeUrl})](${scoreUrl})`,
      url: badgeUrl,
    }),
    [scoreUrl, badgeUrl, alt, w, h]
  );

  const copy = async (key: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(key);
      toast.success("Copied to clipboard");
      window.setTimeout(() => setCopied((c) => (c === key ? null : c)), 2000);
    } catch {
      toast.error("Couldn't copy — select and copy manually");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BadgeCheck className="w-5 h-5 text-green-600" />
            Show off your Verified score
          </DialogTitle>
          <DialogDescription>
            Add a live GreenChainz Verified badge to your website or product page. It
            updates automatically as your Material Credit Score improves.
          </DialogDescription>
        </DialogHeader>

        {/* Controls */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <Tabs value={style} onValueChange={(v) => setStyle(v as BadgeStyle)}>
            <TabsList>
              <TabsTrigger value="flat">Compact</TabsTrigger>
              <TabsTrigger value="card">Card</TabsTrigger>
            </TabsList>
          </Tabs>
          <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer select-none">
            Dark
            <Switch checked={dark} onCheckedChange={setDark} />
          </label>
        </div>

        {/* Live preview */}
        <div
          className="rounded-lg border flex items-center justify-center py-6 px-4"
          style={{ background: dark ? "#0b1220" : "#f8fafc" }}
        >
          {/* Real, live SVG endpoint — re-fetches when style/theme change via the key */}
          <img
            key={badgeUrl}
            src={badgeUrl}
            alt={alt}
            width={w}
            height={h}
            style={{ maxWidth: "100%", height: "auto" }}
          />
        </div>

        {/* Snippets */}
        <Tabs defaultValue="html">
          <TabsList className="w-full">
            <TabsTrigger value="html" className="flex-1">HTML</TabsTrigger>
            <TabsTrigger value="markdown" className="flex-1">Markdown</TabsTrigger>
            <TabsTrigger value="url" className="flex-1">Image URL</TabsTrigger>
          </TabsList>

          {(["html", "markdown", "url"] as const).map((key) => (
            <TabsContent key={key} value={key} className="mt-3">
              <div className="relative">
                <pre className="text-xs bg-muted rounded-md p-3 pr-12 overflow-x-auto whitespace-pre-wrap break-all font-mono">
                  {snippets[key]}
                </pre>
                <Button
                  size="sm"
                  variant="secondary"
                  className="absolute top-2 right-2 gap-1.5"
                  onClick={() => copy(key, snippets[key])}
                >
                  {copied === key ? (
                    <Check className="w-3.5 h-3.5 text-green-600" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  {copied === key ? "Copied" : "Copy"}
                </Button>
              </div>
            </TabsContent>
          ))}
        </Tabs>

        {/* Value line */}
        <div className="flex items-start gap-2 rounded-md bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900 p-3">
          <Sparkles className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
          <p className="text-xs text-green-800 dark:text-green-300 leading-relaxed">
            Suppliers who display their score get taken more seriously by architects and
            spec writers — and the badge links buyers straight to your verified profile.
          </p>
        </div>

        <a
          href={scoreUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-primary hover:underline underline-offset-4 inline-flex items-center gap-1 self-start"
        >
          Preview the public score page
          <ExternalLink className="w-3 h-3" />
        </a>
      </DialogContent>
    </Dialog>
  );
}
