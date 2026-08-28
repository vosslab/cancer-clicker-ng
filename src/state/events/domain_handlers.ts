import { bigNum, hallmarkId } from "../../brands.js";
import { compare, fromSafeInteger, subtract } from "../../bignum/bignum.js";
import type { GameEvent } from "../../types/events.js";
import type { GameState, PendingProgression, TrackedResourceSnapshot } from "../../types/state.js";
import { TRACKED_RESOURCE_KEYS } from "../../types/state.js";
import { isPrestigeId, isStageId } from "../catalog.js";
import { applyCoreSixOperation } from "../../hallmarks/core_six_dispatch.js";
import { applyMetabolicConversion } from "../../hallmarks/handlers/metabolism.js";
import { applyImmuneVisibility } from "../../hallmarks/handlers/immune_visibility.js";
import { applyInflammation } from "../../hallmarks/handlers/inflammation.js";
import { applyMutationSelection } from "../../hallmarks/handlers/mutation_draft.js";
import { MICROBIOME_OFFER_DURATION_MS } from "../../hallmarks/microbiome_catalog.js";
import {
  findLateHallmark,
  hasReachedLateHallmarkActivation,
} from "../../hallmarks/late_hallmark_catalog.js";
import { plasticityDefinition } from "../../hallmarks/plasticity_catalog.js";
import { findLateProgramOption } from "../../hallmarks/program_catalog.js";
import { removeRegionProjection } from "../region_projection.js";
import { phenotypeEligibilityQuote } from "../../hallmarks/late_hallmark_effects.js";
import { canonicalOrganTags, ORGAN_SITE_CATALOG } from "../../prestige/seeding.js";
import { LINEAGE_BOON_CATALOG } from "../../prestige/hosts.js";
import type { LineageBoonApplication, LineageLedger } from "../../prestige/layers.js";
import { completeActiveCampaignWithRenewal } from "../../prestige/network.js";
import {
  cultureLateProgramInterfacesAvailable,
  cultureProtocolCooldownDeadline,
} from "../../prestige/culture_effects.js";
import { CORE_SIX_HALLMARK_CATALOG } from "../../hallmarks/core_six_catalog.js";
import { EXTENDED_HALLMARK_CATALOG } from "../../hallmarks/extended_hallmark_catalog.js";
import { LATE_HALLMARK_CATALOG } from "../../hallmarks/late_hallmark_catalog.js";

export function natural(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function hasEarnedPrestige(state: GameState, id: "L3" | "L4"): boolean {
  return state.prestigeAvailability.some((entry) => entry.id === id && entry.status === "earned");
}

export function networkActionAvailable(state: GameState): boolean {
  return (
    state.currentStage === "global_lab_contamination" &&
    hasEarnedPrestige(state, "L3") &&
    hasEarnedPrestige(state, "L4") &&
    state.lineageLedger.networkSeed !== null
  );
}

export function renewCompletedCampaign(
  state: GameState,
  network: GameState["network"],
): GameState["network"] {
  const networkSeed = state.lineageLedger.networkSeed;
  if (networkSeed === null) throw new Error("Network seed is unavailable.");
  return (
    completeActiveCampaignWithRenewal(network, {
      atMs: state.activeTimeMs,
      networkSeed,
      frontierSequence: state.lineageLedger.frontierSequence,
      sourceEventSequence: state.eventSequence + 1,
    }) ?? network
  );
}
export function next(state: GameState, change: Partial<GameState>): GameState {
  if (!natural(state.eventSequence) || state.eventSequence === Number.MAX_SAFE_INTEGER)
    throw new Error("Event sequence cannot advance safely.");
  const eventSequence = state.eventSequence + 1;
  if (!Object.prototype.hasOwnProperty.call(change, "lastStageTransition"))
    return { ...state, ...change, eventSequence };
  const { lastStageTransition, ...changeWithoutTransition } = change;
  if (lastStageTransition !== undefined)
    return { ...state, ...changeWithoutTransition, lastStageTransition, eventSequence };
  const { lastStageTransition: _discarded, ...stateWithoutTransition } = state;
  return { ...stateWithoutTransition, ...changeWithoutTransition, eventSequence };
}

const HALLMARK_ORDER = [
  ...CORE_SIX_HALLMARK_CATALOG,
  ...EXTENDED_HALLMARK_CATALOG,
  ...LATE_HALLMARK_CATALOG,
].map((entry) => entry.id);

export function boonCatalogOrder(boonId: import("../../types/ids.js").LineageBoonId): number {
  const index = LINEAGE_BOON_CATALOG.findIndex((boon) => boon.id === boonId);
  if (index < 0) throw new Error("Lineage boon is not catalog-backed.");
  return index;
}

function draftSequenceForApplication(application: LineageBoonApplication): number {
  const match = /^host-draft-v1:[0-9]+:([1-9][0-9]*)$/.exec(application.draftId);
  if (!match) throw new Error("Lineage boon application draft identity is invalid.");
  const sequence = Number(match[1]);
  if (!Number.isSafeInteger(sequence))
    throw new Error("Lineage boon application draft sequence is invalid.");
  return sequence;
}

/** Draft sequence followed by the closed boon catalog is the durable application order. */
function canonicalBoonApplications(
  applications: readonly LineageBoonApplication[],
): readonly LineageBoonApplication[] {
  return [...applications].sort((left, right) => {
    const sequenceOrder = draftSequenceForApplication(left) - draftSequenceForApplication(right);
    if (sequenceOrder !== 0) return sequenceOrder;
    return boonCatalogOrder(left.boonId) - boonCatalogOrder(right.boonId);
  });
}

function incrementCounter(value: number, label: string): number {
  if (!natural(value) || value === Number.MAX_SAFE_INTEGER)
    throw new Error(`${label} cannot advance safely.`);
  return value + 1;
}

/** The reducer's sole lineage writer; catalog-order sets stay canonical and bounded. */
export function updateLedger(
  ledger: LineageLedger,
  update: Readonly<{
    successfulTransit?: boolean;
    chosenHallmarkId?: import("../../types/ids.js").HallmarkId;
    usedBoonId?: import("../../types/ids.js").LineageBoonId;
    completedL1?: boolean;
    completedHostTransfer?: boolean;
    hostDraftSequence?: number;
    currentHostRunId?: import("../../types/ids.js").HostRunId | null;
    hostRunSequence?: number;
    terminalPreparation?: LineageLedger["terminalPreparation"];
    hostCollapseAfterTransfer?: boolean;
    organTags?: readonly import("../../types/ids.js").OrganTagId[];
    lineageBoonApplications?: LineageLedger["lineageBoonApplications"];
    networkSeed?: number | null;
    frontierSequence?: number;
    stabilizedRewardedNodeId?: import("../../types/ids.js").NetworkNodeId;
  }>,
): LineageLedger {
  const hallmarkSet = new Set(ledger.chosenHallmarksAcrossLineage);
  if (update.chosenHallmarkId) hallmarkSet.add(update.chosenHallmarkId);
  const boonSet = new Set(ledger.usedLineageBoonIds);
  if (update.usedBoonId) boonSet.add(update.usedBoonId);
  const tagSet = new Set(ledger.organTagsSeen);
  for (const tag of update.organTags ?? []) tagSet.add(tag);
  const newApplications = update.lineageBoonApplications ?? [];
  const applicationKeys = new Set(
    ledger.lineageBoonApplications.map((item) => JSON.stringify(item)),
  );
  for (const application of newApplications) {
    const key = JSON.stringify(application);
    if (applicationKeys.has(key)) throw new Error("Lineage boon application is duplicated.");
    applicationKeys.add(key);
  }
  const lineageBoonApplications = canonicalBoonApplications([
    ...ledger.lineageBoonApplications,
    ...newApplications,
  ]);
  const rewardedNodeIds = new Set(ledger.stabilizedRewardedNodeIds);
  if (update.stabilizedRewardedNodeId) rewardedNodeIds.add(update.stabilizedRewardedNodeId);
  return {
    ...ledger,
    successfulTransitCount: update.successfulTransit
      ? incrementCounter(ledger.successfulTransitCount, "Successful transit count")
      : ledger.successfulTransitCount,
    completedL1ResetCount: update.completedL1
      ? incrementCounter(ledger.completedL1ResetCount, "L1 reset count")
      : ledger.completedL1ResetCount,
    completedHostTransferCount: update.completedHostTransfer
      ? incrementCounter(ledger.completedHostTransferCount, "Host-transfer count")
      : ledger.completedHostTransferCount,
    hostCollapseAfterTransferCount: update.hostCollapseAfterTransfer
      ? incrementCounter(ledger.hostCollapseAfterTransferCount, "Host-collapse count")
      : ledger.hostCollapseAfterTransferCount,
    hostDraftSequence: update.hostDraftSequence ?? ledger.hostDraftSequence,
    hostRunSequence: update.hostRunSequence ?? ledger.hostRunSequence,
    currentHostRunId:
      update.currentHostRunId === undefined ? ledger.currentHostRunId : update.currentHostRunId,
    terminalPreparation:
      update.terminalPreparation === undefined
        ? ledger.terminalPreparation
        : update.terminalPreparation,
    organTagsSeen: canonicalOrganTags([...tagSet]),
    chosenHallmarksAcrossLineage: HALLMARK_ORDER.filter((id) => hallmarkSet.has(id)),
    usedLineageBoonIds: LINEAGE_BOON_CATALOG.filter((boon) => boonSet.has(boon.id)).map(
      (boon) => boon.id,
    ),
    lineageBoonApplications,
    networkSeed: update.networkSeed === undefined ? ledger.networkSeed : update.networkSeed,
    frontierSequence: update.frontierSequence ?? ledger.frontierSequence,
    stabilizedRewardedNodeIds: [...rewardedNodeIds].sort(),
  };
}

/** Catalog order is the durable order for every keyed L1 portfolio record. */
export function canonicalSiteRecords<
  T extends Readonly<{ siteId: import("../../types/ids.js").OrganSiteId }>,
>(records: readonly T[]): readonly T[] {
  const bySite = new Map(records.map((record) => [record.siteId, record]));
  return ORGAN_SITE_CATALOG.flatMap((site) => {
    const record = bySite.get(site.id);
    return record === undefined ? [] : [record];
  });
}
export function progressionIdentity(value: PendingProgression): string {
  return `${value.kind}:${value.id}`;
}
export function validProgression(value: PendingProgression, atMs: number): boolean {
  return (
    value.firstObservedAtActiveMs === atMs &&
    natural(value.firstObservedAtActiveMs) &&
    ((value.kind === "stage" && isStageId(value.id)) ||
      (value.kind === "prestige" && isPrestigeId(value.id)))
  );
}
export function canonicalSnapshot(snapshot: TrackedResourceSnapshot): TrackedResourceSnapshot {
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
    !cultureLateProgramInterfacesAvailable(state) ||
    !state.hallmarkLevels.some((level) => level.id === definition.id && level.level > 0)
  )
    throw new Error("Late hallmark is unavailable.");
}

/**
 * Applies one late-hallmark command without a sequence change. ASVS 2.3.1/2.3.3:
 * each prerequisite is checked before one complete immutable projection is returned.
 */
export function applyLateHallmarkEvent(state: GameState, event: GameEvent): GameState | undefined {
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
      const quote = phenotypeEligibilityQuote(state, event.regionId, event.atMs);
      const region = state.regions.find((candidate) => candidate.id === event.regionId);
      const cooldown = state.lateHallmarks.plasticity.switchCooldownByRegion[event.regionId];
      if (!quote.eligible || !region || (cooldown !== undefined && cooldown > event.atMs))
        throw new Error("Phenotype assignment is unavailable.");
      const definition = plasticityDefinition(event.phenotype);
      return {
        ...state,
        regions: state.regions.map((candidate) =>
          candidate.id === event.regionId
            ? { ...candidate, phenotype: event.phenotype }
            : candidate,
        ),
        lateHallmarks: {
          ...state.lateHallmarks,
          plasticity: {
            switchCooldownByRegion: {
              ...state.lateHallmarks.plasticity.switchCooldownByRegion,
              [event.regionId]: cultureProtocolCooldownDeadline(
                state,
                event.atMs,
                event.atMs + definition.switchCooldownMs,
              ),
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
      const assignments = [
        ...state.lateHallmarks.epigenetic.assignments.filter(
          (assignment) => assignment.hallmarkId !== event.hallmarkId,
        ),
        { hallmarkId: event.hallmarkId, optionId: event.optionId },
      ].sort((left, right) => String(left.hallmarkId).localeCompare(String(right.hallmarkId)));
      return {
        ...state,
        atp: subtract(state.atp, fromSafeInteger(option.atpCost)),
        lateHallmarks: {
          ...state.lateHallmarks,
          epigenetic: {
            assignments,
            cooldownDeadlineMs: cultureProtocolCooldownDeadline(
              state,
              event.atMs,
              event.atMs + option.cooldownMs,
            ),
          },
        },
      };
    }
    case "install-microbiome-composition": {
      ownsLateHallmark(state, hallmarkId("polymorphic_microbiomes"));
      const pending = state.lateHallmarks.microbiome.pendingOffer;
      if (pending === null || pending.id !== event.offerId || pending.expiresAtMs <= event.atMs)
        throw new Error("Microbiome offer is unavailable.");
      const composition = pending.compositions.find(
        (candidate) => candidate.id === event.compositionId,
      );
      if (composition === undefined) throw new Error("Microbiome composition is unavailable.");
      if (event.atMs > Number.MAX_SAFE_INTEGER - MICROBIOME_OFFER_DURATION_MS)
        throw new Error("Microbiome rotation deadline cannot advance safely.");
      const nextRotationDeadlineMs = event.atMs + MICROBIOME_OFFER_DURATION_MS;
      return {
        ...state,
        lateHallmarks: {
          ...state.lateHallmarks,
          microbiome: {
            ...state.lateHallmarks.microbiome,
            activeComposition: { offerId: pending.id, composition, installedAtMs: event.atMs },
            pendingOffer: null,
            nextRotationDeadlineMs,
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
            ].sort(
              (left, right) =>
                left.createdAtMs - right.createdAtMs ||
                String(left.decisionId).localeCompare(String(right.decisionId)),
            ),
          },
        },
      };
    }
    default:
      return undefined;
  }
}
/** Applies a trusted core-six projection without assigning a sequence number. */
export function applyCoreSixEvent(state: GameState, event: GameEvent): GameState | undefined {
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
export function applyExtendedHallmarkEvent(
  state: GameState,
  event: GameEvent,
): GameState | undefined {
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
