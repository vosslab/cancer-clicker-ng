import type { HallmarkId } from "./ids.js";
import type { GameState } from "./state.js";

export type HallmarkEffectContext = Readonly<{
  state: GameState;
  level: number;
  appliedAtMs: number;
}>;

/** Data-driven hallmark behavior. The catalog owns the data; handlers own effects. */
export interface HallmarkEffect {
  readonly hallmarkId: HallmarkId;
  apply(context: HallmarkEffectContext): GameState;
}
