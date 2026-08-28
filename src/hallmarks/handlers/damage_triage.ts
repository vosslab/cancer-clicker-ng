import { bigNum, hallmarkId } from "../../brands.js";
import { add } from "../../bignum/bignum.js";
import {
  removeRegionProjection,
  type RemoveRegionProjection,
} from "../../state/region_projection.js";
import type { GameState, RegionState } from "../../types/state.js";
import { coreSixHallmarkDefinition, hasReachedCoreSixUnlock } from "../core_six_catalog.js";
import type { CoreSixHandler, ResolveTriageOperation } from "../core_six_types.js";

const TRIAGE_HALLMARK_KEY = "cell_death_resistance";
const TRIAGE_HALLMARK_ID = hallmarkId(TRIAGE_HALLMARK_KEY);

function safeNonnegativeInteger(value: number): boolean {
  return Number.isSafeInteger(value) && value >= 0;
}

function ownedAndUnlocked(state: GameState): boolean {
  const definition = coreSixHallmarkDefinition(TRIAGE_HALLMARK_KEY);
  const level = state.hallmarkLevels.find((candidate) => candidate.id === TRIAGE_HALLMARK_ID);
  return (
    level !== undefined &&
    safeNonnegativeInteger(level.level) &&
    level.level >= definition.ownership.requiredLevel &&
    hasReachedCoreSixUnlock(state.currentStage, TRIAGE_HALLMARK_KEY)
  );
}

function pendingTarget(state: GameState, eventId: ResolveTriageOperation["eventId"]): RegionState {
  const pending = state.pendingDamageEvents.find((candidate) => candidate.id === eventId);
  if (!pending) throw new Error("Damage triage event is unavailable.");
  const target = state.regions.find((candidate) => candidate.id === pending.regionId);
  if (!target) throw new Error("Damage triage event has no region.");
  return target;
}

function remainingExactDamageEvent(
  state: GameState,
  eventId: ResolveTriageOperation["eventId"],
): readonly GameState["pendingDamageEvents"][number][] {
  return state.pendingDamageEvents.filter((candidate) => candidate.id !== eventId);
}

function replaceRegion(
  state: GameState,
  target: RegionState,
  change: Partial<RegionState>,
): readonly RegionState[] {
  return state.regions.map((candidate) =>
    candidate.id === target.id ? { ...candidate, ...change } : candidate,
  );
}

function canonicalSurvivalCapacity(state: GameState): number {
  if (!safeNonnegativeInteger(state.survivalCapacity)) {
    throw new Error("Damage triage survival capacity is invalid.");
  }
  return state.survivalCapacity;
}

function spentSurvivalCapacity(state: GameState): number {
  const survivalCapacity = canonicalSurvivalCapacity(state);
  if (survivalCapacity < 1) {
    throw new Error("Damage triage requires one available survival capacity.");
  }
  return survivalCapacity - 1;
}

function verifiedLossProjection(
  state: GameState,
  target: RegionState,
  projectRemoval: RemoveRegionProjection,
): Partial<GameState> {
  const projection = projectRemoval(state, target);
  const regions = projection.regions;
  const pendingDamageEvents = projection.pendingDamageEvents;
  if (
    regions === undefined ||
    regions.some((candidate) => candidate.id === target.id) ||
    pendingDamageEvents === undefined ||
    pendingDamageEvents.some((candidate) => candidate.regionId === target.id)
  ) {
    throw new Error("Damage triage loss projection must remove the target region and its damage.");
  }
  return projection;
}

function preserveEventSequence(state: GameState, next: GameState): GameState {
  if (next.eventSequence !== state.eventSequence) {
    throw new Error("Damage triage handlers must not advance the event sequence.");
  }
  return next;
}

/**
 * Creates the core-six damage-triage handler around the reducer's one destructive
 * region-removal seam. The returned state deliberately retains eventSequence;
 * the event funnel records the command after this atomic projection succeeds.
 */
function applyDamageTriageWithProjection(
  context: Parameters<CoreSixHandler<ResolveTriageOperation>["apply"]>[0],
  projectRemoval: RemoveRegionProjection,
): GameState {
  const { state, operation } = context;
  if (operation.hallmark !== TRIAGE_HALLMARK_KEY) {
    throw new Error("Damage triage handler received the wrong hallmark operation.");
  }
  if (!ownedAndUnlocked(state)) {
    throw new Error("Cell-death resistance is not owned or unlocked.");
  }

  const target = pendingTarget(state, operation.eventId);

  switch (operation.action) {
    case "absorb": {
      const survivalCapacity = spentSurvivalCapacity(state);
      const next = {
        ...state,
        survivalCapacity,
        pendingDamageEvents: remainingExactDamageEvent(state, operation.eventId),
        regionalModifiers: { ...state.regionalModifiers, [`triage:${operation.eventId}`]: 2 },
      };
      return preserveEventSequence(state, next);
    }
    case "repair": {
      const survivalCapacity = spentSurvivalCapacity(state);
      if (!safeNonnegativeInteger(state.damagePressure) || state.damagePressure < 1) {
        throw new Error("Damage triage repair requires a positive damage pressure.");
      }
      return preserveEventSequence(state, {
        ...state,
        survivalCapacity,
        damagePressure: state.damagePressure - 1,
        regions: replaceRegion(state, target, { viability: 1 }),
        pendingDamageEvents: remainingExactDamageEvent(state, operation.eventId),
        regionalModifiers: { ...state.regionalModifiers, [`triage:${operation.eventId}`]: 1 },
      });
    }
    case "lose-region": {
      const survivalCapacity = canonicalSurvivalCapacity(state);
      const projection = verifiedLossProjection(state, target, projectRemoval);
      if (!safeNonnegativeInteger(target.capacity)) {
        throw new Error("Damage triage loss target capacity is invalid.");
      }
      const recoveredSubstrate = bigNum(target.capacity, 0);
      return preserveEventSequence(state, {
        ...state,
        ...projection,
        survivalCapacity,
        substrate: add(state.substrate, recoveredSubstrate),
      });
    }
  }
}

/** Applies one pure, catalog-gated triage choice without recording the event. */
export function applyDamageTriage(
  context: Parameters<CoreSixHandler<ResolveTriageOperation>["apply"]>[0],
): GameState {
  return applyDamageTriageWithProjection(context, removeRegionProjection);
}

/** D3 supplies the reducer's one removal projection when constructing its dispatch map. */
export function createDamageTriageHandler(
  projectRemoval: RemoveRegionProjection,
): CoreSixHandler<ResolveTriageOperation> {
  return {
    hallmark: TRIAGE_HALLMARK_KEY,
    apply(context): GameState {
      return applyDamageTriageWithProjection(context, projectRemoval);
    },
  };
}

export const DAMAGE_TRIAGE_HANDLER: CoreSixHandler<ResolveTriageOperation> = {
  hallmark: TRIAGE_HALLMARK_KEY,
  apply: applyDamageTriage,
};
