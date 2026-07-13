import { Button } from "@/components/ui/button";
import { CarbonWinCard } from "@/components/CarbonWinCard";
import SEOHead from "@/components/SEOHead";
import { downloadWinPng } from "@/lib/winCanvas";
import {
  buildWinUrl,
  decodeWin,
  formatCo2,
  winHeadline,
  winShareText,
  type CarbonWinData,
} from "@shared/carbonWin";
import {
  ArrowRight,
  Building2,
  Download,
  Factory,
  Leaf,
  Link2,
  Linkedin,
  Loader2,
  Sparkles,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useSearch } from "wouter";
import { toast } from "sonner";

const DEMO_WIN: CarbonWinData = {
  co2SavedKg: 12400,
  fromMaterial: "Standard CMU wall assembly",
  toMaterial: "Low-carbon GFRC rainscreen panel",
  supplier: "EcoStone Facades",
  savingsPct: 38,
};

function getOrigin(): string {
  return typeof window !== "undefined"
    ? window.location.origin
    : "https://greenchainz.com";
}

export default function CarbonWin() {
  const search = useSearch();
  const [downloading, setDownloading] = useState(false);

  const { data, isDemo } = useMemo(() => {
    const params = new URLSearchParams(search);
    const decoded = decodeWin(params.get("d"));
    return decoded
      ? { data: decoded, isDemo: false }
      : { data: DEMO_WIN, isDemo: true };
  }, [search]);

  const co2 = formatCo2(data.co2SavedKg);
  const shareLink = buildWinUrl(getOrigin(), data);

  const handleDownload = async () => {
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
    try {
      await navigator.clipboard.writeText(shareLink);
      toast.success("Share link copied");
    } catch {
      toast.error("Copy failed — copy the link from the address bar.");
    }
  };

  const handleLinkedIn = () => {
    const url = encodeURIComponent(shareLink);
    window.open(
      `https://www.linkedin.com/sharing/share-offsite/?url=${url}`,
      "_blank",
      "noopener,noreferrer",
    );
  };

  const handleX = () => {
    const url = encodeURIComponent(shareLink);
    const text = encodeURIComponent(winShareText(data));
    window.open(
      `https://twitter.com/intent/tweet?text=${text}&url=${url}`,
      "_blank",
      "noopener,noreferrer",
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title={`${co2.value} ${co2.unit} avoided — a GreenChainz Carbon Win`}
        description={winHeadline(data)}
        canonicalPath="/win"
        ogTitle={`${co2.value} ${co2.unit} avoided — GreenChainz Carbon Win`}
        ogDescription={winShareText(data)}
      />

      <div className="mx-auto max-w-5xl px-4 py-10 sm:py-16">
        <div className="mb-8 text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            Carbon Win
          </span>
          <h1 className="mt-4 text-3xl font-bold sm:text-4xl">
            Real carbon savings, made shareable.
          </h1>
          <p className="mx-auto mt-2 max-w-xl text-muted-foreground">
            This is what a smarter material choice looks like on GreenChainz.
            {isDemo ? " (Example win — make your own below.)" : ""}
          </p>
        </div>

        <div className="mx-auto max-w-xl">
          <CarbonWinCard data={data} />

          {/* Share actions */}
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Button
              onClick={handleDownload}
              disabled={downloading}
              className="col-span-2 sm:col-span-1"
            >
              {downloading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              Download
            </Button>
            <Button variant="outline" onClick={handleCopy}>
              <Link2 className="h-4 w-4" />
              Copy link
            </Button>
            <Button variant="outline" onClick={handleLinkedIn}>
              <Linkedin className="h-4 w-4" />
              LinkedIn
            </Button>
            <Button variant="outline" onClick={handleX}>
              <span className="text-sm font-bold">𝕏</span>
              Post
            </Button>
          </div>
        </div>

        {/* Conversion band */}
        <div className="mt-14">
          <h2 className="text-center text-xl font-bold sm:text-2xl">
            Win your own specs the low-carbon way
          </h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <Link
              href="/architect/onboarding"
              className="group rounded-xl border bg-card p-5 transition-colors hover:border-primary/50"
            >
              <Building2 className="h-6 w-6 text-primary" />
              <h3 className="mt-3 font-semibold">For architects &amp; specifiers</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Find lower-carbon, spec-ready substitutions in seconds and prove
                the savings.
              </p>
              <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary">
                Get started
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>

            <Link
              href="/for-suppliers"
              className="group rounded-xl border bg-card p-5 transition-colors hover:border-primary/50"
            >
              <Factory className="h-6 w-6 text-primary" />
              <h3 className="mt-3 font-semibold">For suppliers</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Get your low-carbon products in front of architects at
                the moment of specification.
              </p>
              <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary">
                List your products
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>

            <Link
              href="/how-it-works"
              className="group rounded-xl border bg-card p-5 transition-colors hover:border-primary/50"
            >
              <Leaf className="h-6 w-6 text-primary" />
              <h3 className="mt-3 font-semibold">How it works</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                See how GreenChainz turns EPD data into shareable carbon wins for
                every project.
              </p>
              <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary">
                Learn more
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
