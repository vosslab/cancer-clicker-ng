import { For, Show } from "solid-js";
import type { JSX } from "solid-js";

import { formatBigNum } from "../bignum/format.js";
import { stageDefinitionsInOrder } from "../stages/catalog.js";
import { stageGateResult } from "../stages/gates.js";
import type { StageDefinition, StageGateResult, StageUiMode } from "../stages/stage_types.js";
import type { GameState } from "../types/state.js";
import { StageSigil } from "../svg/evolution_sigils.js";
import { ActionIcon } from "./action_icon.js";
import { HelpTooltip } from "./action_tooltip.js";
import { formatCellInventory } from "./cell_metrics.js";

type StagePanelProps = Readonly<{
  game: GameState;
  disabled?: boolean;
  onAdvance: () => void;
}>;

type ModeReadout = Readonly<{ heading: string; metrics: readonly string[] }>;

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

function readableMode(mode: string): string {
  const words = mode.replace(/-/g, " ");
  return `${words.charAt(0).toUpperCase()}${words.slice(1)}`;
}

function totalCommittedCells(game: GameState): number {
  return Object.values(game.committedCellCommitments).reduce((total, cells) => total + cells, 0);
}

function vesselLinkCount(game: GameState): number {
  return game.regions.reduce((total, region) => total + region.vesselLinkIds.length, 0);
}

function modeReadout(game: GameState, mode: StageUiMode): ModeReadout {
  const cellCount = formatCellInventory(game.cells, game.numberFormat);
  const substrate = formatBigNum(game.substrate, game.numberFormat, 2);
  const atp = formatBigNum(game.atp, game.numberFormat, 2);
  const producerLevels = game.producerLevels.reduce((total, level) => total + level.level, 0);
  const pressures = game.oxygenPressure + game.damagePressure + game.immunePressure;
  switch (mode) {
    case "cell-focus":
      return {
        heading: "Cell focus",
        metrics: [cellCount, `Charge ${game.manualDivisionCharge}`],
      };
    case "colony-grid":
      return {
        heading: "Colony",
        metrics: [`Producers ${producerLevels}`, `Contact ${game.contactPressure}`],
      };
    case "resource-budget":
      return { heading: "Budget", metrics: [`Substrate ${substrate}`, `ATP ${atp}`] };
    case "region-map":
      return {
        heading: "Regions",
        metrics: [`Regions ${game.regions.length}`, `Oxygen ${game.oxygenPressure}`],
      };
    case "vascular-overlay":
      return {
        heading: "Vessels",
        metrics: [`Links ${vesselLinkCount(game)}`, `Upkeep ${game.vesselMaintenanceAtp}`],
      };
    case "route-board":
      return {
        heading: "Routes",
        metrics: [
          `Discovery ${game.routeDiscoveryProgress}`,
          `Committed ${totalCommittedCells(game)}`,
        ],
      };
    case "transit-panel":
      return {
        heading: "Transit",
        metrics: [
          `Events ${game.pendingTransitEvents.length}`,
          `Committed ${totalCommittedCells(game)}`,
        ],
      };
    case "site-switcher":
      return {
        heading: "Sites",
        metrics: [`Seeded ${game.seededSites.length}`, `Regions ${game.regions.length}`],
      };
    case "burden-dashboard":
      return {
        heading: "Burden",
        metrics: [`Seeded ${game.seededSites.length}`, `Pressure ${pressures}`],
      };
    case "collapse-summary":
      return { heading: "Collapse", metrics: [cellCount, `Pressure ${pressures}`] };
    case "culture-bench": {
      const l3 = game.prestigeAvailability.some(
        (entry) => entry.id === "L3" && entry.status === "earned",
      );
      return {
        heading: "Culture",
        metrics: [
          `L3 ${l3 ? "earned" : "locked"}`,
          `Senescent ${game.lateHallmarks.senescence.retainedRegions.length}`,
        ],
      };
    }
    case "contamination-network":
      return {
        heading: "Network",
        metrics: [`Spread ${game.routeDiscoveryProgress}`, `Regions ${game.regions.length}`],
      };
  }
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
  function readout(): ModeReadout {
    return modeReadout(props.game, current().uiMode);
  }

  return (
    <section class="stage-panel evolution-stage" aria-labelledby="stage-title">
      <header class="evolution-stage__current">
        <StageSigil index={stagePosition(props.game)} terminal={next() === undefined} />
        <div>
          <p class="evolution-stage__kicker">
            Stage {stagePosition(props.game)} / {stageDefinitionsInOrder().length}
          </p>
          <h2 id="stage-title">{current().title}</h2>
          <p class="evolution-stage__mode">{readableMode(current().uiMode)}</p>
        </div>
      </header>
      <div class="evolution-stage__numbers" role="group" aria-label={readout().heading}>
        <For each={readout().metrics}>{(metric) => <output>{metric}</output>}</For>
      </div>
      <Show
        when={next()}
        fallback={<p class="evolution-stage__terminal">Terminal stage reached</p>}
      >
        {(nextStage) => (
          <div class="evolution-stage__goal">
            <div class="evolution-stage__goal-copy">
              <p>Next: {nextStage().title}</p>
              <span id="stage-gate-label">{gate()?.label}</span>
              <output>
                {gate()?.current} / {gate()?.required}
              </output>
              <span
                class="evolution-stage__gate-state"
                data-state={gate()?.eligible ? "ready" : "locked"}
              >
                {gate()?.eligible ? "Ready" : "Locked"}
              </span>
            </div>
            <progress
              id="stage-gate-progress"
              max={gate()?.required ?? 1}
              value={Math.min(gate()?.required ?? 1, Math.max(0, gate()?.current ?? 0))}
              aria-labelledby="stage-gate-label"
            />
            <HelpTooltip
              tooltip={
                gate()?.eligible
                  ? "Advance to the next stage"
                  : (gate()?.label ?? "Advance unavailable")
              }
              disabled={advanceDisabled()}
              disabledLabel={`Advance unavailable. ${gate()?.label ?? "Meet the stage prerequisite first."}`}
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
                  <span>Advance</span>
                </button>
              )}
            </HelpTooltip>
          </div>
        )}
      </Show>
    </section>
  );
}
