import { Show } from "solid-js";
import type { JSX } from "solid-js";

import { stageDefinitionsInOrder } from "../stages/catalog.js";
import { stageGateResult } from "../stages/gates.js";
import type { StageDefinition, StageGateResult } from "../stages/stage_types.js";
import type { GameState } from "../types/state.js";
import { StageSigil } from "../svg/evolution_sigils.js";
import { ActionIcon } from "./action_icon.js";
import { HelpTooltip } from "./action_tooltip.js";

type StagePanelProps = Readonly<{
  game: GameState;
  disabled?: boolean;
  onAdvance: () => void;
}>;

function successorFor(game: GameState): StageDefinition | undefined {
  const definitions = stageDefinitionsInOrder();
  const index = definitions.findIndex((definition) => definition.id === game.currentStage);
  if (index < 0) throw new Error("Current stage is absent from the stage catalog.");
  return definitions[index + 1];
}

function currentStage(game: GameState): StageDefinition {
  const definition = stageDefinitionsInOrder().find(
    (candidate) => candidate.id === game.currentStage,
  );
  if (!definition) throw new Error("Current stage is absent from the stage catalog.");
  return definition;
}

function stagePosition(game: GameState): number {
  const position = stageDefinitionsInOrder().findIndex((stage) => stage.id === game.currentStage);
  if (position < 0) throw new Error("Current stage is absent from the stage catalog.");
  return position + 1;
}

function displayedGateValue(value: number): number {
  return Math.max(0, Math.floor(value));
}

function gateProgress(gate: StageGateResult | undefined): string {
  if (!gate) return "Unavailable";
  return `${displayedGateValue(gate.current)} / ${displayedGateValue(gate.required)}`;
}

function remainingGateProgress(gate: StageGateResult | undefined): string {
  if (!gate) return "Goal unavailable";
  if (gate.eligible) return "Ready to advance";
  const remaining = Math.max(
    0,
    displayedGateValue(gate.required) - displayedGateValue(gate.current),
  );
  return `${remaining} more needed`;
}

function advanceLabel(stage: StageDefinition): string {
  return `Advance to ${stage.title}`;
}

/** Compact progress HUD: stage truth remains catalog and gate owned. */
export function StagePanel(props: StagePanelProps): JSX.Element {
  function current(): StageDefinition {
    return currentStage(props.game);
  }
  function next(): StageDefinition | undefined {
    return successorFor(props.game);
  }
  function gate(): StageGateResult | undefined {
    const successor = next();
    return successor ? stageGateResult(props.game, successor.id) : undefined;
  }
  function advanceDisabled(): boolean {
    const nextGate = gate();
    return props.disabled === true || nextGate === undefined || !nextGate.eligible;
  }
  return (
    <section class="stage-panel evolution-stage" aria-labelledby="stage-title">
      <header class="evolution-stage__current">
        <StageSigil index={stagePosition(props.game)} terminal={next() === undefined} />
        <div>
          <p class="evolution-stage__kicker">Tumor growth</p>
          <h2 id="stage-title">{current().title}</h2>
          <p class="evolution-stage__position">
            Stage {stagePosition(props.game)} of {stageDefinitionsInOrder().length}
          </p>
        </div>
      </header>
      <Show
        when={next()}
        fallback={<p class="evolution-stage__terminal">Terminal stage reached</p>}
      >
        {(nextStage) => (
          <section class="evolution-stage__goal" aria-labelledby="stage-goal-title">
            <div class="evolution-stage__goal-copy">
              <p class="evolution-stage__goal-kicker">Your next goal</p>
              <h3 id="stage-goal-title">{nextStage().playerGoal.title}</h3>
              <p class="evolution-stage__goal-instruction">{nextStage().playerGoal.instruction}</p>
              <div class="evolution-stage__goal-progress" id="stage-gate-label">
                <span>{nextStage().playerGoal.progressLabel}</span>
                <output>{gateProgress(gate())}</output>
              </div>
              <p
                class="evolution-stage__gate-state"
                data-state={gate()?.eligible ? "ready" : "locked"}
              >
                {remainingGateProgress(gate())}
              </p>
            </div>
            <HelpTooltip
              tooltip={
                gate()?.eligible ? advanceLabel(nextStage()) : nextStage().playerGoal.instruction
              }
              disabled={advanceDisabled()}
              disabledLabel={`Advance unavailable. ${nextStage().playerGoal.instruction}`}
            >
              {(tooltipBindings) => (
                <button
                  {...tooltipBindings}
                  class="stage-advance-button evolution-stage__advance"
                  type="button"
                  disabled={advanceDisabled()}
                  aria-describedby={`${tooltipBindings["aria-describedby"]} stage-gate-label`}
                  onClick={props.onAdvance}
                >
                  <ActionIcon name="stage_advance" />
                  <span>{advanceLabel(nextStage())}</span>
                </button>
              )}
            </HelpTooltip>
          </section>
        )}
      </Show>
    </section>
  );
}
