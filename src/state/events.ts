import { bigNum, eventId, hallmarkId, offerId, producerId, programOptionId } from "../brands.js";
import { add } from "../bignum/bignum.js";
import { applyProducerPurchase } from "../economy/costs.js";
import type { GameEvent } from "../types/events.js";
import type {
  GameState,
  PendingProgression,
  RegionState,
  TrackedResourceSnapshot,
} from "../types/state.js";
import { MAX_PENDING_PROGRESSION, TRACKED_RESOURCE_KEYS } from "../types/state.js";
import { isPrestigeId, isStageId } from "./catalog.js";
import { parseRuntimeEvent } from "./event_parse.js";
import { assertStageTransition } from "../stages/transitions.js";
import { findCoreSixHallmark, hasReachedCoreSixUnlock } from "../hallmarks/core_six_catalog.js";
import { applyCoreSixOperation } from "../hallmarks/core_six_dispatch.js";
import {
  findAtpSink,
  findM11Hallmark,
  hasReachedM11Unlock,
  MAX_TOTAL_ATP_BUDGET,
} from "../hallmarks/m11_catalog.js";
import { applyMetabolicConversion } from "../hallmarks/handlers/metabolism.js";
import { applyImmuneVisibility } from "../hallmarks/handlers/immune_visibility.js";
import { applyInflammation } from "../hallmarks/handlers/inflammation.js";
import { applyMutationSelection } from "../hallmarks/handlers/mutation_draft.js";
import {
  projectElapsedHallmarkDurableEffects,
  projectManualDivisionHallmarkEffects,
} from "../hallmarks/elapsed_effects.js";
import { projectM11DurableTickEffects } from "../hallmarks/m11_tick_effects.js";
import { removeRegionProjection } from "./region_projection.js";

function natural(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}
function next(state: GameState, change: Partial<GameState>): GameState {
  if (!natural(state.eventSequence) || state.eventSequence === Number.MAX_SAFE_INTEGER)
    throw new Error("Event sequence cannot advance safely.");
  return { ...state, ...change, eventSequence: state.eventSequence + 1 };
}
function progressionIdentity(value: PendingProgression): string {
  return `${value.kind}:${value.id}`;
}
function validProgression(value: PendingProgression, atMs: number): boolean {
  return (
    value.firstObservedAtActiveMs === atMs &&
    natural(value.firstObservedAtActiveMs) &&
    ((value.kind === "stage" && isStageId(value.id)) ||
      (value.kind === "prestige" && isPrestigeId(value.id)))
  );
}
function canonicalSnapshot(snapshot: TrackedResourceSnapshot): TrackedResourceSnapshot {
  const keys = Object.keys(snapshot);
  if (
    Object.getPrototypeOf(snapshot) !== Object.prototype ||
    Object.getOwnPropertySymbols(snapshot).length !== 0 ||
    keys.length !== TRACKED_RESOURCE_KEYS.length ||
    keys.some(
      (key) => !TRACKED_RESOURCE_KEYS.includes(key as (typeof TRACKED_RESOURCE_KEYS)[number]),
    )
  )
    throw new Error("Offline resource snapshot is invalid.");
  const output: Record<string, ReturnType<typeof bigNum>> = {};
  for (const key of TRACKED_RESOURCE_KEYS) {
    const descriptor = Object.getOwnPropertyDescriptor(snapshot, key);
    if (!descriptor || !("value" in descriptor) || !descriptor.enumerable)
      throw new Error("Offline resource snapshot is invalid.");
    const value: unknown = descriptor.value;
    if (
      typeof value !== "object" ||
      value === null ||
      Object.getPrototypeOf(value) !== Object.prototype ||
      Object.getOwnPropertySymbols(value).length !== 0 ||
      Object.keys(value).length !== 2 ||
      !Object.prototype.hasOwnProperty.call(value, "mantissa") ||
      !Object.prototype.hasOwnProperty.call(value, "exponent")
    )
      throw new Error("Offline resource snapshot is invalid.");
    const fields = Object.getOwnPropertyDescriptors(value);
    const mantissaDescriptor = fields.mantissa;
    const exponentDescriptor = fields.exponent;
    if (
      !mantissaDescriptor ||
      !("value" in mantissaDescriptor) ||
      !exponentDescriptor ||
      !("value" in exponentDescriptor) ||
      typeof mantissaDescriptor.value !== "number" ||
      !Number.isFinite(mantissaDescriptor.value) ||
      typeof exponentDescriptor.value !== "number" ||
      !Number.isSafeInteger(exponentDescriptor.value)
    )
      throw new Error("Offline resource snapshot is invalid.");
    const restored = bigNum(mantissaDescriptor.value, exponentDescriptor.value);
    if (
      restored.mantissa !== mantissaDescriptor.value ||
      restored.exponent !== exponentDescriptor.value
    )
      throw new Error("Offline resource snapshot is not canonical.");
    output[key] = restored;
  }
  return output as TrackedResourceSnapshot;
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
/** Applies a trusted core-six projection without assigning a sequence number. */
function applyCoreSixEvent(state: GameState, event: GameEvent): GameState | undefined {
  const isCoreSixEvent =
    event.type === "set-signaling-allocation" ||
    event.type === "select-checkpoint" ||
    event.type === "resolve-triage" ||
    event.type === "spend-telomerase" ||
    event.type === "set-vessel-link" ||
    event.type === "commit-route";
  if (isCoreSixEvent && (!natural(state.activeTimeMs) || event.atMs !== state.activeTimeMs)) {
    throw new Error("Core-six operation is stale.");
  }
  let projection: GameState;
  switch (event.type) {
    case "set-signaling-allocation": {
      const operation = {
        type: event.type,
        hallmark: "proliferative_signaling",
        allocation: event.allocation,
      } as const;
      projection = applyCoreSixOperation(state, operation, event.atMs);
      break;
    }
    case "select-checkpoint": {
      const operation = {
        type: event.type,
        hallmark: "growth_suppressor_evasion",
        checkpoint: event.checkpoint,
      } as const;
      projection = applyCoreSixOperation(state, operation, event.atMs);
      break;
    }
    case "resolve-triage": {
      const operation = {
        type: event.type,
        hallmark: "cell_death_resistance",
        eventId: event.eventId,
        action: event.action,
      } as const;
      projection = applyCoreSixOperation(state, operation, event.atMs);
      break;
    }
    case "spend-telomerase": {
      const operation =
        event.target === "refill-region"
          ? ({
              type: event.type,
              hallmark: "replicative_immortality",
              target: event.target,
              regionId: event.regionId,
              charges: event.charges,
            } as const)
          : ({
              type: event.type,
              hallmark: "replicative_immortality",
              target: event.target,
              charges: event.charges,
            } as const);
      projection = applyCoreSixOperation(state, operation, event.atMs);
      break;
    }
    case "set-vessel-link": {
      const operation = {
        type: event.type,
        hallmark: "angiogenesis",
        regionId: event.regionId,
        linked: event.linked,
      } as const;
      projection = applyCoreSixOperation(state, operation, event.atMs);
      break;
    }
    case "commit-route": {
      const operation = {
        type: event.type,
        hallmark: "invasion_metastasis",
        routeId: event.routeId,
        cells: event.cells,
      } as const;
      projection = applyCoreSixOperation(state, operation, event.atMs);
      break;
    }
    default:
      return undefined;
  }
  if (projection.eventSequence !== state.eventSequence) {
    throw new Error("Core-six handlers must not advance the event sequence.");
  }
  return projection;
}

/** Applies a trusted M11 projection without assigning a sequence number. */
function applyM11Event(state: GameState, event: GameEvent): GameState | undefined {
  const isM11Event =
    event.type === "convert-substrate" ||
    event.type === "set-region-mask" ||
    event.type === "activate-inflammation" ||
    event.type === "select-mutation";
  if (!isM11Event) return undefined;
  // ASVS 2.3.1, 2.3.3, and 16.5.3: stale operations fail before any projection is built.
  if (!natural(state.activeTimeMs) || event.atMs !== state.activeTimeMs) {
    throw new Error("M11 operation is stale.");
  }
  let projection: GameState;
  switch (event.type) {
    case "convert-substrate":
      projection = applyMetabolicConversion({
        state,
        operation: {
          type: event.type,
          hallmark: "metabolic_deregulation",
          amount: event.amount,
        },
        appliedAtMs: event.atMs,
      });
      break;
    case "set-region-mask":
      projection = applyImmuneVisibility({
        state,
        operation: {
          type: event.type,
          hallmark: "immune_destruction_avoidance",
          regionId: event.regionId,
          masked: event.masked,
        },
        appliedAtMs: event.atMs,
      });
      break;
    case "activate-inflammation":
      projection = applyInflammation({
        state,
        operation: {
          type: event.type,
          hallmark: "tumor_promoting_inflammation",
          regionId: event.regionId,
        },
        appliedAtMs: event.atMs,
      });
      break;
    case "select-mutation":
      // ASVS 2.2.3 and 15.3.3: selection is bound to the one persisted offer identity.
      if (state.mutationOffers.length !== 1 || state.mutationOffers[0]?.id !== event.offerId) {
        throw new Error("Mutation selection offer is unavailable.");
      }
      projection = applyMutationSelection({
        state,
        operation: {
          type: event.type,
          hallmark: "genome_instability_mutation",
          offerId: event.offerId,
          mutationId: event.mutationId,
        },
        appliedAtMs: event.atMs,
      });
      break;
    default:
      return undefined;
  }
  if (projection.eventSequence !== state.eventSequence) {
    throw new Error("M11 handlers must not advance the event sequence.");
  }
  return projection;
}

/** Applies a validated event. The terminal never assertion couples this reducer to GameEvent. */
export function reduceGameEvent(state: GameState, event: GameEvent): GameState {
  const coreSixProjection = applyCoreSixEvent(state, event);
  if (coreSixProjection !== undefined) return next(state, coreSixProjection);
  const m11Projection = applyM11Event(state, event);
  if (m11Projection !== undefined) return next(state, m11Projection);
  switch (event.type) {
    case "click-divide": {
      const projection = projectManualDivisionHallmarkEffects(state);
      if (
        !natural(projection.manualDivisionCharge) ||
        projection.manualDivisionCharge === Number.MAX_SAFE_INTEGER
      )
        throw new Error("Manual division charge cannot advance safely.");
      return next(state, {
        ...projection,
        cells: add(projection.cells, bigNum(1, 0)),
        manualDivisionCharge: projection.manualDivisionCharge + 1,
      });
    }
    case "purchase-producer": {
      const id = producerId(event.producerId);
      const quantity = event.quantity;
      const purchased = applyProducerPurchase(state, id, quantity);
      return next(state, purchased);
    }
    case "purchase-hallmark": {
      const id = hallmarkId(event.hallmarkId);
      const hallmark = state.hallmarkLevels.find((level) => level.id === id);
      if (!hallmark || !natural(hallmark.level) || hallmark.level === Number.MAX_SAFE_INTEGER)
        throw new Error("Hallmark purchase is invalid.");
      const coreSixDefinition = findCoreSixHallmark(id);
      if (coreSixDefinition !== undefined) {
        if (!hasReachedCoreSixUnlock(state.currentStage, coreSixDefinition.key)) {
          throw new Error("Core-six hallmark is locked.");
        }
        if (hallmark.level >= coreSixDefinition.purchase.maximumLevel) {
          throw new Error("Core-six hallmark is already owned.");
        }
      }
      const m11Definition = findM11Hallmark(id);
      if (m11Definition !== undefined) {
        if (!hasReachedM11Unlock(state.currentStage, m11Definition.key)) {
          throw new Error("M11 hallmark is locked.");
        }
        if (hallmark.level >= m11Definition.purchase.maximumLevel) {
          throw new Error("M11 hallmark is already owned.");
        }
      }
      return next(state, {
        hallmarkLevels: state.hallmarkLevels.map((level) =>
          level.id === id ? { ...level, level: level.level + 1 } : level,
        ),
      });
    }
    case "advance-stage": {
      const fromStageId = event.fromStageId;
      const toStageId = event.toStageId;
      const projection = assertStageTransition(state, fromStageId, toStageId, event.atMs);
      const pendingProgression = state.pendingProgression.filter((item) => item.kind !== "stage");
      return next(state, { ...projection, bypassedCheckpoints: [], pendingProgression });
    }
    case "perform-prestige-reset":
      throw new Error("Prestige reset is unavailable before M13.");
    case "set-signaling-allocation":
    case "select-checkpoint":
    case "resolve-triage":
    case "spend-telomerase":
    case "set-vessel-link":
    case "commit-route":
      throw new Error("Core-six event dispatch failed.");
    case "apply-offline-accrual": {
      if (
        event.atMs !== state.activeTimeMs ||
        !natural(state.activeTimeMs) ||
        !natural(state.totalOfflineMs) ||
        !natural(event.elapsedMs) ||
        state.totalOfflineMs > Number.MAX_SAFE_INTEGER - event.elapsedMs
      )
        throw new Error("Offline elapsed time is invalid.");
      const resourceSnapshot = canonicalSnapshot(event.resourceSnapshot);
      const existing = new Set(state.pendingProgression.map(progressionIdentity));
      const additions = event.newlyObservedProgression;
      if (
        additions.length > MAX_PENDING_PROGRESSION ||
        state.pendingProgression.length > MAX_PENDING_PROGRESSION - additions.length ||
        additions.some((value) => !validProgression(value, state.activeTimeMs)) ||
        additions.some((value) => existing.has(progressionIdentity(value))) ||
        new Set(additions.map(progressionIdentity)).size !== additions.length
      )
        throw new Error("Offline progression is invalid.");
      // The economy adapter already debits tracked ATP at each boundary. Replay only structural
      // reserve/link outcomes from the original balance, then retain the authoritative snapshot.
      const elapsedDurable = projectElapsedHallmarkDurableEffects(state, event.elapsedMs);
      // ASVS 2.3.3: reconstruct M11 from the original state, never from an adapter snapshot.
      const m11Durable = projectM11DurableTickEffects(state, event.elapsedMs);
      const accrued = { ...state, ...elapsedDurable, ...m11Durable, ...resourceSnapshot };
      return next(state, {
        ...accrued,
        pendingProgression: [...state.pendingProgression, ...additions],
        totalOfflineMs: state.totalOfflineMs + event.elapsedMs,
      });
    }
    case "set-number-format":
      return next(state, { numberFormat: event.numberFormat });
    case "set-atp-budget": {
      if (!natural(state.activeTimeMs) || event.atMs !== state.activeTimeMs) {
        throw new Error("ATP budget operation is stale.");
      }
      const sink = findAtpSink(event.sink);
      if (event.amount < sink.minimumBudget || event.amount > sink.maximumBudget) {
        throw new Error("ATP budget is outside its declared bounds.");
      }
      const atpBudget = { ...state.atpBudget, [sink.id]: event.amount };
      const totalBudget = Object.values(atpBudget).reduce((total, amount) => total + amount, 0);
      if (!Number.isSafeInteger(totalBudget) || totalBudget > MAX_TOTAL_ATP_BUDGET) {
        throw new Error("ATP budget exceeds the declared total.");
      }
      return next(state, {
        atpBudget,
        atpSinks: Object.keys(atpBudget),
      });
    }
    case "convert-substrate":
    case "set-region-mask":
    case "activate-inflammation":
    case "select-mutation":
      throw new Error("M11 event dispatch failed.");
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
      if (event.action === "clear") return next(state, removeRegionProjection(state, target));
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
