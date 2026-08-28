import { compare, multiplyByNumber, subtract, zero } from "../bignum/bignum.js";
import { geometricCost, maxAffordable } from "../bignum/solve.js";
import type { BigNum } from "../types/bignum.js";
import type { ProducerId } from "../types/ids.js";
import type { GameState } from "../types/state.js";
import { assertCanonicalProducerLevels, producerDefinition } from "./producers.js";
import { stageEconomyModifier } from "../stages/effects.js";
import { composeEconomyModifiers, hallmarkEconomyModifier } from "../hallmarks/economy_effects.js";
import { atpAccelerationEconomyModifier } from "../hallmarks/atp_allocation.js";
import {
  mutationDraftProducerModifier,
  extendedHallmarkRegionalProducerModifier,
} from "../hallmarks/extended_hallmark_effects.js";

export type PurchaseQuantity = 1 | 10 | 100 | "max";
export type PurchaseQuote = Readonly<{
  producerId: ProducerId;
  quantity: number;
  debit: BigNum;
  affordable: boolean;
}>;

function natural(value: number): boolean {
  return Number.isSafeInteger(value) && value >= 0;
}
function purchaseRequest(value: unknown): value is PurchaseQuantity {
  return value === "max" || value === 1 || value === 10 || value === 100;
}
function inventory(state: GameState): ReadonlyMap<ProducerId, number> {
  assertCanonicalProducerLevels(state.producerLevels);
  const result = new Map<ProducerId, number>();
  for (const level of state.producerLevels) {
    result.set(level.id, level.level);
  }
  return result;
}

function quoteExactProducerPurchase(
  state: GameState,
  id: ProducerId,
  quantity: number,
): PurchaseQuote {
  const definition = producerDefinition(id);
  const modifier = composeEconomyModifiers(
    stageEconomyModifier(state, id),
    hallmarkEconomyModifier(state, id),
  );
  const owned = inventory(state).get(id);
  if (owned === undefined) throw new Error("Producer state inventory is invalid.");
  const maximum = Number.MAX_SAFE_INTEGER - owned;
  if (!natural(quantity) || quantity > maximum) throw new Error("Producer quantity is invalid.");
  const acceleration = atpAccelerationEconomyModifier(state, id);
  const regional = extendedHallmarkRegionalProducerModifier(state, id);
  const mutation = mutationDraftProducerModifier(state, id);
  const unmodifiedDebit =
    quantity === 0
      ? zero()
      : geometricCost(definition.firstCost, definition.growth, owned, quantity);
  const debit = multiplyByNumber(
    unmodifiedDebit,
    (modifier.purchaseCostMultiplier * acceleration.purchaseCostMultiplier * mutation.cost) /
      regional,
  );
  return { producerId: id, quantity, debit, affordable: compare(debit, state.cells) <= 0 };
}

/** Quote only user-visible bulk options; reducer use stays in the exact numeric helper below. */
export function quoteProducerPurchase(
  state: GameState,
  id: ProducerId,
  quantity: PurchaseQuantity,
): PurchaseQuote {
  if (!purchaseRequest(quantity)) throw new Error("Producer quantity is invalid.");
  if (quantity !== "max") return quoteExactProducerPurchase(state, id, quantity);
  const definition = producerDefinition(id);
  const modifier = composeEconomyModifiers(
    stageEconomyModifier(state, id),
    hallmarkEconomyModifier(state, id),
  );
  const owned = inventory(state).get(id);
  if (owned === undefined) throw new Error("Producer state inventory is invalid.");
  const acceleration = atpAccelerationEconomyModifier(state, id);
  const regional = extendedHallmarkRegionalProducerModifier(state, id);
  const mutation = mutationDraftProducerModifier(state, id);
  const count = maxAffordable(
    state.cells,
    multiplyByNumber(
      definition.firstCost,
      (modifier.purchaseCostMultiplier * acceleration.purchaseCostMultiplier * mutation.cost) /
        regional,
    ),
    definition.growth,
    owned,
    Number.MAX_SAFE_INTEGER - owned,
  );
  const quote = quoteExactProducerPurchase(state, id, count);
  return count === 0 ? { ...quote, affordable: false } : quote;
}

export function applyProducerPurchase(
  state: GameState,
  id: ProducerId,
  request: PurchaseQuantity,
): GameState {
  if (!purchaseRequest(request)) throw new Error("Producer quantity is invalid.");
  const quote = quoteProducerPurchase(state, id, request);
  if (quote.quantity === 0 || !quote.affordable)
    throw new Error("Producer purchase is unaffordable.");
  const quantity = quote.quantity;
  const cells = subtract(state.cells, quote.debit);
  if (compare(cells, zero()) < 0) throw new Error("Producer purchase would create negative cells.");
  const producerLevels = state.producerLevels.map((level) =>
    level.id === id ? { ...level, level: level.level + quantity } : level,
  );
  return { ...state, cells, producerLevels };
}
