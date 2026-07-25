import type { ComponentType } from "react";

/**
 * Shared contracts for the GreenChainz Arcade.
 *
 * Every game is a self-contained React component that implements
 * {@link ArcadeGameProps}. The overlay hosts any game uniformly, so adding a
 * new classic later is a single-file drop-in registered in `registry.ts`.
 */
export interface ArcadeGameProps {
  /** When true the game should freeze (overlay covered, tab hidden, etc.). */
  paused: boolean;
  /** Optional live score updates for the HUD. */
  onScore?: (score: number) => void;
  /** Fired once when the run ends. The final score drives the high-score flow. */
  onGameOver: (finalScore: number) => void;
}

export interface ArcadeGameMeta {
  /** Stable id — also the localStorage high-score key. */
  id: string;
  /** GreenChainz-branded name, e.g. "Supply Snake". */
  name: string;
  /** The arcade classic it riffs on, e.g. "Snake". */
  classic: string;
  /** One-line pitch shown on the picker card. */
  tagline: string;
  /** Accent colour (hex) for the card + in-game chrome. */
  accent: string;
  /** The playable component. */
  Component: ComponentType<ArcadeGameProps>;
}
