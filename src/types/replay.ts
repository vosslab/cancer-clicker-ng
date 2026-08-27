import type { GameEvent } from "./events.js";

export type ReplayEntry = Readonly<{
  offsetMs: number;
  event: GameEvent;
}>;

/** A deterministic event stream; seed-owned randomness is replayable. */
export type ReplayLog = Readonly<{
  seed: number;
  startedAtMs: number;
  entries: readonly ReplayEntry[];
}>;
