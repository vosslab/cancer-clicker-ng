import type { ProducerId } from "../types/ids.js";
import type { GameState } from "../types/state.js";

/** Reads the required complete producer inventory without allowing silent UI fallbacks. */
export function producerLevelFor(game: GameState, id: ProducerId): number {
  const level = game.producerLevels.find((candidate) => candidate.id === id);
  if (!level) throw new Error("Producer level is missing from the canonical inventory.");
  return level.level;
}
