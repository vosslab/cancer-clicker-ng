import { multiplyByNumber, sum, zero } from "../bignum/bignum.js";
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
    extendedHallmarkRate;
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

/** The authoritative total cell-production rate in cells per second. */
export function cellProductionRate(state: GameState): BigNum {
  const rates = producerCellProductionRates(state).map((producer) => producer.cellsPerSecond);
  return sum(rates);
}
