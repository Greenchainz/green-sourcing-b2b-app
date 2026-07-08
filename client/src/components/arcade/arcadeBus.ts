/**
 * A tiny window-event bus so any part of the app can open the arcade or drop a
 * dismissible "play while you wait" nudge — without importing arcade internals.
 *
 * Example (after an RFQ is sent):
 *   import { openArcadeNudge } from "@/components/arcade/arcadeBus";
 *   openArcadeNudge({ reason: "rfq-sent" });
 */
export type ArcadeOpenDetail = {
  /** Optionally jump straight into a specific game by id. */
  gameId?: string;
  /** Free-form reason for analytics / copy, e.g. "rfq-sent". */
  reason?: string;
};

const OPEN_EVENT = "greenchainz:arcade:open";
const NUDGE_EVENT = "greenchainz:arcade:nudge";

export function openArcade(detail: ArcadeOpenDetail = {}): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<ArcadeOpenDetail>(OPEN_EVENT, { detail }));
}

export function onOpenArcade(
  handler: (detail: ArcadeOpenDetail) => void,
): () => void {
  if (typeof window === "undefined") return () => {};
  const listener = (e: Event) =>
    handler((e as CustomEvent<ArcadeOpenDetail>).detail ?? {});
  window.addEventListener(OPEN_EVENT, listener);
  return () => window.removeEventListener(OPEN_EVENT, listener);
}

/** Show the non-blocking "beat your high score while you wait" prompt. */
export function openArcadeNudge(detail: ArcadeOpenDetail = {}): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<ArcadeOpenDetail>(NUDGE_EVENT, { detail }));
}

export function onArcadeNudge(
  handler: (detail: ArcadeOpenDetail) => void,
): () => void {
  if (typeof window === "undefined") return () => {};
  const listener = (e: Event) =>
    handler((e as CustomEvent<ArcadeOpenDetail>).detail ?? {});
  window.addEventListener(NUDGE_EVENT, listener);
  return () => window.removeEventListener(NUDGE_EVENT, listener);
}
