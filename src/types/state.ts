import type { BigNum } from "./bignum.js";
import type { MutationDraftOffer } from "../hallmarks/extended_hallmark_types.js";
import type {
  EventId,
  HallmarkId,
  MicrobiomePoolId,
  MutationId,
  OfferId,
  PrestigeId,
  ProducerId,
  ProgramOptionId,
  RegionId,
  RouteId,
  StageId,
} from "./ids.js";

export type NumberFormat = "short" | "full";
export type SignalingAllocation = "burst" | "cycle";
export type CheckpointId = "contact-inhibition" | "nutrient-arrest" | "damage-arrest";
export type TriageAction = "absorb" | "repair" | "lose-region";
export type Phenotype = "proliferative" | "migratory" | "stress-tolerant";
export type SenescenceAction = "keep" | "clear";
export type ProducerLevel = Readonly<{ id: ProducerId; level: number }>;
export type HallmarkLevel = Readonly<{ id: HallmarkId; level: number }>;
/** Declarative only: M13 owns currencies, rewards, and reset behavior. */
export type PrestigeAvailability = Readonly<{ id: PrestigeId; status: "unavailable" | "earned" }>;
export type PendingProgression =
  | Readonly<{ kind: "stage"; id: StageId; firstObservedAtActiveMs: number }>
  | Readonly<{ kind: "prestige"; id: PrestigeId; firstObservedAtActiveMs: number }>;
/** One durable bound protects save parsing, runtime events, and offline adapter work. */
export const MAX_PENDING_PROGRESSION = 256;
export type RegionState = Readonly<{
  id: RegionId;
  capacity: number;
  viability: number;
  phenotype: Phenotype;
  vesselLinkIds: readonly EventId[];
  routeIds: readonly RouteId[];
  senescenceEventId?: EventId;
}>;
export type PendingDamageEvent = Readonly<{
  id: EventId;
  regionId: RegionId;
  outcome: "repairable" | "fatal" | "substrate-recovery";
}>;
export type PendingTransitEvent = Readonly<{
  id: EventId;
  routeId: RouteId;
  outcome: "arrived" | "lost";
}>;
export type InflammationEpisode = Readonly<{ id: EventId; regionId: RegionId; deadlineMs: number }>;
export type ProgramState = Readonly<{
  allowedByHallmark: Readonly<Record<string, readonly ProgramOptionId[]>>;
  selectedByHallmark: Readonly<Record<string, ProgramOptionId>>;
  eligibleHallmarks: readonly HallmarkId[];
  cooldownDeadlineMs: number | null;
}>;
export type MicrobiomeState = Readonly<{
  poolId?: MicrobiomePoolId;
  offerIds: readonly OfferId[];
  seed: number;
  sequence: number;
  rotationCounter: number;
  rotationDeadlineMs: number | null;
  pendingCompatibility: "compatible" | "incompatible" | null;
  selectedNiches: readonly OfferId[];
  compatibilitySnapshot: readonly OfferId[];
}>;

/** The serializable, authoritative game state. All deadlines use simulation time. */
export type GameState = Readonly<{
  cells: BigNum;
  substrate: BigNum;
  atp: BigNum;
  producerLevels: readonly ProducerLevel[];
  hallmarkLevels: readonly HallmarkLevel[];
  currentStage: StageId;
  stageStartedAtMs: number;
  /** Monotonic simulation time; never derived from a wall-clock save sample. */
  activeTimeMs: number;
  /** Identity-only eligibility observations awaiting an explicit stage progression/M13 action. */
  pendingProgression: readonly PendingProgression[];
  stageProgress: number;
  /** Saved per-stage gate progress; stage progression owns semantic gate evaluation. */
  stageGateProgress: Readonly<Record<string, number>>;
  lastStageTransition?: Readonly<{ from: StageId; to: StageId; atMs: number }>;
  oxygenPressure: number;
  damagePressure: number;
  immunePressure: number;
  contactPressure: number;
  nutrientPressure: number;
  signalingAllocation: SignalingAllocation;
  manualDivisionCharge: number;
  cycleFillRate: number;
  bypassedCheckpoints: readonly CheckpointId[];
  survivalCapacity: number;
  regions: readonly RegionState[];
  telomereReserveByRegion: Readonly<Record<string, number>>;
  telomeraseCharges: number;
  reserveFloor: number;
  vesselMaintenanceAtp: number;
  /** Route commitments partition cells; this is not a second resource balance. */
  committedCellCommitments: Readonly<Record<string, number>>;
  routeRiskById: Readonly<Record<string, number>>;
  seededSites: readonly RegionId[];
  atpBudget: Readonly<Record<string, number>>;
  atpSinks: readonly string[];
  immuneVisibilityByRegion: Readonly<Record<string, number>>;
  concealmentTokens: number;
  maskedRegions: readonly RegionId[];
  inflammationEpisodes: readonly InflammationEpisode[];
  regionalInflammation: Readonly<Record<string, number>>;
  routeDiscoveryProgress: number;
  /** extended-hallmark persists at most one closed, deterministic three-card offer snapshot. */
  mutationOffers: readonly MutationDraftOffer[];
  chosenMutations: readonly MutationId[];
  mutationLiabilities: readonly MutationId[];
  genomeBurden: number;
  phenotypeCooldowns: Readonly<Record<string, number>>;
  regionalModifiers: Readonly<Record<string, number>>;
  programs: ProgramState;
  microbiome: MicrobiomeState;
  senescentRegions: readonly RegionId[];
  secretoryEffects: Readonly<Record<string, number>>;
  clearanceQueue: readonly EventId[];
  pendingDamageEvents: readonly PendingDamageEvent[];
  pendingTransitEvents: readonly PendingTransitEvent[];
  deterministicSeed: number;
  eventSequence: number;
  prestigeAvailability: readonly PrestigeAvailability[];
  totalOfflineMs: number;
  numberFormat: NumberFormat;
  endingReached: boolean;
}>;

export type BigNumKeys<T> = {
  [K in keyof T]-?: T[K] extends BigNum ? K : never;
}[keyof T];
export type BigNumGameStateKey = BigNumKeys<GameState>;
export const TRACKED_RESOURCE_KEYS = [
  "cells",
  "substrate",
  "atp",
] as const satisfies readonly BigNumGameStateKey[];
export type TrackedResourceKey = (typeof TRACKED_RESOURCE_KEYS)[number];
export type TrackedResourceSnapshot = Readonly<Record<TrackedResourceKey, BigNum>>;
type AllBigNumResourcesTrackedFor<T, Keys extends readonly PropertyKey[]> =
  Exclude<BigNumKeys<T>, Keys[number]> extends never
    ? Exclude<Keys[number], BigNumKeys<T>> extends never
      ? true
      : never
    : never;
type AllBigNumResourcesTracked = AllBigNumResourcesTrackedFor<
  GameState,
  typeof TRACKED_RESOURCE_KEYS
>;
export const ALL_BIG_NUM_RESOURCES_TRACKED: AllBigNumResourcesTracked = true;
type SyntheticLactateState = GameState & Readonly<{ lactate: BigNum }>;
// @ts-expect-error A new BigNum field must join TRACKED_RESOURCE_KEYS.
const _SYNTHETIC_LACTATE_COVERAGE: AllBigNumResourcesTrackedFor<
  SyntheticLactateState,
  typeof TRACKED_RESOURCE_KEYS
> = true;
function compileSnapshotProbe(value: TrackedResourceSnapshot): TrackedResourceSnapshot {
  return value;
}
// @ts-expect-error A resource snapshot cannot omit a tracked resource.
compileSnapshotProbe({ cells: {} as BigNum, substrate: {} as BigNum });
compileSnapshotProbe({
  cells: {} as BigNum,
  substrate: {} as BigNum,
  atp: {} as BigNum,
  // @ts-expect-error A resource snapshot cannot add non-resource state.
  oxygenPressure: {} as BigNum,
});
/** Ephemeral state that must not be written to a save file. */
export type RuntimeState = Readonly<{
  game: GameState;
  lastTickAtMs: number;
  pendingOfflineMs: number;
  saveStatus: "idle" | "saving" | "error";
}>;
