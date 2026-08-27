import type { BigNum } from "./bignum.js";
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
export type RegionState = Readonly<{
  id: RegionId;
  capacity: number;
  viability: number;
  phenotype: Phenotype;
  vesselLinkIds: readonly EventId[];
  routeIds: readonly RouteId[];
  senescenceEventId?: EventId;
}>;
export type MutationOffer = Readonly<{
  id: OfferId;
  /** Stable deterministic offer-pool identity; M11 supplies pool generation. */
  poolId: string;
  mutationIds: readonly MutationId[];
  sourceSeed: number;
  sourceSequence: number;
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
  stageProgress: number;
  /** Saved per-stage gate progress; M9 owns semantic gate evaluation. */
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
  mutationOffers: readonly MutationOffer[];
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
/** Ephemeral state that must not be written to a save file. */
export type RuntimeState = Readonly<{
  game: GameState;
  lastTickAtMs: number;
  pendingOfflineMs: number;
  saveStatus: "idle" | "saving" | "error";
}>;
