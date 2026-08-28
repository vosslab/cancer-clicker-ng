import { For, Show } from "solid-js";
import type { JSX } from "solid-js";

import { formatBigNum } from "../bignum/format.js";
import { producerDefinition } from "../economy/producers.js";
import { stageDefinitionsInOrder } from "../stages/catalog.js";
import { stageOperationalChange } from "../stages/effects.js";
import { stageGateResult } from "../stages/gates.js";
import type { GameState } from "../types/state.js";
import type { StageDefinition, StageGateResult, StageUiMode } from "../stages/stage_types.js";

type StagePanelProps = Readonly<{
  game: GameState;
  disabled?: boolean;
  onAdvance: () => void;
}>;

function successorFor(
  game: GameState,
): ReturnType<typeof stageDefinitionsInOrder>[number] | undefined {
  const definitions = stageDefinitionsInOrder();
  const index = definitions.findIndex((definition) => definition.id === game.currentStage);
  if (index < 0) throw new Error("Current stage is absent from the stage catalog.");
  return definitions[index + 1];
}

function readableMode(mode: string): string {
  const words = mode.replace(/-/g, " ");
  return `${words.charAt(0).toUpperCase()}${words.slice(1)}`;
}

function economyEvidence(game: GameState): string {
  const economy = stageOperationalChange(game).economy;
  const producer = producerDefinition(economy.favoredProducerId);
  return `Production runs at ${economy.productionMultiplier}x. ${producer.displayName} costs ${economy.favoredProducerCostMultiplier}x.`;
}

type ModeReadout = Readonly<{ heading: string; metrics: readonly string[] }>;

function totalCommittedCells(game: GameState): number {
  return Object.values(game.committedCellCommitments).reduce((total, cells) => total + cells, 0);
}

function vesselLinkCount(game: GameState): number {
  return game.regions.reduce((total, region) => total + region.vesselLinkIds.length, 0);
}

function modeReadout(game: GameState, mode: StageUiMode): ModeReadout {
  const cellCount = formatBigNum(game.cells, game.numberFormat, 2);
  const substrate = formatBigNum(game.substrate, game.numberFormat, 2);
  const atp = formatBigNum(game.atp, game.numberFormat, 2);
  const producerLevels = game.producerLevels.reduce((total, level) => total + level.level, 0);
  const pressures = game.oxygenPressure + game.damagePressure + game.immunePressure;
  switch (mode) {
    case "cell-focus":
      return {
        heading: "Cell focus metrics",
        metrics: [`Cells: ${cellCount}`, `Manual charge: ${game.manualDivisionCharge}`],
      };
    case "colony-grid":
      return {
        heading: "Colony grid metrics",
        metrics: [
          `Producer levels: ${producerLevels}`,
          `Contact pressure: ${game.contactPressure}`,
        ],
      };
    case "resource-budget":
      return {
        heading: "Resource budget metrics",
        metrics: [`Substrate: ${substrate}`, `ATP: ${atp}`],
      };
    case "region-map":
      return {
        heading: "Region map metrics",
        metrics: [`Regions: ${game.regions.length}`, `Oxygen pressure: ${game.oxygenPressure}`],
      };
    case "vascular-overlay":
      return {
        heading: "Vascular overlay metrics",
        metrics: [
          `Vessel links: ${vesselLinkCount(game)}`,
          `Upkeep ATP: ${game.vesselMaintenanceAtp}`,
        ],
      };
    case "route-board":
      return {
        heading: "Route board metrics",
        metrics: [
          `Route discovery: ${game.routeDiscoveryProgress}`,
          `Committed cells: ${totalCommittedCells(game)}`,
        ],
      };
    case "transit-panel":
      return {
        heading: "Transit panel metrics",
        metrics: [
          `Transit events: ${game.pendingTransitEvents.length}`,
          `Committed cells: ${totalCommittedCells(game)}`,
        ],
      };
    case "site-switcher":
      return {
        heading: "Site switcher metrics",
        metrics: [`Seeded sites: ${game.seededSites.length}`, `Regions: ${game.regions.length}`],
      };
    case "burden-dashboard":
      return {
        heading: "Burden dashboard metrics",
        metrics: [`Seeded sites: ${game.seededSites.length}`, `Coupled pressure: ${pressures}`],
      };
    case "collapse-summary":
      return {
        heading: "Collapse summary metrics",
        metrics: [`Cells: ${cellCount}`, `Host pressure: ${pressures}`],
      };
    case "culture-bench": {
      const l3 = game.prestigeAvailability.some(
        (entry) => entry.id === "L3" && entry.status === "earned",
      );
      return {
        heading: "Culture bench metrics",
        metrics: [
          `L3 availability: ${l3 ? "earned" : "unavailable"}`,
          `Senescent regions: ${game.lateHallmarks.senescence.retainedRegions.length}`,
        ],
      };
    }
    case "contamination-network":
      return {
        heading: "Contamination network metrics",
        metrics: [
          `Dissemination progress: ${game.routeDiscoveryProgress}`,
          `Network regions: ${game.regions.length}`,
        ],
      };
  }
}

/** Shows the currently active play contract and the next semantic gate without owning stage truth. */
export function StagePanel(props: StagePanelProps): JSX.Element {
  function current(): StageDefinition {
    const definition = stageDefinitionsInOrder().find(
      (candidate) => candidate.id === props.game.currentStage,
    );
    if (!definition) throw new Error("Current stage is absent from the stage catalog.");
    return definition;
  }
  function next(): StageDefinition | undefined {
    return successorFor(props.game);
  }
  function gate(): StageGateResult | undefined {
    const nextStage = next();
    return nextStage ? stageGateResult(props.game, nextStage.id) : undefined;
  }
  function advanceDisabled(): boolean {
    const nextGate = gate();
    return props.disabled === true || nextGate === undefined || !nextGate.eligible;
  }
  function readout(): ModeReadout {
    return modeReadout(props.game, current().uiMode);
  }

  return (
    <section class="panel stage-panel" aria-labelledby="stage-title">
      <div class="section-heading">
        <div>
          <p class="eyebrow">Disease progression</p>
          <h2 id="stage-title">{current().title}</h2>
        </div>
        <p class="stage-mode">{readableMode(current().uiMode)}</p>
      </div>
      <div class="stage-contract-grid">
        <section aria-labelledby="stage-pressure-title">
          <h3 id="stage-pressure-title">Current pressure</h3>
          <p>{current().pressure}</p>
        </section>
        <section aria-labelledby="stage-opportunity-title">
          <h3 id="stage-opportunity-title">New opportunity</h3>
          <p>{current().opportunity}</p>
        </section>
        <section aria-labelledby="stage-identity-title">
          <h3 id="stage-identity-title">How play changes</h3>
          <p>{current().gameplayIdentity}</p>
        </section>
        <section aria-labelledby="stage-retired-title">
          <h3 id="stage-retired-title">Retired assumption</h3>
          <p>{current().retires}</p>
        </section>
      </div>
      <section
        class="stage-mode-readout"
        data-stage-mode={current().uiMode}
        aria-labelledby="stage-readout-title"
      >
        <h3 id="stage-readout-title">{readout().heading}</h3>
        <ul>
          <For each={readout().metrics}>{(metric) => <li>{metric}</li>}</For>
        </ul>
      </section>
      <p class="stage-operation">
        <span>
          {stageOperationalChange(props.game).availability === "available"
            ? "Active operational shift:"
            : "Deferred operational shift:"}
        </span>{" "}
        {stageOperationalChange(props.game).summary}
      </p>
      <p class="stage-economy" role="status">
        <span>Current economy effect:</span> {economyEvidence(props.game)}
      </p>
      <Show when={stageOperationalChange(props.game).availability === "deferred"}>
        <p class="stage-deferred">
          The associated action is intentionally deferred:{" "}
          {stageOperationalChange(props.game).feasibilityRule}
        </p>
      </Show>
      <Show
        when={next()}
        fallback={<p class="stage-terminal">This is the current terminal stage of the ladder.</p>}
      >
        {(nextStage) => (
          <div class="stage-advance" aria-labelledby="stage-gate-title">
            <div>
              <p class="eyebrow">Next stage</p>
              <h3 id="stage-gate-title">{nextStage().title}</h3>
              <p>
                {gate()?.label}: {gate()?.current} / {gate()?.required}
              </p>
            </div>
            <button
              class="stage-advance-button"
              type="button"
              disabled={advanceDisabled()}
              aria-describedby="stage-gate-title"
              onClick={props.onAdvance}
            >
              Advance to {nextStage().title}
            </button>
          </div>
        )}
      </Show>
    </section>
  );
}
