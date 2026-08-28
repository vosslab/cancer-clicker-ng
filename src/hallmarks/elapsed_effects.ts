import { compare, fromSafeInteger, subtract } from "../bignum/bignum.js";
import { coreSixHallmarkDefinition } from "./core_six_catalog.js";
import type { GameState, RegionState } from "../types/state.js";
import { atpBudgetForSink } from "./atp_allocation.js";

export const ELAPSED_HALLMARK_BOUNDARY_MS = 1_000;
const PERFUSION_OXYGEN_LOSS_PER_LINK = 2;

function natural(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function owns(state: GameState, key: Parameters<typeof coreSixHallmarkDefinition>[0]): boolean {
  const definition = coreSixHallmarkDefinition(key);
  const level = state.hallmarkLevels.find((candidate) => candidate.id === definition.id);
  return (
    level !== undefined && natural(level.level) && level.level >= definition.ownership.requiredLevel
  );
}

export function elapsedHallmarkClockMs(state: GameState): number {
  if (!natural(state.activeTimeMs) || !natural(state.totalOfflineMs)) {
    throw new Error("Elapsed hallmark clock is invalid.");
  }
  if (state.activeTimeMs > Number.MAX_SAFE_INTEGER - state.totalOfflineMs) {
    throw new Error("Elapsed hallmark clock cannot advance safely.");
  }
  return state.activeTimeMs + state.totalOfflineMs;
}

function reserveFor(state: GameState, region: RegionState): number {
  const reserve = state.telomereReserveByRegion[region.id] ?? 0;
  if (!natural(reserve)) throw new Error("Telomere reserve is invalid.");
  return reserve;
}

function viableRegions(state: GameState): readonly RegionState[] {
  return state.regions.filter((region) => region.viability > 0);
}

/** A positive banked floor is protected capacity; only unprotected zero reserve is exhausted. */
export function replicativeCapacityExhausted(state: GameState): boolean {
  if (!owns(state, "replicative_immortality")) return false;
  if (!natural(state.reserveFloor)) throw new Error("Telomere reserve floor is invalid.");
  const viable = viableRegions(state);
  return (
    state.reserveFloor === 0 &&
    viable.length > 0 &&
    viable.every((region) => reserveFor(state, region) === 0)
  );
}

/** D3 uses this pure policy before recording manual division. */
export function manualDivisionAllowed(state: GameState): boolean {
  return !replicativeCapacityExhausted(state);
}

/** Avoids changing legacy arithmetic when no elapsed core-six state can change at a boundary. */
export function hasElapsedHallmarkEffect(state: GameState): boolean {
  const changingReserve =
    owns(state, "replicative_immortality") &&
    viableRegions(state).some((region) => reserveFor(state, region) > state.reserveFloor);
  const maintainedPerfusion = owns(state, "angiogenesis") && linkedRegions(state).length > 0;
  return changingReserve || maintainedPerfusion;
}

function consumeReplicativeReserve(state: GameState): GameState {
  if (!owns(state, "replicative_immortality")) return state;
  if (!natural(state.reserveFloor)) throw new Error("Telomere reserve floor is invalid.");
  const reserves = { ...state.telomereReserveByRegion };
  for (const region of viableRegions(state)) {
    const reserve = reserveFor(state, region);
    reserves[region.id] = Math.max(state.reserveFloor, reserve - 1);
  }
  return { ...state, telomereReserveByRegion: reserves };
}

/**
 * A manual division consumes the currently viable regional reserve allocation.
 * The reducer owns the cell grant and event sequence; this projection owns only core-six state.
 */
export function projectManualDivisionHallmarkEffects(state: GameState): GameState {
  if (!manualDivisionAllowed(state)) throw new Error("Replicative capacity is exhausted.");
  return consumeReplicativeReserve(state);
}

function linkedRegions(state: GameState): readonly RegionState[] {
  return state.regions.filter((region) => region.vesselLinkIds.length > 0);
}

function unlinkForUnpaidMaintenance(state: GameState): GameState {
  const linked = linkedRegions(state);
  if (linked.length === 0) return state;
  const linkedIds = new Set(linked.map((region) => region.id));
  const regions = state.regions.map((region) => {
    if (!linkedIds.has(region.id)) return region;
    const lostCapacity = Math.max(1, region.capacity - 2 * region.vesselLinkIds.length);
    return { ...region, capacity: lostCapacity, vesselLinkIds: [] };
  });
  const oxygenIncrease = linked.reduce(
    (total, region) => total + PERFUSION_OXYGEN_LOSS_PER_LINK * region.vesselLinkIds.length,
    0,
  );
  if (
    !natural(state.oxygenPressure) ||
    state.oxygenPressure > Number.MAX_SAFE_INTEGER - oxygenIncrease
  ) {
    throw new Error("Perfusion oxygen projection is invalid.");
  }
  return {
    ...state,
    regions,
    oxygenPressure: state.oxygenPressure + oxygenIncrease,
    vesselMaintenanceAtp: 0,
  };
}

function debitPerfusionMaintenance(state: GameState): GameState {
  if (!owns(state, "angiogenesis")) return state;
  const linked = linkedRegions(state);
  if (linked.length === 0) return state;
  if (!natural(state.vesselMaintenanceAtp) || state.vesselMaintenanceAtp !== linked.length) {
    throw new Error("Perfusion maintenance state is invalid.");
  }
  // ASVS 2.2.3/2.3.3: a declared extended-hallmark reservation must cover every active physical link.
  if (
    state.atpSinks.includes("vessel-maintenance") &&
    atpBudgetForSink(state, "vessel-maintenance") < linked.length * 25
  ) {
    return unlinkForUnpaidMaintenance(state);
  }
  const debit = fromSafeInteger(state.vesselMaintenanceAtp);
  if (compare(state.atp, debit) < 0) return unlinkForUnpaidMaintenance(state);
  return { ...state, atp: subtract(state.atp, debit) };
}

/** Applies exactly one whole-second durable hallmark boundary without sequencing an event. */
export function applyElapsedHallmarkBoundary(state: GameState): GameState {
  const afterReserve = consumeReplicativeReserve(state);
  return debitPerfusionMaintenance(afterReserve);
}

/** Counts deterministic whole-second crossings from the durable simulation clock. */
export function elapsedHallmarkBoundaryCrossings(state: GameState, elapsedMs: number): number {
  if (!natural(elapsedMs)) throw new Error("Elapsed hallmark duration is invalid.");
  const start = elapsedHallmarkClockMs(state);
  if (start > Number.MAX_SAFE_INTEGER - elapsedMs) {
    throw new Error("Elapsed hallmark duration cannot advance safely.");
  }
  const crossings =
    Math.floor((start + elapsedMs) / ELAPSED_HALLMARK_BOUNDARY_MS) -
    Math.floor(start / ELAPSED_HALLMARK_BOUNDARY_MS);
  if (!natural(crossings)) throw new Error("Elapsed hallmark boundary count is invalid.");
  return crossings;
}

/**
 * Projects elapsed durable core-six mechanics without recording an event or advancing clocks.
 * Repeated one-boundary application makes chunked and unchunked elapsed calls equivalent.
 */
export function projectElapsedHallmarkEffects(state: GameState, elapsedMs: number): GameState {
  const crossings = elapsedHallmarkBoundaryCrossings(state, elapsedMs);
  let projected = state;
  for (let index = 0; index < crossings; index += 1) {
    projected = applyElapsedHallmarkBoundary(projected);
  }
  return projected;
}

export type ElapsedHallmarkDurableProjection = Readonly<
  Pick<GameState, "telomereReserveByRegion" | "regions" | "oxygenPressure" | "vesselMaintenanceAtp">
>;

/**
 * Replays reserve/link state using the supplied ATP balance but leaves tracked resources alone.
 * Reducers use this after their tick snapshot has already accounted for upkeep debit.
 */
export function projectElapsedHallmarkDurableEffects(
  state: GameState,
  elapsedMs: number,
): ElapsedHallmarkDurableProjection {
  const projection = projectElapsedHallmarkEffects(state, elapsedMs);
  return {
    telomereReserveByRegion: projection.telomereReserveByRegion,
    regions: projection.regions,
    oxygenPressure: projection.oxygenPressure,
    vesselMaintenanceAtp: projection.vesselMaintenanceAtp,
  };
}
