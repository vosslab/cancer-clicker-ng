import type { EventId, RegionId } from "../types/ids.js";
import type { GameState, InflammationEpisode } from "../types/state.js";
import { m11ElapsedClock } from "./m11_tick_effects.js";

/** M11 keeps episodes short enough to be a tactical decision rather than background state. */
export const INFLAMMATION_DURATION_MS = 30_000;
export const MAX_ACTIVE_INFLAMMATION_EPISODES = 64;
export const MASKED_REGION_EFFICIENCY_MULTIPLIER = 0.7;
export const INFLAMMATION_SUBSTRATE_ACCESS_MULTIPLIER = 1.2;
export const INFLAMMATION_ROUTE_DISCOVERY_OPPORTUNITY = 1;
export const INFLAMMATION_DAMAGE_PRESSURE = 1;
export const INFLAMMATION_IMMUNE_PRESSURE = 1;

export type M11InflammationRegionalModifier = Readonly<{
  regionId: RegionId;
  substrateAccessMultiplier: number;
  routeDiscoveryOpportunity: number;
  damagePressure: number;
  immunePressure: number;
}>;
export type M11InflammationModifiers = Readonly<{
  byRegion: Readonly<Record<string, M11InflammationRegionalModifier>>;
  routeDiscoveryOpportunity: number;
  damagePressure: number;
  immunePressure: number;
}>;
export type M11InflammationTimelineProjection = Readonly<{
  episodes: readonly InflammationEpisode[];
  regionalInflammation: Readonly<Record<string, number>>;
  modifiers: M11InflammationModifiers;
}>;

function natural(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function timelineClock(state: GameState, elapsedMs: number): number {
  if (!natural(elapsedMs)) {
    throw new Error("Inflammation timeline time is invalid.");
  }
  const baseClock = m11ElapsedClock(state);
  if (baseClock > Number.MAX_SAFE_INTEGER - elapsedMs) {
    throw new Error("Inflammation timeline time cannot advance safely.");
  }
  return baseClock + elapsedMs;
}

function canonicalEpisode(
  state: GameState,
  episode: InflammationEpisode,
  seenIds: Set<EventId>,
  seenRegions: Set<RegionId>,
): void {
  if (
    !seenIds.add(episode.id) ||
    !seenRegions.add(episode.regionId) ||
    !state.regions.some((region) => region.id === episode.regionId && region.viability > 0) ||
    !Number.isSafeInteger(episode.deadlineMs) ||
    episode.deadlineMs < 1
  ) {
    throw new Error("Inflammation episode state is invalid.");
  }
}

/** The fixed order is expire, derive per-region effects, then expose production modifiers. */
export function projectM11InflammationTimeline(
  state: GameState,
  elapsedMs: number,
): M11InflammationTimelineProjection {
  const clock = timelineClock(state, elapsedMs);
  const seenIds = new Set<EventId>();
  const seenRegions = new Set<RegionId>();
  if (state.inflammationEpisodes.length > MAX_ACTIVE_INFLAMMATION_EPISODES) {
    throw new Error("Inflammation episode capacity is invalid.");
  }
  for (const episode of state.inflammationEpisodes)
    canonicalEpisode(state, episode, seenIds, seenRegions);
  const episodes = state.inflammationEpisodes.filter((episode) => episode.deadlineMs > clock);
  const regionalInflammation: Record<string, number> = {};
  const byRegion: Record<string, M11InflammationRegionalModifier> = {};
  let routeDiscoveryOpportunity = 0;
  let damagePressure = 0;
  let immunePressure = 0;
  for (const episode of episodes) {
    regionalInflammation[episode.regionId] = 1;
    const modifier: M11InflammationRegionalModifier = {
      regionId: episode.regionId,
      substrateAccessMultiplier: INFLAMMATION_SUBSTRATE_ACCESS_MULTIPLIER,
      routeDiscoveryOpportunity: INFLAMMATION_ROUTE_DISCOVERY_OPPORTUNITY,
      damagePressure: INFLAMMATION_DAMAGE_PRESSURE,
      immunePressure: INFLAMMATION_IMMUNE_PRESSURE,
    };
    byRegion[episode.regionId] = modifier;
    routeDiscoveryOpportunity += modifier.routeDiscoveryOpportunity;
    damagePressure += modifier.damagePressure;
    immunePressure += modifier.immunePressure;
  }
  return {
    episodes,
    regionalInflammation,
    modifiers: { byRegion, routeDiscoveryOpportunity, damagePressure, immunePressure },
  };
}

/** Applies only durable episode expiry; tick code consumes the accompanying pure modifiers. */
export function applyM11InflammationTimeline(state: GameState, elapsedMs: number): GameState {
  const projection = projectM11InflammationTimeline(state, elapsedMs);
  return {
    ...state,
    inflammationEpisodes: projection.episodes,
    regionalInflammation: projection.regionalInflammation,
  };
}

/** Concealment keeps immune pressure down at a documented local output-efficiency cost. */
export function regionalVisibilityEfficiency(state: GameState, regionId: RegionId): number {
  return state.maskedRegions.includes(regionId) ? MASKED_REGION_EFFICIENCY_MULTIPLIER : 1;
}
