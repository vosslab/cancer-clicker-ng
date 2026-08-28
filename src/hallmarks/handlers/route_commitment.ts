import { hallmarkId } from "../../brands.js";
import { compare, fromSafeInteger, subtract } from "../../bignum/bignum.js";
import { coreSixHallmarkDefinition, hasReachedCoreSixUnlock } from "../core_six_catalog.js";
import { effectiveLateHallmarkRouteRisk } from "../late_hallmark_effects.js";
import { prestigeRouteRisk } from "../../prestige/effects.js";
import { cultureRouteRisk } from "../../prestige/culture_effects.js";
import type { CommitRouteOperation, CoreSixHandler } from "../core_six_types.js";
import type { HallmarkEffect, HallmarkEffectContext } from "../../types/effects.js";
import type { RouteId } from "../../types/ids.js";
import type { GameState } from "../../types/state.js";

const INVASION_KEY = "invasion_metastasis";

function isPositiveSafeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

function isOwned(state: GameState): boolean {
  const definition = coreSixHallmarkDefinition(INVASION_KEY);
  return state.hallmarkLevels.some(
    (level) =>
      level.id === definition.id &&
      Number.isSafeInteger(level.level) &&
      level.level >= definition.ownership.requiredLevel,
  );
}

function isKnownRevealedRoute(state: GameState, route: RouteId): boolean {
  return state.regions.some((region) => region.routeIds.includes(route));
}

export function effectiveRouteCommitmentRisk(state: GameState, route: RouteId): number {
  if (!Object.prototype.hasOwnProperty.call(state.routeRiskById, route)) {
    throw new Error("Route commitment requires a revealed route risk.");
  }
  const risk = state.routeRiskById[route];
  if (typeof risk !== "number" || !Number.isFinite(risk) || risk < 0 || risk > 1) {
    throw new Error("Route commitment has an invalid route risk.");
  }
  return cultureRouteRisk(
    state,
    prestigeRouteRisk(state, route, effectiveLateHallmarkRouteRisk(state, route, risk)),
  );
}

function assertRouteCommitment(context: HallmarkEffectContext<CommitRouteOperation>): void {
  const { operation, state } = context;
  const definition = coreSixHallmarkDefinition(INVASION_KEY);
  if (operation.type !== definition.operationType || operation.hallmark !== INVASION_KEY) {
    throw new Error("Route commitment operation is not owned by invasion and metastasis.");
  }
  if (!hasReachedCoreSixUnlock(state.currentStage, INVASION_KEY) || !isOwned(state)) {
    throw new Error("Invasion and metastasis is not operational.");
  }
  if (!isPositiveSafeInteger(operation.cells)) {
    throw new Error("Route commitment cells must be a positive safe integer.");
  }
  const route = operation.routeId;
  if (typeof route !== "string" || !isKnownRevealedRoute(state, route)) {
    throw new Error("Route commitment requires a known revealed route.");
  }
  effectiveRouteCommitmentRisk(state, route);
  if (Object.prototype.hasOwnProperty.call(state.committedCellCommitments, route)) {
    throw new Error("Route commitment is already committed.");
  }
  const parcel = fromSafeInteger(operation.cells);
  if (compare(state.cells, parcel) < 0) {
    throw new Error("Route commitment exceeds available biomass.");
  }
}

/**
 * Commits one exact parcel from the primary balance. A zero-risk revealed route is local
 * expansion; a nonzero risk is a future dissemination attempt. Both leave seeded sites untouched:
 * only the later transit outcome can establish a destination, and M13 owns organ allocation.
 */
export function applyRouteCommitment(
  context: HallmarkEffectContext<CommitRouteOperation>,
): GameState {
  assertRouteCommitment(context);
  const { operation, state } = context;
  const parcel = fromSafeInteger(operation.cells);
  const remainingCells = subtract(state.cells, parcel);
  const commitments = { ...state.committedCellCommitments, [operation.routeId]: operation.cells };
  const nextState: GameState = {
    ...state,
    cells: remainingCells,
    committedCellCommitments: commitments,
  };
  return nextState;
}

/** The reducer imports this narrow effect; it alone assigns event sequence and records the event. */
export const ROUTE_COMMITMENT_EFFECT: HallmarkEffect<CommitRouteOperation> &
  CoreSixHandler<CommitRouteOperation> = {
  hallmarkId: hallmarkId(INVASION_KEY),
  hallmark: INVASION_KEY,
  apply: applyRouteCommitment,
};
