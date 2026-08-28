import { findM11MutationCard } from "./m11_catalog.js";
import { m11InflammationModifiers } from "./m11_tick_effects.js";
import type { ProducerId } from "../types/ids.js";
import type { GameState } from "../types/state.js";
import type { MutationCardEffects } from "./m11_types.js";

const AFFINITY: Readonly<Record<string, number>> = {
  egfr: 2,
  pi3k: 2,
  ras: 1.5,
  myc: 1.5,
  cdk4: 1.25,
  producer: 1.25,
  telomerase: 1,
  replication_fork: 1,
};

function isMutationCardEffects(
  value: MutationCardEffects | undefined,
): value is MutationCardEffects {
  return value !== undefined;
}

function chosenCardEffects(state: GameState): readonly MutationCardEffects[] {
  return state.chosenMutations
    .map((id) => findM11MutationCard(id)?.effects)
    .filter(isMutationCardEffects);
}

function mutationEffectTotal(
  state: GameState,
  key: "routeDiscoveryBonus" | "damagePressure" | "immunePressure",
): number {
  return chosenCardEffects(state).reduce((total, effects) => total + effects[key], 0);
}

export function m11ConversionYieldMultiplier(state: GameState): number {
  return chosenCardEffects(state).reduce(
    (multiplier, effects) => multiplier * effects.conversionYieldMultiplier,
    1,
  );
}

export function m11MaskTokenCost(state: GameState): number {
  return chosenCardEffects(state).reduce(
    (cost, effects) => Math.min(cost, effects.maskTokenCost),
    1,
  );
}

export function m11MutationProducerModifier(
  state: GameState,
  producerId: ProducerId,
): Readonly<{ rate: number; cost: number }> {
  const active = chosenCardEffects(state).filter((effects) => effects.producerMultiplier !== 1);
  const appliesToMyc = producerId === "myc";
  const rate = appliesToMyc
    ? active.reduce((value, effects) => value * effects.producerMultiplier, 1)
    : 1;
  const cost = appliesToMyc
    ? active.reduce((value, effects) => value * effects.producerCostMultiplier, 1)
    : 1;
  return { rate, cost };
}

/** Capacity/viability/vessel-weighted local average; unaffected regions remain at baseline. */
export function m11RegionalProducerModifier(state: GameState, producerId: ProducerId): number {
  const affinity = AFFINITY[producerId];
  if (affinity === undefined) throw new Error("M11 producer affinity is unavailable.");
  const modifiers = m11InflammationModifiers(state);
  let numerator = 0;
  let denominator = 0;
  for (const region of state.regions) {
    if (!Number.isSafeInteger(region.capacity) || region.capacity < 1 || region.viability <= 0)
      continue;
    const hasVessel = region.vesselLinkIds.length > 0;
    const weight = region.capacity * region.viability * (hasVessel ? affinity : 1);
    const mask = state.maskedRegions.includes(region.id) ? 0.7 : 1;
    const inflammation = modifiers.byRegion[region.id] === undefined ? 1 : 1.2;
    numerator += weight * mask * inflammation;
    denominator += weight;
  }
  const modifier = denominator === 0 ? 1 : numerator / denominator;
  if (!Number.isFinite(modifier) || modifier < 0.7 || modifier > 1.2) {
    throw new Error("M11 regional producer modifier is invalid.");
  }
  return modifier;
}

export function effectiveM11Pressures(
  state: GameState,
): Readonly<{ damage: number; immune: number }> {
  const modifiers = m11InflammationModifiers(state);
  const activeCount = Object.keys(modifiers.byRegion).length;
  const damage = state.damagePressure + activeCount + mutationEffectTotal(state, "damagePressure");
  const immune = Math.max(
    0,
    state.immunePressure +
      activeCount +
      mutationEffectTotal(state, "immunePressure") -
      state.maskedRegions.length,
  );
  if (!Number.isSafeInteger(damage) || !Number.isSafeInteger(immune) || damage < 0 || immune < 0) {
    throw new Error("M11 effective pressures are invalid.");
  }
  return { damage, immune };
}

export function m11RouteDiscoveryGainPerSecond(state: GameState): number {
  const activeCount = Object.keys(m11InflammationModifiers(state).byRegion).length;
  const gain = activeCount + mutationEffectTotal(state, "routeDiscoveryBonus");
  if (!Number.isSafeInteger(gain) || gain < 0 || gain > 65)
    throw new Error("M11 route gain is invalid.");
  return gain;
}
