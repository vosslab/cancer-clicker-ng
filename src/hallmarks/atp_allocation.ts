import { compare, fromSafeInteger, subtract } from "../bignum/bignum.js";
import type { ProducerId } from "../types/ids.js";
import type { GameState } from "../types/state.js";
import { coreSixHallmarkDefinition } from "./core_six_catalog.js";
import {
  hasReachedExtendedHallmarkUnlock,
  extendedHallmarkDefinition,
} from "./extended_hallmark_catalog.js";
import type { AtpSinkId } from "./extended_hallmark_types.js";

const ACCELERATION_SINK: AtpSinkId = "acceleration";
const MAXIMUM_ACCELERATION_BUDGET = 100;
const MAXIMUM_TOTAL_ATP_BUDGET = 200;
const ATP_BUDGET_UNITS_PER_DEBIT = 25;
export const ATP_ACCELERATION_MAX_MULTIPLIER = 1.5;
export type AtpAccelerationEconomyModifier = Readonly<{
  productionMultiplier: number;
  purchaseCostMultiplier: number;
}>;

function natural(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function ownsMetabolism(state: GameState): boolean {
  const definition = extendedHallmarkDefinition("metabolic_deregulation");
  return state.hallmarkLevels.some(
    (level) => level.id === definition.id && natural(level.level) && level.level >= 1,
  );
}

function ownsAngiogenesis(state: GameState): boolean {
  const definition = coreSixHallmarkDefinition("angiogenesis");
  return state.hallmarkLevels.some(
    (level) => level.id === definition.id && natural(level.level) && level.level >= 1,
  );
}

function assertAtpBudgetState(state: GameState): void {
  const allowed = new Set<AtpSinkId>(["acceleration", "vessel-maintenance", "mutation-drafting"]);
  const sinks = state.atpSinks;
  if (
    !Array.isArray(sinks) ||
    new Set(sinks).size !== sinks.length ||
    sinks.some((sink) => !allowed.has(sink as AtpSinkId))
  ) {
    throw new Error("ATP budget sink identifiers are invalid.");
  }
  let total = 0;
  for (const [sink, amount] of Object.entries(state.atpBudget)) {
    if (
      !allowed.has(sink as AtpSinkId) ||
      !sinks.includes(sink) ||
      !natural(amount) ||
      amount > MAXIMUM_ACCELERATION_BUDGET
    ) {
      throw new Error("ATP budget allocation is invalid.");
    }
    total += amount;
  }
  if (total > MAXIMUM_TOTAL_ATP_BUDGET)
    throw new Error("ATP budget total exceeds its bounded cap.");
}

function accelerationBudget(state: GameState): number {
  return atpBudgetForSink(state, ACCELERATION_SINK);
}

/** Reads one closed ATP allocation after validating the complete bounded allocation state. */
export function atpBudgetForSink(state: GameState, sink: AtpSinkId): number {
  assertAtpBudgetState(state);
  return state.atpBudget[sink] ?? 0;
}

function accelerationDebit(state: GameState): number {
  const budget = accelerationBudget(state);
  return budget === 0 ? 0 : Math.ceil(budget / ATP_BUDGET_UNITS_PER_DEBIT);
}

function vesselMaintenanceDebit(state: GameState): number {
  if (!ownsAngiogenesis(state)) return 0;
  const linkedCount = state.regions.filter((region) => region.vesselLinkIds.length > 0).length;
  if (linkedCount === 0) return 0;
  if (
    state.atpSinks.includes("vessel-maintenance") &&
    atpBudgetForSink(state, "vessel-maintenance") < linkedCount * 25
  ) {
    return Number.MAX_SAFE_INTEGER;
  }
  return state.vesselMaintenanceAtp;
}

/** True only when this interval can pay its vessel upkeep first and its acceleration debit second. */
export function hasFundedAtpAcceleration(state: GameState): boolean {
  const budget = accelerationBudget(state);
  if (
    budget === 0 ||
    !hasReachedExtendedHallmarkUnlock(state.currentStage, "metabolic_deregulation") ||
    !ownsMetabolism(state)
  ) {
    return false;
  }
  const required = vesselMaintenanceDebit(state) + accelerationDebit(state);
  if (!natural(required)) throw new Error("ATP acceleration debit is invalid.");
  return compare(state.atp, fromSafeInteger(required)) >= 0;
}

/**
 * A bounded, producer-nonuniform payoff for the paid acceleration sink.
 * Higher-flux producer identities receive the larger half of the bounded boost.
 */
export function atpAccelerationMultiplier(state: GameState, producerId: ProducerId): number {
  return atpAccelerationEconomyModifier(state, producerId).productionMultiplier;
}

/**
 * The paid allocation changes both rate and quote terms. This deliberately preserves meaningful
 * producer choices instead of applying a uniform "numbers go up" scalar to the entire catalog.
 */
export function atpAccelerationEconomyModifier(
  state: GameState,
  producerId: ProducerId,
): AtpAccelerationEconomyModifier {
  if (!hasFundedAtpAcceleration(state)) {
    return { productionMultiplier: 1, purchaseCostMultiplier: 1 };
  }
  const budget = accelerationBudget(state);
  const highFlux = producerId === "myc" || producerId === "egfr" || producerId === "pi3k";
  const fraction = budget / MAXIMUM_ACCELERATION_BUDGET;
  const productionMultiplier = 1 + fraction * (highFlux ? 0.5 : 0.25);
  const purchaseCostMultiplier = 1 + fraction * (highFlux ? -0.2 : 0.1);
  if (
    !Number.isFinite(productionMultiplier) ||
    !Number.isFinite(purchaseCostMultiplier) ||
    productionMultiplier < 1 ||
    productionMultiplier > ATP_ACCELERATION_MAX_MULTIPLIER ||
    purchaseCostMultiplier < 0.8 ||
    purchaseCostMultiplier > 1.1
  ) {
    throw new Error("ATP acceleration multiplier is outside its bounded envelope.");
  }
  return { productionMultiplier, purchaseCostMultiplier };
}

/**
 * Pays acceleration once at the same whole-second boundary as other durable economy effects.
 * Call this after core-six perfusion maintenance so a scarce balance cannot fund both in reverse order.
 */
export function applyAtpAccelerationBoundary(state: GameState): GameState {
  if (!hasFundedAtpAcceleration(state)) return state;
  const debit = fromSafeInteger(accelerationDebit(state));
  return { ...state, atp: subtract(state.atp, debit) };
}

/** Keeps the tick on its historical fast path when no active allocation can change it. */
export function hasAtpAccelerationEffect(state: GameState): boolean {
  return accelerationBudget(state) > 0;
}
