import {
  eventId,
  hallmarkId,
  mutationId,
  offerId,
  prestigeId,
  producerId,
  programOptionId,
  routeId,
  stageId,
} from "../brands.js";
import type { GameEvent } from "../types/events.js";
import type { GameState, RegionState } from "../types/state.js";
import { isImmediateStageTransition } from "./catalog.js";
import { parseRuntimeEvent } from "./event_parse.js";

function natural(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}
function next(state: GameState, change: Partial<GameState>): GameState {
  if (!natural(state.eventSequence) || state.eventSequence === Number.MAX_SAFE_INTEGER)
    throw new Error("Event sequence cannot advance safely.");
  return { ...state, ...change, eventSequence: state.eventSequence + 1 };
}
function region(state: GameState, id: unknown): RegionState {
  if (typeof id !== "string") throw new Error("Region identifier is invalid.");
  const found = state.regions.find((candidate) => candidate.id === id);
  if (!found) throw new Error("Unknown region.");
  return found;
}
function replaceRegion(
  state: GameState,
  id: string,
  change: Partial<RegionState>,
): readonly RegionState[] {
  return state.regions.map((candidate) =>
    candidate.id === id ? { ...candidate, ...change } : candidate,
  );
}
function clearSenescenceEvent(state: GameState, id: string): readonly RegionState[] {
  return state.regions.map((candidate) => {
    if (candidate.id !== id) return candidate;
    const { senescenceEventId: _removed, ...withoutSenescenceEvent } = candidate;
    return withoutSenescenceEvent;
  });
}
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

/** The sole destructive-region transition keeps all persisted region relations coherent. */
function removeRegion(state: GameState, target: RegionState): Partial<GameState> {
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

/** Applies a validated event. The terminal never assertion couples this reducer to GameEvent. */
export function reduceGameEvent(state: GameState, event: GameEvent): GameState {
  switch (event.type) {
    case "click-divide":
      if (
        !natural(state.manualDivisionCharge) ||
        state.manualDivisionCharge === Number.MAX_SAFE_INTEGER
      )
        throw new Error("Manual division charge cannot advance safely.");
      return next(state, { manualDivisionCharge: state.manualDivisionCharge + 1 });
    case "purchase-producer": {
      const id = producerId(event.producerId);
      const quantity = event.quantity;
      if (!natural(quantity) || quantity === 0) throw new Error("Producer quantity is invalid.");
      const producer = state.producerLevels.find((level) => level.id === id);
      if (
        !producer ||
        !natural(producer.level) ||
        producer.level > Number.MAX_SAFE_INTEGER - quantity
      )
        throw new Error("Producer purchase is invalid.");
      return next(state, {
        producerLevels: state.producerLevels.map((level) =>
          level.id === id ? { ...level, level: level.level + quantity } : level,
        ),
      });
    }
    case "purchase-hallmark": {
      const id = hallmarkId(event.hallmarkId);
      const hallmark = state.hallmarkLevels.find((level) => level.id === id);
      if (!hallmark || !natural(hallmark.level) || hallmark.level === Number.MAX_SAFE_INTEGER)
        throw new Error("Hallmark purchase is invalid.");
      return next(state, {
        hallmarkLevels: state.hallmarkLevels.map((level) =>
          level.id === id ? { ...level, level: level.level + 1 } : level,
        ),
      });
    }
    case "advance-stage": {
      const fromStageId = event.fromStageId;
      const toStageId = event.toStageId;
      const entersImmortalizedCulture =
        fromStageId === stageId("host_collapse") && toStageId === stageId("immortalized_culture");
      const hasEarnedL3 = state.prestigeAvailability.some(
        (availability) => availability.id === prestigeId("L3") && availability.status === "earned",
      );
      if (
        state.currentStage !== fromStageId ||
        !isImmediateStageTransition(fromStageId, toStageId) ||
        (entersImmortalizedCulture && !hasEarnedL3)
      )
        throw new Error("Stage transition is invalid.");
      return next(state, {
        currentStage: stageId(toStageId),
        stageStartedAtMs: event.atMs,
        stageProgress: 0,
        lastStageTransition: {
          from: stageId(fromStageId),
          to: stageId(toStageId),
          atMs: event.atMs,
        },
      });
    }
    case "perform-prestige-reset":
      throw new Error("Prestige reset is unavailable before M13.");
    case "apply-offline-accrual":
      if (
        !natural(state.totalOfflineMs) ||
        state.totalOfflineMs > Number.MAX_SAFE_INTEGER - event.elapsedMs
      )
        throw new Error("Offline elapsed time is invalid.");
      return next(state, { totalOfflineMs: state.totalOfflineMs + event.elapsedMs });
    case "set-number-format":
      return next(state, { numberFormat: event.numberFormat });
    case "set-signaling-allocation":
      return next(state, { signalingAllocation: event.allocation });
    case "select-checkpoint":
      return next(state, {
        bypassedCheckpoints: [...new Set([...state.bypassedCheckpoints, event.checkpoint])],
      });
    case "resolve-triage": {
      const pendingId = event.eventId;
      const pending = state.pendingDamageEvents.find((candidate) => candidate.id === pendingId);
      if (!pending) throw new Error("Triage event is unavailable.");
      const target = region(state, pending.regionId);
      const cascade = event.action === "lose-region" ? removeRegion(state, target) : {};
      return next(state, {
        ...cascade,
        regions:
          event.action === "lose-region"
            ? cascade.regions
            : replaceRegion(state, target.id, event.action === "repair" ? { viability: 1 } : {}),
        pendingDamageEvents: (cascade.pendingDamageEvents ?? state.pendingDamageEvents).filter(
          (candidate) => candidate.id !== pendingId,
        ),
        regionalModifiers:
          event.action === "lose-region"
            ? cascade.regionalModifiers
            : {
                ...state.regionalModifiers,
                [`triage:${pendingId}`]: event.action === "repair" ? 1 : 2,
              },
      });
    }
    case "set-vessel-link": {
      const target = region(state, event.regionId);
      const id = eventId(`vessel:${target.id}`);
      return next(state, {
        regions: replaceRegion(state, target.id, {
          vesselLinkIds: event.linked ? [...new Set([...target.vesselLinkIds, id])] : [],
        }),
      });
    }
    case "commit-route": {
      const id = routeId(event.routeId);
      const cells = event.cells;
      if (cells === 0 || !state.regions.some((candidate) => candidate.routeIds.includes(id)))
        throw new Error("Route commitment is invalid.");
      return next(state, {
        committedCellCommitments: { ...state.committedCellCommitments, [id]: cells },
      });
    }
    case "set-atp-budget":
      return next(state, {
        atpBudget: { ...state.atpBudget, [event.sink]: event.amount },
        atpSinks: [...new Set([...state.atpSinks, event.sink])],
      });
    case "select-mutation": {
      const selectedOfferId = offerId(event.offerId);
      const selectedMutationId = mutationId(event.mutationId);
      const offer = state.mutationOffers.find((candidate) => candidate.id === selectedOfferId);
      if (!offer || !offer.mutationIds.includes(selectedMutationId))
        throw new Error("Mutation is not offered.");
      return next(state, {
        mutationOffers: state.mutationOffers.filter(
          (candidate) => candidate.id !== selectedOfferId,
        ),
        chosenMutations: [...new Set([...state.chosenMutations, selectedMutationId])],
        mutationLiabilities: [...new Set([...state.mutationLiabilities, selectedMutationId])],
        regionalModifiers: { ...state.regionalModifiers, [`mutation:${selectedMutationId}`]: 1 },
      });
    }
    case "switch-phenotype": {
      const target = region(state, event.regionId);
      const deadline = event.cooldownDeadlineMs;
      return next(state, {
        regions: replaceRegion(state, target.id, { phenotype: event.phenotype }),
        phenotypeCooldowns: { ...state.phenotypeCooldowns, [target.id]: deadline },
      });
    }
    case "edit-program": {
      const id = hallmarkId(event.hallmarkId);
      const option = programOptionId(event.optionId);
      const deadline = event.cooldownDeadlineMs;
      if (
        !state.programs.eligibleHallmarks.includes(id) ||
        !state.programs.allowedByHallmark[id]?.includes(option)
      )
        throw new Error("Program option is invalid.");
      return next(state, {
        programs: {
          ...state.programs,
          selectedByHallmark: { ...state.programs.selectedByHallmark, [id]: option },
          cooldownDeadlineMs: deadline,
        },
      });
    }
    case "select-microbiome": {
      const selectedOfferId = offerId(event.offerId);
      if (
        !state.microbiome.offerIds.includes(selectedOfferId) ||
        state.microbiome.selectedNiches.includes(selectedOfferId) ||
        state.microbiome.selectedNiches.length >= 2 ||
        state.microbiome.pendingCompatibility === null
      )
        throw new Error("Microbiome offer is invalid.");
      const selectedNiches = [...state.microbiome.selectedNiches, selectedOfferId];
      return next(state, {
        microbiome: {
          ...state.microbiome,
          offerIds: state.microbiome.offerIds.filter((id) => id !== selectedOfferId),
          selectedNiches,
          compatibilitySnapshot: selectedNiches,
        },
      });
    }
    case "resolve-senescence": {
      const pendingId = eventId(event.eventId);
      if (!state.clearanceQueue.includes(pendingId))
        throw new Error("Senescence event is unavailable.");
      const target = state.regions.find((candidate) => candidate.senescenceEventId === pendingId);
      if (!target) throw new Error("Senescence event has no region.");
      if (event.action === "clear") return next(state, removeRegion(state, target));
      return next(state, {
        clearanceQueue: state.clearanceQueue.filter((id) => id !== pendingId),
        senescentRegions: [...new Set([...state.senescentRegions, target.id])],
        regions: clearSenescenceEvent(state, target.id),
        secretoryEffects: { ...state.secretoryEffects, [`senescence:${pendingId}`]: 1 },
      });
    }
  }
  const unreachable: never = event;
  return unreachable;
}

/** ASVS 2.3.1-2.3.3 and 15.3.5: parse untrusted input before the typed reducer. */
export function recordEvent(state: GameState, raw: unknown): GameState {
  return reduceGameEvent(state, parseRuntimeEvent(raw));
}

export const record_event = recordEvent;
