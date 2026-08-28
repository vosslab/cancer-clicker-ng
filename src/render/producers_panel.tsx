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
  const [expandedProducerIds, setExpandedProducerIds] = createSignal<ReadonlySet<ProducerId>>(
    new Set(),
  );

  function rows(): readonly ProducerDefinition[] {
    return props.reverse ? [...STAGE_ONE_PRODUCERS].reverse() : STAGE_ONE_PRODUCERS;
  }
  const assayDiscipline = (): boolean =>
    hasPassageUpgrade(props.game.culture, passageUpgradeId("assay_discipline"));
  const queuedAssay = (): GameState["culture"]["queuedProducerAction"] =>
    props.game.culture.queuedProducerAction;

  function producerDetailsOpen(id: ProducerId): boolean {
    return expandedProducerIds().has(id);
  }

  function toggleProducerDetails(id: ProducerId): void {
    setExpandedProducerIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <section class="panel producers-panel" aria-labelledby="producers-title">
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
              formatBigNum(
                producerCellProductionRate(props.game, producer.id),
                props.game.numberFormat,
                2,
              );
            const marginalBenefit = (): string => {
              const quote = selectedQuote();
              return formatBigNum(
                producerPurchaseCellProductionBenefit(props.game, producer.id, quote.quantity),
                props.game.numberFormat,
                2,
              );
            };
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
                <HelpTooltip tooltip={`Buy ${quantityLabel(quantity())} ${producer.displayName}`}>
                  {(tooltipBindings) => (
                    <button
                      {...tooltipBindings}
                      class="producer-row__buy"
                      type="button"
                      data-buy-quantity={quantity()}
                      disabled={props.disabled || !unlocked() || !selectedQuote().affordable}
                      onClick={() => props.onPurchase(producer.id, quantity())}
                      aria-label={`Buy ${quantityLabel(quantity())} ${producer.displayName} machine${quantity() === 1 ? "" : "s"} for ${formatBigNum(selectedQuote().debit, props.game.numberFormat, 2)}`}
                      title={`Buy ${quantityLabel(quantity())} ${producer.displayName}`}
                    >
                      <span class="producer-row__art" aria-hidden="true">
                        <ProducerMachine
                          id={producer.id}
                          level={levelFor(props.game, producer.id)}
                        />
                      </span>
                      <span class="producer-row__summary">
                        <span class="producer-row__name">
                          <ActionIcon name="producer" /> {producer.displayName}
                        </span>
                        <span class="producer-row__identity">
                          <span
                            class="producer-row__rank"
                            aria-label={`Owned level ${levelFor(props.game, producer.id)}`}
                          >
                            <span class="sr-only">Owned level </span>
                            {levelFor(props.game, producer.id)}
                          </span>
                          <span class="producer-row__rate">{contribution()} cells/s</span>
                        </span>
                      </span>
                      <span
                        class="producer-row__cost cost-note"
                        classList={{
                          "is-unavailable": !selectedQuote().affordable || !unlocked(),
                        }}
                      >
                        <span class="sr-only">Next {quantityLabel(quantity())} cost: </span>
                        <ActionIcon name="buy" />
                        <strong>
                          {formatBigNum(selectedQuote().debit, props.game.numberFormat, 2)}
                        </strong>
                        <span aria-hidden="true"> / </span>
                        <span class="sr-only">; marginal benefit </span>+{marginalBenefit()} cells/s
                        <span class="sr-only">
                          {selectedQuote().affordable && unlocked()
                            ? "; affordable"
                            : "; unavailable"}
                        </span>
                      </span>
                    </button>
                  )}
                </HelpTooltip>
                <Show when={assayDiscipline()}>
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
                        title={assayLabel()}
                      >
                        <ActionIcon name="assay" />
                        <span class="sr-only">{assayLabel()}</span>
                      </button>
                    )}
                  </HelpTooltip>
                </Show>
                <HelpTooltip tooltip={`${producer.displayName} specimen details`}>
                  {(tooltipBindings) => (
                    <button
                      {...tooltipBindings}
                      class="producer-row__detail-trigger"
                      type="button"
                      aria-label={`Open ${producer.displayName} biological details`}
                      aria-expanded={producerDetailsOpen(producer.id)}
                      onClick={() => toggleProducerDetails(producer.id)}
                      title={`${producer.displayName} specimen details`}
                    >
                      <ActionIcon name="assay" />
                      <span class="sr-only">Open {producer.displayName} specimen details</span>
                    </button>
                  )}
                </HelpTooltip>
                <Show when={producerDetailsOpen(producer.id)}>
                  <section
                    class="producer-row__detail"
                    aria-label={`${producer.displayName} details`}
                  >
                    <p>
                      <strong>Base:</strong> +
                      {formatBigNum(producer.baseCellRate, props.game.numberFormat, 2)} cells/s per
                      machine. Current production uses stage and hallmark modifiers.
                    </p>
                    <Show when={!unlocked()}>
                      <p>
                        <strong>Unlock:</strong> reach {unlockStage()}.
                      </p>
                    </Show>
                  </section>
                </Show>
              </li>
            );
          }}
        </For>
      </ul>
    </section>
  );
}
