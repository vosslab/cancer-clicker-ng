import { For } from "solid-js";
import type { JSX } from "solid-js";

import { formatBigNum } from "../bignum/format.js";
import { quoteProducerPurchase } from "../economy/costs.js";
import { STAGE_ONE_PRODUCERS } from "../economy/producers.js";
import type { PurchaseQuantity } from "../economy/costs.js";
import type { ProducerDefinition } from "../economy/producers.js";
import type { ProducerId } from "../types/ids.js";
import type { GameState } from "../types/state.js";

type ProducersPanelProps = Readonly<{
  game: GameState;
  onPurchase: (id: ProducerId, quantity: PurchaseQuantity) => void;
  disabled?: boolean;
  reverse?: boolean;
}>;

const PURCHASE_QUANTITIES = [1, 10, 100, "max"] as const satisfies readonly PurchaseQuantity[];

function levelFor(game: GameState, id: ProducerId): number {
  const level = game.producerLevels.find((candidate) => candidate.id === id);
  if (!level) throw new Error("Producer level is missing from the canonical inventory.");
  return level.level;
}

export function ProducersPanel(props: ProducersPanelProps): JSX.Element {
  function rows(): readonly ProducerDefinition[] {
    const result = props.reverse ? [...STAGE_ONE_PRODUCERS].reverse() : STAGE_ONE_PRODUCERS;
    return result;
  }
  return (
    <section class="panel producers-panel" aria-labelledby="producers-title">
      <div class="section-heading">
        <div>
          <p class="eyebrow">Autonomous machinery</p>
          <h2 id="producers-title">Division apparatus</h2>
        </div>
        <p class="section-note">Each purchase buys a molecular shortcut.</p>
      </div>
      <ul id="producer-list" class="producer-list">
        <For each={rows()}>
          {(producer): JSX.Element => {
            const quote = (): ReturnType<typeof quoteProducerPurchase> =>
              quoteProducerPurchase(props.game, producer.id, 1);
            return (
              <li class="producer-row" data-producer-id={producer.id}>
                <div class="producer-copy">
                  <h3>{producer.displayName}</h3>
                  <p>
                    Level {levelFor(props.game, producer.id)} · +
                    {formatBigNum(producer.baseCellRate, props.game.numberFormat, 2)} cells/s
                  </p>
                </div>
                <div
                  class="purchase-controls"
                  role="group"
                  aria-label={`${producer.displayName} purchase options`}
                >
                  <For each={PURCHASE_QUANTITIES}>
                    {(quantity): JSX.Element => {
                      const currentQuote = (): ReturnType<typeof quoteProducerPurchase> =>
                        quoteProducerPurchase(props.game, producer.id, quantity);
                      return (
                        <button
                          type="button"
                          data-buy-quantity={quantity}
                          disabled={props.disabled || !currentQuote().affordable}
                          onClick={() => props.onPurchase(producer.id, quantity)}
                        >
                          Buy {quantity === "max" ? "max" : quantity}
                        </button>
                      );
                    }}
                  </For>
                  <span class="cost-note">
                    1 costs {formatBigNum(quote().debit, props.game.numberFormat, 2)}
                  </span>
                </div>
              </li>
            );
          }}
        </For>
      </ul>
    </section>
  );
}
