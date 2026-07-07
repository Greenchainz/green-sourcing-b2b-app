import GolfGame from "./GolfGame";
import { createRoundState } from "./golfEngine";
import type { ArcadeGameProps } from "./types";

/**
 * The Round — GreenChainz's daily main show.
 *
 * One long championship hole, tee to cup: stroke 1 is a real drive (grip it and
 * rip it down the fairway), then an approach and a breaking putt to the pin.
 * Sink it and the round is over — that is your card for the leaderboard.
 *
 * It is a thin skin over the shared {@link GolfGame} renderer + golf engine:
 * only the single-hole state factory and the gold accent differ, so there is
 * zero new physics to maintain and Green Approach / Long Drive stay untouched.
 */
export default function TheRoundGame(props: ArcadeGameProps) {
  return <GolfGame {...props} stateFactory={createRoundState} accent="#FFCC33" />;
}
