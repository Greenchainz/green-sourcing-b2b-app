/**
 * PdfDownloadGateModal
 *
 * Shown when an architect hits their free PDF download limit.
 * Presents three unlock options simultaneously:
 *   A — Referral link (+3 credits per accepted referral)
 *   B — LinkedIn share (+1 credit, honor system, 1× per report)
 *   C — Profile completion checklist (up to +4 credits)
 *
 * Calls onCreditGranted() when credits are added so the parent
 * can immediately retry the download.
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Users,
  Linkedin,
  UserCheck,
  Copy,
  CheckCircle,
  ExternalLink,
  ArrowRight,
  Zap,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────────

interface ProfileCreditItem {
  key: string;
  label: string;
  credits: number;
}

interface PdfDownloadGateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  materialId: number;
  /** Called after any option successfully grants credits */
  onCreditGranted: () => void;
}

// ── Option A — Referral ───────────────────────────────────────────────────────

function ReferralOption({
  materialId: _materialId,
  onCreditGranted: _onCreditGranted,
}: {
  materialId: number;
  onCreditGranted: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const { data: creditData, refetch: refetchCredits } =
    trpc.architect.getDownloadCredits.useQuery(undefined, { staleTime: 0 });

  const generateCode = trpc.architect.generateReferralCode.useMutation({
    onSuccess: () => refetchCredits(),
  });

  const referralUrl = creditData?.referralUrl;

  const handleCopy = async () => {
    if (!referralUrl) {
      generateCode.mutate();
      return;
    }
    try {
      await navigator.clipboard.writeText(referralUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("Link copied!");
    } catch {
      toast.error("Copy failed — select the link manually");
    }
  };

  return (
    <div className="rounded-xl border border-border p-4 space-y-3">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center shrink-0">
          <Users className="w-4 h-4 text-purple-600" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-sm">Invite a colleague</p>
            <Badge className="text-xs bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 border-0">
              +3 downloads
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            They complete onboarding → you get 3 free reports
          </p>
        </div>
      </div>

      {referralUrl ? (
        <div className="flex gap-2">
          <input
            readOnly
            value={referralUrl}
            className="flex-1 text-xs px-3 py-2 rounded-lg border bg-muted font-mono truncate focus:outline-none"
          />
          <Button
            size="sm"
            variant="outline"
            className="shrink-0"
            onClick={handleCopy}
          >
            {copied ? (
              <CheckCircle className="w-3.5 h-3.5 text-green-500" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </Button>
        </div>
      ) : (
        <Button
          size="sm"
          className="w-full bg-purple-600 hover:bg-purple-700"
          onClick={() => generateCode.mutate()}
          disabled={generateCode.isPending}
        >
          {generateCode.isPending ? "Generating…" : "Generate Referral Link"}
        </Button>
      )}
    </div>
  );
}

// ── Option B — LinkedIn ───────────────────────────────────────────────────────

function LinkedInOption({
  materialId,
  onCreditGranted,
}: {
  materialId: number;
  onCreditGranted: () => void;
}) {
  const [shared, setShared] = useState(false);

  const claimShare = trpc.architect.claimLinkedInShare.useMutation({
    onSuccess: (data) => {
      if (data.alreadyClaimed) {
        toast.info("Already claimed for this report");
        return;
      }
      setShared(true);
      toast.success("+1 download credit added!");
      onCreditGranted();
    },
    onError: (err) => toast.error(err.message),
  });

  const shareText = encodeURIComponent(
    "Just found GreenChainz — material credit scores for sustainable building materials. Check it out: https://greenchainz.com"
  );
  const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=https%3A%2F%2Fgreenchainz.com&summary=${shareText}`;

  const handleShare = () => {
    window.open(linkedInUrl, "_blank", "width=600,height=500,noopener,noreferrer");
    // Honor-system: grant credit immediately on click
    claimShare.mutate({ materialId });
  };

  return (
    <div className="rounded-xl border border-border p-4 space-y-3">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
          <Linkedin className="w-4 h-4 text-blue-600" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-sm">Share on LinkedIn</p>
            <Badge className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-0">
              +1 download
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Share this report with your network — 1× per report
          </p>
        </div>
      </div>

      <div className="rounded-lg bg-muted/60 p-3 text-xs text-muted-foreground italic leading-relaxed">
        "Just found GreenChainz — material credit scores for sustainable building materials. Check it out: greenchainz.com"
      </div>

      {shared ? (
        <div className="flex items-center gap-2 text-sm text-green-600 font-medium">
          <CheckCircle className="w-4 h-4" /> Credit added — thanks for sharing!
        </div>
      ) : (
        <Button
          size="sm"
          className="w-full bg-[#0a66c2] hover:bg-[#0958a8] text-white"
          onClick={handleShare}
          disabled={claimShare.isPending}
        >
          <Linkedin className="w-3.5 h-3.5 mr-1.5" />
          {claimShare.isPending ? "Opening…" : "Share on LinkedIn"}
          <ExternalLink className="w-3 h-3 ml-1.5 opacity-70" />
        </Button>
      )}
    </div>
  );
}

// ── Option C — Profile Completion ─────────────────────────────────────────────

function ProfileOption({
  materialId: _materialId,
  profileCreditsAvailable,
  onCreditGranted,
}: {
  materialId: number;
  profileCreditsAvailable: ProfileCreditItem[];
  onCreditGranted: () => void;
}) {
  const applyCredits = trpc.architect.applyProfileCredits.useMutation({
    onSuccess: (data) => {
      if (data.creditsAdded > 0) {
        toast.success(`+${data.creditsAdded} download credit${data.creditsAdded === 1 ? "" : "s"} from profile!`);
        onCreditGranted();
      }
    },
    onError: (err) => toast.error(err.message),
  });

  const allFields: { key: string; label: string; credits: number; hint: string }[] = [
    { key: "firmName",  label: "Firm name",          credits: 1, hint: "Required during onboarding" },
    { key: "license",   label: "License number",      credits: 1, hint: "Add in Edit Profile" },
    { key: "autodesk",  label: "Autodesk account",    credits: 2, hint: "Connect in integrations" },
  ];

  const availableKeys = new Set(profileCreditsAvailable.map((p) => p.key));
  const totalAvailable = profileCreditsAvailable.reduce((s, p) => s + p.credits, 0);

  return (
    <div className="rounded-xl border border-border p-4 space-y-3">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center shrink-0">
          <UserCheck className="w-4 h-4 text-green-600" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-sm">Complete your profile</p>
            {totalAvailable > 0 && (
              <Badge className="text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 border-0">
                +{totalAvailable} available
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Earn credits for each profile section completed
          </p>
        </div>
      </div>

      <div className="space-y-2">
        {allFields.map((field) => {
          const available = availableKeys.has(field.key);
          return (
            <div
              key={field.key}
              className={`flex items-center gap-2.5 py-1.5 px-2 rounded-lg ${available ? "bg-green-50 dark:bg-green-900/10" : ""}`}
            >
              {available ? (
                <Zap className="w-3.5 h-3.5 text-green-500 shrink-0" />
              ) : (
                <CheckCircle className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />
              )}
              <span className={`text-xs flex-1 ${available ? "font-medium text-green-700 dark:text-green-400" : "text-muted-foreground line-through"}`}>
                {field.label}
              </span>
              <Badge
                className={`text-xs border-0 ${
                  available
                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                +{field.credits}
              </Badge>
            </div>
          );
        })}
      </div>

      {totalAvailable > 0 ? (
        <Button
          size="sm"
          className="w-full bg-green-600 hover:bg-green-700"
          onClick={() => applyCredits.mutate()}
          disabled={applyCredits.isPending}
        >
          {applyCredits.isPending ? "Applying…" : `Claim +${totalAvailable} credits now`}
          <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
        </Button>
      ) : (
        <div className="text-xs text-muted-foreground text-center py-1">
          All available profile credits already claimed.{" "}
          <a href="/architect/onboarding" className="underline text-foreground">
            Add license number?
          </a>
        </div>
      )}
    </div>
  );
}

// ── Main modal ────────────────────────────────────────────────────────────────

export function PdfDownloadGateModal({
  open,
  onOpenChange,
  materialId,
  onCreditGranted,
}: PdfDownloadGateModalProps) {
  const { data: creditData } = trpc.architect.getDownloadCredits.useQuery(undefined, {
    enabled: open,
    staleTime: 0,
  });

  const profileCreditsAvailable = creditData?.profileCreditsAvailable ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <Zap className="w-3.5 h-3.5 text-amber-500" />
            </div>
            Unlock your free report
          </DialogTitle>
          <DialogDescription>
            You've used your 2 free PDF downloads. Choose any option below to get more —
            no payment required.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-1">
          <ReferralOption materialId={materialId} onCreditGranted={onCreditGranted} />
          <LinkedInOption materialId={materialId} onCreditGranted={onCreditGranted} />
          <ProfileOption
            materialId={materialId}
            profileCreditsAvailable={profileCreditsAvailable}
            onCreditGranted={onCreditGranted}
          />
        </div>

        {/* Pro upsell */}
        <div className="border-t pt-4 text-center">
          <p className="text-xs text-muted-foreground">
            Need unlimited downloads?{" "}
            <a
              href="/subscription"
              className="font-semibold text-foreground hover:underline inline-flex items-center gap-0.5"
            >
              Upgrade to Pro
              <ArrowRight className="w-3 h-3" />
            </a>
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
