import { projectPendingMutationOffer } from "./mutation_offer_generator.js";
import { projectM11InflammationTimeline } from "./m11_timeline.js";
import type { M11InflammationModifiers } from "./m11_timeline.js";
import type { GameState, InflammationEpisode } from "../types/state.js";
import type { M11MutationOffer } from "./m11_types.js";
import { m11RouteDiscoveryGainPerSecond } from "./m11_authoritative_effects.js";

export type M11DurableTickProjection = Readonly<{
  inflammationEpisodes: readonly InflammationEpisode[];
  regionalInflammation: Readonly<Record<string, number>>;
  mutationOffers: readonly M11MutationOffer[];
  routeDiscoveryProgress: number;
}>;

function natural(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

/** One simulation clock includes offline replay without trusting wall-clock time. */
export function m11ElapsedClock(state: GameState): number {
  if (!natural(state.activeTimeMs) || !natural(state.totalOfflineMs)) {
    throw new Error("M11 elapsed clock is invalid.");
  }
  if (state.activeTimeMs > Number.MAX_SAFE_INTEGER - state.totalOfflineMs) {
    throw new Error("M11 elapsed clock cannot advance safely.");
  }
  return state.activeTimeMs + state.totalOfflineMs;
}

function clockedState(state: GameState): GameState {
  const clock = m11ElapsedClock(state);
  return { ...state, activeTimeMs: clock, totalOfflineMs: 0 };
}

/**
 * M11 owns only its three durable fields. ASVS 2.3.3: the projection is pure and never
 * returns resources or sequence state, so the reducer can atomically overlay a verified result.
 */
export function projectM11DurableTickEffects(
  state: GameState,
  elapsedMs: number,
): M11DurableTickProjection {
  if (!natural(elapsedMs)) throw new Error("M11 tick elapsed time is invalid.");
  const timelineState = clockedState(state);
  const timeline = projectM11InflammationTimeline(timelineState, elapsedMs);
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
    const offset = (m11ElapsedClock(state) + consumedMs) % 1_000;
    const boundary = offset === 0 ? 1_000 : 1_000 - offset;
    const segment = Math.min(remainingMs, boundary);
    remainingMs -= segment;
    consumedMs += segment;
    if (segment === boundary) {
      const atBoundary = {
        ...state,
        activeTimeMs: m11ElapsedClock(state) + consumedMs,
        totalOfflineMs: 0,
      };
      const gain = m11RouteDiscoveryGainPerSecond(atBoundary);
      routeDiscoveryProgress += gain;
    }
  }
  if (!Number.isSafeInteger(routeDiscoveryProgress) || routeDiscoveryProgress < 0) {
    throw new Error("M11 route discovery projection is invalid.");
  }
  return {
    inflammationEpisodes: offered.inflammationEpisodes,
    regionalInflammation: offered.regionalInflammation,
    mutationOffers: offered.mutationOffers,
    routeDiscoveryProgress,
  };
}

/** Active episodes affect resource math only while their deadline has not been reached. */
export function m11InflammationModifiers(state: GameState): M11InflammationModifiers {
  const timelineState = clockedState(state);
  const projection = projectM11InflammationTimeline(timelineState, 0);
  return projection.modifiers;
}
