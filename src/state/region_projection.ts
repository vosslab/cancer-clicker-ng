import type { GameState, RegionState } from "../types/state.js";

function withoutKey(
  source: Readonly<Record<string, number>>,
  key: string,
): Readonly<Record<string, number>> {
  return Object.fromEntries(Object.entries(source).filter(([candidate]) => candidate !== key));
}

function withoutRegionKey(
  source: Readonly<Record<string, number>>,
  regionId: string,
): Readonly<Record<string, number>> {
  return Object.fromEntries(
    Object.entries(source).filter(
      ([candidate]) => candidate !== regionId && !candidate.startsWith(`region:${regionId}:`),
    ),
  );
}

/**
 * Projects the one destructive region transition and every persisted relation it owns.
 * Callers must record the accepted projection through the sole event reducer.
 */
export function removeRegionProjection(state: GameState, target: RegionState): Partial<GameState> {
  const senescenceId = target.senescenceEventId;
  const regions = state.regions.filter((candidate) => candidate.id !== target.id);
  const survivingRouteIds = new Set<string>(regions.flatMap((candidate) => candidate.routeIds));
  const orphanedRouteIds = new Set<string>(
    target.routeIds.filter((route) => !survivingRouteIds.has(route)),
  );
  return {
    regions,
    seededSites: state.seededSites.filter((id) => id !== target.id),
    maskedRegions: state.maskedRegions.filter((id) => id !== target.id),
    senescentRegions: state.senescentRegions.filter((id) => id !== target.id),
    telomereReserveByRegion: withoutKey(state.telomereReserveByRegion, target.id),
    immuneVisibilityByRegion: withoutKey(state.immuneVisibilityByRegion, target.id),
    regionalInflammation: withoutKey(state.regionalInflammation, target.id),
    phenotypeCooldowns: withoutKey(state.phenotypeCooldowns, target.id),
    regionalModifiers: withoutRegionKey(state.regionalModifiers, target.id),
    pendingDamageEvents: state.pendingDamageEvents.filter((event) => event.regionId !== target.id),
    pendingTransitEvents: state.pendingTransitEvents.filter(
      (event) => !orphanedRouteIds.has(event.routeId),
    ),
    committedCellCommitments: Object.fromEntries(
      Object.entries(state.committedCellCommitments).filter(
        ([route]) => !orphanedRouteIds.has(route),
      ),
    ),
    routeRiskById: Object.fromEntries(
      Object.entries(state.routeRiskById).filter(([route]) => !orphanedRouteIds.has(route)),
    ),
    inflammationEpisodes: state.inflammationEpisodes.filter(
      (event) => event.regionId !== target.id,
    ),
    clearanceQueue:
      senescenceId === undefined
        ? state.clearanceQueue
        : state.clearanceQueue.filter((id) => id !== senescenceId),
    secretoryEffects:
      senescenceId === undefined
        ? withoutKey(state.secretoryEffects, target.id)
        : withoutKey(withoutKey(state.secretoryEffects, target.id), `senescence:${senescenceId}`),
  };
}

export type RemoveRegionProjection = typeof removeRegionProjection;
