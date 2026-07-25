import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { InsiderDashboard } from "@/components/InsiderDashboard";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
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
import { openArcade } from "@/components/arcade/arcadeBus";
import { useAuth } from "@/contexts/AuthContext";

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
  const { user } = useAuth();
  const { data: leaderboard, isLoading: lbLoading } = trpc.engagement.getLeaderboard.useQuery(
    undefined,
    { staleTime: 60_000 }
  );

  // Arcade — Season 1 top score for The Round (public board)
  const { data: roundBoard } = trpc.arcade.topScores.useQuery(
    { gameId: "green-round", limit: 3 },
    { staleTime: 60_000 }
  );
  const leader = roundBoard?.scores[0] ?? null;

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

          {/* ⛳ Arcade Season 1 — prominent CTA */}
          <Card className="border-amber-500/40 bg-gradient-to-br from-emerald-950/60 via-zinc-900 to-black overflow-hidden">
            <CardContent className="p-0">
              <div className="flex flex-col md:flex-row items-stretch">
                {/* Left: season info */}
                <div className="flex-1 p-6 space-y-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className="bg-amber-500 text-black font-bold text-xs px-2.5 py-0.5 rounded-full animate-pulse">
                      SEASON 1 LIVE
                    </Badge>
                    <Badge className="bg-emerald-700 text-white font-bold text-xs px-2.5 py-0.5 rounded-full">
                      $500 PRIZE
                    </Badge>
                  </div>
                  <h2 className="text-lg font-bold text-white leading-snug">
                    ⛳ Play The Round — Championship Golf
                  </h2>
                  <p className="text-sm text-emerald-300 leading-relaxed">
                    Top score on The Round when Season 1 ends{" "}
                    <span className="font-semibold text-white">Aug 1 2026</span> wins{" "}
                    <span className="font-semibold text-amber-400">$500 cash</span>.
                    {leader && (
                      <span className="block mt-1 text-emerald-400">
                        Current leader: <span className="text-white font-bold">{leader.initials}</span>{" "}
                        with{" "}
                        <span className="text-amber-400 font-bold">
                          {leader.score.toLocaleString()} pts
                        </span>
                        {leader.company && ` · ${leader.company}`}
                      </span>
                    )}
                  </p>
                  <div className="flex items-center gap-3 pt-1 flex-wrap">
                    <Button
                      onClick={() => openArcade({ gameId: "green-round", reason: "insider-cta" })}
                      className="bg-amber-400 hover:bg-amber-300 text-black font-bold text-sm px-5 py-2 shadow-md hover:shadow-amber-400/40 transition-all"
                    >
                      ⛳ Play The Round
                    </Button>
                    <Link href="/arcade">
                      <span className="text-xs text-emerald-400 hover:text-emerald-300 underline underline-offset-2 cursor-pointer transition-colors">
                        View full leaderboard →
                      </span>
                    </Link>
                  </div>
                </div>

                {/* Right: mini top-3 board */}
                <div className="md:w-52 bg-black/30 border-t md:border-t-0 md:border-l border-emerald-900/40 p-4 flex flex-col justify-center">
                  <p className="text-[10px] uppercase tracking-widest text-emerald-500 font-bold mb-3">
                    Top 3 · The Round
                  </p>
                  {!roundBoard?.scores.length ? (
                    <p className="text-xs text-muted-foreground">No scores yet</p>
                  ) : (
                    <div className="space-y-2">
                      {roundBoard.scores.map((entry) => {
                        const medal =
                          entry.rank === 1 ? "🥇" : entry.rank === 2 ? "🥈" : "🥉";
                        return (
                          <div
                            key={`${entry.rank}-${entry.initials}`}
                            className="flex items-center gap-2"
                          >
                            <span className="text-sm">{medal}</span>
                            <span className="text-xs font-semibold text-white truncate flex-1">
                              {entry.initials}
                            </span>
                            <span className="text-xs text-amber-400 font-bold tabular-nums shrink-0">
                              {entry.score.toLocaleString()}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {user && (
                    <p className="text-[10px] text-emerald-600 mt-4 leading-snug">
                      Signed in as{" "}
                      <span className="text-emerald-400 font-semibold">
                        {user.name ?? user.email}
                      </span>
                      . Submit a score to claim your rank.
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

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
