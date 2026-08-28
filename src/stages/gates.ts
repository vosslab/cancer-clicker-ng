import { compare } from "../bignum/bignum.js";
import { bigNum, prestigeId } from "../brands.js";
import { nextStageId } from "../state/catalog.js";
import type { GameState } from "../types/state.js";
import type { StageId } from "../types/ids.js";
import { stageDefinition } from "./catalog.js";
import type { StageGateResult } from "./stage_types.js";
import { effectiveExtendedHallmarkPressures } from "../hallmarks/extended_hallmark_effects.js";

function atLeast(value: number, required: number, label: string): StageGateResult {
  return { eligible: value >= required, current: value, required, label };
}

function cellsAtLeast(state: GameState, required: number, label: string): StageGateResult {
  const eligible = compare(state.cells, bigNum(required, 0)) >= 0;
  const current = eligible
    ? required
    : Math.max(0, state.cells.mantissa * 10 ** state.cells.exponent);
  return { eligible, current, required, label };
}

function producerLevels(state: GameState): number {
  return state.producerLevels.reduce((total, producer) => total + producer.level, 0);
}

function viableVesselLinks(state: GameState): number {
  return state.regions.filter((region) => region.viability > 0 && region.vesselLinkIds.length > 0)
    .length;
}

function perfusedRouteDiscovery(state: GameState): number {
  return viableVesselLinks(state) > 0 ? state.routeDiscoveryProgress : 0;
}

function committedRouteCells(state: GameState): number {
  const viableRouteIds = new Set<string>(
    state.regions
      .filter((region) => region.viability > 0 && region.vesselLinkIds.length > 0)
      .flatMap((region) => region.routeIds),
  );
  return Object.entries(state.committedCellCommitments)
    .filter(([routeId]) => viableRouteIds.has(routeId))
    .reduce((total, [, cells]) => total + cells, 0);
}

function hasEarnedL3(state: GameState): boolean {
  return state.prestigeAvailability.some(
    (availability) => availability.id === prestigeId("L3") && availability.status === "earned",
  );
}

/** Evaluates a stage's entry gate from durable state, without mutating or auto-transitioning. */
export function stageGateResult(state: GameState, id: StageId): StageGateResult {
  const definition = stageDefinition(id);
  const { gate } = definition;
  switch (gate.code) {
    case "manual-division":
      return atLeast(state.manualDivisionCharge, gate.threshold, gate.label);
    case "local-cluster":
      return cellsAtLeast(state, gate.threshold, gate.label);
    case "diffusion-demand": {
      const cells = cellsAtLeast(state, gate.threshold, gate.label);
      const producers = producerLevels(state);
      const eligible = cells.eligible && producers >= 1;
      const current = Math.min(cells.current, producers > 0 ? gate.threshold : 0);
      return { eligible, current, required: gate.threshold, label: gate.label };
    }
    case "persistent-hypoxia":
      return atLeast(
        state.regions.some((region) => region.viability > 0) ? state.oxygenPressure : 0,
        gate.threshold,
        gate.label,
      );
    case "viable-vessel":
      return atLeast(viableVesselLinks(state), gate.threshold, gate.label);
    case "perfused-invasion":
      return atLeast(perfusedRouteDiscovery(state), gate.threshold, gate.label);
    case "committed-transit":
      return atLeast(committedRouteCells(state), gate.threshold, gate.label);
    case "seeded-destination":
      return atLeast(state.seededSites.length, gate.threshold, gate.label);
    case "multisite-burden": {
      const sites = state.seededSites.length;
      const burden = cellsAtLeast(state, 1_000, gate.label).eligible;
      return atLeast(burden ? sites : 0, gate.threshold, gate.label);
    }
    case "host-tolerance": {
      const burden = cellsAtLeast(state, gate.threshold, gate.label);
      const effective = effectiveExtendedHallmarkPressures(state);
      const pressure = state.oxygenPressure + effective.damage + effective.immune;
      return { ...burden, eligible: burden.eligible && pressure >= 1 };
    }
    case "earned-immortalization":
      return atLeast(hasEarnedL3(state) ? 1 : 0, gate.threshold, gate.label);
    case "culture-dissemination":
      return atLeast(state.routeDiscoveryProgress, gate.threshold, gate.label);
  }
}

/** Returns only the immediate eligible successor. Players still record the transition explicitly. */
export function eligibleNextStage(state: GameState): StageId | undefined {
  const next = nextStageId(state.currentStage);
  if (next === undefined) return undefined;
  return stageGateResult(state, next).eligible ? next : undefined;
}
