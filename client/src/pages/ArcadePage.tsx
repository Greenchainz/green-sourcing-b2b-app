import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import { Trophy, Timer, Gamepad2, Star } from "lucide-react";
import { openArcade } from "@/components/arcade/arcadeBus";
import type { ArcadeGameId } from "@shared/arcadeScoring";

// Season 1 ends Aug 1 2026 00:00 UTC
const SEASON_END = new Date("2026-08-01T00:00:00Z");

const GAME_META: Record<ArcadeGameId, { label: string; emoji: string }> = {
  "green-round": { label: "The Round", emoji: "⛳" },
  "spec-breaker": { label: "Spec Breaker", emoji: "🧱" },
  "supply-snake": { label: "Supply Snake", emoji: "🐍" },
  "green-iq": { label: "Green IQ", emoji: "🧠" },
  "green-approach": { label: "Green Approach", emoji: "🏌️" },
  "green-drive": { label: "Long Drive", emoji: "💨" },
};

const SIDE_GAMES: ArcadeGameId[] = [
  "spec-breaker",
  "supply-snake",
  "green-iq",
  "green-approach",
  "green-drive",
];

function useCountdown(target: Date) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const diff = Math.max(0, target.getTime() - now);
  const days = Math.floor(diff / 86_400_000);
  const hours = Math.floor((diff % 86_400_000) / 3_600_000);
  const mins = Math.floor((diff % 3_600_000) / 60_000);
  const secs = Math.floor((diff % 60_000) / 1000);
  return { days, hours, mins, secs, expired: diff === 0 };
}

function CountdownUnit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center min-w-[3rem]">
      <span className="text-2xl font-bold text-white tabular-nums">
        {String(value).padStart(2, "0")}
      </span>
      <span className="text-[10px] uppercase tracking-widest text-emerald-400 font-semibold">
        {label}
      </span>
    </div>
  );
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1)
    return <span className="text-lg" title="1st">🥇</span>;
  if (rank === 2)
    return <span className="text-lg" title="2nd">🥈</span>;
  if (rank === 3)
    return <span className="text-lg" title="3rd">🥉</span>;
  return (
    <span className="text-sm font-bold text-muted-foreground w-6 text-center">
      {rank}
    </span>
  );
}

function MiniBoard({
  gameId,
  limit = 5,
}: {
  gameId: ArcadeGameId;
  limit?: number;
}) {
  const { data, isLoading } = trpc.arcade.topScores.useQuery(
    { gameId, limit },
    { staleTime: 30_000 }
  );

  const meta = GAME_META[gameId];

  return (
    <Card className="border-border bg-card/60">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-base">{meta.emoji}</span>
          <span className="text-sm font-semibold text-foreground">
            {meta.label}
          </span>
        </div>
        {isLoading ? (
          <div className="space-y-1.5">
            {Array.from({ length: limit }).map((_, i) => (
              <div key={i} className="h-6 bg-muted animate-pulse rounded" />
            ))}
          </div>
        ) : !data?.scores.length ? (
          <p className="text-xs text-muted-foreground py-3 text-center">
            No scores yet — be first!
          </p>
        ) : (
          <div className="space-y-1">
            {data.scores.map((entry) => (
              <div
                key={`${entry.rank}-${entry.initials}`}
                className="flex items-center gap-2 px-1 py-0.5"
              >
                <RankBadge rank={entry.rank} />
                <span className="flex-1 text-xs font-medium text-foreground truncate">
                  {entry.initials}
                  {entry.company && (
                    <span className="text-muted-foreground font-normal">
                      {" "}· {entry.company}
                    </span>
                  )}
                </span>
                <span className="text-xs font-bold text-emerald-500 tabular-nums">
                  {entry.score.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function ArcadePage() {
  const countdown = useCountdown(SEASON_END);

  const { data: mainBoard, isLoading: mainLoading } =
    trpc.arcade.topScores.useQuery(
      { gameId: "green-round", limit: 10 },
      { staleTime: 30_000 }
    );

  const leader = useMemo(() => mainBoard?.scores[0] ?? null, [mainBoard]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEOHead
        title="GreenChainz Arcade — $500 Prize Leaderboard"
        description="Play The Round golf championship and compete for a $500 prize. Season 1 ends Aug 1 2026. Top scores live. No login needed to view."
        canonicalPath="/arcade"
      />
      <Header />

      <main className="flex-1">
        {/* Season Banner */}
        <section
          className="py-12 bg-gradient-to-br from-emerald-950 via-zinc-950 to-black border-b border-emerald-800/40"
        >
          <div className="container max-w-4xl mx-auto text-center space-y-6 px-4">
            <div className="flex items-center justify-center gap-2">
              <Trophy className="w-6 h-6 text-amber-400" />
              <Badge className="bg-amber-500 text-black font-bold text-sm px-3 py-1 rounded-full">
                SEASON 1 LIVE
              </Badge>
            </div>

            <h1 className="text-3xl md:text-5xl font-extrabold text-white leading-tight">
              Play The Round.{" "}
              <span className="text-amber-400">Win $500.</span>
            </h1>

            <p className="text-emerald-300 text-base md:text-lg max-w-xl mx-auto">
              The GreenChainz golf championship. Top score on{" "}
              <span className="font-semibold text-white">The Round</span> when
              Season 1 ends takes home the prize.
            </p>

            {/* Countdown */}
            <div className="inline-flex items-center gap-1 rounded-xl border border-emerald-700 bg-emerald-950/60 px-6 py-4">
              <Timer className="w-4 h-4 text-emerald-400 mr-2 shrink-0" />
              {countdown.expired ? (
                <span className="text-sm text-emerald-300 font-semibold">
                  Season ended
                </span>
              ) : (
                <div className="flex items-center gap-3">
                  <CountdownUnit value={countdown.days} label="days" />
                  <span className="text-emerald-600 font-bold text-xl">:</span>
                  <CountdownUnit value={countdown.hours} label="hrs" />
                  <span className="text-emerald-600 font-bold text-xl">:</span>
                  <CountdownUnit value={countdown.mins} label="min" />
                  <span className="text-emerald-600 font-bold text-xl">:</span>
                  <CountdownUnit value={countdown.secs} label="sec" />
                </div>
              )}
              <span className="ml-3 text-xs text-emerald-500 font-medium">
                until Aug 1 2026
              </span>
            </div>

            {/* Play CTA */}
            <div className="pt-2">
              <Button
                size="lg"
                onClick={() => openArcade({ gameId: "green-round", reason: "arcade-page" })}
                className="text-base px-8 py-5 bg-amber-400 hover:bg-amber-300 text-black font-bold shadow-lg hover:shadow-amber-400/40 transition-all duration-200"
              >
                ⛳ Play The Round Now
              </Button>
              <p className="mt-2 text-xs text-emerald-600">
                No account required to play · Account needed to claim the prize
              </p>
            </div>
          </div>
        </section>

        {/* Main leaderboard — The Round top 10 */}
        <section className="py-10 bg-background border-b border-border">
          <div className="container max-w-2xl mx-auto px-4">
            <div className="flex items-center gap-3 mb-6">
              <span className="text-2xl">⛳</span>
              <div>
                <h2 className="text-xl font-bold text-foreground">
                  The Round — All-Time Top 10
                </h2>
                <p className="text-xs text-muted-foreground">
                  Championship board · Season 1 · $500 Prize
                </p>
              </div>
            </div>

            {mainLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div key={i} className="h-12 bg-muted animate-pulse rounded-lg" />
                ))}
              </div>
            ) : !mainBoard?.scores.length ? (
              <Card className="border-dashed border-emerald-600/40">
                <CardContent className="py-12 text-center space-y-3">
                  <Gamepad2 className="w-8 h-8 text-emerald-500 mx-auto" />
                  <p className="font-semibold text-foreground">
                    No scores yet — be the first!
                  </p>
                  <p className="text-sm text-muted-foreground">
                    The first score on the board is guaranteed top 10.
                  </p>
                  <Button
                    onClick={() => openArcade({ gameId: "green-round" })}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white"
                  >
                    ⛳ Play now
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-1.5">
                {mainBoard.scores.map((entry) => {
                  const isFirst = entry.rank === 1;
                  return (
                    <div
                      key={`${entry.rank}-${entry.initials}`}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                        isFirst
                          ? "bg-amber-500/10 border border-amber-500/30"
                          : "bg-card/50 hover:bg-secondary/30"
                      }`}
                    >
                      <RankBadge rank={entry.rank} />
                      <div className="flex-1 min-w-0">
                        <span className="font-semibold text-foreground text-sm">
                          {entry.initials}
                        </span>
                        {entry.company && (
                          <span className="text-xs text-muted-foreground ml-2">
                            · {entry.company}
                          </span>
                        )}
                      </div>
                      <span
                        className={`text-sm font-bold tabular-nums ${
                          isFirst ? "text-amber-400" : "text-emerald-500"
                        }`}
                      >
                        {entry.score.toLocaleString()} pts
                      </span>
                      {isFirst && (
                        <Star className="w-4 h-4 text-amber-400 shrink-0" />
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {leader && (
              <div className="mt-6 text-center">
                <Button
                  onClick={() => openArcade({ gameId: "green-round", reason: "beat-leader" })}
                  variant="outline"
                  className="border-emerald-600 text-emerald-500 hover:bg-emerald-600 hover:text-white"
                >
                  Can you beat {leader.initials} ({leader.score.toLocaleString()} pts)?
                </Button>
              </div>
            )}
          </div>
        </section>

        {/* Other games mini-boards */}
        <section className="py-10 bg-secondary/10">
          <div className="container max-w-4xl mx-auto px-4">
            <div className="flex items-center gap-2 mb-6">
              <Gamepad2 className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-bold text-foreground">
                Other Games — Top 5
              </h2>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {SIDE_GAMES.map((gid) => (
                <MiniBoard key={gid} gameId={gid} limit={5} />
              ))}
            </div>
            <div className="mt-8 text-center">
              <Button
                onClick={() => openArcade({ reason: "arcade-page-bottom" })}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                🕹️ Open the Arcade
              </Button>
              <p className="mt-2 text-xs text-muted-foreground">
                Games auto-unlock after sourcing activity.{" "}
                <Link href="/get-started" className="text-primary hover:underline">
                  Get started for free →
                </Link>
              </p>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
