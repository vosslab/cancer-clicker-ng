import { For, Show, createSignal } from "solid-js";
import type { JSX } from "solid-js";

import { formatBigNum } from "../bignum/format.js";
import { quoteProducerPurchase } from "../economy/costs.js";
import {
  producerCellProductionRate,
  producerPurchaseCellProductionBenefit,
} from "../economy/production.js";
import { STAGE_ONE_PRODUCERS } from "../economy/producers.js";
import { stageDefinition, stageDefinitionsInOrder } from "../stages/catalog.js";
import { passageUpgradeId } from "../brands.js";
import { hasPassageUpgrade } from "../prestige/culture.js";
import type { PurchaseQuantity } from "../economy/costs.js";
import type { ProducerDefinition } from "../economy/producers.js";
import type { ProducerId } from "../types/ids.js";
import type { GameState } from "../types/state.js";
import { ProducerMachine } from "../svg/producer_machines.js";
import { ActionIcon } from "./action_icon.js";
import { HelpTooltip } from "./action_tooltip.js";
import { formatCellRate } from "./cell_metrics.js";

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
  return quantity === "max" ? "MAX" : `${quantity}`;
}

function producerLabel(id: ProducerId): string {
  const producer = STAGE_ONE_PRODUCERS.find((candidate) => candidate.id === id);
  if (!producer) throw new Error("Queued assay producer is missing from the catalog.");
  return producer.displayName;
}

/** Persistent illustrated upgrade rack: one buy mode applies to every molecular machine. */
export function ProducersPanel(props: ProducersPanelProps): JSX.Element {
  const [quantity, setQuantity] = createSignal<PurchaseQuantity>(1);

  const producerDiscovered = (producer: ProducerDefinition): boolean =>
    isProducerUnlocked(props.game, producer) &&
    (levelFor(props.game, producer.id) > 0 ||
      quoteProducerPurchase(props.game, producer.id, 1).affordable ||
      props.game.culture.queuedProducerAction?.producerId === producer.id);
  function rows(): readonly ProducerDefinition[] {
    if (props.reverse) return [...STAGE_ONE_PRODUCERS].reverse();
    let lastDiscovered = -1;
    STAGE_ONE_PRODUCERS.forEach((producer, index) => {
      if (producerDiscovered(producer)) lastDiscovered = index;
    });
    return STAGE_ONE_PRODUCERS.slice(0, Math.min(STAGE_ONE_PRODUCERS.length, lastDiscovered + 3));
  }
  const assayDiscipline = (): boolean =>
    hasPassageUpgrade(props.game.culture, passageUpgradeId("assay_discipline"));
  const queuedAssay = (): GameState["culture"]["queuedProducerAction"] =>
    props.game.culture.queuedProducerAction;

  return (
    <section class="panel producers-panel" aria-labelledby="producers-title" tabIndex={0}>
      <div class="section-heading">
        <div>
          <p class="eyebrow">Autonomous machinery</p>
          <h2 id="producers-title">Upgrade rack</h2>
        </div>
        <p class="section-note">Choose a buy mode, then build the molecular system.</p>
      </div>
      <div class="producer-quantity" role="group" aria-label="Producer purchase quantity">
        <For each={PURCHASE_QUANTITIES}>
          {(candidate) => (
            <HelpTooltip tooltip={`Buy ${quantityLabel(candidate)} machines`} placement="below">
              {(tooltipBindings) => (
                <button
                  {...tooltipBindings}
                  class="producer-quantity__option"
                  classList={{ "is-selected": quantity() === candidate }}
                  type="button"
                  aria-pressed={quantity() === candidate}
                  disabled={props.disabled}
                  onClick={() => setQuantity(candidate)}
                  aria-label={`Buy ${quantityLabel(candidate)} machines`}
                  title={`Buy ${quantityLabel(candidate)} machines`}
                >
                  <ActionIcon name="buy" />
                  <span aria-hidden="true">{quantityLabel(candidate)}</span>
                </button>
              )}
            </HelpTooltip>
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
              formatCellRate(
                producerCellProductionRate(props.game, producer.id),
                props.game.numberFormat,
              );
            const marginalBenefit = (): string => {
              const quote = selectedQuote();
              return formatCellRate(
                producerPurchaseCellProductionBenefit(props.game, producer.id, quote.quantity),
                props.game.numberFormat,
              );
            };
            const unlockStage = (): string => stageDefinition(producer.unlockStage).title;
            const available = (): boolean => unlocked() && selectedQuote().affordable;
            const discovered = (): boolean => producerDiscovered(producer);
            const purchaseTooltip = (): string => {
              const quote = selectedQuote();
              const owned = levelFor(props.game, producer.id);
              const economics = `${producer.displayName}. Owned ${owned}. Produces ${contribution()}. Buy ${quantityLabel(quantity())} for ${formatBigNum(quote.debit, props.game.numberFormat, 2)} cells; adds ${marginalBenefit()}.`;
              if (!unlocked()) return `${economics} Unlock at ${unlockStage()}.`;
              return `${economics} ${quote.affordable ? "Affordable now." : "More cells required."}`;
            };
            const assayLabel = (): string => {
              const queued = queuedAssay();
              if (!queued) return "Prime next purchase";
              return queued.producerId === producer.id
                ? "Primed next purchase"
                : `Prime ${producer.displayName} instead`;
            };
            const assayAriaLabel = (): string => {
              const queued = queuedAssay();
              if (!queued) return `Prime ${producer.displayName} as the next purchase`;
              const prior = producerLabel(queued.producerId);
              return `Replace primed purchase from ${prior} to ${producer.displayName}`;
            };
            return (
              <li
                class="producer-row"
                classList={{
                  "is-locked": !unlocked(),
                  "is-affordable": available(),
                  "is-unaffordable": !available(),
                }}
                data-producer-id={producer.id}
                data-affordable={available() ? "true" : "false"}
              >
                <Show
                  when={discovered()}
                  fallback={
                    <div class="producer-row__undiscovered">
                      <span class="producer-row__unknown-art" aria-hidden="true">
                        ?
                      </span>
                      <span>
                        <strong>Undiscovered target</strong>
                        <small>Accumulate cells to identify</small>
                      </span>
                    </div>
                  }
                >
                  <HelpTooltip
                    tooltip={purchaseTooltip()}
                    disabled={!available() || props.disabled === true}
                    disabledLabel={purchaseTooltip()}
                    placement="left"
                  >
                    {(tooltipBindings) => (
                      <button
                        {...tooltipBindings}
                        class="producer-row__buy"
                        type="button"
                        data-buy-quantity={quantity()}
                        disabled={props.disabled || !unlocked() || !selectedQuote().affordable}
                        onClick={() => props.onPurchase(producer.id, quantity())}
                        aria-label={`Buy ${quantityLabel(quantity())} ${producer.displayName} machine${quantity() === 1 ? "" : "s"} for ${formatBigNum(selectedQuote().debit, props.game.numberFormat, 2)} cells`}
                      >
                        <span class="producer-row__art" aria-hidden="true">
                          <ProducerMachine
                            id={producer.id}
                            level={levelFor(props.game, producer.id)}
                          />
                        </span>
                        <span class="producer-row__summary">
                          <span class="producer-row__name">{producer.displayName}</span>
                          <span class="producer-row__identity">
                            <span
                              class="producer-row__rank"
                              aria-label={`Owned level ${levelFor(props.game, producer.id)}`}
                            >
                              <span aria-hidden="true">Owned </span>
                              <strong>{levelFor(props.game, producer.id)}</strong>
                              <span class="sr-only">
                                Owned level {levelFor(props.game, producer.id)}
                              </span>
                            </span>
                            <span class="producer-row__rate">
                              <span>Output </span>
                              <strong>
                                {formatCellRate(
                                  producerCellProductionRate(props.game, producer.id),
                                  props.game.numberFormat,
                                )}
                              </strong>
                            </span>
                          </span>
                        </span>
                        <span
                          class="producer-row__cost cost-note"
                          classList={{ "is-unavailable": !selectedQuote().affordable }}
                        >
                          <span class="producer-row__buy-label">
                            Buy {quantityLabel(quantity())}
                          </span>
                          <span class="producer-row__cost-value">
                            <span>Cost </span>
                            <strong>
                              {formatBigNum(selectedQuote().debit, props.game.numberFormat, 2)}{" "}
                              cells
                            </strong>
                          </span>
                          <span class="producer-row__benefit">
                            <span>Adds </span>
                            <strong>
                              {formatCellRate(
                                producerPurchaseCellProductionBenefit(
                                  props.game,
                                  producer.id,
                                  selectedQuote().quantity,
                                ),
                                props.game.numberFormat,
                              )}
                            </strong>
                          </span>
                          <span class="sr-only">
                            {selectedQuote().affordable ? "; affordable" : "; unavailable"}
                          </span>
                        </span>
                      </button>
                    )}
                  </HelpTooltip>
                </Show>
                <Show when={discovered() && assayDiscipline()}>
                  <HelpTooltip tooltip={assayLabel()}>
                    {(tooltipBindings) => (
                      <button
                        {...tooltipBindings}
                        type="button"
                        aria-label={assayAriaLabel()}
                        data-assay-queue-target={producer.id}
                        disabled={
                          props.disabled ||
                          !unlocked() ||
                          !quoteProducerPurchase(props.game, producer.id, 1).affordable
                        }
                        onClick={() => props.onQueueAssay?.(producer.id)}
                        class="producer-row__assay"
                      >
                        <ActionIcon name="assay" />
                        <span class="sr-only">{assayLabel()}</span>
                      </button>
                    )}
                  </HelpTooltip>
                </Show>
              </li>
            );
          }}
        </For>
      </ul>
    </section>
  );
}
