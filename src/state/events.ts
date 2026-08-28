import { bigNum, hallmarkId, hostRunId, passageUpgradeId, producerId } from "../brands.js";
import { add, compare, fromSafeInteger, subtract } from "../bignum/bignum.js";
import { applyProducerPurchase, quoteProducerPurchase } from "../economy/costs.js";
import type { GameEvent } from "../types/events.js";
import type { GameState, PendingProgression, TrackedResourceSnapshot } from "../types/state.js";
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
import { projectSenescenceDecisions } from "../hallmarks/handlers/senescence_factory.js";
import { projectLateHallmarkDurableTickEffects } from "../hallmarks/late_hallmark_tick.js";
import { MICROBIOME_OFFER_DURATION_MS } from "../hallmarks/microbiome_catalog.js";
import { projectExtendedHallmarkDurableTickEffects } from "../hallmarks/extended_hallmark_tick.js";
import {
  findLateHallmark,
  hasReachedLateHallmarkActivation,
} from "../hallmarks/late_hallmark_catalog.js";
import { plasticityDefinition } from "../hallmarks/plasticity_catalog.js";
import { findLateProgramOption } from "../hallmarks/program_catalog.js";
import { removeRegionProjection } from "./region_projection.js";
import { phenotypeEligibilityQuote } from "../hallmarks/late_hallmark_effects.js";
import {
  canonicalOrganTags,
  findColonizationProgram,
  findOrganSite,
  isRouteCompatibleWithSite,
  ORGAN_SITE_CATALOG,
  seededRegionIdForTransit,
} from "../prestige/seeding.js";
import { LINEAGE_BOON_CATALOG } from "../prestige/hosts.js";
import {
  projectL1Reset,
  projectL2Reset,
  projectL3Reset,
  projectL4CampaignReset,
} from "../prestige/reset.js";
import type { LineageBoonApplication, LineageLedger } from "../prestige/layers.js";
import {
  cryobankProgramQuote,
  findPassageUpgrade,
  hasPassageUpgrade,
  passageUpgradeQuote,
} from "../prestige/culture.js";
import {
  AUTHORED_NETWORK_EDGE_CATALOG,
  AUTHORED_NETWORK_NODE_CATALOG,
  completeActiveCampaignWithRenewal,
  generateNetworkFrontierV1,
  hasValidNetworkFrontier,
  isReachableAuthoredTopologyComplete,
  networkFrontierSource,
  type NetworkNodeState,
} from "../prestige/network.js";
import { deriveSeedV1 } from "./deterministic_random.js";
import {
  cultureLateProgramInterfacesAvailable,
  cultureProtocolCooldownDeadline,
} from "../prestige/culture_effects.js";
import { networkNodeCreditQuote } from "../prestige/network_effects.js";
import { CORE_SIX_HALLMARK_CATALOG } from "../hallmarks/core_six_catalog.js";
import { EXTENDED_HALLMARK_CATALOG } from "../hallmarks/extended_hallmark_catalog.js";
import { LATE_HALLMARK_CATALOG } from "../hallmarks/late_hallmark_catalog.js";
import { softEndingEligibility } from "../ending/trigger.js";

function natural(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function hasEarnedPrestige(state: GameState, id: "L3" | "L4"): boolean {
  return state.prestigeAvailability.some((entry) => entry.id === id && entry.status === "earned");
}

function networkActionAvailable(state: GameState): boolean {
  return (
    state.currentStage === "global_lab_contamination" &&
    hasEarnedPrestige(state, "L3") &&
    hasEarnedPrestige(state, "L4") &&
    state.lineageLedger.networkSeed !== null
  );
}

function renewCompletedCampaign(
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
function next(state: GameState, change: Partial<GameState>): GameState {
  if (!natural(state.eventSequence) || state.eventSequence === Number.MAX_SAFE_INTEGER)
    throw new Error("Event sequence cannot advance safely.");
  return { ...state, ...change, eventSequence: state.eventSequence + 1 };
}

const HALLMARK_ORDER = [
  ...CORE_SIX_HALLMARK_CATALOG,
  ...EXTENDED_HALLMARK_CATALOG,
  ...LATE_HALLMARK_CATALOG,
].map((entry) => entry.id);

function boonCatalogOrder(boonId: import("../types/ids.js").LineageBoonId): number {
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
function updateLedger(
  ledger: LineageLedger,
  update: Readonly<{
    successfulTransit?: boolean;
    chosenHallmarkId?: import("../types/ids.js").HallmarkId;
    usedBoonId?: import("../types/ids.js").LineageBoonId;
    completedL1?: boolean;
    completedHostTransfer?: boolean;
    hostDraftSequence?: number;
    currentHostRunId?: import("../types/ids.js").HostRunId | null;
    hostRunSequence?: number;
    terminalPreparation?: LineageLedger["terminalPreparation"];
    hostCollapseAfterTransfer?: boolean;
    organTags?: readonly import("../types/ids.js").OrganTagId[];
    lineageBoonApplications?: LineageLedger["lineageBoonApplications"];
    networkSeed?: number | null;
    frontierSequence?: number;
    stabilizedRewardedNodeId?: import("../types/ids.js").NetworkNodeId;
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
function canonicalSiteRecords<
  T extends Readonly<{ siteId: import("../types/ids.js").OrganSiteId }>,
>(records: readonly T[]): readonly T[] {
  const bySite = new Map(records.map((record) => [record.siteId, record]));
  return ORGAN_SITE_CATALOG.flatMap((site) => {
    const record = bySite.get(site.id);
    return record === undefined ? [] : [record];
  });
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
    !cultureLateProgramInterfacesAvailable(state) ||
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
      const reserveProjection = projectManualDivisionHallmarkEffects(state);
      const projection = projectSenescenceDecisions(state, reserveProjection, {
        atMs: event.atMs,
        originSequence: state.eventSequence,
      });
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
      if (event.execution === "assay") {
        const queued = state.culture.queuedProducerAction;
        if (
          event.atMs !== state.activeTimeMs ||
          !queued ||
          queued.producerId !== id ||
          queued.queuedAtEventSequence !== event.queuedAtEventSequence ||
          !hasPassageUpgrade(state.culture, passageUpgradeId("assay_discipline")) ||
          !quoteProducerPurchase(state, id, 1).affordable
        )
          throw new Error("Assay producer action is unavailable.");
        const purchased = applyProducerPurchase(state, id, 1);
        return next(state, {
          ...purchased,
          culture: { ...state.culture, queuedProducerAction: null },
        });
      }
      const purchased = applyProducerPurchase(state, id, event.quantity);
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
      const lateHallmarkDefinition = findLateHallmark(id);
      if (lateHallmarkDefinition !== undefined) {
        if (
          !hasReachedLateHallmarkActivation(state.currentStage, lateHallmarkDefinition.key) ||
          !cultureLateProgramInterfacesAvailable(state)
        )
          throw new Error("Late hallmark is locked.");
      }
      return next(state, {
        hallmarkLevels: state.hallmarkLevels.map((level) =>
          level.id === id ? { ...level, level: level.level + 1 } : level,
        ),
        lineageLedger: updateLedger(state.lineageLedger, { chosenHallmarkId: id }),
      });
    }
    case "advance-stage": {
      const fromStageId = event.fromStageId;
      const toStageId = event.toStageId;
      const projection = assertStageTransition(state, fromStageId, toStageId, event.atMs);
      const pendingProgression = state.pendingProgression.filter((item) => item.kind !== "stage");
      const currentHostRunId = state.lineageLedger.currentHostRunId;
      const enteredHostCollapse = toStageId === "host_collapse" && currentHostRunId !== null;
      const ledger = enteredHostCollapse
        ? updateLedger(state.lineageLedger, {
            hostCollapseAfterTransfer: true,
            terminalPreparation: {
              hostRunId: currentHostRunId,
              eligible:
                state.seededSites.some((id) =>
                  state.regions.some((region) => region.id === id && region.viability > 0),
                ) &&
                state.pendingDamageEvents.length === 0 &&
                state.pendingTransitEvents.length === 0,
              assessedAtActiveMs: event.atMs,
            },
          })
        : state.lineageLedger;
      return next(state, {
        ...projection,
        bypassedCheckpoints: [],
        pendingProgression,
        lineageLedger: ledger,
      });
    }
    case "resolve-transit": {
      if (!natural(state.activeTimeMs) || event.atMs !== state.activeTimeMs)
        throw new Error("Transit resolution is stale.");
      const pending = state.pendingTransitEvents.find(
        (candidate) => candidate.id === event.transitEventId,
      );
      const site = findOrganSite(event.destinationSiteId);
      if (!pending || !site || !isRouteCompatibleWithSite(pending.routeId, site.id))
        throw new Error("Transit resolution is unavailable.");
      const pendingTransitEvents = state.pendingTransitEvents.filter(
        (candidate) => candidate.id !== pending.id,
      );
      if (pending.outcome === "lost") return next(state, { pendingTransitEvents });
      const seededId = seededRegionIdForTransit(pending.id);
      if (
        state.regions.some((region) => region.id === seededId) ||
        state.seededSites.includes(seededId)
      )
        throw new Error("Transit region already exists.");
      return next(state, {
        pendingTransitEvents,
        regions: [
          ...state.regions,
          {
            id: seededId,
            capacity: site.initialCapacity,
            viability: 1,
            phenotype: "proliferative",
            vesselLinkIds: [],
            routeIds: [],
          },
        ],
        seededSites: [...state.seededSites, seededId],
        lineageLedger: updateLedger(state.lineageLedger, {
          successfulTransit: true,
          organTags: site.tags,
        }),
      });
    }
    case "perform-metastasis-reset": {
      const projection = projectL1Reset(state, event);
      if (projection === undefined) throw new Error("Metastasis reset is unavailable.");
      return next(state, {
        ...projection,
        lineageLedger: updateLedger(projection.lineageLedger, { completedL1: true }),
      });
    }
    case "allocate-organ-site": {
      if (
        !natural(state.activeTimeMs) ||
        event.atMs !== state.activeTimeMs ||
        event.sourceEventSequence !== state.eventSequence
      )
        throw new Error("Organ allocation is stale.");
      const site = findOrganSite(event.siteId);
      if (!site) throw new Error("Organ allocation site is unavailable.");
      const current = state.metastasis.allocations.find(
        (allocation) => allocation.siteId === site.id,
      );
      const nextRank = current ? current.rank + 1 : 1;
      const cost = site.allocationCosts[nextRank - 1];
      if (
        !cost ||
        nextRank > site.allocationCosts.length ||
        compare(state.metastasis.metastaticPotential, bigNum(cost, 0)) < 0
      )
        throw new Error("Organ allocation is unaffordable.");
      const allocations = canonicalSiteRecords([
        ...state.metastasis.allocations.filter((allocation) => allocation.siteId !== site.id),
        { siteId: site.id, rank: nextRank },
      ]);
      return next(state, {
        metastasis: {
          ...state.metastasis,
          metastaticPotential: subtract(state.metastasis.metastaticPotential, bigNum(cost, 0)),
          allocations,
        },
      });
    }
    case "select-colonization-program": {
      if (
        !natural(state.activeTimeMs) ||
        event.atMs !== state.activeTimeMs ||
        event.sourceEventSequence !== state.eventSequence
      )
        throw new Error("Colonization program is stale.");
      if (
        !findColonizationProgram(event.programId) ||
        !state.metastasis.allocations.some(
          (entry) => entry.siteId === event.siteId && entry.rank > 0,
        )
      )
        throw new Error("Colonization program is unavailable.");
      const programs = canonicalSiteRecords([
        ...state.metastasis.programs.filter((entry) => entry.siteId !== event.siteId),
        { siteId: event.siteId, programId: event.programId },
      ]);
      return next(state, { metastasis: { ...state.metastasis, programs } });
    }
    case "purchase-lineage-boon": {
      if (
        !natural(state.activeTimeMs) ||
        event.atMs !== state.activeTimeMs ||
        event.sourceEventSequence !== state.eventSequence
      )
        throw new Error("Lineage boon is stale.");
      const boon = LINEAGE_BOON_CATALOG.find((candidate) => candidate.id === event.boonId);
      if (
        !boon ||
        state.lineageLedger.usedLineageBoonIds.includes(boon.id) ||
        state.hostTransfer.hostImprints < boon.cost
      )
        throw new Error("Lineage boon is unavailable.");
      if (event.boonId === "reduced_trait_liability") {
        const activeHost = state.hostTransfer.activeHost;
        const draft = state.hostTransfer.pendingDraft;
        if (
          !activeHost ||
          !draft ||
          draft.consumedCardId !== activeHost.card.id ||
          state.lineageLedger.currentHostRunId !== activeHost.hostRunId ||
          ![
            activeHost.card.immuneRegime,
            activeHost.card.tissueEcology,
            activeHost.card.hostHorizon,
          ].includes(event.targetTraitId)
        )
          throw new Error("Targeted lineage boon is unavailable.");
        return next(state, {
          hostTransfer: {
            ...state.hostTransfer,
            hostImprints: state.hostTransfer.hostImprints - boon.cost,
          },
          lineageLedger: updateLedger(state.lineageLedger, {
            usedBoonId: boon.id,
            lineageBoonApplications: [
              {
                boonId: boon.id,
                kind: "targeted-active-host",
                draftId: draft.id,
                hostRunId: activeHost.hostRunId,
                cardId: activeHost.card.id,
                targetTraitId: event.targetTraitId,
              },
            ],
          }),
        });
      }
      if (state.hostTransfer.purchasedBoons.some((purchased) => purchased.boonId === boon.id))
        throw new Error("Lineage boon is unavailable.");
      const purchasedBoons = [
        ...state.hostTransfer.purchasedBoons,
        { boonId: boon.id, kind: "pre-draft" as const },
      ].sort((left, right) => boonCatalogOrder(left.boonId) - boonCatalogOrder(right.boonId));
      return next(state, {
        hostTransfer: {
          ...state.hostTransfer,
          hostImprints: state.hostTransfer.hostImprints - boon.cost,
          purchasedBoons,
        },
        lineageLedger: updateLedger(state.lineageLedger, { usedBoonId: boon.id }),
      });
    }
    case "perform-host-transfer": {
      const projection = projectL2Reset(state, event);
      if (projection === undefined) throw new Error("Host transfer is unavailable.");
      const nextDraftSequence = state.lineageLedger.hostDraftSequence + 1;
      return next(state, {
        ...projection,
        lineageLedger: updateLedger(projection.lineageLedger, {
          completedHostTransfer: true,
          hostDraftSequence: nextDraftSequence,
          currentHostRunId: null,
          terminalPreparation: null,
          lineageBoonApplications: state.hostTransfer.purchasedBoons.map((boon) => ({
            boonId: boon.boonId,
            kind: "pre-draft",
            draftId: projection.hostTransfer.pendingDraft!.id,
          })),
        }),
      });
    }
    case "select-host-card": {
      if (!natural(state.activeTimeMs) || event.atMs !== state.activeTimeMs)
        throw new Error("Host-card selection is stale.");
      const draft = state.hostTransfer.pendingDraft;
      if (
        !draft ||
        draft.id !== event.draftId ||
        !draft.available ||
        draft.consumedCardId !== null ||
        draft.sourceEventSequence !== event.sourceEventSequence
      )
        throw new Error("Host draft is unavailable.");
      const card = draft.cards.find((candidate) => candidate.id === event.cardId);
      if (
        !card ||
        !draft.revealedCardIds.includes(card.id) ||
        state.lineageLedger.hostRunSequence === Number.MAX_SAFE_INTEGER
      )
        throw new Error("Host card is unavailable.");
      const hostRunSequence = state.lineageLedger.hostRunSequence + 1;
      const id = hostRunId(`host-run-v1:${state.lineageLedger.lineageSeed}:${hostRunSequence}`);
      return next(state, {
        hostTransfer: {
          ...state.hostTransfer,
          activeHost: { hostRunId: id, card },
          pendingDraft: { ...draft, available: false, consumedCardId: card.id },
        },
        lineageLedger: updateLedger(state.lineageLedger, { currentHostRunId: id, hostRunSequence }),
      });
    }
    case "perform-immortalization": {
      const projection = projectL3Reset(state, event);
      if (projection === undefined) throw new Error("Immortalization is unavailable.");
      if (state.lineageLedger.networkSeed !== null)
        throw new Error("Immortalization is unavailable.");
      const networkSeed = deriveSeedV1(
        "network-seed-v1",
        state.lineageLedger.lineageSeed,
        state.eventSequence,
      );
      return next(state, {
        ...projection,
        lineageLedger: updateLedger(projection.lineageLedger, {
          currentHostRunId: null,
          terminalPreparation: null,
          networkSeed,
        }),
      });
    }
    case "purchase-passage-upgrade": {
      if (event.atMs !== state.activeTimeMs || event.sourceEventSequence !== state.eventSequence)
        throw new Error("Passage upgrade is stale.");
      const quote = passageUpgradeQuote(state.lineageLedger, state.culture, event.upgradeId);
      const definition = findPassageUpgrade(event.upgradeId);
      if (!definition || !quote.available || quote.cost === null)
        throw new Error("Passage upgrade is unavailable.");
      const current = state.culture.purchasedPassageUpgrades.find(
        (purchase) => purchase.upgradeId === definition.id,
      );
      const rank = (current?.rank ?? 0) + 1;
      const purchasedPassageUpgrades = [
        ...state.culture.purchasedPassageUpgrades.filter(
          (purchase) => purchase.upgradeId !== definition.id,
        ),
        { upgradeId: definition.id, rank },
      ].sort((left, right) => left.upgradeId.localeCompare(right.upgradeId));
      return next(state, {
        culture: {
          ...state.culture,
          passages: state.culture.passages - quote.cost,
          purchasedPassageUpgrades,
        },
      });
    }
    case "queue-assay-producer-action": {
      if (event.atMs !== state.activeTimeMs || event.sourceEventSequence !== state.eventSequence)
        throw new Error("Assay queue is stale.");
      if (
        !hasPassageUpgrade(state.culture, passageUpgradeId("assay_discipline")) ||
        !quoteProducerPurchase(state, event.producerId, 1).affordable
      )
        throw new Error("Assay queue is unavailable.");
      return next(state, {
        culture: {
          ...state.culture,
          queuedProducerAction: {
            producerId: event.producerId,
            queuedAtEventSequence: state.eventSequence + 1,
            queuedAtActiveMs: event.atMs,
          },
        },
      });
    }
    case "select-cryobank-program": {
      if (event.atMs !== state.activeTimeMs || event.sourceEventSequence !== state.eventSequence)
        throw new Error("Cryobank selection is stale.");
      if (!cryobankProgramQuote(state.culture, event.cryobankProgramId).available)
        throw new Error("Cryobank program is unavailable.");
      return next(state, {
        culture: { ...state.culture, cryobankProgram: event.cryobankProgramId },
      });
    }
    case "establish-dissemination-node": {
      if (event.atMs !== state.activeTimeMs || event.sourceEventSequence !== state.eventSequence)
        throw new Error("Network node is stale.");
      if (!networkActionAvailable(state)) throw new Error("Network node is unavailable.");
      const definition = AUTHORED_NETWORK_NODE_CATALOG.find((node) => node.id === event.nodeId);
      if (!definition || state.network.nodes.some((node) => node.id === definition.id))
        throw new Error("Network node is unavailable.");
      const hasNodes = state.network.nodes.length > 0;
      const adjacentEstablished = AUTHORED_NETWORK_EDGE_CATALOG.some(
        (edge) =>
          edge.toNodeId === definition.id &&
          state.network.nodes.some((node) => node.id === edge.fromNodeId),
      );
      if (hasNodes && !adjacentEstablished) throw new Error("Network node is disconnected.");
      const node: NetworkNodeState = {
        id: definition.id,
        sourceKind: "authored",
        campaignId: null,
        status: "established",
        establishedAtActiveMs: event.atMs,
        stabilizedAtActiveMs: null,
      };
      return next(state, { network: { ...state.network, nodes: [...state.network.nodes, node] } });
    }
    case "commit-dissemination-edge": {
      if (event.atMs !== state.activeTimeMs || event.sourceEventSequence !== state.eventSequence)
        throw new Error("Network edge is stale.");
      if (!networkActionAvailable(state)) throw new Error("Network edge is unavailable.");
      const authored = AUTHORED_NETWORK_EDGE_CATALOG.find((edge) => edge.id === event.edgeId);
      const plannedGeneratedEdge = state.network.activeCampaign?.mandate.plannedEdges.find(
        (edge) => edge.id === event.edgeId,
      );
      const generated = state.network.edges.find(
        (edge) =>
          edge.id === event.edgeId &&
          edge.campaignId === state.network.activeCampaign?.mandate.campaignId &&
          edge.status === "retired" &&
          edge.fromNodeId === plannedGeneratedEdge?.fromNodeId &&
          edge.toNodeId === plannedGeneratedEdge?.toNodeId,
      );
      const definition = authored ?? generated;
      if (!definition || (authored && state.network.edges.some((edge) => edge.id === authored.id)))
        throw new Error("Network edge is unavailable.");
      if (
        !state.network.nodes.some((node) => node.id === definition.fromNodeId) ||
        !state.network.nodes.some((node) => node.id === definition.toNodeId)
      )
        throw new Error("Network edge endpoints are unavailable.");
      const committedEdge = {
        ...definition,
        status: "committed" as const,
        campaignId: generated?.campaignId ?? null,
      };
      const network = {
        ...state.network,
        edges: generated
          ? state.network.edges.map((edge) => (edge.id === generated.id ? committedEdge : edge))
          : [...state.network.edges, committedEdge],
      };
      return next(state, { network: renewCompletedCampaign(state, network) });
    }
    case "choose-dissemination-mandate": {
      if (event.atMs !== state.activeTimeMs || event.sourceEventSequence !== state.eventSequence)
        throw new Error("Dissemination mandate is stale.");
      if (!networkActionAvailable(state)) throw new Error("Dissemination mandate is unavailable.");
      const frontier = state.network.pendingFrontier;
      const mandate = frontier?.mandates.find((candidate) => candidate.id === event.mandateId);
      if (
        !frontier ||
        !hasValidNetworkFrontier(frontier) ||
        frontier.id !== event.frontierId ||
        !mandate ||
        mandate.status !== "pending" ||
        state.network.activeCampaign !== null
      )
        throw new Error("Dissemination mandate is unavailable.");
      const projection = projectL4CampaignReset(state, mandate, event);
      if (projection === undefined) throw new Error("Dissemination mandate is unavailable.");
      const selected = { ...mandate, status: "selected" as const };
      return next(state, {
        ...projection,
        network: {
          ...projection.network,
          pendingFrontier: null,
          activeCampaign: {
            sourceFrontier: networkFrontierSource(frontier),
            mandate: selected,
            selectedAtActiveMs: event.atMs,
          },
          nodes: [
            ...state.network.nodes,
            ...selected.generatedNodeIds.map((id) => ({
              id,
              sourceKind: "generated" as const,
              campaignId: selected.campaignId,
              status: "established" as const,
              establishedAtActiveMs: event.atMs,
              stabilizedAtActiveMs: null,
            })),
          ],
          edges: [
            ...state.network.edges,
            ...selected.plannedEdges.map((edge) => ({
              id: edge.id,
              fromNodeId: edge.fromNodeId,
              toNodeId: edge.toNodeId,
              status: "retired" as const,
              campaignId: selected.campaignId,
            })),
          ],
        },
        lineageLedger: updateLedger(projection.lineageLedger, {
          frontierSequence: state.lineageLedger.frontierSequence + 1,
        }),
      });
    }
    case "stabilize-network-node": {
      if (event.atMs !== state.activeTimeMs || event.sourceEventSequence !== state.eventSequence)
        throw new Error("Network stabilization is stale.");
      if (!networkActionAvailable(state)) throw new Error("Network stabilization is unavailable.");
      const node = state.network.nodes.find((candidate) => candidate.id === event.nodeId);
      if (!node || node.status !== "established") throw new Error("Network node is unavailable.");
      const stabilized = { ...node, status: "stable" as const, stabilizedAtActiveMs: event.atMs };
      const network = {
        ...state.network,
        nodes: state.network.nodes.map((candidate) =>
          candidate.id === node.id ? stabilized : candidate,
        ),
      };
      const readyForFrontier =
        network.pendingFrontier === null &&
        network.activeCampaign === null &&
        state.lineageLedger.networkSeed !== null &&
        isReachableAuthoredTopologyComplete(network);
      const frontier = readyForFrontier
        ? generateNetworkFrontierV1({
            networkSeed: state.lineageLedger.networkSeed,
            globalTier: network.globalTier,
            frontierSequence: state.lineageLedger.frontierSequence,
            sourceEventSequence: state.eventSequence + 1,
          })
        : null;
      return next(state, {
        network: renewCompletedCampaign(state, {
          ...network,
          pendingFrontier: frontier ?? network.pendingFrontier,
        }),
      });
    }
    case "collect-transmission-pressure": {
      if (event.atMs !== state.activeTimeMs || event.sourceEventSequence !== state.eventSequence)
        throw new Error("Transmission Pressure collection is stale.");
      if (!networkActionAvailable(state)) throw new Error("Transmission Pressure is unavailable.");
      const quote = networkNodeCreditQuote(state, event.nodeId);
      if (!quote.available) throw new Error("Transmission Pressure is unavailable.");
      return next(state, {
        network: {
          ...state.network,
          transmissionPressure: add(state.network.transmissionPressure, bigNum(quote.credit, 0)),
        },
        lineageLedger: updateLedger(state.lineageLedger, {
          stabilizedRewardedNodeId: quote.nodeId,
        }),
      });
    }
    case "select-containment-node": {
      if (event.atMs !== state.activeTimeMs || event.sourceEventSequence !== state.eventSequence)
        throw new Error("Containment selection is stale.");
      if (!networkActionAvailable(state)) throw new Error("Containment selection is unavailable.");
      if (
        state.lineageLedger.networkSeed === null ||
        !hasPassageUpgrade(state.culture, passageUpgradeId("containment")) ||
        !state.network.nodes.some(
          (node) =>
            node.id === event.nodeId && (node.status === "established" || node.status === "stable"),
        )
      )
        throw new Error("Containment selection is unavailable.");
      return next(state, { network: { ...state.network, containedNodeId: event.nodeId } });
    }
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
      const lateHallmarkDurable = projectLateHallmarkDurableTickEffects(state, event.elapsedMs);
      const accrued = {
        ...state,
        ...elapsedDurable,
        ...extendedHallmarkDurable,
        lateHallmarks: {
          ...elapsedDurable.lateHallmarks,
          microbiome: lateHallmarkDurable.microbiome,
        },
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
    case "reach-soft-ending": {
      if (event.atMs !== state.activeTimeMs || event.sourceEventSequence !== state.eventSequence)
        throw new Error("Soft-ending report is stale.");
      if (!softEndingEligibility(state).available)
        throw new Error("Soft-ending report is unavailable.");
      const ending = Object.freeze({
        phase: "reached" as const,
        reachedAtActiveMs: state.activeTimeMs,
        sourceEventSequence: state.eventSequence,
        reachedCells: state.cells,
        reachedNetworkTier: state.network.globalTier,
      });
      return next(state, { ending });
    }
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
