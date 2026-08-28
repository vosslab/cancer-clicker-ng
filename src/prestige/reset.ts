import { bigNum, passageUpgradeId, stageId } from "../brands.js";
import { add, isNegative } from "../bignum/bignum.js";
import { STAGE_ONE_PRODUCERS } from "../economy/producers.js";
import { CORE_SIX_HALLMARK_CATALOG } from "../hallmarks/core_six_catalog.js";
import { EXTENDED_HALLMARK_CATALOG } from "../hallmarks/extended_hallmark_catalog.js";
import { emptyLateHallmarksState } from "../hallmarks/late_hallmark_types.js";
import { LATE_HALLMARK_CATALOG } from "../hallmarks/late_hallmark_catalog.js";
import { deriveSeedV1 } from "../state/deterministic_random.js";
import type { GameState, HallmarkLevel } from "../types/state.js";
import { immortalizationCryobankSelectionQuote } from "./culture.js";
import { generateHostDraftV1 } from "./hosts.js";
import { createEmptyHostTransferState, createEmptyMetastasisState } from "./layers.js";
import { createEmptyNetworkState, type DisseminationMandate } from "./network.js";
import { findColonizationProgram, findOrganSite } from "./seeding.js";
import {
  captureTerminalSnapshotV1,
  hostTransferQuoteV1,
  metastasisQuoteV1,
  type HostTransferQuoteV1,
  type MetastasisQuoteV1,
} from "./layers.js";

const HALLMARK_IDS = [
  ...CORE_SIX_HALLMARK_CATALOG,
  ...EXTENDED_HALLMARK_CATALOG,
  ...LATE_HALLMARK_CATALOG,
].map((definition) => definition.id);

function natural(value: number): boolean {
  return Number.isSafeInteger(value) && value >= 0;
}

function hasEarned(state: GameState, id: "L1" | "L2" | "L3" | "L4"): boolean {
  return state.prestigeAvailability.some((entry) => entry.id === id && entry.status === "earned");
}

/** Recomputes the trusted L1 read model; UI values are never accepted as reset inputs. */
export function metastasisResetQuoteV1(state: GameState): MetastasisQuoteV1 {
  return metastasisQuoteV1(captureTerminalSnapshotV1(state));
}

/** Recomputes the trusted L2 read model; UI values are never accepted as reset inputs. */
export function hostTransferResetQuoteV1(state: GameState): HostTransferQuoteV1 {
  return hostTransferQuoteV1(captureTerminalSnapshotV1(state));
}

function validResetEnvelope(state: GameState, sourceEventSequence: number, atMs: number): boolean {
  return (
    natural(state.activeTimeMs) &&
    natural(state.totalOfflineMs) &&
    natural(state.eventSequence) &&
    state.eventSequence < Number.MAX_SAFE_INTEGER &&
    atMs === state.activeTimeMs &&
    sourceEventSequence === state.eventSequence &&
    state.currentStage === "host_collapse"
  );
}

function resetHallmarks(state: GameState, retainHalf: boolean): readonly HallmarkLevel[] {
  const oldLevels = new Map(state.hallmarkLevels.map((level) => [level.id, level.level]));
  return HALLMARK_IDS.map((id) => ({
    id,
    level: retainHalf ? Math.floor((oldLevels.get(id) ?? 0) / 2) : 0,
  }));
}

/** Constructs the complete fresh local run; it deliberately never patches an initial state. */
function projectClearedRunV1(
  state: GameState,
  hallmarkLevels: readonly HallmarkLevel[],
  deterministicSeed: number,
): GameState {
  return {
    cells: bigNum(0, 0),
    substrate: bigNum(0, 0),
    atp: bigNum(0, 0),
    producerLevels: STAGE_ONE_PRODUCERS.map((producer) => ({ id: producer.id, level: 0 })),
    hallmarkLevels,
    currentStage: stageId("transformed_cell"),
    stageStartedAtMs: state.activeTimeMs,
    activeTimeMs: state.activeTimeMs,
    pendingProgression: [],
    stageProgress: 0,
    stageGateProgress: {},
    oxygenPressure: 0,
    damagePressure: 0,
    immunePressure: 0,
    contactPressure: 0,
    nutrientPressure: 0,
    signalingAllocation: "burst",
    manualDivisionCharge: 0,
    cycleFillRate: 0,
    bypassedCheckpoints: [],
    survivalCapacity: 0,
    regions: [],
    telomereReserveByRegion: {},
    telomeraseCharges: 0,
    reserveFloor: 0,
    vesselMaintenanceAtp: 0,
    committedCellCommitments: {},
    routeRiskById: {},
    seededSites: [],
    atpBudget: {},
    atpSinks: [],
    immuneVisibilityByRegion: {},
    concealmentTokens: 0,
    maskedRegions: [],
    inflammationEpisodes: [],
    regionalInflammation: {},
    routeDiscoveryProgress: 0,
    mutationOffers: [],
    chosenMutations: [],
    mutationLiabilities: [],
    genomeBurden: 0,
    lateHallmarks: emptyLateHallmarksState(),
    pendingDamageEvents: [],
    pendingTransitEvents: [],
    deterministicSeed,
    eventSequence: state.eventSequence,
    prestigeAvailability: state.prestigeAvailability,
    totalOfflineMs: state.totalOfflineMs,
    numberFormat: state.numberFormat,
    ending: state.ending,
    lineageLedger: state.lineageLedger,
    metastasis: state.metastasis,
    hostTransfer: state.hostTransfer,
    culture: state.culture,
    network: state.network,
  };
}

/** L3 clears host-local history while retaining only the independently owned culture translation. */
export function projectL3Reset(
  state: GameState,
  input: Readonly<{
    cryobankProgramId: import("../types/ids.js").CryobankProgramId;
    sourceEventSequence: number;
    atMs: number;
  }>,
): GameState | undefined {
  if (!validResetEnvelope(state, input.sourceEventSequence, input.atMs) || !hasEarned(state, "L3"))
    return undefined;
  const preparation = state.lineageLedger.terminalPreparation;
  if (
    !preparation ||
    !preparation.eligible ||
    preparation.hostRunId !== state.lineageLedger.currentHostRunId
  )
    return undefined;
  const quote = immortalizationCryobankSelectionQuote(
    state.lineageLedger,
    state.eventSequence,
    state.metastasis.activeNicheContext?.programId ?? null,
    input.cryobankProgramId,
  );
  if (!quote.available || quote.remainingAwardedPassages === null) return undefined;
  if (state.culture.passages > Number.MAX_SAFE_INTEGER - quote.remainingAwardedPassages)
    return undefined;
  const cleared = projectClearedRunV1(
    state,
    resetHallmarks(state, false),
    deriveSeedV1("l3-reset-v1", state.lineageLedger.lineageSeed, state.eventSequence),
  );
  return {
    ...cleared,
    currentStage: stageId("immortalized_culture"),
    stageStartedAtMs: state.activeTimeMs,
    metastasis: createEmptyMetastasisState(),
    hostTransfer: createEmptyHostTransferState(),
    culture: {
      ...state.culture,
      passages: state.culture.passages + quote.remainingAwardedPassages,
      purchasedPassageUpgrades: [
        ...state.culture.purchasedPassageUpgrades.filter(
          (entry) => entry.upgradeId !== passageUpgradeId("cryobank"),
        ),
        { upgradeId: passageUpgradeId("cryobank"), rank: 1 },
      ],
      cryobankProgram: input.cryobankProgramId,
    },
    network: createEmptyNetworkState(),
  };
}

/** L4 starts one mandate-specific local campaign while retaining culture and global topology. */
export function projectL4CampaignReset(
  state: GameState,
  mandate: DisseminationMandate,
  input: Readonly<{ sourceEventSequence: number; atMs: number }>,
): GameState | undefined {
  void mandate;
  if (
    !natural(state.activeTimeMs) ||
    !natural(state.totalOfflineMs) ||
    !natural(state.eventSequence) ||
    state.eventSequence === Number.MAX_SAFE_INTEGER ||
    input.atMs !== state.activeTimeMs ||
    input.sourceEventSequence !== state.eventSequence
  )
    return undefined;
  if (
    !hasEarned(state, "L3") ||
    !hasEarned(state, "L4") ||
    state.lineageLedger.networkSeed === null ||
    state.currentStage !== "global_lab_contamination"
  )
    return undefined;
  const cleared = projectClearedRunV1(
    state,
    resetHallmarks(state, false),
    deriveSeedV1("l4-campaign-reset-v1", state.lineageLedger.lineageSeed, state.eventSequence),
  );
  return {
    ...cleared,
    currentStage: stageId("global_lab_contamination"),
    stageStartedAtMs: state.activeTimeMs,
    culture: state.culture,
    network: state.network,
  };
}

/**
 * Complete L1 projection. ASVS 2.3.1/2.3.3: all gates precede one immutable output.
 * The reducer owns the following one sequence advance and ledger update.
 */
export function projectL1Reset(
  state: GameState,
  input: Readonly<{
    siteId: import("../types/ids.js").OrganSiteId;
    sourceEventSequence: number;
    atMs: number;
  }>,
): GameState | undefined {
  if (!validResetEnvelope(state, input.sourceEventSequence, input.atMs) || !hasEarned(state, "L1"))
    return undefined;
  const quote = metastasisResetQuoteV1(state);
  if (quote.sourceEventSequence !== input.sourceEventSequence || quote.survivingSeededSiteCount < 1)
    return undefined;
  if (isNegative(state.metastasis.metastaticPotential)) return undefined;
  const allocation = state.metastasis.allocations.find((entry) => entry.siteId === input.siteId);
  const selectedPrograms = state.metastasis.programs.filter(
    (entry) => entry.siteId === input.siteId,
  );
  const [program] = selectedPrograms;
  if (
    !allocation ||
    !program ||
    selectedPrograms.length !== 1 ||
    allocation.rank < 1 ||
    allocation.rank > 3 ||
    findOrganSite(input.siteId) === undefined ||
    findColonizationProgram(program.programId) === undefined
  )
    return undefined;
  const deterministicSeed = deriveSeedV1(
    "l1-reset-v1",
    state.lineageLedger.lineageSeed,
    state.eventSequence,
  );
  const cleared = projectClearedRunV1(state, resetHallmarks(state, true), deterministicSeed);
  return {
    ...cleared,
    metastasis: {
      ...state.metastasis,
      metastaticPotential: add(
        state.metastasis.metastaticPotential,
        bigNum(quote.gainedPotential, 0),
      ),
      activeNicheContext: {
        siteId: input.siteId,
        allocationRank: allocation.rank as 1 | 2 | 3,
        programId: program.programId,
      },
    },
  };
}

/** Complete L2 projection with one saved deterministic draft and no active host. */
export function projectL2Reset(
  state: GameState,
  input: Readonly<{ sourceEventSequence: number; atMs: number }>,
): GameState | undefined {
  if (!validResetEnvelope(state, input.sourceEventSequence, input.atMs) || !hasEarned(state, "L2"))
    return undefined;
  const quote = hostTransferResetQuoteV1(state);
  if (!quote.available || quote.sourceEventSequence !== input.sourceEventSequence) return undefined;
  if (state.hostTransfer.hostImprints > Number.MAX_SAFE_INTEGER - quote.gainedImprints)
    return undefined;
  if (state.lineageLedger.hostDraftSequence === Number.MAX_SAFE_INTEGER) return undefined;
  const nextDraftSequence = state.lineageLedger.hostDraftSequence + 1;
  const draft = generateHostDraftV1({
    lineageSeed: state.lineageLedger.lineageSeed,
    hostDraftSequence: nextDraftSequence,
    sourceEventSequence: state.eventSequence,
    purchasedBoons: state.hostTransfer.purchasedBoons,
  });
  const deterministicSeed = deriveSeedV1(
    "l2-reset-v1",
    state.lineageLedger.lineageSeed,
    state.eventSequence,
  );
  const cleared = projectClearedRunV1(state, resetHallmarks(state, false), deterministicSeed);
  return {
    ...cleared,
    hostTransfer: {
      hostImprints: state.hostTransfer.hostImprints + quote.gainedImprints,
      purchasedBoons: [],
      activeHost: null,
      pendingDraft: draft,
    },
  };
}
