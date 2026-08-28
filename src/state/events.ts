import { bigNum, hallmarkId, producerId } from "../brands.js";
import { add, compare, fromSafeInteger, subtract } from "../bignum/bignum.js";
import { applyProducerPurchase } from "../economy/costs.js";
import type { GameEvent } from "../types/events.js";
import type {
  GameState,
  PendingProgression,
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
  findExtendedHallmark,
  hasReachedExtendedHallmarkUnlock,
  MAX_TOTAL_ATP_BUDGET,
} from "../hallmarks/extended_hallmark_catalog.js";
import { applyMetabolicConversion } from "../hallmarks/handlers/metabolism.js";
import { applyImmuneVisibility } from "../hallmarks/handlers/immune_visibility.js";
import { applyInflammation } from "../hallmarks/handlers/inflammation.js";
import { applyMutationSelection } from "../hallmarks/handlers/mutation_draft.js";
import {
  projectElapsedHallmarkDurableEffects,
  projectManualDivisionHallmarkEffects,
} from "../hallmarks/elapsed_effects.js";
import { projectExtendedHallmarkDurableTickEffects } from "../hallmarks/extended_hallmark_tick.js";
import { findLateHallmark, hasReachedLateHallmarkActivation } from "../hallmarks/late_hallmark_catalog.js";
import { plasticityDefinition } from "../hallmarks/plasticity_catalog.js";
import { findLateProgramOption } from "../hallmarks/program_catalog.js";
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

function ownsLateHallmark(state: GameState, key: Parameters<typeof findLateHallmark>[0]): void {
  const definition = findLateHallmark(key);
  if (
    definition === undefined ||
    !hasReachedLateHallmarkActivation(state.currentStage, definition.key) ||
    !state.hallmarkLevels.some((level) => level.id === definition.id && level.level > 0)
  )
    throw new Error("Late hallmark is unavailable.");
}

/**
 * Applies one p5 command without a sequence change. ASVS 2.3.1/2.3.3:
 * each prerequisite is checked before one complete immutable projection is returned.
 */
function applyLateHallmarkEvent(state: GameState, event: GameEvent): GameState | undefined {
  const isLateHallmarkEvent =
    event.type === "assign-region-phenotype" ||
    event.type === "reconfigure-hallmark-program" ||
    event.type === "install-microbiome-composition" ||
    event.type === "resolve-senescence-decision";
  if (!isLateHallmarkEvent) return undefined;
  if (!natural(state.activeTimeMs) || event.atMs !== state.activeTimeMs)
    throw new Error("Late-hallmark operation is stale.");
  switch (event.type) {
    case "assign-region-phenotype": {
      ownsLateHallmark(state, hallmarkId("phenotypic_plasticity"));
      const region = state.regions.find((candidate) => candidate.id === event.regionId);
      const cooldown = state.lateHallmarks.plasticity.switchCooldownByRegion[event.regionId];
      if (!region || (cooldown !== undefined && cooldown > event.atMs))
        throw new Error("Phenotype assignment is unavailable.");
      const definition = plasticityDefinition(event.phenotype);
      return {
        ...state,
        regions: state.regions.map((candidate) =>
          candidate.id === event.regionId ? { ...candidate, phenotype: event.phenotype } : candidate,
        ),
        lateHallmarks: {
          ...state.lateHallmarks,
          plasticity: {
            switchCooldownByRegion: {
              ...state.lateHallmarks.plasticity.switchCooldownByRegion,
              [event.regionId]: event.atMs + definition.switchCooldownMs,
            },
          },
        },
      };
    }
    case "reconfigure-hallmark-program": {
      ownsLateHallmark(state, hallmarkId("epigenetic_reprogramming"));
      const option = findLateProgramOption(event.optionId);
      const cooldown = state.lateHallmarks.epigenetic.cooldownDeadlineMs;
      if (
        option === undefined ||
        option.target !== event.hallmarkId ||
        !state.hallmarkLevels.some((level) => level.id === event.hallmarkId && level.level > 0) ||
        (cooldown !== null && cooldown > event.atMs) ||
        compare(state.atp, fromSafeInteger(option.atpCost)) < 0
      )
        throw new Error("Program reconfiguration is unavailable.");
      const assignments = state.lateHallmarks.epigenetic.assignments.filter(
        (assignment) => assignment.hallmarkId !== event.hallmarkId,
      );
      return {
        ...state,
        atp: subtract(state.atp, fromSafeInteger(option.atpCost)),
        lateHallmarks: {
          ...state.lateHallmarks,
          epigenetic: {
            assignments: [...assignments, { hallmarkId: event.hallmarkId, optionId: event.optionId }],
            cooldownDeadlineMs: event.atMs + option.cooldownMs,
          },
        },
      };
    }
    case "install-microbiome-composition": {
      ownsLateHallmark(state, hallmarkId("polymorphic_microbiomes"));
      const pending = state.lateHallmarks.microbiome.pendingOffer;
      if (
        pending === null ||
        pending.id !== event.offerId ||
        pending.expiresAtMs <= event.atMs
      )
        throw new Error("Microbiome offer is unavailable.");
      const composition = pending.compositions.find((candidate) => candidate.id === event.compositionId);
      if (composition === undefined) throw new Error("Microbiome composition is unavailable.");
      return {
        ...state,
        lateHallmarks: {
          ...state.lateHallmarks,
          microbiome: {
            ...state.lateHallmarks.microbiome,
            activeComposition: { offerId: pending.id, composition, installedAtMs: event.atMs },
            pendingOffer: null,
            nextRotationDeadlineMs: null,
          },
        },
      };
    }
    case "resolve-senescence-decision": {
      ownsLateHallmark(state, hallmarkId("senescent_cells"));
      const decision = state.lateHallmarks.senescence.pendingDecisions.find(
        (candidate) => candidate.id === event.decisionId,
      );
      if (decision === undefined) throw new Error("Senescence decision is unavailable.");
      if (event.action === "clear") {
        const region = state.regions.find((candidate) => candidate.id === decision.regionId);
        if (region === undefined) throw new Error("Senescence decision region is unavailable.");
        return { ...state, ...removeRegionProjection(state, region) };
      }
      return {
        ...state,
        lateHallmarks: {
          ...state.lateHallmarks,
          senescence: {
            pendingDecisions: state.lateHallmarks.senescence.pendingDecisions.filter(
              (candidate) => candidate.id !== decision.id,
            ),
            retainedRegions: [
              ...state.lateHallmarks.senescence.retainedRegions,
              {
                decisionId: decision.id,
                regionId: decision.regionId,
                cause: decision.cause,
                createdAtMs: decision.createdAtMs,
                retainedAtMs: event.atMs,
              },
            ],
          },
        },
      };
    }
    default:
      return undefined;
  }
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

/** Applies a trusted extended-hallmark projection without assigning a sequence number. */
function applyExtendedHallmarkEvent(state: GameState, event: GameEvent): GameState | undefined {
  const isExtendedHallmarkEvent =
    event.type === "convert-substrate" ||
    event.type === "set-region-mask" ||
    event.type === "activate-inflammation" ||
    event.type === "select-mutation";
  if (!isExtendedHallmarkEvent) return undefined;
  // ASVS 2.3.1, 2.3.3, and 16.5.3: stale operations fail before any projection is built.
  if (!natural(state.activeTimeMs) || event.atMs !== state.activeTimeMs) {
    throw new Error("extended-hallmark operation is stale.");
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
    throw new Error("extended-hallmark handlers must not advance the event sequence.");
  }
  return projection;
}

/** Applies a validated event. The terminal never assertion couples this reducer to GameEvent. */
export function reduceGameEvent(state: GameState, event: GameEvent): GameState {
  const coreSixProjection = applyCoreSixEvent(state, event);
  if (coreSixProjection !== undefined) return next(state, coreSixProjection);
  const extendedHallmarkProjection = applyExtendedHallmarkEvent(state, event);
  if (extendedHallmarkProjection !== undefined) return next(state, extendedHallmarkProjection);
  const lateHallmarkProjection = applyLateHallmarkEvent(state, event);
  if (lateHallmarkProjection !== undefined) return next(state, lateHallmarkProjection);
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
      const extendedHallmarkDefinition = findExtendedHallmark(id);
      if (extendedHallmarkDefinition !== undefined) {
        if (!hasReachedExtendedHallmarkUnlock(state.currentStage, extendedHallmarkDefinition.key)) {
          throw new Error("extended-hallmark hallmark is locked.");
        }
        if (hallmark.level >= extendedHallmarkDefinition.purchase.maximumLevel) {
          throw new Error("extended-hallmark hallmark is already owned.");
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
      // ASVS 2.3.3: reconstruct extended-hallmark from the original state, never from an adapter snapshot.
      const extendedHallmarkDurable = projectExtendedHallmarkDurableTickEffects(
        state,
        event.elapsedMs,
      );
      const accrued = {
        ...state,
        ...elapsedDurable,
        ...extendedHallmarkDurable,
        ...resourceSnapshot,
      };
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
      throw new Error("extended-hallmark event dispatch failed.");
    case "assign-region-phenotype":
    case "reconfigure-hallmark-program":
    case "install-microbiome-composition":
    case "resolve-senescence-decision":
      throw new Error("Late-hallmark event dispatch failed.");
  }
  const unreachable: never = event;
  return unreachable;
}

/** ASVS 2.3.1-2.3.3 and 15.3.5: parse untrusted input before the typed reducer. */
export function recordEvent(state: GameState, raw: unknown): GameState {
  return reduceGameEvent(state, parseRuntimeEvent(raw));
}

export const record_event = recordEvent;
