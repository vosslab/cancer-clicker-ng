import { eventId } from "../../brands.js";
import { coreSixHallmarkDefinition, hasReachedCoreSixUnlock } from "../core_six_catalog.js";
import type { CoreSixHandler, SetVesselLinkOperation } from "../core_six_types.js";
import type { GameState, RegionState } from "../../types/state.js";

/** One region can carry one deliberate vessel link; the choice remains regional, not scalar. */
export const MAX_VESSEL_LINKS_PER_REGION = 1;
/** Small M10 cap; M21 network progression may tune it through a later owned projection. */
export const MAX_ACTIVE_VESSEL_LINKS = 3;
export const MAX_PERFUSED_REGION_CAPACITY = 8;
export const PERFUSION_CAPACITY_DELTA = 2;
export const PERFUSION_OXYGEN_PRESSURE_DELTA = 2;
export const PERFUSION_MAINTENANCE_ATP = 1;

function requireCurrentOperationTime(state: GameState, appliedAtMs: number): void {
  if (!Number.isSafeInteger(appliedAtMs) || appliedAtMs < 0 || appliedAtMs !== state.activeTimeMs) {
    throw new Error("Perfusion operation time is stale.");
  }
}

function requireAngiogenesisOwnership(state: GameState): void {
  const definition = coreSixHallmarkDefinition("angiogenesis");
  const owned = state.hallmarkLevels.some(
    (level) => level.id === definition.id && level.level >= definition.ownership.requiredLevel,
  );
  if (!owned) throw new Error("Angiogenesis must be owned before perfusion can change.");
  if (!hasReachedCoreSixUnlock(state.currentStage, "angiogenesis")) {
    throw new Error("The current stage cannot use regional perfusion.");
  }
}

function canonicalLinkId(region: RegionState): ReturnType<typeof eventId> {
  return eventId(`vessel:${region.id}`);
}

function requireCanonicalRegionLinks(region: RegionState): void {
  const canonicalId = canonicalLinkId(region);
  if (
    region.vesselLinkIds.length > MAX_VESSEL_LINKS_PER_REGION ||
    region.vesselLinkIds.some((linkId) => linkId !== canonicalId)
  ) {
    throw new Error("Perfusion links are corrupted.");
  }
}

/** Counts only live, canonical links: dead regions do not consume the active vascular budget. */
export function countActiveVesselLinks(state: GameState): number {
  let activeLinks = 0;
  for (const region of state.regions) {
    requireCanonicalRegionLinks(region);
    if (region.viability > 0 && region.vesselLinkIds.length === 1) activeLinks += 1;
  }
  return activeLinks;
}

function requirePerfusionCounters(state: GameState, activeLinks: number): void {
  if (
    !Number.isFinite(state.oxygenPressure) ||
    state.oxygenPressure < 0 ||
    state.oxygenPressure > Number.MAX_SAFE_INTEGER ||
    !Number.isSafeInteger(state.vesselMaintenanceAtp) ||
    state.vesselMaintenanceAtp < 0 ||
    activeLinks > MAX_ACTIVE_VESSEL_LINKS ||
    state.vesselMaintenanceAtp !== activeLinks * PERFUSION_MAINTENANCE_ATP
  ) {
    throw new Error("Perfusion counters are invalid.");
  }
}

function targetRegion(state: GameState, operation: SetVesselLinkOperation): RegionState {
  const target = state.regions.find((region) => region.id === operation.regionId);
  if (!target) throw new Error("Perfusion target region is unknown.");
  if (target.viability <= 0) throw new Error("Perfusion target region is not viable.");
  if (!Number.isSafeInteger(target.capacity) || target.capacity < 1) {
    throw new Error("Perfusion target capacity is invalid.");
  }
  return target;
}

function replaceTarget(
  state: GameState,
  target: RegionState,
  replacement: RegionState,
): readonly RegionState[] {
  return state.regions.map((region) => (region.id === target.id ? replacement : region));
}

function linkRegion(state: GameState, target: RegionState, activeLinks: number): GameState {
  const linkId = canonicalLinkId(target);
  if (target.vesselLinkIds.includes(linkId)) throw new Error("Perfusion link already exists.");
  if (target.vesselLinkIds.length >= MAX_VESSEL_LINKS_PER_REGION) {
    throw new Error("Perfusion link capacity is exhausted.");
  }
  if (target.capacity >= MAX_PERFUSED_REGION_CAPACITY) {
    throw new Error("Perfusion target capacity is exhausted.");
  }
  if (activeLinks >= MAX_ACTIVE_VESSEL_LINKS) {
    throw new Error("The active vessel-link capacity is exhausted.");
  }
  if (state.vesselMaintenanceAtp > Number.MAX_SAFE_INTEGER - PERFUSION_MAINTENANCE_ATP) {
    throw new Error("Perfusion maintenance would overflow.");
  }

  const capacity = Math.min(
    MAX_PERFUSED_REGION_CAPACITY,
    target.capacity + PERFUSION_CAPACITY_DELTA,
  );
  const oxygenPressure = Math.max(0, state.oxygenPressure - PERFUSION_OXYGEN_PRESSURE_DELTA);
  const vesselMaintenanceAtp = state.vesselMaintenanceAtp + PERFUSION_MAINTENANCE_ATP;
  const linkedRegion: RegionState = {
    ...target,
    capacity,
    vesselLinkIds: [...target.vesselLinkIds, linkId],
  };
  return {
    ...state,
    regions: replaceTarget(state, target, linkedRegion),
    oxygenPressure,
    vesselMaintenanceAtp,
  };
}

function unlinkRegion(state: GameState, target: RegionState): GameState {
  const linkId = canonicalLinkId(target);
  if (!target.vesselLinkIds.includes(linkId)) throw new Error("Perfusion link is unavailable.");
  if (state.vesselMaintenanceAtp < PERFUSION_MAINTENANCE_ATP) {
    throw new Error("Perfusion maintenance state is invalid.");
  }

  const capacity = Math.max(1, target.capacity - PERFUSION_CAPACITY_DELTA);
  if (state.oxygenPressure > Number.MAX_SAFE_INTEGER - PERFUSION_OXYGEN_PRESSURE_DELTA) {
    throw new Error("Perfusion oxygen pressure would overflow.");
  }
  const oxygenPressure = state.oxygenPressure + PERFUSION_OXYGEN_PRESSURE_DELTA;
  const vesselMaintenanceAtp = state.vesselMaintenanceAtp - PERFUSION_MAINTENANCE_ATP;
  const unlinkedRegion: RegionState = {
    ...target,
    capacity,
    vesselLinkIds: target.vesselLinkIds.filter((candidate) => candidate !== linkId),
  };
  return {
    ...state,
    regions: replaceTarget(state, target, unlinkedRegion),
    oxygenPressure,
    vesselMaintenanceAtp,
  };
}

/** Applies a single regional perfusion decision without recording or sequencing a GameEvent. */
export function applyPerfusionLayout(
  context: Readonly<{
    state: GameState;
    operation: SetVesselLinkOperation;
    appliedAtMs: number;
  }>,
): GameState {
  const { state, operation, appliedAtMs } = context;
  requireCurrentOperationTime(state, appliedAtMs);
  requireAngiogenesisOwnership(state);
  const activeLinks = countActiveVesselLinks(state);
  requirePerfusionCounters(state, activeLinks);
  const target = targetRegion(state, operation);
  const next = operation.linked
    ? linkRegion(state, target, activeLinks)
    : unlinkRegion(state, target);
  if (next.eventSequence !== state.eventSequence) {
    throw new Error("Perfusion handlers must not advance the event sequence.");
  }
  return next;
}

export const PERFUSION_LAYOUT_HANDLER: CoreSixHandler<SetVesselLinkOperation> = {
  hallmark: "angiogenesis",
  apply: applyPerfusionLayout,
};
