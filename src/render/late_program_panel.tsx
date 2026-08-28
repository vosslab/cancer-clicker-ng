import { For, Show } from "solid-js";
import type { JSX } from "solid-js";

import { programEligibilityQuote } from "../hallmarks/late_hallmark_effects.js";
import type { ProgramEligibilityQuote } from "../hallmarks/late_hallmark_effects.js";
import { LATE_PROGRAM_CATALOG } from "../hallmarks/program_catalog.js";
import { hallmarkId } from "../brands.js";
import type { HallmarkId } from "../types/ids.js";
import type { GameState } from "../types/state.js";
import type { GameController } from "./game_controller.js";

type LateProgramPanelProps = Readonly<{ game: GameState; controller: GameController }>;

function readable(value: string): string {
  const words = value.split("_").join(" ");
  return `${words.charAt(0).toUpperCase()}${words.slice(1)}`;
}

function reasonText(reason: string | null): string | undefined {
  switch (reason) {
    case "epigenetic-inactive":
      return "Acquire and activate epigenetic reprogramming before changing a program.";
    case "target-unowned":
      return "Acquire this target hallmark before assigning its program.";
    case "target-unavailable":
      return "This program target is unavailable in the current hallmark catalog.";
    case "cooldown-active":
      return "The shared program cooldown is active.";
    case "insufficient-atp":
      return "The ATP reserve cannot pay this program's quoted cost.";
    default:
      return undefined;
  }
}

function targetIds(): readonly HallmarkId[] {
  return Object.freeze(
    [...new Set(LATE_PROGRAM_CATALOG.map((option) => option.target))].map((target) =>
      hallmarkId(target),
    ),
  );
}

/** Renders catalog options through reducer-aligned target, ATP, and cooldown quotes. */
export function LateProgramPanel(props: LateProgramPanelProps): JSX.Element {
  return (
    <fieldset class="hallmark-fieldset late-hallmark-panel">
      <legend>Epigenetic program</legend>
      <For each={targetIds()}>
        {(target) => {
          const quote = (): ProgramEligibilityQuote =>
            programEligibilityQuote(props.game, target, props.game.activeTimeMs);
          return (
            <section class="late-program-target" aria-label={`${readable(target)} program`}>
              <h4>{readable(target)}</h4>
              <Show when={quote().currentOptionId}>
                {(optionId) => <p class="hallmark-readout">Active: {optionId()}.</p>}
              </Show>
              <Show when={quote().remainingCooldownMs > 0}>
                <p class="hallmark-disabled-note">
                  Program cooldown: {quote().remainingCooldownMs} ms remaining.
                </p>
              </Show>
              <div class="late-option-list">
                <For each={quote().options}>
                  {(optionQuote) => {
                    const option = optionQuote.option;
                    const effect = option.effects;
                    return (
                      <article class="late-option-card">
                        <h5>{option.displayName}</h5>
                        <p>
                          {option.atpCost} ATP; {effect.productionPerSecondMultiplier}x production;
                          route risk {effect.routeRiskDelta >= 0 ? "+" : ""}
                          {effect.routeRiskDelta}; pressure {effect.pressureDelta >= 0 ? "+" : ""}
                          {effect.pressureDelta}.
                        </p>
                        <button
                          type="button"
                          disabled={props.controller.recoveryBlocked() || !optionQuote.eligible}
                          onClick={() =>
                            props.controller.reconfigureHallmarkProgram(target, option.id)
                          }
                        >
                          Assign program
                        </button>
                        <Show when={reasonText(optionQuote.reason)}>
                          {(message) => <p class="hallmark-disabled-note">{message()}</p>}
                        </Show>
                      </article>
                    );
                  }}
                </For>
              </div>
            </section>
          );
        }}
      </For>
      <Show when={props.controller.recoveryBlocked()}>
        <p class="hallmark-disabled-note">
          Recovery protection must be resolved before program changes.
        </p>
      </Show>
    </fieldset>
  );
}
