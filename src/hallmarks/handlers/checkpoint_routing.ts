import { coreSixHallmarkDefinition, hasReachedCoreSixUnlock } from "../core_six_catalog.js";
import type { CoreSixHandler, SelectCheckpointOperation } from "../core_six_types.js";
import type { CheckpointId, GameState } from "../../types/state.js";

type CheckpointPressureTradeoff = Readonly<{
  checkpoint: CheckpointId;
  pressureKey: "contactPressure" | "nutrientPressure" | "damagePressure";
  pressureIncrease: number;
}>;

const CHECKPOINT_ORDER: readonly CheckpointId[] = [
  "contact-inhibition",
  "nutrient-arrest",
  "damage-arrest",
];

/**
 * Each bypass opens a different constrained lane and carries its biologically named pressure.
 * These bounded first-pass values are deliberately visible state, not a hidden rate multiplier.
 */
const CHECKPOINT_PRESSURE_TRADEOFFS: Readonly<Record<CheckpointId, CheckpointPressureTradeoff>> = {
  "contact-inhibition": {
    checkpoint: "contact-inhibition",
    pressureKey: "contactPressure",
    pressureIncrease: 1,
  },
  "nutrient-arrest": {
    checkpoint: "nutrient-arrest",
    pressureKey: "nutrientPressure",
    pressureIncrease: 2,
  },
  "damage-arrest": {
    checkpoint: "damage-arrest",
    pressureKey: "damagePressure",
    pressureIncrease: 3,
  },
};

function isCheckpointId(value: string): value is CheckpointId {
  return CHECKPOINT_ORDER.includes(value as CheckpointId);
}

function isSafePressure(value: number): boolean {
  return Number.isSafeInteger(value) && value >= 0;
}

function assertOperationalOwnership(state: GameState): void {
  const definition = coreSixHallmarkDefinition("growth_suppressor_evasion");
  const ownership = state.hallmarkLevels.find((level) => level.id === definition.id);
  if (!ownership || ownership.level < definition.ownership.requiredLevel) {
    throw new Error("Growth-suppressor evasion is not owned.");
  }
  if (!hasReachedCoreSixUnlock(state.currentStage, definition.key)) {
    throw new Error("Checkpoint routing is locked before the microcolony stage.");
  }
}

function assertAvailableBoardSlot(state: GameState, checkpoint: CheckpointId): void {
  if (state.bypassedCheckpoints.some((value) => !isCheckpointId(value))) {
    throw new Error("Checkpoint board state is invalid.");
  }
  if (state.bypassedCheckpoints.includes(checkpoint)) {
    throw new Error("Checkpoint is already bypassed.");
  }
  if (state.bypassedCheckpoints.length >= 1) {
    throw new Error("Only one checkpoint board slot is available per stage.");
  }
}

function assertPressureCanIncrease(state: GameState, tradeoff: CheckpointPressureTradeoff): void {
  const pressure = state[tradeoff.pressureKey];
  if (!isSafePressure(pressure) || pressure > Number.MAX_SAFE_INTEGER - tradeoff.pressureIncrease) {
    throw new Error("Checkpoint pressure cannot increase safely.");
  }
}

/** Returns the named pressure cost for a closed checkpoint board option. */
export function checkpointPressureTradeoff(checkpoint: CheckpointId): CheckpointPressureTradeoff {
  return CHECKPOINT_PRESSURE_TRADEOFFS[checkpoint];
}

/**
 * Rank still-open lanes by their resulting named pressure. Ties retain the board's fixed order,
 * so a pressure change can visibly change a later choice without inventing a generic multiplier.
 */
export function checkpointRoutingDecisionOrder(state: GameState): readonly CheckpointId[] {
  return CHECKPOINT_ORDER.filter(
    (checkpoint) => !state.bypassedCheckpoints.includes(checkpoint),
  ).sort((left, right) => {
    const leftTradeoff = checkpointPressureTradeoff(left);
    const rightTradeoff = checkpointPressureTradeoff(right);
    const leftResult = state[leftTradeoff.pressureKey] + leftTradeoff.pressureIncrease;
    const rightResult = state[rightTradeoff.pressureKey] + rightTradeoff.pressureIncrease;
    return (
      leftResult - rightResult || CHECKPOINT_ORDER.indexOf(left) - CHECKPOINT_ORDER.indexOf(right)
    );
  });
}

function applyCheckpointRouting(
  context: Parameters<CoreSixHandler<SelectCheckpointOperation>["apply"]>[0],
): GameState {
  const { state, operation } = context;
  if (operation.hallmark !== "growth_suppressor_evasion") {
    throw new Error("Checkpoint routing operation has the wrong hallmark.");
  }
  if (!isCheckpointId(operation.checkpoint)) throw new Error("Checkpoint is invalid.");
  assertOperationalOwnership(state);
  assertAvailableBoardSlot(state, operation.checkpoint);
  const tradeoff = checkpointPressureTradeoff(operation.checkpoint);
  assertPressureCanIncrease(state, tradeoff);
  return {
    ...state,
    bypassedCheckpoints: [...state.bypassedCheckpoints, operation.checkpoint],
    [tradeoff.pressureKey]: state[tradeoff.pressureKey] + tradeoff.pressureIncrease,
  };
}

/** Pure core-six checkpoint-board projection. The sole reducer remains responsible for event sequence. */
export const CHECKPOINT_ROUTING_HANDLER: CoreSixHandler<SelectCheckpointOperation> = {
  hallmark: "growth_suppressor_evasion",
  apply: applyCheckpointRouting,
};
