import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { InsiderDashboard } from "@/components/InsiderDashboard";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Flame,
  Award,
  Zap,
  Trophy,
  FileText,
  Send,
  GitCompare,
  Users,
  CheckCircle2,
} from "lucide-react";

const CREDIT_ACTIONS = [
  { action: "Weekly Check-in", credits: 1, icon: CheckCircle2, description: "Check in once per week to maintain your streak" },
  { action: "Submit an RFQ", credits: 5, icon: Send, description: "Request a quote from suppliers" },
  { action: "Material Comparison", credits: 2, icon: GitCompare, description: "Compare materials side-by-side" },
  { action: "Download Spec Sheet", credits: 1, icon: FileText, description: "Generate a material spec sheet PDF" },
  { action: "Refer a Colleague", credits: 10, icon: Users, description: "Invite another professional to join" },
];

const TIER_INFO = [
  {
    tier: "Explorer",
    requirement: "Sign up",
    color: "bg-zinc-600",
    perks: ["Access to materials catalog", "Basic comparison tools"],
  },
  {
    tier: "Pro",
    requirement: "4-week streak",
    color: "bg-emerald-600",
    perks: ["Pro PDF Generator", "Carbon Report Gen (at 8 weeks)", "Priority support"],
  },
  {
    tier: "Founding Architect",
    requirement: "12-week streak",
    color: "bg-amber-500",
    perks: ["All Pro perks", "Founding Architect badge", "Early access to new features", "Lead Time Intel (50 credits)", "Priority RFQ Matching (100 credits)"],
  },
];

export default function InsiderPage() {
  const { data: leaderboard, isLoading: lbLoading } = trpc.engagement.getLeaderboard.useQuery(
    undefined,
    { staleTime: 60_000 }
  );

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1">
        <div className="container max-w-5xl mx-auto px-4 py-8 space-y-8">

          {/* Hero */}
          <div className="text-center mb-2">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Flame className="w-7 h-7 text-emerald-500" />
              <h1 className="text-2xl font-bold text-foreground">GreenChainz Insider</h1>
            </div>
            <p className="text-sm text-muted-foreground max-w-lg mx-auto">
              Stay engaged with sustainable sourcing. Check in weekly, earn credits,
              and unlock powerful tools as you build your streak.
            </p>
          </div>

          {/* Dashboard widget (full size) */}
          <InsiderDashboard />

          {/* Leaderboard */}
          <Card className="border-emerald-500/20">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Trophy className="w-5 h-5 text-amber-500" />
                <h2 className="font-semibold text-foreground">Leaderboard — Top 10</h2>
              </div>

              {lbLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="h-10 bg-muted animate-pulse rounded" />
                  ))}
                </div>
              ) : leaderboard && leaderboard.length > 0 ? (
                <div className="space-y-1">
                  {leaderboard.map((entry, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-secondary/50 transition-colors"
                    >
                      <span className={`text-sm font-bold w-6 text-center ${
                        idx === 0 ? "text-amber-500" : idx === 1 ? "text-zinc-400" : idx === 2 ? "text-amber-700" : "text-muted-foreground"
                      }`}>
                        {idx + 1}
                      </span>
                      <span className="flex-1 text-sm font-medium text-foreground truncate">
                        {entry.name}
                      </span>
                      <Badge variant="secondary" className="text-xs">
                        {entry.currentStreak} wk
                      </Badge>
                      <span className="text-sm font-semibold text-emerald-500 w-16 text-right">
                        {entry.credits} cr
                      </span>
                      {entry.tier === "founding" && (
                        <Award className="w-4 h-4 text-amber-500 shrink-0" />
                      )}
                      {entry.tier === "pro" && (
                        <Zap className="w-4 h-4 text-emerald-500 shrink-0" />
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-6">
                  No leaderboard data yet. Be the first to check in!
                </p>
              )}
            </CardContent>
          </Card>

          {/* How It Works */}
          <Card>
            <CardContent className="p-6">
              <h2 className="font-semibold text-foreground mb-4">How It Works</h2>
              <div className="grid md:grid-cols-3 gap-4">
                {TIER_INFO.map((t) => (
                  <div key={t.tier} className="border border-border rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`w-3 h-3 rounded-full ${t.color}`} />
                      <span className="font-medium text-sm text-foreground">{t.tier}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-3">{t.requirement}</p>
                    <ul className="space-y-1">
                      {t.perks.map((perk) => (
                        <li key={perk} className="text-xs text-muted-foreground flex items-start gap-1.5">
                          <CheckCircle2 className="w-3 h-3 text-emerald-500 mt-0.5 shrink-0" />
                          {perk}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* How to Earn Credits */}
          <Card>
            <CardContent className="p-6">
              <h2 className="font-semibold text-foreground mb-4">How to Earn Credits</h2>
              <div className="space-y-3">
                {CREDIT_ACTIONS.map((a) => {
                  const Icon = a.icon;
                  return (
                    <div key={a.action} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-secondary/30">
                      <Icon className="w-4 h-4 text-emerald-500 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">{a.action}</p>
                        <p className="text-xs text-muted-foreground">{a.description}</p>
                      </div>
                      <Badge className="bg-emerald-600 text-white text-xs shrink-0">
                        +{a.credits}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        <Footer />
      </main>
    </div>
  );
}
