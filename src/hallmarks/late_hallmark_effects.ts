import {
  hasReachedLateHallmarkActivation,
  lateHallmarkDefinition,
} from "./late_hallmark_catalog.js";
import { plasticityDefinition } from "./plasticity_catalog.js";
import { findLateProgramOption, LATE_PROGRAM_CATALOG } from "./program_catalog.js";
import { senescenceDefinition } from "./senescence_catalog.js";
import type {
  LateHallmarkKey,
  LateProgramDefinition,
  MicrobiomeEffects,
  MicrobiomeOfferSnapshot,
  SenescenceDecision,
} from "./late_hallmark_types.js";
import { compare, fromSafeInteger } from "../bignum/bignum.js";
import type { HallmarkId, RegionId, RouteId } from "../types/ids.js";
import type { GameState, Phenotype, RegionState } from "../types/state.js";
import { PLASTICITY_PHENOTYPES } from "./plasticity_catalog.js";
import {
  cultureLateProgramInterfacesAvailable,
  culturePhenotypePreference,
} from "../prestige/culture_effects.js";

const NEUTRAL_MICROBIOME_EFFECTS: MicrobiomeEffects = Object.freeze({
  substrateConversionMultiplier: 1,
  inflammationDurationMultiplier: 1,
  immuneVisibilityDelta: 0,
});

function finite(value: number, label: string): number {
  if (!Number.isFinite(value)) throw new Error(`${label} must be finite.`);
  return value;
}

function bounded(value: number, minimum: number, maximum: number, label: string): number {
  finite(value, label);
  return Math.min(maximum, Math.max(minimum, value));
}

function ownsHallmark(state: GameState, id: HallmarkId): boolean {
  return state.hallmarkLevels.some(
    (level) => level.id === id && Number.isSafeInteger(level.level) && level.level > 0,
  );
}

function natural(value: number, label: string): void {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error(`${label} must be natural.`);
}

function remainingDeadline(deadline: number | null | undefined, atMs: number): number {
  if (deadline === null || deadline === undefined) return 0;
  natural(deadline, "Cooldown deadline");
  return deadline > atMs ? deadline - atMs : 0;
}

function pendingSenescenceDecision(
  state: GameState,
  regionId: RegionId,
): SenescenceDecision | undefined {
  return state.lateHallmarks.senescence.pendingDecisions.find(
    (decision) => decision.regionId === regionId,
  );
}

function retainedSenescenceRelation(state: GameState, regionId: RegionId): boolean {
  return state.lateHallmarks.senescence.retainedRegions.some(
    (record) => record.regionId === regionId,
  );
}

export type PhenotypeEligibilityReason =
  | "plasticity-inactive"
  | "region-unavailable"
  | "senescence-pending"
  | "senescence-retained"
  | "cooldown-active";

export type PhenotypeEligibilityQuote = Readonly<{
  regionId: RegionId;
  currentPhenotype: Phenotype | null;
  eligibleChoices: readonly Phenotype[];
  eligible: boolean;
  reason: PhenotypeEligibilityReason | null;
  remainingCooldownMs: number;
}>;

/**
 * Reducer-aligned phenotype legality, expressed as presentation-safe domain data.
 * Pending and retained senescence relations exclude a region before branch availability is tested.
 */
export function phenotypeEligibilityQuote(
  state: GameState,
  regionId: RegionId,
  atMs: number,
): PhenotypeEligibilityQuote {
  natural(atMs, "Phenotype quote time");
  const region = state.regions.find((candidate) => candidate.id === regionId);
  if (!region)
    return {
      regionId,
      currentPhenotype: null,
      eligibleChoices: Object.freeze([]),
      eligible: false,
      reason: "region-unavailable",
      remainingCooldownMs: 0,
    };
  if (pendingSenescenceDecision(state, regionId))
    return {
      regionId,
      currentPhenotype: region.phenotype,
      eligibleChoices: Object.freeze([]),
      eligible: false,
      reason: "senescence-pending",
      remainingCooldownMs: 0,
    };
  if (retainedSenescenceRelation(state, regionId))
    return {
      regionId,
      currentPhenotype: region.phenotype,
      eligibleChoices: Object.freeze([]),
      eligible: false,
      reason: "senescence-retained",
      remainingCooldownMs: 0,
    };
  if (!isLateHallmarkOperational(state, "phenotypic_plasticity"))
    return {
      regionId,
      currentPhenotype: region.phenotype,
      eligibleChoices: Object.freeze([]),
      eligible: false,
      reason: "plasticity-inactive",
      remainingCooldownMs: 0,
    };
  const remainingCooldownMs = remainingDeadline(
    state.lateHallmarks.plasticity.switchCooldownByRegion[regionId],
    atMs,
  );
  if (remainingCooldownMs > 0)
    return {
      regionId,
      currentPhenotype: region.phenotype,
      eligibleChoices: Object.freeze([]),
      eligible: false,
      reason: "cooldown-active",
      remainingCooldownMs,
    };
  const preference = culturePhenotypePreference(state);
  const eligibleChoices =
    preference === null
      ? PLASTICITY_PHENOTYPES
      : Object.freeze([
          preference,
          ...PLASTICITY_PHENOTYPES.filter((phenotype) => phenotype !== preference),
        ]);
  return {
    regionId,
    currentPhenotype: region.phenotype,
    eligibleChoices,
    eligible: true,
    reason: null,
    remainingCooldownMs: 0,
  };
}

/** The public eligible-region list keeps UI selectors out of durable legality rules. */
export function eligiblePhenotypeRegions(
  state: GameState,
  atMs: number,
): readonly PhenotypeEligibilityQuote[] {
  natural(atMs, "Phenotype quote time");
  return Object.freeze(
    state.regions
      .map((region) => phenotypeEligibilityQuote(state, region.id, atMs))
      .filter((quote) => quote.eligible),
  );
}

export type ProgramEligibilityReason =
  | "epigenetic-inactive"
  | "target-unavailable"
  | "target-unowned"
  | "cooldown-active"
  | "insufficient-atp";

export type ProgramOptionQuote = Readonly<{
  option: LateProgramDefinition;
  eligible: boolean;
  reason: ProgramEligibilityReason | null;
}>;

export type ProgramEligibilityQuote = Readonly<{
  hallmarkId: HallmarkId;
  currentOptionId: LateProgramDefinition["id"] | null;
  options: readonly ProgramOptionQuote[];
  available: boolean;
  reason: ProgramEligibilityReason | null;
  remainingCooldownMs: number;
}>;

/** Gives each catalog option its reducer-equivalent ATP/cooldown availability. */
export function programEligibilityQuote(
  state: GameState,
  hallmarkId: HallmarkId,
  atMs: number,
): ProgramEligibilityQuote {
  natural(atMs, "Program quote time");
  const options = LATE_PROGRAM_CATALOG.filter((option) => option.target === hallmarkId);
  const assignment = state.lateHallmarks.epigenetic.assignments.find(
    (candidate) => candidate.hallmarkId === hallmarkId,
  );
  const currentOptionId = assignment?.optionId ?? null;
  const remainingCooldownMs = remainingDeadline(
    state.lateHallmarks.epigenetic.cooldownDeadlineMs,
    atMs,
  );
  const commonReason: ProgramEligibilityReason | null =
    options.length === 0
      ? "target-unavailable"
      : !isLateHallmarkOperational(state, "epigenetic_reprogramming")
        ? "epigenetic-inactive"
        : !ownsHallmark(state, hallmarkId)
          ? "target-unowned"
          : remainingCooldownMs > 0
            ? "cooldown-active"
            : null;
  const quotedOptions = Object.freeze(
    options.map((option) => {
      const reason =
        commonReason ??
        (compare(state.atp, fromSafeInteger(option.atpCost)) < 0 ? "insufficient-atp" : null);
      return Object.freeze({ option, eligible: reason === null, reason });
    }),
  );
  const available = quotedOptions.some((option) => option.eligible);
  return Object.freeze({
    hallmarkId,
    currentOptionId,
    options: quotedOptions,
    available,
    reason: commonReason ?? (available ? null : "insufficient-atp"),
    remainingCooldownMs,
  });
}

export type MicrobiomeOfferReason = "microbiome-inactive" | "no-offer" | "offer-expired";

export type MicrobiomeOfferQuote = Readonly<{
  offer: MicrobiomeOfferSnapshot | null;
  activeComposition: GameState["lateHallmarks"]["microbiome"]["activeComposition"];
  available: boolean;
  reason: MicrobiomeOfferReason | null;
  remainingOfferMs: number;
}>;

/** Exposes the exact saved offer and its simulation-time installability without redrawing it. */
export function microbiomeOfferQuote(state: GameState, atMs: number): MicrobiomeOfferQuote {
  natural(atMs, "Microbiome quote time");
  const offer = state.lateHallmarks.microbiome.pendingOffer;
  const inactive = !isLateHallmarkOperational(state, "polymorphic_microbiomes");
  const remainingOfferMs = offer === null ? 0 : remainingDeadline(offer.expiresAtMs, atMs);
  const reason: MicrobiomeOfferReason | null = inactive
    ? "microbiome-inactive"
    : offer === null
      ? "no-offer"
      : remainingOfferMs === 0
        ? "offer-expired"
        : null;
  return Object.freeze({
    offer,
    activeComposition: state.lateHallmarks.microbiome.activeComposition,
    available: reason === null,
    reason,
    remainingOfferMs,
  });
}

export type SenescenceResolutionReason =
  "senescence-inactive" | "decision-unavailable" | "region-unavailable";

export type SenescenceResolutionQuote = Readonly<{
  decision: SenescenceDecision | null;
  available: boolean;
  keepEligible: boolean;
  clearEligible: boolean;
  reason: SenescenceResolutionReason | null;
}>;

/** Resolves pending-decision availability while keeping action consequences in the catalog/reducer. */
export function senescenceResolutionQuote(
  state: GameState,
  decisionId: SenescenceDecision["id"],
  atMs: number,
): SenescenceResolutionQuote {
  natural(atMs, "Senescence quote time");
  const decision = state.lateHallmarks.senescence.pendingDecisions.find(
    (candidate) => candidate.id === decisionId,
  );
  if (!isLateHallmarkOperational(state, "senescent_cells"))
    return Object.freeze({
      decision: decision ?? null,
      available: false,
      keepEligible: false,
      clearEligible: false,
      reason: "senescence-inactive",
    });
  if (!decision)
    return Object.freeze({
      decision: null,
      available: false,
      keepEligible: false,
      clearEligible: false,
      reason: "decision-unavailable",
    });
  const regionExists = state.regions.some((region) => region.id === decision.regionId);
  return Object.freeze({
    decision,
    available: regionExists,
    keepEligible: regionExists,
    clearEligible: regionExists,
    reason: regionExists ? null : "region-unavailable",
  });
}

/** True only when the closed catalog branch is both owned and stage-activated. */
export function isLateHallmarkOperational(state: GameState, key: LateHallmarkKey): boolean {
  const definition = lateHallmarkDefinition(key);
  return (
    ownsHallmark(state, definition.id) &&
    hasReachedLateHallmarkActivation(state.currentStage, key) &&
    cultureLateProgramInterfacesAvailable(state)
  );
}

function activeProgramEffects(state: GameState): readonly LateProgramDefinition[] {
  if (!isLateHallmarkOperational(state, "epigenetic_reprogramming")) return [];
  return state.lateHallmarks.epigenetic.assignments
    .map((assignment) => {
      if (!ownsHallmark(state, assignment.hallmarkId)) return undefined;
      const option = findLateProgramOption(assignment.optionId);
      return option?.target === assignment.hallmarkId ? option : undefined;
    })
    .filter((option): option is LateProgramDefinition => option !== undefined);
}

/** A retained region stays in the topology but no longer contributes dividing output. */
export function isRetainedSenescentRegion(state: GameState, regionId: RegionId): boolean {
  if (!isLateHallmarkOperational(state, "senescent_cells")) return false;
  return state.lateHallmarks.senescence.retainedRegions.some(
    (record) => record.regionId === regionId,
  );
}

function productiveRegionWeight(region: RegionState): number {
  const weight = region.capacity * region.viability;
  return Number.isFinite(weight) && weight > 0 ? weight : 0;
}

/**
 * Projects regional phenotype/program and retained-senescence effects onto the one shared
 * production boundary. Regions without an active late branch retain the neutral multiplier.
 */
export function lateHallmarkProductionMultiplier(state: GameState): number {
  let weightedMultiplier = 0;
  let totalWeight = 0;
  for (const region of state.regions) {
    const weight = productiveRegionWeight(region);
    if (weight === 0) continue;
    totalWeight += weight;
    if (isRetainedSenescentRegion(state, region.id)) continue;
    const phenotypeMultiplier = isLateHallmarkOperational(state, "phenotypic_plasticity")
      ? plasticityDefinition(region.phenotype).effects.productionPerSecondMultiplier
      : 1;
    weightedMultiplier += weight * phenotypeMultiplier;
  }
  if (totalWeight === 0) return 1;
  const programMultiplier = activeProgramEffects(state).reduce(
    (multiplier, option) => multiplier * option.effects.productionPerSecondMultiplier,
    1,
  );
  return bounded(
    (weightedMultiplier / totalWeight) * programMultiplier,
    0,
    16,
    "Late-hallmark production multiplier",
  );
}

function routeOwner(state: GameState, routeId: RouteId): RegionState | undefined {
  return state.regions.find((region) => region.routeIds.includes(routeId));
}

/** Derives a decision-time route risk without rewriting the durable discovery-risk map. */
export function effectiveLateHallmarkRouteRisk(
  state: GameState,
  routeId: RouteId,
  rawRisk: number,
): number {
  finite(rawRisk, "Route risk");
  const owner = routeOwner(state, routeId);
  let delta = 0;
  if (owner && isLateHallmarkOperational(state, "phenotypic_plasticity")) {
    delta += plasticityDefinition(owner.phenotype).effects.routeRiskDelta;
  }
  for (const option of activeProgramEffects(state)) delta += option.effects.routeRiskDelta;
  return bounded(rawRisk + delta, 0, 1, "Effective route risk");
}

/** Named host-tolerance pressure, local to viable regions and retained senescence records. */
export function lateHallmarkPressure(state: GameState): number {
  let pressure = 0;
  for (const region of state.regions) {
    if (productiveRegionWeight(region) === 0) continue;
    if (isLateHallmarkOperational(state, "phenotypic_plasticity")) {
      pressure += plasticityDefinition(region.phenotype).effects.pressureDelta;
    }
    if (isRetainedSenescentRegion(state, region.id)) {
      const retained = state.lateHallmarks.senescence.retainedRegions.find(
        (record) => record.regionId === region.id,
      );
      if (retained) {
        pressure += senescenceDefinition(retained.cause).retainedEffects
          .localSecretoryPressureDelta;
      }
    }
  }
  for (const option of activeProgramEffects(state)) pressure += option.effects.pressureDelta;
  return bounded(pressure, -64, 64, "Late-hallmark pressure");
}

function activeMicrobiomeEffects(state: GameState): MicrobiomeEffects {
  if (!isLateHallmarkOperational(state, "polymorphic_microbiomes"))
    return NEUTRAL_MICROBIOME_EFFECTS;
  const composition = state.lateHallmarks.microbiome.activeComposition?.composition;
  if (!composition) return NEUTRAL_MICROBIOME_EFFECTS;
  let substrateConversionMultiplier =
    composition.compatibility.effects.substrateConversionMultiplier;
  let inflammationDurationMultiplier =
    composition.compatibility.effects.inflammationDurationMultiplier;
  let immuneVisibilityDelta = composition.compatibility.effects.immuneVisibilityDelta;
  for (const niche of composition.niches) {
    substrateConversionMultiplier *= niche.effects.substrateConversionMultiplier;
    inflammationDurationMultiplier *= niche.effects.inflammationDurationMultiplier;
    immuneVisibilityDelta += niche.effects.immuneVisibilityDelta;
  }
  return Object.freeze({
    substrateConversionMultiplier: bounded(
      substrateConversionMultiplier,
      0,
      16,
      "Microbiome conversion multiplier",
    ),
    inflammationDurationMultiplier: bounded(
      inflammationDurationMultiplier,
      0.05,
      16,
      "Microbiome inflammation duration multiplier",
    ),
    immuneVisibilityDelta: bounded(
      immuneVisibilityDelta,
      -8,
      8,
      "Microbiome immune visibility delta",
    ),
  });
}

export function lateHallmarkConversionYieldMultiplier(state: GameState): number {
  return activeMicrobiomeEffects(state).substrateConversionMultiplier;
}

export function lateHallmarkInflammationDurationMultiplier(state: GameState): number {
  return activeMicrobiomeEffects(state).inflammationDurationMultiplier;
}

/** Keeps the saved concealment choice raw while deriving its operational visibility. */
export function effectiveLateHallmarkImmuneVisibility(
  state: GameState,
  regionId: RegionId,
): number {
  const stored = state.immuneVisibilityByRegion[regionId] ?? 1;
  return bounded(
    stored + activeMicrobiomeEffects(state).immuneVisibilityDelta,
    0,
    8,
    "Effective immune visibility",
  );
}
