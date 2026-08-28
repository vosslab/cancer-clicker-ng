import { eventId } from "../../brands.js";
import {
  hasReachedExtendedHallmarkUnlock,
  extendedHallmarkDefinition,
} from "../extended_hallmark_catalog.js";
import {
  INFLAMMATION_DURATION_MS,
  MAX_ACTIVE_INFLAMMATION_EPISODES,
  projectInflammationTimeline,
} from "../inflammation_timeline.js";
import { extendedHallmarkElapsedClock } from "../extended_hallmark_tick.js";
import { lateHallmarkInflammationDurationMultiplier } from "../late_hallmark_effects.js";
import { effectiveImmuneVisibility } from "./immune_visibility.js";
import type {
  ActivateInflammationOperation,
  ExtendedHallmarkHandler,
  ExtendedHallmarkHandlerResult,
} from "../extended_hallmark_types.js";
import type { GameState, RegionState } from "../../types/state.js";

function natural(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function requireOwnedAndUnlocked(state: GameState): void {
  const definition = extendedHallmarkDefinition("tumor_promoting_inflammation");
  const owned = state.hallmarkLevels.some(
    (level) => level.id === definition.id && natural(level.level) && level.level >= 1,
  );
  if (!owned || !hasReachedExtendedHallmarkUnlock(state.currentStage, definition.key)) {
    throw new Error("Inflammation is locked.");
  }
}

function targetRegion(
  state: GameState,
  regionId: ActivateInflammationOperation["regionId"],
): RegionState {
  const region = state.regions.find((candidate) => candidate.id === regionId);
  if (!region || region.viability <= 0 || region.vesselLinkIds.length === 0) {
    throw new Error("Inflammation target is unavailable.");
  }
  if (
    state.maskedRegions.includes(region.id) ||
    effectiveImmuneVisibility(state, region.id) === 0
  ) {
    throw new Error("Inflammation target must be immune-visible.");
  }
  return region;
}

function canonicalPreconditions(state: GameState, appliedAtMs: number): void {
  if (!natural(state.activeTimeMs) || appliedAtMs !== state.activeTimeMs) {
    throw new Error("Inflammation operation is stale.");
  }
  if (!Number.isSafeInteger(state.deterministicSeed) || !natural(state.eventSequence)) {
    throw new Error("Inflammation identity state is invalid.");
  }
  const regionIds = new Set<string>();
  for (const region of state.regions) {
    if (
      !regionIds.add(region.id) ||
      !Number.isFinite(region.viability) ||
      region.viability < 0 ||
      region.viability > 1 ||
      !Number.isSafeInteger(region.capacity) ||
      region.capacity < 1
    ) {
      throw new Error("Inflammation region state is invalid.");
    }
  }
  if (
    state.maskedRegions.length !== new Set(state.maskedRegions).size ||
    !state.maskedRegions.every((id) => regionIds.has(id)) ||
    !Object.entries(state.immuneVisibilityByRegion).every(
      ([id, visibility]) => regionIds.has(id) && natural(visibility) && visibility <= 1,
    ) ||
    !Object.entries(state.regionalInflammation).every(
      ([id, value]) => regionIds.has(id) && value === 1,
    )
  ) {
    throw new Error("Inflammation regional state is invalid.");
  }
  const projection = projectInflammationTimeline(state, 0);
  if (projection.episodes.length !== state.inflammationEpisodes.length) {
    throw new Error("Inflammation episode is expired.");
  }
  if (state.inflammationEpisodes.length >= MAX_ACTIVE_INFLAMMATION_EPISODES) {
    throw new Error("Inflammation episode capacity is exhausted.");
  }
}

export function inflammationEpisodeId(
  state: GameState,
  regionId: ActivateInflammationOperation["regionId"],
): ReturnType<typeof eventId> {
  return eventId(
    `inflammation:${state.deterministicSeed}:${state.eventSequence}:${state.activeTimeMs}:${regionId}`,
  );
}

/** Starts one bounded regional episode; the timeline consumer owns its later expiry projection. */
export function applyInflammation(
  context: Readonly<{
    state: GameState;
    operation: ActivateInflammationOperation;
    appliedAtMs: number;
  }>,
): ExtendedHallmarkHandlerResult {
  const { state, operation, appliedAtMs } = context;
  if (
    operation.type !== "activate-inflammation" ||
    operation.hallmark !== "tumor_promoting_inflammation"
  ) {
    throw new Error("Inflammation operation is invalid.");
  }
  canonicalPreconditions(state, appliedAtMs);
  requireOwnedAndUnlocked(state);
  const region = targetRegion(state, operation.regionId);
  if (state.inflammationEpisodes.some((episode) => episode.regionId === region.id)) {
    throw new Error("Inflammation episode is already active.");
  }
  const deadlineClock = extendedHallmarkElapsedClock(state);
  const durationMs = Math.max(
    1,
    Math.round(INFLAMMATION_DURATION_MS * lateHallmarkInflammationDurationMultiplier(state)),
  );
  if (!Number.isSafeInteger(durationMs) || deadlineClock > Number.MAX_SAFE_INTEGER - durationMs) {
    throw new Error("Inflammation deadline cannot advance safely.");
  }
  const episode = {
    id: inflammationEpisodeId(state, region.id),
    regionId: region.id,
    deadlineMs: deadlineClock + durationMs,
  };
  const next = {
    ...state,
    inflammationEpisodes: [...state.inflammationEpisodes, episode],
    regionalInflammation: { ...state.regionalInflammation, [region.id]: 1 },
  };
  if (next.eventSequence !== state.eventSequence)
    throw new Error("extended-hallmark handlers cannot sequence events.");
  return next;
}

export const INFLAMMATION_HANDLER: ExtendedHallmarkHandler<ActivateInflammationOperation> = {
  hallmark: "tumor_promoting_inflammation",
  apply: applyInflammation,
};
