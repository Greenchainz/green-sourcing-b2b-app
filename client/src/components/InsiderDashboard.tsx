import { trpc } from "@/lib/trpc";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  Lock,
  Flame,
  Award,
  Zap,
} from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";

const MILESTONES = [
  { weeks: 4, label: "Pro PDF Generator", tier: "pro" },
  { weeks: 8, label: "Carbon Report Gen", tier: "pro" },
  { weeks: 12, label: "Founding Architect", tier: "founding" },
];

const CREDIT_MILESTONES = [
  { credits: 50, label: "Lead Time Intel" },
  { credits: 100, label: "Priority RFQ Matching" },
];

function tierBadge(tier: string) {
  switch (tier) {
    case "founding":
      return (
        <Badge className="bg-amber-500 text-white">
          <Award className="w-3 h-3 mr-1" />
          Founding
        </Badge>
      );
    case "pro":
      return (
        <Badge className="bg-emerald-600 text-white">
          <Zap className="w-3 h-3 mr-1" />
          Pro
        </Badge>
      );
    default:
      return (
        <Badge variant="secondary">Explorer</Badge>
      );
  }
}

interface InsiderDashboardProps {
  compact?: boolean;
}

export function InsiderDashboard({ compact = false }: InsiderDashboardProps) {
  const { user } = useAuth();
  const utils = trpc.useUtils();

  const { data: engagement, isLoading } = trpc.engagement.getMyEngagement.useQuery(
    undefined,
    { enabled: !!user, staleTime: 30_000 }
  );

  const checkInMutation = trpc.engagement.checkIn.useMutation({
    onSuccess: (data) => {
      if (data.alreadyCheckedIn) {
        toast.info("Already checked in this week");
      } else {
        toast.success(`Checked in! +1 credit. Streak: ${data.engagement?.currentStreak} weeks`);
      }
      utils.engagement.getMyEngagement.invalidate();
    },
    onError: () => toast.error("Check-in failed"),
  });

  // Not logged in
  if (!user) {
    return (
      <Card className="border-emerald-500/20">
        <CardContent className={compact ? "p-4" : "p-6"}>
          <div className="flex items-center gap-2 mb-3">
            <Flame className="w-5 h-5 text-emerald-500" />
            <h3 className="font-semibold text-foreground text-sm">GreenChainz Insider</h3>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            Sign up to track your GreenChainz Insider progress and earn rewards.
          </p>
          <Link href="/login">
            <Button size="sm" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs">
              Sign Up to Start
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  if (isLoading || !engagement) {
    return (
      <Card className="border-emerald-500/20">
        <CardContent className={compact ? "p-4" : "p-6"}>
          <div className="h-24 bg-muted animate-pulse rounded" />
        </CardContent>
      </Card>
    );
  }

  const streak = engagement.currentStreak;
  const credits = engagement.credits;
  const tier = engagement.tier;

  // Next milestone
  const nextMilestone = MILESTONES.find((m) => m.weeks > streak);
  const progressMax = nextMilestone ? nextMilestone.weeks : 12;
  const progressPct = Math.min(100, (streak / progressMax) * 100);

  // Already checked in this week?
  const checkedInThisWeek = (() => {
    if (!engagement.lastCheckIn) return false;
    const now = new Date();
    const last = new Date(engagement.lastCheckIn);
    const getWeekStart = (d: Date) => {
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      const s = new Date(d);
      s.setDate(diff);
      s.setHours(0, 0, 0, 0);
      return s.getTime();
    };
    return getWeekStart(now) === getWeekStart(last);
  })();

  if (compact) {
    return (
      <Card className="border-emerald-500/20">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-emerald-500" />
              <span className="text-xs font-semibold text-foreground">Insider</span>
            </div>
            {tierBadge(tier)}
          </div>

          {/* Progress bar */}
          <div className="w-full h-1.5 bg-secondary rounded-full mb-2">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-3">
            <span>{streak}/{progressMax} weeks</span>
            <span>{credits} credits</span>
          </div>

          <Button
            size="sm"
            className={`w-full h-7 text-xs ${
              checkedInThisWeek
                ? "bg-secondary text-muted-foreground cursor-default"
                : "bg-emerald-600 hover:bg-emerald-700 text-white"
            }`}
            disabled={checkedInThisWeek || checkInMutation.isPending}
            onClick={() => checkInMutation.mutate()}
          >
            {checkedInThisWeek ? (
              <>
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Checked In
              </>
            ) : (
              "Check In This Week"
            )}
          </Button>

          <Link href="/insider" className="block text-center mt-2">
            <span className="text-[10px] text-emerald-500 hover:text-emerald-400">
              View full dashboard &rarr;
            </span>
          </Link>
        </CardContent>
      </Card>
    );
  }

  // Full version
  return (
    <Card className="border-emerald-500/20">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-emerald-500" />
            <h3 className="font-semibold text-foreground">GreenChainz Insider</h3>
          </div>
          {tierBadge(tier)}
        </div>

        {/* Progress bar */}
        <div className="mb-1">
          <div className="w-full h-2.5 bg-secondary rounded-full">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-4">
          <span>
            {streak}/{progressMax} weeks
          </span>
          {nextMilestone && (
            <span>Next: {nextMilestone.label}</span>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="bg-secondary/50 rounded-lg px-3 py-2">
            <p className="text-lg font-bold text-foreground">{credits}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Credits</p>
          </div>
          <div className="bg-secondary/50 rounded-lg px-3 py-2">
            <p className="text-lg font-bold text-foreground">
              {streak} <span className="text-sm font-normal text-muted-foreground">wk</span>
            </p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Streak</p>
          </div>
        </div>

        {/* Check-in button */}
        <Button
          className={`w-full mb-5 ${
            checkedInThisWeek
              ? "bg-secondary text-muted-foreground cursor-default"
              : "bg-emerald-600 hover:bg-emerald-700 text-white"
          }`}
          disabled={checkedInThisWeek || checkInMutation.isPending}
          onClick={() => checkInMutation.mutate()}
        >
          {checkedInThisWeek ? (
            <>
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Checked In This Week
            </>
          ) : (
            "Check In This Week"
          )}
        </Button>

        {/* Milestones */}
        <div className="space-y-2.5">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Unlocks
          </p>
          {MILESTONES.map((m) => {
            const unlocked = streak >= m.weeks;
            return (
              <div
                key={m.weeks}
                className="flex items-center gap-2.5 text-sm"
              >
                {unlocked ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                ) : (
                  <Lock className="w-4 h-4 text-muted-foreground/40 shrink-0" />
                )}
                <span
                  className={
                    unlocked
                      ? "text-foreground font-medium"
                      : "text-muted-foreground"
                  }
                >
                  {m.label}
                </span>
                <span className="text-[10px] text-muted-foreground ml-auto">
                  {m.weeks} wk streak
                </span>
              </div>
            );
          })}
          {CREDIT_MILESTONES.map((m) => {
            const unlocked = credits >= m.credits;
            return (
              <div
                key={m.credits}
                className="flex items-center gap-2.5 text-sm"
              >
                {unlocked ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                ) : (
                  <Lock className="w-4 h-4 text-muted-foreground/40 shrink-0" />
                )}
                <span
                  className={
                    unlocked
                      ? "text-foreground font-medium"
                      : "text-muted-foreground"
                  }
                >
                  {m.label}
                </span>
                <span className="text-[10px] text-muted-foreground ml-auto">
                  {m.credits} credits
                </span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
