import { For, Show, createMemo } from "solid-js";
import type { JSX } from "solid-js";

import { transitPresentation } from "../prestige/presentation.js";
import type { GameState } from "../types/state.js";
import type { GameController } from "./game_controller.js";
import { ActionIcon } from "./action_icon.js";

type TransitPanelProps = Readonly<{ game: GameState; controller: GameController }>;

/** Keeps live transit choices beside the current stage rather than blending them into reset decisions. */
export function TransitPanel(props: TransitPanelProps): JSX.Element {
  const transits = createMemo(() => transitPresentation(props.game));
  return (
    <Show when={transits().length > 0}>
      <section class="panel transit-panel" aria-labelledby="transit-panel-title">
        <div class="section-heading">
          <div>
            <p class="eyebrow">Transit decisions</p>
            <h2 id="transit-panel-title">Choose a compatible destination</h2>
          </div>
        </div>
        <ul class="prestige-card-grid">
          <For each={transits()}>
            {(transit) => (
              <li>
                <article class="prestige-card">
                  <h3>
                    <ActionIcon name="transit" />{" "}
                    {transit.outcome === "arrived" ? "Arrived transit" : "Lost transit"}
                  </h3>
                  <p>
                    {transit.outcome === "arrived"
                      ? "Resolve this successful transit at one compatible organ site."
                      : "This transit was lost; resolve it to clear the finished route event."}
                  </p>
                  <div class="prestige-card-grid" aria-label="Compatible destinations">
                    <For each={transit.destinations}>
                      {(destination) => (
                        <button
                          type="button"
                          disabled={props.controller.recoveryBlocked()}
                          onClick={() =>
                            props.controller.resolveTransit(transit.eventId, destination.siteId)
                          }
                        >
                          <ActionIcon name="transit" /> Resolve at {destination.title}
                        </button>
                      )}
                    </For>
                  </div>
                </article>
              </li>
            )}
          </For>
        </ul>
      </section>
    </Show>
  );
}
