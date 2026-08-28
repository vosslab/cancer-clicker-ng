import { For, Show, createMemo } from "solid-js";
import type { JSX } from "solid-js";

import { transitPresentation } from "../prestige/presentation.js";
import type { GameState } from "../types/state.js";
import { PrestigeRouteProp } from "../svg/prestige_route_props.js";
import { ActionTooltip } from "./action_tooltip.js";
import type { GameController } from "./game_controller.js";

type TransitPanelProps = Readonly<{ game: GameState; controller: GameController }>;

/** A blood-route decision strip; typed controller dispatch remains the only transit mutation path. */
export function TransitPanel(props: TransitPanelProps): JSX.Element {
  const transits = createMemo(() => transitPresentation(props.game));
  return (
    <Show when={transits().length > 0}>
      <section
        class="panel transit-panel transit-route-board"
        aria-labelledby="transit-panel-title"
      >
        <header class="transit-route-header">
          <PrestigeRouteProp kind="transit" />
          <div>
            <p class="eyebrow">Circulation</p>
            <h2 id="transit-panel-title">Choose a landing</h2>
          </div>
          <span class="transit-route-count" aria-label="Pending circulating cells">
            {transits().length}
          </span>
        </header>
        <div class="transit-route-list">
          <For each={transits()}>
            {(transit) => (
              <article
                class="transit-route-event"
                classList={{ "is-lost": transit.outcome === "lost" }}
              >
                <PrestigeRouteProp kind="transit" />
                <span class="transit-route-status" role="status">
                  {transit.outcome === "arrived" ? "Arrived" : "Lost"}
                </span>
                <div class="transit-destination-rack" aria-label="Compatible destinations">
                  <For each={transit.destinations}>
                    {(destination) => (
                      <ActionTooltip
                        label={"Resolve transit at " + destination.title}
                        tooltip={
                          transit.outcome === "arrived"
                            ? "Seed this circulating cell at the compatible " +
                              destination.title +
                              " organ site."
                            : "Resolve the lost transit to clear this finished route event."
                        }
                        class="transit-destination"
                        disabled={props.controller.recoveryBlocked()}
                        onClick={() =>
                          props.controller.resolveTransit(transit.eventId, destination.siteId)
                        }
                      >
                        <PrestigeRouteProp kind="organ" />
                        <span>{destination.title}</span>
                      </ActionTooltip>
                    )}
                  </For>
                </div>
              </article>
            )}
          </For>
        </div>
      </section>
    </Show>
  );
}
