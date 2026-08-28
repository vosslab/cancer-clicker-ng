import { projectPendingMutationOffer } from "./mutation_offer_generator.js";
import { projectInflammationTimeline } from "./inflammation_timeline.js";
import type { InflammationModifiers } from "./inflammation_timeline.js";
import type { GameState, InflammationEpisode } from "../types/state.js";
import type { MutationDraftOffer } from "./extended_hallmark_types.js";
import { extendedHallmarkRouteDiscoveryGainPerSecond } from "./extended_hallmark_effects.js";

export type ExtendedHallmarkDurableTickProjection = Readonly<{
  inflammationEpisodes: readonly InflammationEpisode[];
  regionalInflammation: Readonly<Record<string, number>>;
  mutationOffers: readonly MutationDraftOffer[];
  routeDiscoveryProgress: number;
}>;

function natural(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

/** One simulation clock includes offline replay without trusting wall-clock time. */
export function extendedHallmarkElapsedClock(state: GameState): number {
  if (!natural(state.activeTimeMs) || !natural(state.totalOfflineMs)) {
    throw new Error("extended-hallmark elapsed clock is invalid.");
  }
  if (state.activeTimeMs > Number.MAX_SAFE_INTEGER - state.totalOfflineMs) {
    throw new Error("extended-hallmark elapsed clock cannot advance safely.");
  }
  return state.activeTimeMs + state.totalOfflineMs;
}

function clockedState(state: GameState): GameState {
  const clock = extendedHallmarkElapsedClock(state);
  return { ...state, activeTimeMs: clock, totalOfflineMs: 0 };
}

/**
 * extended-hallmark owns only its three durable fields. ASVS 2.3.3: the projection is pure and never
 * returns resources or sequence state, so the reducer can atomically overlay a verified result.
 */
export function projectExtendedHallmarkDurableTickEffects(
  state: GameState,
  elapsedMs: number,
): ExtendedHallmarkDurableTickProjection {
  if (!natural(elapsedMs)) throw new Error("extended-hallmark tick elapsed time is invalid.");
  const timelineState = clockedState(state);
  const timeline = projectInflammationTimeline(timelineState, elapsedMs);
  const durable: GameState = {
    ...state,
    inflammationEpisodes: timeline.episodes,
    regionalInflammation: timeline.regionalInflammation,
  };
  // A zero-duration read must not create a draft outside the valid tick lifecycle.
  const offered = elapsedMs === 0 ? durable : projectPendingMutationOffer(durable);
  let routeDiscoveryProgress = state.routeDiscoveryProgress;
  let remainingMs = elapsedMs;
  let consumedMs = 0;
  while (remainingMs > 0) {
    const offset = (extendedHallmarkElapsedClock(state) + consumedMs) % 1_000;
    const boundary = offset === 0 ? 1_000 : 1_000 - offset;
    const segment = Math.min(remainingMs, boundary);
    remainingMs -= segment;
    consumedMs += segment;
    if (segment === boundary) {
      const atBoundary = {
        ...state,
        activeTimeMs: extendedHallmarkElapsedClock(state) + consumedMs,
        totalOfflineMs: 0,
      };
      const gain = extendedHallmarkRouteDiscoveryGainPerSecond(atBoundary);
      routeDiscoveryProgress += gain;
    }
  }
  if (!Number.isSafeInteger(routeDiscoveryProgress) || routeDiscoveryProgress < 0) {
    throw new Error("extended-hallmark route discovery projection is invalid.");
  }
  return {
    inflammationEpisodes: offered.inflammationEpisodes,
    regionalInflammation: offered.regionalInflammation,
    mutationOffers: offered.mutationOffers,
    routeDiscoveryProgress,
  };
}

/** Active episodes affect resource math only while their deadline has not been reached. */
export function extendedHallmarkInflammationModifiers(state: GameState): InflammationModifiers {
  const timelineState = clockedState(state);
  const projection = projectInflammationTimeline(timelineState, 0);
  return projection.modifiers;
}
