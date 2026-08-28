import { quoteProducerPurchase, type PurchaseQuantity } from "../../economy/costs.js";
import { producerPurchaseCellProductionBenefit } from "../../economy/production.js";
import { STAGE_ONE_PRODUCERS } from "../../economy/producers.js";
import type { GameState } from "../../types/state.js";
import type { VisibleAction } from "./contracts.js";
import { dto, envelope, visibleAction } from "./builders.js";

/** Catalog-ordered direct division and producer-purchase candidates. */
export function buildProducerCandidates(state: GameState): readonly VisibleAction[] {
  const env = envelope(state);
  const quantities: readonly PurchaseQuantity[] = [1, 10, 100, "max"];
  return [
    visibleAction("divide", { type: "click-divide", atMs: env.atMs }, "Divide one visible cell."),
    ...STAGE_ONE_PRODUCERS.flatMap((producer) =>
      quantities.flatMap((quantity) => {
        const quote = quoteProducerPurchase(state, producer.id, quantity);
        if (!quote.affordable) return [];
        return [
          visibleAction(
            "producer",
            {
              type: "purchase-producer",
              producerId: producer.id,
              quantity,
              execution: "manual",
              atMs: env.atMs,
            },
            `Purchase ${producer.displayName}.`,
            ["producer", producer.id],
            { resource: "cells", value: dto(quote.debit) },
            {
              metric: "cells-per-second",
              value: dto(producerPurchaseCellProductionBenefit(state, producer.id, quote.quantity)),
            },
          ),
        ];
      }),
    ),
  ];
}
