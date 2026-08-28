import { bigNum } from "../brands.js";
import { add, isNegative, isPositive, log10, one } from "../bignum/bignum.js";
import type { BigNum } from "../types/bignum.js";
import type {
  HallmarkId,
  ColonizationProgramId,
  HostCardId,
  HostDraftId,
  HostRunId,
  HostTraitId,
  LineageBoonId,
  OrganSiteId,
  OrganTagId,
  RegionId,
  StageId,
} from "../types/ids.js";
import type { HostCard, HostDraft, PurchasedLineageBoon } from "./hosts.js";

export type TerminalPreparation = Readonly<{
  hostRunId: HostRunId;
  eligible: boolean;
  assessedAtActiveMs: number;
}>;
export type ActiveNicheContext = Readonly<{
  siteId: OrganSiteId;
  allocationRank: 1 | 2 | 3;
  programId: ColonizationProgramId;
}>;
export type LineageBoonApplication =
  | Readonly<{
      boonId: LineageBoonId;
      kind: "pre-draft";
      draftId: HostDraftId;
    }>
  | Readonly<{
      boonId: LineageBoonId;
      kind: "targeted-active-host";
      draftId: HostDraftId;
      hostRunId: HostRunId;
      cardId: HostCardId;
      targetTraitId: HostTraitId;
    }>;
export type LineageLedger = Readonly<{
  lineageSeed: number;
  hostRunSequence: number;
  currentHostRunId: HostRunId | null;
  completedL1ResetCount: number;
  completedHostTransferCount: number;
  hostCollapseAfterTransferCount: number;
  successfulTransitCount: number;
  organTagsSeen: readonly OrganTagId[];
  chosenHallmarksAcrossLineage: readonly HallmarkId[];
  usedLineageBoonIds: readonly LineageBoonId[];
  /** Immutable per-draft boon provenance for later layer effects. */
  lineageBoonApplications: readonly LineageBoonApplication[];
  terminalPreparation: TerminalPreparation | null;
  hostDraftSequence: number;
  networkSeed: number | null;
  frontierSequence: number;
  stabilizedRewardedNodeIds: readonly string[];
}>;
export type MetastasisState = Readonly<{
  metastaticPotential: BigNum;
  allocations: readonly Readonly<{ siteId: OrganSiteId; rank: number }>[];
  programs: readonly Readonly<{
    siteId: OrganSiteId;
    programId: ColonizationProgramId;
  }>[];
  activeNicheContext: ActiveNicheContext | null;
}>;
export type HostTransferState = Readonly<{
  hostImprints: number;
  purchasedBoons: readonly PurchasedLineageBoon[];
  activeHost: Readonly<{ hostRunId: HostRunId; card: HostCard }> | null;
  pendingDraft: HostDraft | null;
}>;
export type TerminalSnapshotV1 = Readonly<{
  stageId: StageId;
  activeTimeMs: number;
  eventSequence: number;
  cells: BigNum;
  viableSeededSiteIds: readonly RegionId[];
  organTagsSeen: readonly OrganTagId[];
  successfulTransitCount: number;
  completedL1ResetCount: number;
}>;
export type TrustedTerminalStateV1 = Readonly<{
  currentStage: StageId;
  activeTimeMs: number;
  eventSequence: number;
  cells: BigNum;
  seededSites: readonly RegionId[];
  regions: readonly Readonly<{ id: RegionId; viability: number }>[];
  lineageLedger: LineageLedger;
}>;
export type MetastasisQuoteV1 = Readonly<{
  sourceEventSequence: number;
  gainedPotential: number;
  survivingSeededSiteCount: number;
  distinctOrganTagCount: number;
}>;
export type HostTransferQuoteV1 = Readonly<{
  sourceEventSequence: number;
  gainedImprints: number;
  available: boolean;
  reason: "available" | "insufficient-resets" | "insufficient-diversity";
}>;

export function createEmptyLineageLedger(lineageSeed: number): LineageLedger {
  if (!Number.isSafeInteger(lineageSeed) || lineageSeed < 1 || lineageSeed > 0xffff_ffff) {
    throw new Error("Lineage seed must be a nonzero unsigned 32-bit integer.");
  }
  return Object.freeze({
    lineageSeed,
    hostRunSequence: 0,
    currentHostRunId: null,
    completedL1ResetCount: 0,
    completedHostTransferCount: 0,
    hostCollapseAfterTransferCount: 0,
    successfulTransitCount: 0,
    organTagsSeen: Object.freeze([]),
    chosenHallmarksAcrossLineage: Object.freeze([]),
    usedLineageBoonIds: Object.freeze([]),
    lineageBoonApplications: Object.freeze([]),
    terminalPreparation: null,
    hostDraftSequence: 0,
    networkSeed: null,
    frontierSequence: 0,
    stabilizedRewardedNodeIds: Object.freeze([]),
  });
}

export function createEmptyMetastasisState(): MetastasisState {
  return Object.freeze({
    metastaticPotential: bigNum(0, 0),
    allocations: Object.freeze([]),
    programs: Object.freeze([]),
    activeNicheContext: null,
  });
}

export function createEmptyHostTransferState(): HostTransferState {
  return Object.freeze({
    hostImprints: 0,
    purchasedBoons: Object.freeze([]),
    activeHost: null,
    pendingDraft: null,
  });
}

/** Captures only trusted terminal facts; the caller supplies a state that owns a lineage ledger. */
export function captureTerminalSnapshotV1(state: TrustedTerminalStateV1): TerminalSnapshotV1 {
  if (state.currentStage !== "host_collapse")
    throw new Error("Terminal snapshot requires host collapse.");
  const viableRegionIds = new Set(
    state.regions
      .filter((region) => Number.isFinite(region.viability) && region.viability > 0)
      .map((region) => region.id),
  );
  const viableSeededSiteIds = state.seededSites.filter((siteId) => viableRegionIds.has(siteId));
  return Object.freeze({
    stageId: state.currentStage,
    activeTimeMs: state.activeTimeMs,
    eventSequence: state.eventSequence,
    cells: state.cells,
    viableSeededSiteIds: Object.freeze([...viableSeededSiteIds]),
    organTagsSeen: Object.freeze([...state.lineageLedger.organTagsSeen]),
    successfulTransitCount: state.lineageLedger.successfulTransitCount,
    completedL1ResetCount: state.lineageLedger.completedL1ResetCount,
  });
}

function terminalCellLogFloor(cells: BigNum): number {
  if (isNegative(cells)) throw new Error("Terminal cells must not be negative.");
  const incrementedCells = add(cells, one());
  if (!isPositive(incrementedCells))
    throw new Error("Terminal cells must produce a positive log input.");
  const logarithm = log10(incrementedCells);
  if (!Number.isFinite(logarithm)) throw new Error("Terminal cell logarithm is not finite.");
  return Math.max(0, Math.min(Number.MAX_SAFE_INTEGER, Math.floor(logarithm)));
}

export function metastasisQuoteV1(snapshot: TerminalSnapshotV1): MetastasisQuoteV1 {
  const survivingSeededSiteCount = snapshot.viableSeededSiteIds.length;
  const distinctOrganTagCount = snapshot.organTagsSeen.length;
  const base = terminalCellLogFloor(snapshot.cells);
  const gainedPotential = Math.max(
    1,
    base +
      2 * survivingSeededSiteCount +
      distinctOrganTagCount +
      Math.floor(snapshot.successfulTransitCount / 2),
  );
  return Object.freeze({
    sourceEventSequence: snapshot.eventSequence,
    gainedPotential,
    survivingSeededSiteCount,
    distinctOrganTagCount,
  });
}

export function hostTransferQuoteV1(snapshot: TerminalSnapshotV1): HostTransferQuoteV1 {
  const distinctOrganTagCount = snapshot.organTagsSeen.length;
  const gainedImprints =
    1 + Math.floor(distinctOrganTagCount / 2) + Math.floor(snapshot.completedL1ResetCount / 3);
  const reason =
    snapshot.completedL1ResetCount < 3
      ? "insufficient-resets"
      : distinctOrganTagCount < 2
        ? "insufficient-diversity"
        : "available";
  return Object.freeze({
    sourceEventSequence: snapshot.eventSequence,
    gainedImprints,
    available: reason === "available",
    reason,
  });
}
