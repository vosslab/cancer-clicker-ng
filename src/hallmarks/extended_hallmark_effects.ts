import { findMutationDraftCard } from "./extended_hallmark_catalog.js";
import { extendedHallmarkInflammationModifiers } from "./extended_hallmark_tick.js";
import type { ProducerId } from "../types/ids.js";
import type { GameState } from "../types/state.js";
import type { MutationCardEffects } from "./extended_hallmark_types.js";

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
    .map((id) => findMutationDraftCard(id)?.effects)
    .filter(isMutationCardEffects);
}

function mutationEffectTotal(
  state: GameState,
  key: "routeDiscoveryBonus" | "damagePressure" | "immunePressure",
): number {
  return chosenCardEffects(state).reduce((total, effects) => total + effects[key], 0);
}

export function extendedHallmarkConversionYieldMultiplier(state: GameState): number {
  return chosenCardEffects(state).reduce(
    (multiplier, effects) => multiplier * effects.conversionYieldMultiplier,
    1,
  );
}

export function extendedHallmarkMaskTokenCost(state: GameState): number {
  return chosenCardEffects(state).reduce(
    (cost, effects) => Math.min(cost, effects.maskTokenCost),
    1,
  );
}

export function mutationDraftProducerModifier(
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
export function extendedHallmarkRegionalProducerModifier(
  state: GameState,
  producerId: ProducerId,
): number {
  const affinity = AFFINITY[producerId];
  if (affinity === undefined)
    throw new Error("extended-hallmark producer affinity is unavailable.");
  const modifiers = extendedHallmarkInflammationModifiers(state);
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
    throw new Error("extended-hallmark regional producer modifier is invalid.");
  }
  return modifier;
}

export function effectiveExtendedHallmarkPressures(
  state: GameState,
): Readonly<{ damage: number; immune: number }> {
  const modifiers = extendedHallmarkInflammationModifiers(state);
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
    throw new Error("extended-hallmark effective pressures are invalid.");
  }
  return { damage, immune };
}

export function extendedHallmarkRouteDiscoveryGainPerSecond(state: GameState): number {
  const activeCount = Object.keys(extendedHallmarkInflammationModifiers(state).byRegion).length;
  const gain = activeCount + mutationEffectTotal(state, "routeDiscoveryBonus");
  if (!Number.isSafeInteger(gain) || gain < 0 || gain > 65)
    throw new Error("extended-hallmark route gain is invalid.");
  return gain;
}
