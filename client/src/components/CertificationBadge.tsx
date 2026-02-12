import { CheckCircle2, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface CertificationBadgeProps {
  certifications: {
    matched: string[];
    missing: string[];
  };
  compact?: boolean;
}

export function CertificationBadge({ certifications, compact = false }: CertificationBadgeProps) {
  const { matched, missing } = certifications;
  const totalRequired = matched.length + missing.length;

  if (totalRequired === 0) {
    return null; // No certifications required
  }

  if (compact) {
    // Compact mode: Show summary badge
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>
            <Badge
              variant={matched.length === totalRequired ? "default" : "secondary"}
              className="gap-1"
            >
              <CheckCircle2 className="h-3 w-3" />
              {matched.length}/{totalRequired} Certs
            </Badge>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <div className="space-y-2">
              {matched.length > 0 && (
                <div>
                  <p className="font-semibold text-green-600">✓ Matched:</p>
                  <p className="text-sm">{matched.join(", ")}</p>
                </div>
              )}
              {missing.length > 0 && (
                <div>
                  <p className="font-semibold text-red-600">✗ Missing:</p>
                  <p className="text-sm">{missing.join(", ")}</p>
                </div>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Full mode: Show individual badges
  return (
    <div className="flex flex-wrap gap-1.5">
      {matched.map((cert) => (
        <Badge
          key={cert}
          variant="default"
          className="gap-1 bg-green-100 text-green-800 hover:bg-green-200"
        >
          <CheckCircle2 className="h-3 w-3" />
          {cert}
        </Badge>
      ))}
      {missing.map((cert) => (
        <Badge
          key={cert}
          variant="secondary"
          className="gap-1 bg-gray-100 text-gray-600"
        >
          <XCircle className="h-3 w-3" />
          {cert}
        </Badge>
      ))}
    </div>
  );
}
