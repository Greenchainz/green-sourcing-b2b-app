import type { ArcadeGameMeta } from "./types";
import BreakoutGame from "./BreakoutGame";
import SnakeGame from "./SnakeGame";
import TriviaGame from "./TriviaGame";
import GolfGame from "./GolfGame";
import DriveGame from "./DriveGame";
import TheRoundGame from "./TheRoundGame";

/**
 * The GreenChainz Arcade line-up.
 *
 * Adding a new classic is a single-file drop-in: build a component that
 * implements {@link ArcadeGameProps}, then add one entry here. The overlay,
 * high-score boards and picker all pick it up automatically.
 *
 * Phase-2 seams kept intentionally open: golf ("get on the green") is the
 * top candidate next, then a boxing riff. Original content only — never
 * copyrighted characters or level layouts.
 */
export const ARCADE_GAMES: ArcadeGameMeta[] = [
  {
    id: "green-round",
    name: "The Round",
    classic: "Golf",
    tagline: "One hole, tee to cup. Bomb the drive, read the break, sink your card.",
    accent: "#FFCC33",
    Component: TheRoundGame,
  },
  {
    id: "spec-breaker",
    name: "Spec Breaker",
    classic: "Breakout",
    tagline: "Smash through the spec, brick by brick.",
    accent: "#9FE870",
    Component: BreakoutGame,
  },
  {
    id: "supply-snake",
    name: "Supply Snake",
    classic: "Snake",
    tagline: "Grow your supply chain — don't tie yourself in knots.",
    accent: "#43C6AC",
    Component: SnakeGame,
  },
  {
    id: "green-iq",
    name: "Green IQ",
    classic: "Trivia",
    tagline: "How well do you really know sustainable materials?",
    accent: "#FFC24B",
    Component: TriviaGame,
  },
  {
    id: "green-approach",
    name: "Green Approach",
    classic: "Golf",
    tagline: "Read the break, bank the birdie — get on the green.",
    accent: "#EC6A5E",
    Component: GolfGame,
  },
  {
    id: "green-drive",
    name: "Long Drive",
    classic: "Golf",
    tagline: "Two taps, one bomb — grip it and rip it down the range.",
    accent: "#FFCC33",
    Component: DriveGame,
  },
];

export function getGameById(id: string): ArcadeGameMeta | undefined {
  return ARCADE_GAMES.find((g) => g.id === id);
}
