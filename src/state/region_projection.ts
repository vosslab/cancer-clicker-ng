import type { GameState, RegionState } from "../types/state.js";

function withoutKey(
  source: Readonly<Record<string, number>>,
  key: string,
): Readonly<Record<string, number>> {
  return Object.fromEntries(Object.entries(source).filter(([candidate]) => candidate !== key));
}

/**
 * Projects the one destructive region transition and every persisted relation it owns.
 * Callers must record the accepted projection through the sole event reducer.
 */
export function removeRegionProjection(state: GameState, target: RegionState): Partial<GameState> {
  const regions = state.regions.filter((candidate) => candidate.id !== target.id);
  const survivingRouteIds = new Set<string>(regions.flatMap((candidate) => candidate.routeIds));
  const orphanedRouteIds = new Set<string>(
    target.routeIds.filter((route) => !survivingRouteIds.has(route)),
  );
  return {
    regions,
    seededSites: state.seededSites.filter((id) => id !== target.id),
    maskedRegions: state.maskedRegions.filter((id) => id !== target.id),
    telomereReserveByRegion: withoutKey(state.telomereReserveByRegion, target.id),
    immuneVisibilityByRegion: withoutKey(state.immuneVisibilityByRegion, target.id),
    regionalInflammation: withoutKey(state.regionalInflammation, target.id),
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
    lateHallmarks: {
      ...state.lateHallmarks,
      plasticity: {
        switchCooldownByRegion: withoutKey(
          state.lateHallmarks.plasticity.switchCooldownByRegion,
          target.id,
        ),
      },
      senescence: {
        pendingDecisions: state.lateHallmarks.senescence.pendingDecisions.filter(
          (decision) => decision.regionId !== target.id,
        ),
        retainedRegions: state.lateHallmarks.senescence.retainedRegions.filter(
          (record) => record.regionId !== target.id,
        ),
      },
    },
  };
}

export type RemoveRegionProjection = typeof removeRegionProjection;
