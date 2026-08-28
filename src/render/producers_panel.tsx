import { For, Show, createSignal } from "solid-js";
import type { JSX } from "solid-js";

import { formatBigNum } from "../bignum/format.js";
import { quoteProducerPurchase } from "../economy/costs.js";
import { producerCellProductionRate } from "../economy/production.js";
import { STAGE_ONE_PRODUCERS } from "../economy/producers.js";
import { stageDefinition, stageDefinitionsInOrder } from "../stages/catalog.js";
import { passageUpgradeId } from "../brands.js";
import { hasPassageUpgrade } from "../prestige/culture.js";
import type { PurchaseQuantity } from "../economy/costs.js";
import type { ProducerDefinition } from "../economy/producers.js";
import type { ProducerId } from "../types/ids.js";
import type { GameState } from "../types/state.js";

type ProducersPanelProps = Readonly<{
  game: GameState;
  onPurchase: (id: ProducerId, quantity: PurchaseQuantity) => void;
  onQueueAssay?: (id: ProducerId) => void;
  disabled?: boolean;
  reverse?: boolean;
}>;

const PURCHASE_QUANTITIES = [1, 10, 100, "max"] as const satisfies readonly PurchaseQuantity[];

function levelFor(game: GameState, id: ProducerId): number {
  const level = game.producerLevels.find((candidate) => candidate.id === id);
  if (!level) throw new Error("Producer level is missing from the canonical inventory.");
  return level.level;
}

function isProducerUnlocked(game: GameState, producer: ProducerDefinition): boolean {
  const stages = stageDefinitionsInOrder();
  const currentIndex = stages.findIndex((stage) => stage.id === game.currentStage);
  const unlockIndex = stages.findIndex((stage) => stage.id === producer.unlockStage);
  if (currentIndex < 0 || unlockIndex < 0) throw new Error("Producer stage reference is invalid.");
  return currentIndex >= unlockIndex;
}

function quantityLabel(quantity: PurchaseQuantity): string {
  return quantity === "max" ? "Max" : `${quantity}`;
}

function producerLabel(id: ProducerId): string {
  const producer = STAGE_ONE_PRODUCERS.find((candidate) => candidate.id === id);
  if (!producer) throw new Error("Queued assay producer is missing from the catalog.");
  return producer.displayName;
}

/** Persistent upgrade rail: the selected buy mode applies to every visible producer. */
export function ProducersPanel(props: ProducersPanelProps): JSX.Element {
  const [quantity, setQuantity] = createSignal<PurchaseQuantity>(1);

  function rows(): readonly ProducerDefinition[] {
    return props.reverse ? [...STAGE_ONE_PRODUCERS].reverse() : STAGE_ONE_PRODUCERS;
  }
  const assayDiscipline = (): boolean =>
    hasPassageUpgrade(props.game.culture, passageUpgradeId("assay_discipline"));
  const queuedAssay = (): GameState["culture"]["queuedProducerAction"] =>
    props.game.culture.queuedProducerAction;

  return (
    <section class="panel producers-panel" aria-labelledby="producers-title">
      <div class="section-heading">
        <div>
          <p class="eyebrow">Autonomous machinery</p>
          <h2 id="producers-title">Division apparatus</h2>
        </div>
        <p class="section-note">Choose a buy mode, then build the molecular system.</p>
      </div>
      <div class="producer-quantity" role="group" aria-label="Producer purchase quantity">
        <For each={PURCHASE_QUANTITIES}>
          {(candidate) => (
            <button
              class="producer-quantity__option"
              classList={{ "is-selected": quantity() === candidate }}
              type="button"
              aria-pressed={quantity() === candidate}
              disabled={props.disabled}
              onClick={() => setQuantity(candidate)}
            >
              {quantityLabel(candidate)}
            </button>
          )}
        </For>
      </div>
      <ul id="producer-list" class="producer-list">
        <For each={rows()}>
          {(producer): JSX.Element => {
            const unlocked = (): boolean => isProducerUnlocked(props.game, producer);
            const selectedQuote = (): ReturnType<typeof quoteProducerPurchase> =>
              quoteProducerPurchase(props.game, producer.id, quantity());
            const contribution = (): string =>
              formatBigNum(
                producerCellProductionRate(props.game, producer.id),
                props.game.numberFormat,
                2,
              );
            const unlockStage = (): string => stageDefinition(producer.unlockStage).title;
            const assayLabel = (): string => {
              const queued = queuedAssay();
              if (!queued) return "Queue assay purchase";
              return queued.producerId === producer.id
                ? "Queued assay purchase"
                : `Replace assay target with ${producer.displayName}`;
            };
            const assayAriaLabel = (): string => {
              const queued = queuedAssay();
              if (!queued) return `Queue ${producer.displayName} as the assay purchase target`;
              const prior = producerLabel(queued.producerId);
              return `Replace assay target from ${prior} to ${producer.displayName}`;
            };
            return (
              <li
                class="producer-row"
                classList={{
                  "is-locked": !unlocked(),
                  "is-affordable": selectedQuote().affordable,
                }}
                data-producer-id={producer.id}
              >
                <div class="producer-row__summary">
                  <h3>{producer.displayName}</h3>
                  <p>
                    Owned level {levelFor(props.game, producer.id)} · {contribution()} cells/s
                  </p>
                  <p class="producer-row__details" tabindex="0">
                    Current contribution uses the active stage and hallmark modifiers. Base rate: +
                    {formatBigNum(producer.baseCellRate, props.game.numberFormat, 2)} cells/s per
                    level.
                  </p>
                  {!unlocked() && (
                    <p class="producer-row__unlock">Biological unlock: reach {unlockStage()}.</p>
                  )}
                </div>
                <div
                  class="purchase-controls"
                  role="group"
                  aria-label={`${producer.displayName} purchase`}
                >
                  <button
                    type="button"
                    data-buy-quantity={quantity()}
                    disabled={props.disabled || !unlocked() || !selectedQuote().affordable}
                    onClick={() => props.onPurchase(producer.id, quantity())}
                  >
                    Buy {quantityLabel(quantity())}
                  </button>
                  <Show when={assayDiscipline()}>
                    <button
                      type="button"
                      aria-label={assayAriaLabel()}
                      data-assay-queue-target={producer.id}
                      disabled={
                        props.disabled ||
                        !unlocked() ||
                        !quoteProducerPurchase(props.game, producer.id, 1).affordable
                      }
                      onClick={() => props.onQueueAssay?.(producer.id)}
                    >
                      {assayLabel()}
                    </button>
                  </Show>
                  <span class="cost-note">
                    Next {quantityLabel(quantity())} cost:{" "}
                    {formatBigNum(selectedQuote().debit, props.game.numberFormat, 2)}
                    {selectedQuote().affordable && unlocked() ? " · affordable" : " · unavailable"}
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
