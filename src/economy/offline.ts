import type { OfflineElapsed, OfflineReplayResult } from "../state/offline.js";
import type { GameState } from "../types/state.js";
import { recordEvent } from "../state/events.js";
import { replayOffline } from "../state/offline.js";
import { applyEconomyTick } from "./tick.js";

/** The sole normal economy offline path shares the live production adapter. */
export function replayEconomyOffline(
  state: GameState,
  elapsed: OfflineElapsed,
): OfflineReplayResult {
  return replayOffline(state, elapsed, applyEconomyTick, recordEvent);
}
