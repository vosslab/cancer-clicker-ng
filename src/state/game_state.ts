import { bigNum, stageId } from "../brands.js";
import type { GameState } from "../types/state.js";
import { STAGE_ONE_PRODUCERS } from "../economy/producers.js";
import { emptyLateHallmarksState } from "../hallmarks/late_hallmark_types.js";

/** Creates the one canonical state shape; mechanics fill these durable fields in later milestones. */
export function createInitialGameState(): GameState {
  return {
    cells: bigNum(0, 0),
    substrate: bigNum(0, 0),
    atp: bigNum(0, 0),
    producerLevels: STAGE_ONE_PRODUCERS.map((producer) => ({ id: producer.id, level: 0 })),
    hallmarkLevels: [],
    currentStage: stageId("transformed_cell"),
    stageStartedAtMs: 0,
    activeTimeMs: 0,
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
    deterministicSeed: 0,
    eventSequence: 0,
    prestigeAvailability: [],
    totalOfflineMs: 0,
    numberFormat: "short",
    endingReached: false,
  };
}

export function hasRegion(state: GameState, value: string): boolean {
  return state.regions.some((region) => region.id === value);
}
