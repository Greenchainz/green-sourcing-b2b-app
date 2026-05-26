// client/src/components/proof/ProofBadge.tsx
//
// Displays the GreenChainz Proof Ledger verification state for any anchored artifact.
//
// Usage:
//   <ProofBadge artifactType="epd" artifactId="EPD-12345" />
//   <ProofBadge status="verified" txHash="0xabc..." explorerUrl="https://polygonscan.com/tx/0xabc..." />
//
// The badge fetches proof state via tRPC when artifactType + artifactId are provided.
// You can also pass a pre-fetched status directly for SSR / non-React-Query contexts.

import { useState } from "react";
import { ShieldCheck, ShieldAlert, Shield, ShieldOff, ExternalLink, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { trpc } from "@/lib/trpc";

// ─── Types ────────────────────────────────────────────────────────────────────

type ProofStatus = "verified" | "anchored" | "mismatch" | "no_proof" | "loading" | "error";

type ProofArtifactType =
  | "epd"
  | "certification"
  | "material_score"
  | "material_submittal"
  | "supplier_audit";

interface ProofBadgeProps {
  /** Fetch proof state via tRPC when provided. */
  artifactType?: ProofArtifactType;
  artifactId?:   string;

  /** Override: pass pre-fetched status directly. */
  status?:      ProofStatus;
  txHash?:      string;
  explorerUrl?: string;
  anchoredAt?:  Date | string;

  /** Display size. */
  size?: "sm" | "md";

  className?: string;
}

// ─── Badge config ─────────────────────────────────────────────────────────────

const badgeConfig: Record<
  Exclude<ProofStatus, "loading" | "error">,
  {
    label:       string;
    description: string;
    icon:        typeof ShieldCheck;
    variant:     "default" | "secondary" | "destructive" | "outline";
    className:   string;
  }
> = {
  verified: {
    label:       "Document Integrity Verified",
    description: "This record matches the approved version anchored by GreenChainz on the Polygon blockchain.",
    icon:        ShieldCheck,
    variant:     "default",
    className:   "bg-green-600 hover:bg-green-700 text-white border-transparent",
  },
  anchored: {
    label:       "Proof Anchored",
    description: "This record has an immutable proof on the Polygon blockchain. Full verification requires the original artifact.",
    icon:        Shield,
    variant:     "secondary",
    className:   "bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200",
  },
  mismatch: {
    label:       "Verification Mismatch",
    description: "This record no longer matches its anchored blockchain proof. The document may have been altered after anchoring.",
    icon:        ShieldAlert,
    variant:     "destructive",
    className:   "bg-red-100 text-red-800 border-red-200 hover:bg-red-200",
  },
  no_proof: {
    label:       "No Proof Record",
    description: "This record has not been anchored on the blockchain yet.",
    icon:        ShieldOff,
    variant:     "outline",
    className:   "text-gray-500 border-gray-300",
  },
};

// ─── Component ────────────────────────────────────────────────────────────────

export function ProofBadge({
  artifactType,
  artifactId,
  status: statusOverride,
  txHash: txHashOverride,
  explorerUrl: explorerUrlOverride,
  anchoredAt: anchoredAtOverride,
  size = "md",
  className = "",
}: ProofBadgeProps) {
  const [tooltipOpen, setTooltipOpen] = useState(false);

  // ── Fetch proof state via tRPC (when artifact props provided) ───────────────
  const { data: proof, isLoading } = trpc.proof.getProof.useQuery(
    { artifactType: artifactType!, artifactId: artifactId! },
    {
      enabled: !!(artifactType && artifactId && !statusOverride),
      staleTime: 5 * 60 * 1000, // 5 min — proof records are immutable
    }
  );

  // ── Resolve display state ───────────────────────────────────────────────────
  let status: ProofStatus;
  let txHash: string | undefined;
  let explorerUrl: string | undefined;

  if (statusOverride) {
    status      = statusOverride;
    txHash      = txHashOverride;
    explorerUrl = explorerUrlOverride;
  } else if (isLoading) {
    status = "loading";
  } else if (proof) {
    // We have a proof record — status is "anchored" until full verification is run
    status      = proof.verificationStatus === "mismatch_detected" ? "mismatch" : "anchored";
    txHash      = proof.txHash;
    explorerUrl = proof.explorerUrl;
  } else {
    status = "no_proof";
  }

  // ── Loading state ───────────────────────────────────────────────────────────
  if (status === "loading") {
    return (
      <span className={`inline-flex items-center gap-1 text-gray-400 ${size === "sm" ? "text-xs" : "text-sm"} ${className}`}>
        <Loader2 className={size === "sm" ? "h-3 w-3" : "h-4 w-4"} />
        Checking proof…
      </span>
    );
  }

  // ── Error / unknown ─────────────────────────────────────────────────────────
  if (status === "error") {
    return null;
  }

  const config = badgeConfig[status];
  const Icon   = config.icon;
  const iconSize = size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5";
  const textSize = size === "sm" ? "text-xs" : "text-xs";

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip open={tooltipOpen} onOpenChange={setTooltipOpen}>
        <TooltipTrigger asChild>
          <Badge
            variant={config.variant}
            className={`
              inline-flex items-center gap-1 cursor-default select-none
              ${textSize} ${config.className} ${className}
            `}
          >
            <Icon className={iconSize} />
            {config.label}
          </Badge>
        </TooltipTrigger>

        <TooltipContent
          side="top"
          className="max-w-xs text-sm"
          onClick={() => setTooltipOpen(false)}
        >
          <p className="mb-1">{config.description}</p>

          {txHash && (
            <p className="text-xs text-gray-400 font-mono break-all">
              {txHash.slice(0, 10)}…{txHash.slice(-8)}
            </p>
          )}

          {explorerUrl && (
            <a
              href={explorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1.5 inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300"
              onClick={(e) => e.stopPropagation()}
            >
              View on PolygonScan
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ─── Convenience wrappers ─────────────────────────────────────────────────────

export function EpdProofBadge({ epdId, ...props }: { epdId: string } & Omit<ProofBadgeProps, "artifactType" | "artifactId">) {
  return <ProofBadge artifactType="epd" artifactId={epdId} {...props} />;
}

export function ScoreProofBadge({ materialId, ...props }: { materialId: number } & Omit<ProofBadgeProps, "artifactType" | "artifactId">) {
  return <ProofBadge artifactType="material_score" artifactId={String(materialId)} {...props} />;
}

export function SubmittalProofBadge({ submittalId, ...props }: { submittalId: number } & Omit<ProofBadgeProps, "artifactType" | "artifactId">) {
  return <ProofBadge artifactType="material_submittal" artifactId={String(submittalId)} {...props} />;
}

export function CertificationProofBadge({ certId, ...props }: { certId: string } & Omit<ProofBadgeProps, "artifactType" | "artifactId">) {
  return <ProofBadge artifactType="certification" artifactId={certId} {...props} />;
}
