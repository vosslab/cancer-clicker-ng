import type { GameState } from "../types/state.js";
import type { ProducerId } from "../types/ids.js";
import { stageDefinition } from "./catalog.js";
import type { StageOperationalChange } from "./stage_types.js";

/** One stage-derived feasibility projection for economy and later hallmark handlers. */
export function stageOperationalChange(state: GameState): StageOperationalChange {
  return stageDefinition(state.currentStage).operationalChange;
}

/** A stable action vocabulary makes each boundary mechanically distinguishable without UI coupling. */
export function feasibleStageActions(state: GameState): readonly string[] {
  const current = stageOperationalChange(state);
  const actions = [`buy:${current.economy.favoredProducerId}`];
  if (current.availability === "available") actions.unshift(current.actionId);
  return actions;
}

/** stage progression's current nonvisual effect: every stage changes real production and one quoted producer cost. */
export function stageEconomyModifier(
  state: GameState,
  producerId: ProducerId,
): Readonly<{ productionMultiplier: number; purchaseCostMultiplier: number }> {
  const economy = stageOperationalChange(state).economy;
  const favored = economy.favoredProducerId === producerId;
  const purchaseCostMultiplier = favored ? economy.favoredProducerCostMultiplier : 1;
  const producerRateMultiplier = favored ? economy.favoredProducerRateMultiplier : 1;
  const productionMultiplier = economy.productionMultiplier * producerRateMultiplier;
  return { productionMultiplier, purchaseCostMultiplier };
}
