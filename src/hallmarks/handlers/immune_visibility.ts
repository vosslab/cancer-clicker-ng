import { m11HallmarkDefinition, hasReachedM11Unlock } from "../m11_catalog.js";
import { MAX_ACTIVE_INFLAMMATION_EPISODES } from "../m11_timeline.js";
import type { M11Handler, M11HandlerResult, SetRegionMaskOperation } from "../m11_types.js";
import type { GameState, RegionState } from "../../types/state.js";
import { m11MaskTokenCost } from "../m11_authoritative_effects.js";

export const MAX_CONCEALMENT_TOKENS = 12;
export const CONCEALMENT_TOKEN_COST = 1;

function natural(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function requireOwnedAndUnlocked(state: GameState): void {
  const definition = m11HallmarkDefinition("immune_destruction_avoidance");
  const owned = state.hallmarkLevels.some(
    (level) => level.id === definition.id && natural(level.level) && level.level >= 1,
  );
  if (!owned || !hasReachedM11Unlock(state.currentStage, definition.key)) {
    throw new Error("Immune visibility management is locked.");
  }
}

function requireCanonicalState(state: GameState, appliedAtMs: number): void {
  if (!natural(state.activeTimeMs) || appliedAtMs !== state.activeTimeMs) {
    throw new Error("Immune visibility operation is stale.");
  }
  if (!natural(state.concealmentTokens) || state.concealmentTokens > MAX_CONCEALMENT_TOKENS) {
    throw new Error("Concealment tokens are invalid.");
  }
  const known = new Set<string>();
  for (const region of state.regions) {
    if (
      !known.add(region.id) ||
      !natural(region.capacity) ||
      region.capacity < 1 ||
      !Number.isFinite(region.viability) ||
      region.viability < 0 ||
      region.viability > 1
    ) {
      throw new Error("Immune visibility region state is invalid.");
    }
  }
  if (
    state.maskedRegions.length !== new Set(state.maskedRegions).size ||
    !state.maskedRegions.every((id) => known.has(id)) ||
    state.inflammationEpisodes.length > MAX_ACTIVE_INFLAMMATION_EPISODES ||
    !Object.entries(state.immuneVisibilityByRegion).every(
      ([id, visibility]) => known.has(id) && natural(visibility) && visibility <= 1,
    )
  ) {
    throw new Error("Immune visibility state is invalid.");
  }
  for (const maskedId of state.maskedRegions) {
    if (state.immuneVisibilityByRegion[maskedId] !== 0) {
      throw new Error("Masked region visibility is invalid.");
    }
  }
}

function targetRegion(state: GameState, regionId: SetRegionMaskOperation["regionId"]): RegionState {
  const region = state.regions.find((candidate) => candidate.id === regionId);
  if (!region || region.viability <= 0) throw new Error("Immune visibility target is unavailable.");
  return region;
}

function noActiveEpisode(state: GameState, region: RegionState): void {
  if (state.inflammationEpisodes.some((episode) => episode.regionId === region.id)) {
    throw new Error("Active inflammation prevents a visibility change.");
  }
}

function applyMask(state: GameState, region: RegionState): GameState {
  if (state.maskedRegions.includes(region.id)) throw new Error("Region is already concealed.");
  const cost = m11MaskTokenCost(state);
  if (state.concealmentTokens < cost) {
    throw new Error("Concealment tokens are insufficient.");
  }
  const immuneVisibilityByRegion = { ...state.immuneVisibilityByRegion, [region.id]: 0 };
  return {
    ...state,
    concealmentTokens: state.concealmentTokens - cost,
    immuneVisibilityByRegion,
    maskedRegions: [...state.maskedRegions, region.id],
  };
}

function applyUnmask(state: GameState, region: RegionState): GameState {
  if (!state.maskedRegions.includes(region.id)) throw new Error("Region is already visible.");
  const cost = m11MaskTokenCost(state);
  if (state.concealmentTokens > MAX_CONCEALMENT_TOKENS - cost) {
    throw new Error("Concealment refund would overflow.");
  }
  const { [region.id]: _restoredBaseline, ...immuneVisibilityByRegion } =
    state.immuneVisibilityByRegion;
  return {
    ...state,
    concealmentTokens: state.concealmentTokens + cost,
    immuneVisibilityByRegion,
    maskedRegions: state.maskedRegions.filter((id) => id !== region.id),
  };
}

/** Applies a token-conserving, one-region visibility choice without sequencing an event. */
export function applyImmuneVisibility(
  context: Readonly<{ state: GameState; operation: SetRegionMaskOperation; appliedAtMs: number }>,
): M11HandlerResult {
  const { state, operation, appliedAtMs } = context;
  if (
    operation.type !== "set-region-mask" ||
    operation.hallmark !== "immune_destruction_avoidance"
  ) {
    throw new Error("Immune visibility operation is invalid.");
  }
  requireCanonicalState(state, appliedAtMs);
  requireOwnedAndUnlocked(state);
  const region = targetRegion(state, operation.regionId);
  noActiveEpisode(state, region);
  const next = operation.masked ? applyMask(state, region) : applyUnmask(state, region);
  if (next.eventSequence !== state.eventSequence)
    throw new Error("M11 handlers cannot sequence events.");
  return next;
}

export const IMMUNE_VISIBILITY_HANDLER: M11Handler<SetRegionMaskOperation> = {
  hallmark: "immune_destruction_avoidance",
  apply: applyImmuneVisibility,
};
