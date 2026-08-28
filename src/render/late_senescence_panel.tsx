import { For, Show } from "solid-js";
import type { JSX } from "solid-js";

import { senescenceResolutionQuote } from "../hallmarks/late_hallmark_effects.js";
import type { SenescenceResolutionQuote } from "../hallmarks/late_hallmark_effects.js";
import { senescenceDefinition } from "../hallmarks/senescence_catalog.js";
import type { SenescenceDefinition } from "../hallmarks/late_hallmark_types.js";
import type { GameState } from "../types/state.js";
import type { GameController } from "./game_controller.js";

type LateSenescencePanelProps = Readonly<{ game: GameState; controller: GameController }>;

function decisionReason(reason: string | null): string | undefined {
  switch (reason) {
    case "senescence-inactive":
      return "Acquire and activate senescent cells before resolving this decision.";
    case "decision-unavailable":
      return "This senescence decision has already been resolved.";
    case "region-unavailable":
      return "The decision region is no longer available for this action.";
    default:
      return undefined;
  }
}

/** Makes the durable keep-versus-clear consequence explicit before the controller event. */
export function LateSenescencePanel(props: LateSenescencePanelProps): JSX.Element {
  return (
    <fieldset class="hallmark-fieldset late-hallmark-panel">
      <legend>Senescence decisions</legend>
      <Show
        when={props.game.lateHallmarks.senescence.pendingDecisions.length > 0}
        fallback={<p class="hallmark-empty">No senescence decision is pending.</p>}
      >
        <div class="hallmark-control-stack">
          <For each={props.game.lateHallmarks.senescence.pendingDecisions}>
            {(decision, index) => {
              const quote = (): SenescenceResolutionQuote =>
                senescenceResolutionQuote(props.game, decision.id, props.game.activeTimeMs);
              const retained = (): SenescenceDefinition["retainedEffects"] =>
                senescenceDefinition(decision.cause).retainedEffects;
              return (
                <fieldset class="hallmark-fieldset late-senescence-card">
                  <legend>
                    Decision {index() + 1}: {decision.cause} in region {index() + 1}
                  </legend>
                  <p class="hallmark-readout">
                    Keep: retain a nondividing, secretory region (0x local division; pressure +
                    {retained().localSecretoryPressureDelta}). Clear: remove this region and its
                    local projection.
                  </p>
                  <div class="hallmark-choice-grid">
                    <button
                      type="button"
                      disabled={props.controller.recoveryBlocked() || !quote().keepEligible}
                      onClick={() =>
                        props.controller.resolveSenescenceDecision(decision.id, "keep")
                      }
                    >
                      Keep secretory region
                    </button>
                    <button
                      type="button"
                      disabled={props.controller.recoveryBlocked() || !quote().clearEligible}
                      onClick={() =>
                        props.controller.resolveSenescenceDecision(decision.id, "clear")
                      }
                    >
                      Clear region
                    </button>
                  </div>
                  <Show when={decisionReason(quote().reason)}>
                    {(message) => <p class="hallmark-disabled-note">{message()}</p>}
                  </Show>
                </fieldset>
              );
            }}
          </For>
        </div>
      </Show>
      <Show when={props.game.lateHallmarks.senescence.retainedRegions.length > 0}>
        <p class="hallmark-readout" role="status">
          Retained nondividing regions: {props.game.lateHallmarks.senescence.retainedRegions.length}
          .
        </p>
      </Show>
      <Show when={props.controller.recoveryBlocked()}>
        <p class="hallmark-disabled-note">
          Recovery protection must be resolved before this decision.
        </p>
      </Show>
    </fieldset>
  );
}
