import { multiplyByNumber, subtract, sum, zero } from "../bignum/bignum.js";
import type { BigNum } from "../types/bignum.js";
import type { ProducerId } from "../types/ids.js";
import type { GameState, ProducerLevel } from "../types/state.js";
import { atpAccelerationEconomyModifier } from "../hallmarks/atp_allocation.js";
import { composeEconomyModifiers, hallmarkEconomyModifier } from "../hallmarks/economy_effects.js";
import {
  extendedHallmarkRegionalProducerModifier,
  mutationDraftProducerModifier,
} from "../hallmarks/extended_hallmark_effects.js";
import { replicativeCapacityExhausted } from "../hallmarks/elapsed_effects.js";
import { lateHallmarkProductionMultiplier } from "../hallmarks/late_hallmark_effects.js";
import { stageEconomyModifier } from "../stages/effects.js";
import {
  assertCanonicalProducerLevels,
  producerDefinition,
  STAGE_ONE_PRODUCERS,
  type ProducerDefinition,
} from "./producers.js";

/** The current simulation contribution of one producer to cells per second. */
export type ProducerCellProduction = Readonly<{
  producerId: ProducerId;
  cellsPerSecond: BigNum;
}>;

function producerCellProduction(
  state: GameState,
  producer: ProducerDefinition,
  level: ProducerLevel,
): BigNum {
  const economyModifier = composeEconomyModifiers(
    stageEconomyModifier(state, producer.id),
    hallmarkEconomyModifier(state, producer.id),
  );
  const baseRate = multiplyByNumber(producer.baseCellRate, level.level);
  const extendedHallmarkRate =
    extendedHallmarkRegionalProducerModifier(state, producer.id) *
    mutationDraftProducerModifier(state, producer.id).rate;
  const multiplier =
    economyModifier.productionMultiplier *
    atpAccelerationEconomyModifier(state, producer.id).productionMultiplier *
    extendedHallmarkRate *
    lateHallmarkProductionMultiplier(state);
  return multiplyByNumber(baseRate, multiplier);
}

/**
 * Resolves every producer contribution from the same modifiers used by simulation ticks.
 * Exhausted replicative capacity suppresses each contribution, not merely the displayed total.
 */
export function producerCellProductionRates(state: GameState): readonly ProducerCellProduction[] {
  const levels = assertCanonicalProducerLevels(state.producerLevels);
  if (replicativeCapacityExhausted(state)) {
    return STAGE_ONE_PRODUCERS.map((producer) => ({
      producerId: producer.id,
      cellsPerSecond: zero(),
    }));
  }
  return STAGE_ONE_PRODUCERS.map((producer, index) => {
    const level = levels[index];
    if (!level) throw new Error("Producer levels are invalid.");
    const cellsPerSecond = producerCellProduction(state, producer, level);
    return { producerId: producer.id, cellsPerSecond };
  });
}

/** Resolves one producer's current effective contribution without rendering concerns. */
export function producerCellProductionRate(state: GameState, id: ProducerId): BigNum {
  producerDefinition(id);
  const production = producerCellProductionRates(state).find(
    (candidate) => candidate.producerId === id,
  );
  if (!production) throw new Error("Producer production is invalid.");
  return production.cellsPerSecond;
}

/** Quotes a purchase's marginal rate through the same modifier path as simulation ticks. */
export function producerPurchaseCellProductionBenefit(
  state: GameState,
  id: ProducerId,
  quantity: number,
): BigNum {
  if (!Number.isSafeInteger(quantity) || quantity <= 0)
    throw new Error("Producer purchase quantity is invalid.");
  const producer = producerDefinition(id);
  const level = assertCanonicalProducerLevels(state.producerLevels).find(
    (candidate) => candidate.id === id,
  );
  if (!level || level.level > Number.MAX_SAFE_INTEGER - quantity)
    throw new Error("Producer purchase quantity is invalid.");
  const current = producerCellProduction(state, producer, level);
  const purchased = producerCellProduction(state, producer, {
    ...level,
    level: level.level + quantity,
  });
  return subtract(purchased, current);
}

/** The authoritative total cell-production rate in cells per second. */
export function cellProductionRate(state: GameState): BigNum {
  const rates = producerCellProductionRates(state).map((producer) => producer.cellsPerSecond);
  return sum(rates);
}
