import { For, Show, createMemo, createSignal } from "solid-js";
import type { JSX } from "solid-js";

import { eligiblePhenotypeRegions } from "../hallmarks/late_hallmark_effects.js";
import { plasticityDefinition } from "../hallmarks/plasticity_catalog.js";
import type { GameState } from "../types/state.js";
import type { GameController } from "./game_controller.js";

type LatePlasticityPanelProps = Readonly<{ game: GameState; controller: GameController }>;

function phenotypeSummary(phenotype: Parameters<typeof plasticityDefinition>[0]): string {
  const effect = plasticityDefinition(phenotype).effects;
  return `${effect.productionPerSecondMultiplier}x production; route risk ${effect.routeRiskDelta >= 0 ? "+" : ""}${effect.routeRiskDelta}; pressure ${effect.pressureDelta >= 0 ? "+" : ""}${effect.pressureDelta}.`;
}

/** Presents the reducer-aligned, active regional phenotype choice without inventing eligibility. */
export function LatePlasticityPanel(props: LatePlasticityPanelProps): JSX.Element {
  const [selectedIndex, setSelectedIndex] = createSignal(0);
  const eligible = createMemo(() => eligiblePhenotypeRegions(props.game, props.game.activeTimeMs));
  const selected = createMemo(() => eligible()[selectedIndex()]);

  return (
    <fieldset class="hallmark-fieldset late-hallmark-panel">
      <legend>Regional phenotype</legend>
      <Show
        when={eligible().length > 0}
        fallback={
          <p class="hallmark-empty">
            No region is currently eligible. A plasticity choice requires an active branch, an
            extant non-senescent region, and a completed local cooldown.
          </p>
        }
      >
        <label class="hallmark-input-label">
          Eligible region
          <select
            value={selectedIndex()}
            disabled={props.controller.recoveryBlocked()}
            onChange={(event) => setSelectedIndex(Number(event.currentTarget.value))}
          >
            <For each={eligible()}>
              {(quote, index) => (
                <option value={index()}>
                  Region {index() + 1}: {quote.currentPhenotype}
                </option>
              )}
            </For>
          </select>
        </label>
        <Show when={selected()}>
          {(quote) => (
            <>
              <p class="hallmark-readout" role="status">
                Current phenotype: {quote().currentPhenotype}. Switching begins a new local
                cooldown.
              </p>
              <div class="hallmark-choice-grid">
                <For each={quote().eligibleChoices}>
                  {(phenotype) => (
                    <button
                      type="button"
                      disabled={props.controller.recoveryBlocked()}
                      onClick={() =>
                        props.controller.assignRegionPhenotype(quote().regionId, phenotype)
                      }
                    >
                      {plasticityDefinition(phenotype).displayName}
                    </button>
                  )}
                </For>
              </div>
              <ul class="late-effect-list">
                <For each={quote().eligibleChoices}>
                  {(phenotype) => (
                    <li>
                      {plasticityDefinition(phenotype).displayName}: {phenotypeSummary(phenotype)}
                    </li>
                  )}
                </For>
              </ul>
            </>
          )}
        </Show>
      </Show>
      <Show when={props.controller.recoveryBlocked()}>
        <p class="hallmark-disabled-note">
          Recovery protection must be resolved before phenotype changes.
        </p>
      </Show>
    </fieldset>
  );
}
