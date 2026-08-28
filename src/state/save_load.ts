import { hallmarkId, mutationId, prestigeId, regionId, routeId, stageId } from "../brands.js";
import type { CurrentSaveFile, SaveNotice, SerializedGameState } from "../types/save.js";
import type { GameState } from "../types/state.js";
import { isHallmarkId, isPrestigeId, isStageId } from "./catalog.js";
import { createInitialGameState } from "./game_state.js";
import {
  assertExtendedHallmarkSaveInvariants,
  hasExtendedHallmarkRecoveryNotice,
} from "./extended_hallmark_save_invariants.js";
import {
  parseDamage,
  parseEpisodes,
  parseOffers,
  parseRegions,
  parseTransit,
  parseTransition,
} from "./save_parse/domains.js";
import { parseLateHallmarks } from "./save_parse/late_hallmarks.js";
import { parseCulture, parseNetwork, parsePrestige } from "./save_parse/prestige.js";
import { parseEnding } from "./save_parse/ending.js";
import { parsePendingProgression } from "./save_parse/progression.js";
import { hasDuplicateRecordIds, parseCanonicalProducerLevels } from "./save_parse/producers.js";
import {
  array,
  exact,
  fraction,
  hasOversizedCollection,
  identifier,
  ids,
  natural,
  nonnegative,
  numberValue,
  numericRecord,
  object,
  serialGameState,
  unique,
} from "./save_parse/guards.js";
export { MAX_COLLECTION } from "./save_parse/guards.js";

export const SAVE_KEY = "cancer-clicker-ng.save.v2";
export const CURRENT_STATE_SCHEMA_VERSION = 8;
const MAX_SAVE_BYTES = 250_000;
const STATE_KEYS = [
  "cells",
  "substrate",
  "atp",
  "producerLevels",
  "hallmarkLevels",
  "currentStage",
  "stageStartedAtMs",
  "activeTimeMs",
  "pendingProgression",
  "stageProgress",
  "stageGateProgress",
  "lastStageTransition",
  "oxygenPressure",
  "damagePressure",
  "immunePressure",
  "contactPressure",
  "nutrientPressure",
  "signalingAllocation",
  "manualDivisionCharge",
  "cycleFillRate",
  "bypassedCheckpoints",
  "survivalCapacity",
  "regions",
  "telomereReserveByRegion",
  "telomeraseCharges",
  "reserveFloor",
  "vesselMaintenanceAtp",
  "committedCellCommitments",
  "routeRiskById",
  "seededSites",
  "atpBudget",
  "atpSinks",
  "immuneVisibilityByRegion",
  "concealmentTokens",
  "maskedRegions",
  "inflammationEpisodes",
  "regionalInflammation",
  "routeDiscoveryProgress",
  "mutationOffers",
  "chosenMutations",
  "mutationLiabilities",
  "genomeBurden",
  "lateHallmarks",
  "lineageLedger",
  "metastasis",
  "hostTransfer",
  "culture",
  "network",
  "pendingDamageEvents",
  "pendingTransitEvents",
  "deterministicSeed",
  "eventSequence",
  "prestigeAvailability",
  "totalOfflineMs",
  "numberFormat",
  "ending",
] as const;
type PersistedStateKey = (typeof STATE_KEYS)[number];
type _EveryGameStateKeyIsPersisted =
  Exclude<keyof GameState, PersistedStateKey> extends never ? true : never;
type _NoNonStateKeyIsPersisted =
  Exclude<PersistedStateKey, keyof GameState> extends never ? true : never;
type StateSchemaIsExhaustive = _EveryGameStateKeyIsPersisted extends true
  ? _NoNonStateKeyIsPersisted
  : never;
export const STATE_SCHEMA_IS_EXHAUSTIVE: StateSchemaIsExhaustive = true;
export type StorageLike = Readonly<{
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}>;
export type LoadResult =
  | Readonly<{ status: "absent"; notices: readonly SaveNotice[] }>
  | Readonly<{
      status: "loaded";
      state: GameState;
      notices: readonly SaveNotice[];
      version: 2;
      savedAtMs: number;
      stateSchemaVersion: 8;
    }>
  | Readonly<{
      status: "rejected";
      notices: readonly SaveNotice[];
      retainedRaw?: string;
    }>;

function field<T>(
  source: Record<string, unknown>,
  name: string,
  _fallback: T,
  parse: (v: unknown) => T | undefined,
  _notices: SaveNotice[],
): T {
  const result = parse(source[name]);
  if (result !== undefined) return result;
  throw new Error(`Save field is invalid: ${name}`);
}
export function serializeGameState(state: GameState, savedAtMs: number): string {
  if (!natural(savedAtMs)) throw new Error("Save metadata is invalid.");
  const raw = encodeCurrentP8Envelope(state, savedAtMs);
  validateCurrentP8Envelope(raw, savedAtMs);
  return raw;
}

/**
 * Reconstructs one current durable DTO through the exact save parser without
 * touching browser storage. Development replay uses this semantic boundary.
 */
export function normalizeCurrentGameState(state: GameState): SerializedGameState {
  const serialized = serialGameState(state);
  const raw = JSON.stringify({
    version: 2,
    savedAtMs: 0,
    stateSchemaVersion: CURRENT_STATE_SCHEMA_VERSION,
    state: serialized,
  } satisfies CurrentSaveFile);
  const parsed = parseSave(raw);
  if (parsed.status !== "loaded" || parsed.notices.length !== 0)
    throw new Error("Current game state is invalid.");
  const normalized: unknown = JSON.parse(JSON.stringify(serialGameState(parsed.state)));
  if (!object(normalized)) throw new Error("Current game state is invalid.");
  return normalized;
}

/** Validates a current serialized DTO through the same exact save-state parser. */
export function parseNormalizedGameState(raw: unknown): GameState | undefined {
  if (!object(raw)) return undefined;
  const envelope = JSON.stringify({
    version: 2,
    savedAtMs: 0,
    stateSchemaVersion: CURRENT_STATE_SCHEMA_VERSION,
    state: raw,
  } satisfies CurrentSaveFile);
  const parsed = parseSave(envelope);
  return parsed.status === "loaded" && parsed.notices.length === 0 ? parsed.state : undefined;
}

function encodeCurrentP8Envelope(state: GameState, savedAtMs: number): string {
  const encoded = {
    version: 2,
    savedAtMs,
    stateSchemaVersion: CURRENT_STATE_SCHEMA_VERSION,
    state: serialGameState(state),
  } satisfies CurrentSaveFile;
  return JSON.stringify(encoded);
}
function parseState(
  source: Record<string, unknown>,
  notices: SaveNotice[],
  expectedKeys: readonly string[] = STATE_KEYS,
): GameState | undefined {
  const presentStateKeys = expectedKeys.filter(
    (key) => key !== "lastStageTransition" || Object.prototype.hasOwnProperty.call(source, key),
  );
  if (
    !exact(source, presentStateKeys) ||
    Object.keys(source).length !== presentStateKeys.length ||
    hasOversizedCollection(source) ||
    (Object.prototype.hasOwnProperty.call(source, "eventSequence") &&
      !natural(source.eventSequence)) ||
    ["cells", "substrate", "atp"].some(
      (name) =>
        Object.prototype.hasOwnProperty.call(source, name) &&
        numberValue(source[name]) === undefined,
    ) ||
    ["mutationOffers", "pendingDamageEvents", "pendingTransitEvents", "inflammationEpisodes"].some(
      (name) => hasDuplicateRecordIds(source[name]),
    ) ||
    false
  )
    return undefined;
  if (
    !Object.prototype.hasOwnProperty.call(source, "activeTimeMs") ||
    !Object.prototype.hasOwnProperty.call(source, "pendingProgression") ||
    !natural(source.activeTimeMs)
  )
    return undefined;
  const pendingProgression = parsePendingProgression(
    source.pendingProgression,
    source.activeTimeMs,
  );
  if (pendingProgression === undefined) return undefined;
  const producerLevels = parseCanonicalProducerLevels(source.producerLevels);
  if (producerLevels === undefined) return undefined;
  const i = createInitialGameState();
  const transition =
    source.lastStageTransition === undefined
      ? undefined
      : parseTransition(source.lastStageTransition);
  if (source.lastStageTransition !== undefined && transition === undefined) return undefined;
  let state: GameState = {
    ...i,
    cells: field(source, "cells", i.cells, numberValue, notices),
    substrate: field(source, "substrate", i.substrate, numberValue, notices),
    atp: field(source, "atp", i.atp, numberValue, notices),
    producerLevels,
    hallmarkLevels: field(
      source,
      "hallmarkLevels",
      i.hallmarkLevels,
      (v) => {
        const a = array(v);
        if (!a) return undefined;
        const r = [];
        for (const x of a) {
          if (
            !exact(x, ["id", "level"]) ||
            !identifier(x.id) ||
            !isHallmarkId(x.id) ||
            !natural(x.level)
          )
            return undefined;
          r.push({ id: hallmarkId(x.id), level: x.level });
        }
        return unique(r.map((x) => x.id)) ? r : undefined;
      },
      notices,
    ),
    currentStage: field(
      source,
      "currentStage",
      i.currentStage,
      (v) => (identifier(v) && isStageId(v) ? stageId(v) : undefined),
      notices,
    ),
    stageStartedAtMs: field(
      source,
      "stageStartedAtMs",
      i.stageStartedAtMs,
      (v) => (natural(v) ? v : undefined),
      notices,
    ),
    activeTimeMs: source.activeTimeMs,
    pendingProgression,
    stageProgress: field(
      source,
      "stageProgress",
      i.stageProgress,
      (v) => (nonnegative(v) ? v : undefined),
      notices,
    ),
    stageGateProgress: field(
      source,
      "stageGateProgress",
      i.stageGateProgress,
      (v) => numericRecord(v, nonnegative),
      notices,
    ),
    ...(transition === undefined ? {} : { lastStageTransition: transition }),
    oxygenPressure: field(
      source,
      "oxygenPressure",
      i.oxygenPressure,
      (v) => (nonnegative(v) ? v : undefined),
      notices,
    ),
    damagePressure: field(
      source,
      "damagePressure",
      i.damagePressure,
      (v) => (nonnegative(v) ? v : undefined),
      notices,
    ),
    immunePressure: field(
      source,
      "immunePressure",
      i.immunePressure,
      (v) => (nonnegative(v) ? v : undefined),
      notices,
    ),
    contactPressure: field(
      source,
      "contactPressure",
      i.contactPressure,
      (v) => (nonnegative(v) ? v : undefined),
      notices,
    ),
    nutrientPressure: field(
      source,
      "nutrientPressure",
      i.nutrientPressure,
      (v) => (nonnegative(v) ? v : undefined),
      notices,
    ),
    signalingAllocation: field(
      source,
      "signalingAllocation",
      i.signalingAllocation,
      (v) => (v === "burst" || v === "cycle" ? v : undefined),
      notices,
    ),
    manualDivisionCharge: field(
      source,
      "manualDivisionCharge",
      i.manualDivisionCharge,
      (v) => (nonnegative(v) ? v : undefined),
      notices,
    ),
    cycleFillRate: field(
      source,
      "cycleFillRate",
      i.cycleFillRate,
      (v) => (nonnegative(v) ? v : undefined),
      notices,
    ),
    bypassedCheckpoints: field(
      source,
      "bypassedCheckpoints",
      i.bypassedCheckpoints,
      (v) => {
        const a = array(v);
        return a &&
          a.every(
            (x) => x === "contact-inhibition" || x === "nutrient-arrest" || x === "damage-arrest",
          ) &&
          unique(a)
          ? a
          : undefined;
      },
      notices,
    ),
    survivalCapacity: field(
      source,
      "survivalCapacity",
      i.survivalCapacity,
      (v) => (nonnegative(v) ? v : undefined),
      notices,
    ),
    regions: field(source, "regions", i.regions, (v) => parseRegions(v, notices), notices),
    telomereReserveByRegion: field(
      source,
      "telomereReserveByRegion",
      i.telomereReserveByRegion,
      (v) => numericRecord(v, nonnegative),
      notices,
    ),
    telomeraseCharges: field(
      source,
      "telomeraseCharges",
      i.telomeraseCharges,
      (v) => (nonnegative(v) ? v : undefined),
      notices,
    ),
    reserveFloor: field(
      source,
      "reserveFloor",
      i.reserveFloor,
      (v) => (nonnegative(v) ? v : undefined),
      notices,
    ),
    vesselMaintenanceAtp: field(
      source,
      "vesselMaintenanceAtp",
      i.vesselMaintenanceAtp,
      (v) => (nonnegative(v) ? v : undefined),
      notices,
    ),
    committedCellCommitments: field(
      source,
      "committedCellCommitments",
      i.committedCellCommitments,
      (v) => numericRecord(v, nonnegative),
      notices,
    ),
    routeRiskById: field(
      source,
      "routeRiskById",
      i.routeRiskById,
      (v) => numericRecord(v, fraction),
      notices,
    ),
    seededSites: field(source, "seededSites", i.seededSites, (v) => ids(v, regionId), notices),
    atpBudget: field(
      source,
      "atpBudget",
      i.atpBudget,
      (v) => numericRecord(v, nonnegative),
      notices,
    ),
    atpSinks: field(source, "atpSinks", i.atpSinks, (v) => ids(v, (x) => x), notices),
    immuneVisibilityByRegion: field(
      source,
      "immuneVisibilityByRegion",
      i.immuneVisibilityByRegion,
      (v) => numericRecord(v, nonnegative),
      notices,
    ),
    concealmentTokens: field(
      source,
      "concealmentTokens",
      i.concealmentTokens,
      (v) => (nonnegative(v) ? v : undefined),
      notices,
    ),
    maskedRegions: field(
      source,
      "maskedRegions",
      i.maskedRegions,
      (v) => ids(v, regionId),
      notices,
    ),
    inflammationEpisodes: field(
      source,
      "inflammationEpisodes",
      i.inflammationEpisodes,
      parseEpisodes,
      notices,
    ),
    regionalInflammation: field(
      source,
      "regionalInflammation",
      i.regionalInflammation,
      (v) => numericRecord(v, nonnegative),
      notices,
    ),
    routeDiscoveryProgress: field(
      source,
      "routeDiscoveryProgress",
      i.routeDiscoveryProgress,
      (v) => (nonnegative(v) ? v : undefined),
      notices,
    ),
    mutationOffers: field(source, "mutationOffers", i.mutationOffers, parseOffers, notices),
    chosenMutations: field(
      source,
      "chosenMutations",
      i.chosenMutations,
      (v) => ids(v, mutationId),
      notices,
    ),
    mutationLiabilities: field(
      source,
      "mutationLiabilities",
      i.mutationLiabilities,
      (v) => ids(v, mutationId),
      notices,
    ),
    genomeBurden: field(
      source,
      "genomeBurden",
      i.genomeBurden,
      (v) => (nonnegative(v) ? v : undefined),
      notices,
    ),
    lateHallmarks: i.lateHallmarks,
    lineageLedger: i.lineageLedger,
    metastasis: i.metastasis,
    hostTransfer: i.hostTransfer,
    pendingDamageEvents: field(
      source,
      "pendingDamageEvents",
      i.pendingDamageEvents,
      parseDamage,
      notices,
    ),
    pendingTransitEvents: field(
      source,
      "pendingTransitEvents",
      i.pendingTransitEvents,
      parseTransit,
      notices,
    ),
    deterministicSeed: field(
      source,
      "deterministicSeed",
      i.deterministicSeed,
      (v) => (natural(v) ? v : undefined),
      notices,
    ),
    eventSequence: field(
      source,
      "eventSequence",
      i.eventSequence,
      (v) => (natural(v) ? v : undefined),
      notices,
    ),
    prestigeAvailability: field(
      source,
      "prestigeAvailability",
      i.prestigeAvailability,
      (v) => {
        const a = array(v);
        if (!a) return undefined;
        const r: Array<{ id: ReturnType<typeof prestigeId>; status: "earned" | "unavailable" }> =
          [];
        for (const x of a) {
          if (
            !exact(x, ["id", "status"]) ||
            !identifier(x.id) ||
            !isPrestigeId(x.id) ||
            !(x.status === "earned" || x.status === "unavailable")
          )
            return undefined;
          r.push({ id: prestigeId(x.id), status: x.status });
        }
        return unique(r.map((x) => x.id)) ? r : undefined;
      },
      notices,
    ),
    totalOfflineMs: field(
      source,
      "totalOfflineMs",
      i.totalOfflineMs,
      (v) => (natural(v) ? v : undefined),
      notices,
    ),
    numberFormat: field(
      source,
      "numberFormat",
      i.numberFormat,
      (v) => (v === "short" || v === "full" ? v : undefined),
      notices,
    ),
    ending: i.ending,
  };
  if (
    state.lastStageTransition !== undefined &&
    (state.lastStageTransition.to !== state.currentStage ||
      state.lastStageTransition.atMs !== state.stageStartedAtMs)
  )
    return undefined;
  const lateHallmarks = parseLateHallmarks(source.lateHallmarks, state);
  if (lateHallmarks === undefined) return undefined;
  state = { ...state, lateHallmarks };
  if (expectedKeys.includes("lineageLedger")) {
    const prestige = parsePrestige(
      {
        lineageLedger: source.lineageLedger,
        metastasis: source.metastasis,
        hostTransfer: source.hostTransfer,
      },
      state,
    );
    if (prestige === undefined) return undefined;
    state = { ...state, ...prestige };
  }
  if (expectedKeys.includes("culture") && expectedKeys.includes("network")) {
    const culture = parseCulture(source.culture, state.activeTimeMs, state.eventSequence);
    const network = parseNetwork(
      source.network,
      state.lineageLedger,
      state.activeTimeMs,
      state.eventSequence,
    );
    if (culture === undefined || network === undefined) return undefined;
    state = { ...state, culture, network };
  }
  if (expectedKeys.includes("ending")) {
    const ending = parseEnding(source.ending, {
      activeTimeMs: state.activeTimeMs,
      eventSequence: state.eventSequence,
      networkGlobalTier: state.network.globalTier,
    });
    if (ending === undefined) return undefined;
    state = { ...state, ending };
  }
  const regionSet = new Set(state.regions.map((x) => String(x.id)));
  // A revealed route exists when a region exposes it. Commitment is a later player choice,
  // so it cannot define the universe that durable risk and transit relations validate against.
  const discoveredRouteSet = new Set(state.regions.flatMap((region) => region.routeIds));
  const durableEventIds = [
    ...state.pendingDamageEvents.map((x) => x.id),
    ...state.pendingTransitEvents.map((x) => x.id),
    ...state.inflammationEpisodes.map((x) => x.id),
  ];
  const eventSet = new Set(durableEventIds);
  if (
    eventSet.size !== durableEventIds.length ||
    !state.seededSites.every((x) => regionSet.has(x)) ||
    !state.maskedRegions.every((x) => regionSet.has(x)) ||
    !Object.keys(state.telomereReserveByRegion).every((key) => regionSet.has(key)) ||
    !Object.keys(state.immuneVisibilityByRegion).every((key) => regionSet.has(key)) ||
    !Object.keys(state.regionalInflammation).every((key) => regionSet.has(key)) ||
    !Object.keys(state.routeRiskById).every((key) => discoveredRouteSet.has(routeId(key))) ||
    ![...discoveredRouteSet].every((route) =>
      Object.prototype.hasOwnProperty.call(state.routeRiskById, route),
    ) ||
    !Object.keys(state.committedCellCommitments).every((key) =>
      discoveredRouteSet.has(routeId(key)),
    ) ||
    !Object.keys(state.atpBudget).every((key) => state.atpSinks.includes(key)) ||
    !state.pendingDamageEvents.every((x) => regionSet.has(x.regionId)) ||
    !state.inflammationEpisodes.every((x) => regionSet.has(x.regionId)) ||
    !state.pendingTransitEvents.every((x) =>
      Object.prototype.hasOwnProperty.call(state.committedCellCommitments, x.routeId),
    ) ||
    false
  )
    return undefined;
  if (notices.some((notice) => hasExtendedHallmarkRecoveryNotice(notice.field))) return undefined;
  try {
    assertExtendedHallmarkSaveInvariants(state);
  } catch {
    return undefined;
  }
  return state.activeTimeMs < state.stageStartedAtMs ? undefined : state;
}

function reject(raw: string, field: string, message: string): LoadResult {
  return {
    status: "rejected",
    notices: [{ code: "save-rejected", field, message }],
    retainedRaw: raw,
  };
}

/** Parses the only accepted pre-production save envelope and its exact current state schema. */
export function parseSave(raw: string): LoadResult {
  if (raw.length > MAX_SAVE_BYTES)
    return reject(raw, "envelope", "Save data is too large to load safely.");
  let envelope: unknown;
  try {
    envelope = JSON.parse(raw);
  } catch {
    return reject(raw, "envelope", "Save data is invalid.");
  }
  if (
    !object(envelope) ||
    !exact(envelope, ["version", "savedAtMs", "stateSchemaVersion", "state"]) ||
    envelope.version !== 2 ||
    !natural(envelope.savedAtMs) ||
    envelope.stateSchemaVersion !== CURRENT_STATE_SCHEMA_VERSION ||
    !object(envelope.state)
  )
    return reject(raw, "envelope", "Save envelope is not the current schema.");
  let state: GameState | undefined;
  try {
    state = parseState(envelope.state, []);
  } catch {
    state = undefined;
  }
  if (state === undefined) return reject(raw, "state", "Save state is invalid.");
  return {
    status: "loaded",
    state,
    notices: [],
    version: 2,
    savedAtMs: envelope.savedAtMs,
    stateSchemaVersion: CURRENT_STATE_SCHEMA_VERSION,
  };
}

/** ASVS 1.5.2 and 2.2.1: validate the complete writer envelope without recursion. */
function validateCurrentP8Envelope(raw: string, savedAtMs: number): void {
  const result = parseSave(raw);
  const loadedState = result.status === "loaded" ? result.state : undefined;
  if (
    result.status !== "loaded" ||
    loadedState === undefined ||
    result.notices.length !== 0 ||
    result.savedAtMs !== savedAtMs ||
    result.stateSchemaVersion !== CURRENT_STATE_SCHEMA_VERSION ||
    encodeCurrentP8Envelope(loadedState, savedAtMs) !== raw
  )
    throw new Error("Current save state is invalid.");
}

export function loadFromStorage(storage: StorageLike): LoadResult {
  try {
    const raw = storage.getItem(SAVE_KEY);
    return raw === null ? { status: "absent", notices: [] } : parseSave(raw);
  } catch {
    return {
      status: "rejected",
      notices: [
        { code: "storage-error", field: "storage", message: "Saved game could not be read." },
      ],
    };
  }
}
/** ASVS 14.3.3 and 16.5.1-16.5.3: the only browser storage write boundary. */
export function saveToStorage(
  storage: StorageLike,
  state: GameState,
  savedAtMs: number,
): readonly SaveNotice[] {
  try {
    storage.setItem(SAVE_KEY, serializeGameState(state, savedAtMs));
    return [];
  } catch {
    return [
      { code: "storage-error", field: "storage", message: "Saved game could not be written." },
    ];
  }
}
export { browserStorage } from "./save_storage.js";
