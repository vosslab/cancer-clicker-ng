import { hallmarkId } from "../../brands.js";
import { coreSixHallmarkDefinition, hasReachedCoreSixUnlock } from "../core_six_catalog.js";
import type { CoreSixHandler, SpendTelomeraseOperation } from "../core_six_types.js";
import type { HallmarkEffect } from "../../types/effects.js";
import type { GameState, RegionState } from "../../types/state.js";

/** A single spend can make a meaningful local rescue without creating unbounded mutations. */
export const MAX_TELOMERASE_CHARGES_PER_OPERATION = 3;
export const MAX_TELOMERE_RESERVE = 12;
export const RESERVE_PER_TELOMERASE_CHARGE = 2;
export const FLOOR_PER_TELOMERASE_CHARGE = 1;

function natural(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function positiveChargeCount(value: unknown): value is number {
  return natural(value) && value > 0 && value <= MAX_TELOMERASE_CHARGES_PER_OPERATION;
}

function assertAppliedAtCurrentSimulationTime(state: GameState, appliedAtMs: number): void {
  if (!natural(appliedAtMs) || !natural(state.activeTimeMs) || appliedAtMs !== state.activeTimeMs) {
    throw new Error("Telomerase operation is stale.");
  }
}

function assertReplicativeOwnership(state: GameState): void {
  const definition = coreSixHallmarkDefinition("replicative_immortality");
  if (!hasReachedCoreSixUnlock(state.currentStage, definition.key)) {
    throw new Error("Replicative immortality is locked.");
  }
  const owned = state.hallmarkLevels.find((level) => level.id === definition.id);
  if (!owned || !natural(owned.level) || owned.level < definition.ownership.requiredLevel) {
    throw new Error("Replicative immortality is not owned.");
  }
}

function assertCanonicalRegionalReserve(state: GameState): void {
  const regionIds = new Set<string>();
  for (const region of state.regions) {
    if (
      !regionIds.add(region.id) ||
      !natural(region.capacity) ||
      region.capacity === 0 ||
      !Number.isFinite(region.viability) ||
      region.viability <= 0 ||
      region.viability > 1
    ) {
      throw new Error("Telomerase region state is invalid.");
    }
  }
  for (const [id, reserve] of Object.entries(state.telomereReserveByRegion)) {
    if (!regionIds.has(id) || !natural(reserve) || reserve > MAX_TELOMERE_RESERVE) {
      throw new Error("Telomere reserve state is invalid.");
    }
  }
}

function reserveFor(state: GameState, regionId: string): number {
  const reserve = state.telomereReserveByRegion[regionId] ?? 0;
  if (!natural(reserve) || reserve > MAX_TELOMERE_RESERVE) {
    throw new Error("Telomere reserve is invalid.");
  }
  return reserve;
}

/**
 * A banked floor protects an exhausted region. The elapsed consumer subtracts its division cost
 * from this effective value and clamps at the same floor, so storage and live behavior agree.
 */
export function effectiveTelomereReserve(state: GameState, regionId: string): number {
  if (!natural(state.reserveFloor) || state.reserveFloor > MAX_TELOMERE_RESERVE) {
    throw new Error("Telomere reserve floor is invalid.");
  }
  const reserve = reserveFor(state, regionId);
  return Math.max(reserve, state.reserveFloor);
}

/** A warning means unprotected exhaustion, never merely a stored value below a banked floor. */
export function hasDivisionLimitWarning(state: GameState, region: RegionState): boolean {
  if (state.lateHallmarks.senescence.retainedRegions.some((record) => record.regionId === region.id)) return false;
  const reserve = reserveFor(state, region.id);
  return state.reserveFloor === 0 && reserve === 0;
}

function warnedRegion(state: GameState, requestedId: string): RegionState {
  const region = state.regions.find((candidate) => candidate.id === requestedId);
  if (!region || !hasDivisionLimitWarning(state, region)) {
    throw new Error("Telomerase target is unavailable.");
  }
  return region;
}

function anyWarning(state: GameState): boolean {
  return state.regions.some((region) => hasDivisionLimitWarning(state, region));
}

function assertSharedPreconditions(
  state: GameState,
  operation: SpendTelomeraseOperation,
  appliedAtMs: number,
): void {
  if (operation.type !== "spend-telomerase" || operation.hallmark !== "replicative_immortality") {
    throw new Error("Telomerase operation is invalid.");
  }
  if (!positiveChargeCount(operation.charges)) throw new Error("Telomerase charges are invalid.");
  if (!natural(state.telomeraseCharges) || state.telomeraseCharges < operation.charges) {
    throw new Error("Telomerase charges are insufficient.");
  }
  if (!natural(state.reserveFloor) || state.reserveFloor > MAX_TELOMERE_RESERVE) {
    throw new Error("Telomere reserve floor is invalid.");
  }
  assertAppliedAtCurrentSimulationTime(state, appliedAtMs);
  assertReplicativeOwnership(state);
  assertCanonicalRegionalReserve(state);
}

function applyRefill(state: GameState, operation: SpendTelomeraseOperation): GameState {
  if (operation.target !== "refill-region") throw new Error("Telomerase target is invalid.");
  const region = warnedRegion(state, operation.regionId);
  const previousReserve = reserveFor(state, region.id);
  const increase = operation.charges * RESERVE_PER_TELOMERASE_CHARGE;
  const nextReserve = Math.min(MAX_TELOMERE_RESERVE, previousReserve + increase);
  if (!Number.isSafeInteger(increase) || nextReserve <= previousReserve) {
    throw new Error("Telomerase refill was already spent.");
  }
  return {
    ...state,
    telomeraseCharges: state.telomeraseCharges - operation.charges,
    telomereReserveByRegion: { ...state.telomereReserveByRegion, [region.id]: nextReserve },
  };
}

function applyBank(state: GameState, operation: SpendTelomeraseOperation): GameState {
  if (operation.target !== "bank-reserve-floor") throw new Error("Telomerase target is invalid.");
  if (state.reserveFloor !== 0) throw new Error("Telomerase reserve floor was already banked.");
  if (!anyWarning(state)) throw new Error("Telomerase banking requires a division-limit warning.");
  const nextFloor = operation.charges * FLOOR_PER_TELOMERASE_CHARGE;
  if (!Number.isSafeInteger(nextFloor) || nextFloor > MAX_TELOMERE_RESERVE) {
    throw new Error("Telomerase reserve floor is invalid.");
  }
  return {
    ...state,
    telomeraseCharges: state.telomeraseCharges - operation.charges,
    reserveFloor: nextFloor,
  };
}

/**
 * Applies one trusted parsed operation atomically. ASVS 2.2.1 and 2.3.1-2.3.3:
 * validate the allowlisted command and all coupled prerequisites before constructing next state.
 */
export function applyReplicativeBudget(
  state: GameState,
  operation: SpendTelomeraseOperation,
  appliedAtMs: number,
): GameState {
  assertSharedPreconditions(state, operation, appliedAtMs);
  if (operation.target === "refill-region") return applyRefill(state, operation);
  if (operation.target === "bank-reserve-floor") return applyBank(state, operation);
  throw new Error("Telomerase target is invalid.");
}

export const REPLICATIVE_BUDGET_HANDLER: CoreSixHandler<SpendTelomeraseOperation> = {
  hallmark: "replicative_immortality",
  apply(context) {
    return applyReplicativeBudget(context.state, context.operation, context.appliedAtMs);
  },
};

export const REPLICATIVE_BUDGET_EFFECT: HallmarkEffect<SpendTelomeraseOperation> = {
  hallmarkId: hallmarkId("replicative_immortality"),
  apply(context) {
    return applyReplicativeBudget(context.state, context.operation, context.appliedAtMs);
  },
};
