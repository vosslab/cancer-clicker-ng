import type { ProducerId } from "../types/ids.js";
import type { GameState } from "../types/state.js";
import { coreSixHallmarkDefinition } from "./core_six_catalog.js";

export type HallmarkEconomyModifier = Readonly<{
  productionMultiplier: number;
  purchaseCostMultiplier: number;
}>;

export type EconomyModifier = HallmarkEconomyModifier;

const NEUTRAL_MODIFIER: HallmarkEconomyModifier = {
  productionMultiplier: 1,
  purchaseCostMultiplier: 1,
};

const MIN_COMPONENT_MULTIPLIER = 0.55;
const MAX_COMPONENT_MULTIPLIER = 1.45;
const MIN_COMPOSED_MULTIPLIER = 0.25;
const MAX_COMPOSED_MULTIPLIER = 32;

function isFiniteNonnegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function owns(state: GameState, key: Parameters<typeof coreSixHallmarkDefinition>[0]): boolean {
  const definition = coreSixHallmarkDefinition(key);
  const level = state.hallmarkLevels.find((candidate) => candidate.id === definition.id);
  return level !== undefined && isFiniteNonnegativeInteger(level.level) && level.level >= 1;
}

function producerMatch(producerId: ProducerId, candidates: readonly string[]): boolean {
  return candidates.includes(producerId);
}

function modifier(
  productionMultiplier: number,
  purchaseCostMultiplier: number,
): HallmarkEconomyModifier {
  if (
    !Number.isFinite(productionMultiplier) ||
    !Number.isFinite(purchaseCostMultiplier) ||
    productionMultiplier < MIN_COMPONENT_MULTIPLIER ||
    productionMultiplier > MAX_COMPONENT_MULTIPLIER ||
    purchaseCostMultiplier < MIN_COMPONENT_MULTIPLIER ||
    purchaseCostMultiplier > MAX_COMPONENT_MULTIPLIER
  ) {
    throw new Error("Hallmark economy modifier is outside its bounded envelope.");
  }
  return { productionMultiplier, purchaseCostMultiplier };
}

function merge(left: EconomyModifier, right: EconomyModifier): EconomyModifier {
  const productionMultiplier = left.productionMultiplier * right.productionMultiplier;
  const purchaseCostMultiplier = left.purchaseCostMultiplier * right.purchaseCostMultiplier;
  if (
    !Number.isFinite(productionMultiplier) ||
    !Number.isFinite(purchaseCostMultiplier) ||
    productionMultiplier < MIN_COMPOSED_MULTIPLIER ||
    productionMultiplier > MAX_COMPOSED_MULTIPLIER ||
    purchaseCostMultiplier < MIN_COMPOSED_MULTIPLIER ||
    purchaseCostMultiplier > MAX_COMPOSED_MULTIPLIER
  ) {
    throw new Error("Combined hallmark economy modifier is outside its bounded envelope.");
  }
  return { productionMultiplier, purchaseCostMultiplier };
}

function signalingModifier(state: GameState, producerId: ProducerId): EconomyModifier {
  if (!owns(state, "proliferative_signaling")) return NEUTRAL_MODIFIER;
  if (state.signalingAllocation === "cycle") {
    return producerMatch(producerId, ["cdk4", "egfr", "pi3k"])
      ? modifier(1.4, 0.6)
      : modifier(0.65, 1.4);
  }
  if (state.signalingAllocation === "burst") {
    return producerMatch(producerId, ["cdk4", "producer", "myc", "ras"])
      ? modifier(1.4, 0.6)
      : modifier(0.65, 1.4);
  }
  throw new Error("Signaling allocation is invalid.");
}

function checkpointModifier(state: GameState, producerId: ProducerId): EconomyModifier {
  if (!owns(state, "growth_suppressor_evasion")) return NEUTRAL_MODIFIER;
  const [checkpoint] = state.bypassedCheckpoints;
  if (checkpoint === undefined) return NEUTRAL_MODIFIER;
  if (checkpoint === "contact-inhibition") {
    return producerMatch(producerId, ["cdk4", "producer", "ras"])
      ? modifier(1.4, 0.6)
      : modifier(0.65, 1.4);
  }
  if (checkpoint === "nutrient-arrest") {
    return producerMatch(producerId, ["producer", "pi3k", "egfr"])
      ? modifier(1.4, 0.6)
      : modifier(0.65, 1.4);
  }
  if (checkpoint === "damage-arrest") {
    return producerMatch(producerId, ["producer", "telomerase", "replication_fork"])
      ? modifier(1.4, 0.6)
      : modifier(0.65, 1.4);
  }
  throw new Error("Checkpoint selection is invalid.");
}

function triageModifier(state: GameState, producerId: ProducerId): EconomyModifier {
  void state;
  void producerId;
  return NEUTRAL_MODIFIER;
}

function replicativeModifier(state: GameState, producerId: ProducerId): EconomyModifier {
  if (!owns(state, "replicative_immortality")) return NEUTRAL_MODIFIER;
  if (!isFiniteNonnegativeInteger(state.reserveFloor)) {
    throw new Error("Telomere reserve floor is invalid.");
  }
  const reserveTotal = Object.values(state.telomereReserveByRegion).reduce((total, reserve) => {
    if (!isFiniteNonnegativeInteger(reserve)) throw new Error("Telomere reserve is invalid.");
    return total + reserve;
  }, 0);
  if (state.reserveFloor > 0) {
    return producerMatch(producerId, ["cdk4", "telomerase", "replication_fork"])
      ? modifier(1.4, 0.6)
      : modifier(0.65, 1.4);
  }
  if (reserveTotal > 0) {
    return producerMatch(producerId, ["producer", "myc"])
      ? modifier(1.4, 0.6)
      : modifier(0.65, 1.4);
  }
  return NEUTRAL_MODIFIER;
}

function angiogenesisModifier(state: GameState, producerId: ProducerId): EconomyModifier {
  if (!owns(state, "angiogenesis")) return NEUTRAL_MODIFIER;
  const linkedRegions = state.regions.filter((region) => region.vesselLinkIds.length > 0);
  if (linkedRegions.length === 0) return NEUTRAL_MODIFIER;
  if (!isFiniteNonnegativeInteger(state.vesselMaintenanceAtp)) {
    throw new Error("Vessel maintenance is invalid.");
  }
  const capacity = linkedRegions.reduce((total, region) => total + region.capacity, 0);
  const efficientPerfusion = capacity >= linkedRegions.length * 4 && state.vesselMaintenanceAtp > 0;
  if (efficientPerfusion) {
    return producerMatch(producerId, ["producer", "egfr", "pi3k", "ras"])
      ? modifier(1.4, 0.6)
      : modifier(0.65, 1.4);
  }
  return producerMatch(producerId, ["producer", "cdk4"]) ? modifier(1.4, 0.6) : modifier(0.65, 1.4);
}

function invasionModifier(state: GameState, producerId: ProducerId): EconomyModifier {
  if (!owns(state, "invasion_metastasis")) return NEUTRAL_MODIFIER;
  const commitments = Object.entries(state.committedCellCommitments);
  if (commitments.length === 0) return NEUTRAL_MODIFIER;
  const [routeId, committed] = commitments[0] ?? [];
  if (routeId === undefined || !isFiniteNonnegativeInteger(committed)) {
    throw new Error("Route commitment is invalid.");
  }
  const risk = state.routeRiskById[routeId];
  if (typeof risk !== "number" || !Number.isFinite(risk) || risk < 0 || risk > 1) {
    throw new Error("Route risk is invalid.");
  }
  if (risk === 0) {
    return producerMatch(producerId, ["cdk4", "ras", "myc", "producer"])
      ? modifier(1.4, 0.6)
      : modifier(0.65, 1.4);
  }
  return producerMatch(producerId, ["producer", "egfr", "pi3k", "replication_fork"])
    ? modifier(1.4, 0.6)
    : modifier(0.65, 1.4);
}

/**
 * Projects durable core-six mechanic outcomes onto producer-specific economy terms.
 * It intentionally does not consult UI copy, catalog text, or a generic hallmark level scalar.
 */
export function hallmarkEconomyModifier(state: GameState, producerId: ProducerId): EconomyModifier {
  const modifiers = [
    signalingModifier(state, producerId),
    checkpointModifier(state, producerId),
    triageModifier(state, producerId),
    replicativeModifier(state, producerId),
    angiogenesisModifier(state, producerId),
    invasionModifier(state, producerId),
  ];
  return modifiers.reduce(merge, NEUTRAL_MODIFIER);
}

/** Composes stage and hallmark terms at the one economy boundary used by quotes and ticks. */
export function composeEconomyModifiers(
  stage: EconomyModifier,
  hallmark: EconomyModifier,
): EconomyModifier {
  const productionMultiplier = stage.productionMultiplier * hallmark.productionMultiplier;
  const purchaseCostMultiplier = stage.purchaseCostMultiplier * hallmark.purchaseCostMultiplier;
  if (
    !Number.isFinite(productionMultiplier) ||
    !Number.isFinite(purchaseCostMultiplier) ||
    productionMultiplier < MIN_COMPOSED_MULTIPLIER ||
    productionMultiplier > MAX_COMPOSED_MULTIPLIER ||
    purchaseCostMultiplier < MIN_COMPOSED_MULTIPLIER ||
    purchaseCostMultiplier > MAX_COMPOSED_MULTIPLIER
  ) {
    throw new Error("Composed economy modifier is outside its bounded envelope.");
  }
  return { productionMultiplier, purchaseCostMultiplier };
}
