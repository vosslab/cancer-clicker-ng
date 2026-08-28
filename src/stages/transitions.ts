import type { GameState } from "../types/state.js";
import type { StageId } from "../types/ids.js";
import { isImmediateStageTransition } from "../state/catalog.js";
import { stageGateResult } from "./gates.js";
import type { StageTransitionProjection } from "./stage_types.js";

function natural(value: number): boolean {
  return Number.isSafeInteger(value) && value >= 0;
}

/** Validates a recorded player transition and projects only stage-observation state changes. */
export function assertStageTransition(
  state: GameState,
  fromStageId: StageId,
  toStageId: StageId,
  atMs: number,
): StageTransitionProjection {
  if (
    state.currentStage !== fromStageId ||
    !natural(atMs) ||
    atMs < state.activeTimeMs ||
    !isImmediateStageTransition(fromStageId, toStageId) ||
    !stageGateResult(state, toStageId).eligible
  )
    throw new Error("Stage transition is invalid.");
  return {
    currentStage: toStageId,
    activeTimeMs: atMs,
    stageStartedAtMs: atMs,
    stageProgress: 0,
    stageGateProgress: {},
    lastStageTransition: { from: fromStageId, to: toStageId, atMs },
  };
}
