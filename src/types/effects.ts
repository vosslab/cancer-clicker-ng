import type { HallmarkId } from "./ids.js";
import type { GameState } from "./state.js";
import type { CoreSixOperation } from "../hallmarks/core_six_types.js";

/** core-six activation: trusted parsed operation plus readonly state enters one pure hallmark handler. */
export type HallmarkEffectContext<Operation extends CoreSixOperation = CoreSixOperation> =
  Readonly<{
    state: GameState;
    operation: Operation;
    appliedAtMs: number;
  }>;

/** Data-driven hallmark behavior. The catalog owns the data; handlers own effects. */
export interface HallmarkEffect<Operation extends CoreSixOperation = CoreSixOperation> {
  readonly hallmarkId: HallmarkId;
  apply(context: HallmarkEffectContext<Operation>): GameState;
}
