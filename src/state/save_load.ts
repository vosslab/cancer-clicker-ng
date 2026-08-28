import { hallmarkId, mutationId, prestigeId, regionId, routeId, stageId } from "../brands.js";
import type { CurrentSaveFileV2, SaveNotice, SerializedGameState } from "../types/save.js";
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
import { deriveSeedV1 } from "./deterministic_random.js";
import {
  hasDuplicateRecordIds,
  normalizeParsedLegacyProducerLevels,
  parseCanonicalProducerLevels,
} from "./save_parse/producers.js";
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
  serial,
  serialGameState,
  unique,
} from "./save_parse/guards.js";
export { MAX_COLLECTION } from "./save_parse/guards.js";

export const SAVE_KEY = "cancer-clicker-ng.save.v2";
export const CURRENT_PROGRESSION_VERSION = 8;
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
      progressionVersion: 8;
    }>
  | Readonly<{
      status: "rejected";
      notices: readonly SaveNotice[];
      retainedRaw?: string;
    }>;

function field<T>(
  source: Record<string, unknown>,
  name: string,
  fallback: T,
  parse: (v: unknown) => T | undefined,
  notices: SaveNotice[],
): T {
  const result = parse(source[name]);
  if (result !== undefined) return result;
  notices.push({
    code: "field-defaulted",
    field: name,
    message: `Recovered ${name} with its safe default.`,
  });
  return fallback;
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
    progressionVersion: CURRENT_PROGRESSION_VERSION,
    state: serialized,
  } satisfies CurrentSaveFileV2);
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
    progressionVersion: CURRENT_PROGRESSION_VERSION,
    state: raw,
  } satisfies CurrentSaveFileV2);
  const parsed = parseSave(envelope);
  return parsed.status === "loaded" && parsed.notices.length === 0 ? parsed.state : undefined;
}

function encodeCurrentP8Envelope(state: GameState, savedAtMs: number): string {
  const encoded = {
    version: 2,
    savedAtMs,
    progressionVersion: CURRENT_PROGRESSION_VERSION,
    state: serialGameState(state),
  } satisfies CurrentSaveFileV2;
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
  if (source.lastStageTransition !== undefined && transition === undefined)
    notices.push({
      code: "field-defaulted",
      field: "lastStageTransition",
      message: "Recovered lastStageTransition with its safe default.",
    });
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
  ) {
    const { lastStageTransition: _discardedTransition, ...withoutTransition } = state;
    state = withoutTransition;
    notices.push({
      code: "field-defaulted",
      field: "lastStageTransition",
      message: "Recovered lastStageTransition with its safe default.",
    });
  }
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

const P7_STATE_KEYS = [...STATE_KEYS.filter((key) => key !== "ending"), "endingReached"] as const;
const P6_STATE_KEYS = P7_STATE_KEYS.filter((key) => key !== "culture" && key !== "network");
const P5_STATE_KEYS = P6_STATE_KEYS.filter(
  (key) => key !== "lineageLedger" && key !== "metastasis" && key !== "hostTransfer",
);
const P4_RETIRED_STATE_KEYS = [
  "phenotypeCooldowns",
  "regionalModifiers",
  "programs",
  "microbiome",
  "senescentRegions",
  "secretoryEffects",
  "clearanceQueue",
] as const;
const P4_STATE_KEYS = P5_STATE_KEYS.flatMap((key) =>
  key === "lateHallmarks" ? P4_RETIRED_STATE_KEYS : [key],
);
function migrateLegacyState(
  source: Record<string, unknown>,
  progressionVersion: 1 | 2 | 3 | 4,
): SerializedGameState | undefined {
  const legacyKeys = P4_STATE_KEYS.filter(
    (key) => key !== "activeTimeMs" && key !== "pendingProgression",
  );
  const expectedKeys =
    progressionVersion === 3 || progressionVersion === 4 ? P4_STATE_KEYS : legacyKeys;
  if (!exact(source, expectedKeys) || !natural(source.stageStartedAtMs)) return undefined;
  const producerLevels = normalizeParsedLegacyProducerLevels(source.producerLevels);
  if (producerLevels === undefined) return undefined;
  const migrated: Record<string, unknown> = {};
  for (const key of expectedKeys) {
    if (Object.prototype.hasOwnProperty.call(source, key)) migrated[key] = source[key];
  }
  migrated.producerLevels = producerLevels;
  // extended-hallmark closes formerly provisional ATP/visibility/mutation placeholders. Historical p1-p3
  // saves cannot contain an extended-hallmark offer snapshot, so migrate them to the one canonical empty state.
  const initial = createInitialGameState();
  migrated.atpBudget = initial.atpBudget;
  migrated.atpSinks = initial.atpSinks;
  migrated.immuneVisibilityByRegion = initial.immuneVisibilityByRegion;
  migrated.concealmentTokens = initial.concealmentTokens;
  migrated.maskedRegions = initial.maskedRegions;
  migrated.inflammationEpisodes = initial.inflammationEpisodes;
  migrated.regionalInflammation = initial.regionalInflammation;
  migrated.mutationOffers = initial.mutationOffers;
  migrated.chosenMutations = initial.chosenMutations;
  migrated.mutationLiabilities = initial.mutationLiabilities;
  migrated.genomeBurden = initial.genomeBurden;
  delete migrated.phenotypeCooldowns;
  delete migrated.regionalModifiers;
  delete migrated.programs;
  delete migrated.microbiome;
  delete migrated.senescentRegions;
  delete migrated.secretoryEffects;
  delete migrated.clearanceQueue;
  const legacyRegions = migrated.regions;
  if (!Array.isArray(legacyRegions)) return undefined;
  const currentRegions: unknown[] = [];
  for (const legacyRegion of legacyRegions) {
    if (!object(legacyRegion)) return undefined;
    const currentRegion: Record<string, unknown> = {};
    for (const [key, field] of Object.entries(legacyRegion)) {
      if (key !== "senescenceEventId") currentRegion[key] = field;
    }
    currentRegions.push(currentRegion);
  }
  migrated.regions = currentRegions;
  migrated.lateHallmarks = initial.lateHallmarks;
  if (progressionVersion !== 3) {
    migrated.activeTimeMs = source.stageStartedAtMs;
    migrated.pendingProgression = [];
  }
  return migrated;
}

/** p6 is the only place historic p5 state may receive empty prestige records. */
function migrateP5ToP6(
  source: SerializedGameState,
  notices: SaveNotice[],
): SerializedGameState | undefined {
  if (typeof source.endingReached !== "boolean") return undefined;
  const p5State = parseState(source, [], P5_STATE_KEYS);
  if (p5State === undefined) return undefined;
  const initial = createInitialGameState();
  const lineageSeed = deriveSeedV1("lineage-v1", p5State.deterministicSeed, p5State.eventSequence);
  const serializedWithInitialL3L4 = serialGameState({
    ...p5State,
    lineageLedger: { ...initial.lineageLedger, lineageSeed },
    metastasis: initial.metastasis,
    hostTransfer: initial.hostTransfer,
  });
  const {
    culture: _culture,
    network: _network,
    ending: _ending,
    ...withoutEnding
  } = serializedWithInitialL3L4;
  const migrated = serial({ ...withoutEnding, endingReached: source.endingReached });
  for (const field of ["lineageLedger", "metastasis", "hostTransfer"]) {
    notices.push({
      code: "field-defaulted",
      field,
      message: `Recovered ${field} with its safe default during p6 migration.`,
    });
  }
  // serialGameState deliberately uses null-prototype records for output. Reparse the locally built
  // projection through JSON so this in-memory migration follows the same ordinary-record boundary.
  return JSON.parse(JSON.stringify(migrated)) as SerializedGameState;
}
/** p7 is the only place accepted p6 state receives empty L3/L4 aggregates. */
function migrateP6ToP7(
  source: SerializedGameState,
  notices: SaveNotice[],
): SerializedGameState | undefined {
  const p6State = parseState(source, [], P6_STATE_KEYS);
  if (p6State === undefined) return undefined;
  if (typeof source.endingReached !== "boolean") return undefined;
  const initial = createInitialGameState();
  const { ending: _ending, ...withoutEnding } = p6State;
  const migrated = serial({
    ...withoutEnding,
    culture: initial.culture,
    network: initial.network,
    endingReached: source.endingReached,
  }) as SerializedGameState;
  for (const field of ["culture", "network"]) {
    notices.push({
      code: "field-defaulted",
      field,
      message: `Recovered ${field} with its safe default during p7 migration.`,
    });
  }
  return JSON.parse(JSON.stringify(migrated)) as SerializedGameState;
}
function migrateP7ToP8(
  source: SerializedGameState,
  notices: SaveNotice[],
): SerializedGameState | undefined {
  if (typeof source.endingReached !== "boolean") return undefined;
  const p7State = parseState(source, [], P7_STATE_KEYS);
  if (p7State === undefined) return undefined;
  const { ending: _ending, ...withoutEnding } = p7State;
  const migrated = serial({ ...withoutEnding, ending: { phase: "unreached" } });
  notices.push({
    code: "field-defaulted",
    field: "ending",
    message: "Recovered ending with its safe default during p8 migration.",
  });
  return JSON.parse(JSON.stringify(migrated)) as SerializedGameState;
}
function reject(raw: string, field: string, message: string): LoadResult {
  return {
    status: "rejected",
    notices: [{ code: "save-rejected", field, message }],
    retainedRaw: raw,
  };
}
/** ASVS 1.5.2, 2.1.1/2.1.2, 2.2.1/2.2.2, 16.5.3: bounded allowlisted reconstruction. */
export function parseSave(raw: string): LoadResult {
  if (raw.length > MAX_SAVE_BYTES)
    return reject(raw, "envelope", "Save data is too large to load safely.");
  let e: unknown;
  try {
    e = JSON.parse(raw);
  } catch {
    return reject(raw, "envelope", "Save data is invalid.");
  }
  if (!object(e) || !natural(e.version) || !natural(e.savedAtMs) || !object(e.state))
    return reject(raw, "envelope", "Save envelope is invalid.");
  let current: CurrentSaveFileV2;
  const migrationNotices: SaveNotice[] = [];
  if (e.version === 1) {
    if (
      !exact(e, ["version", "savedAtMs", "state"]) ||
      !exact(e.state, ["cells", "atp", "stageId", "eventSequence"]) ||
      !numberValue(e.state.cells) ||
      !numberValue(e.state.atp) ||
      !identifier(e.state.stageId) ||
      !isStageId(e.state.stageId) ||
      !natural(e.state.eventSequence)
    )
      return reject(raw, "envelope", "Save version is unsupported.");
    const initializedState = JSON.parse(
      JSON.stringify(
        serial({
          ...createInitialGameState(),
          cells: numberValue(e.state.cells),
          atp: numberValue(e.state.atp),
          currentStage: stageId(e.state.stageId),
          eventSequence: e.state.eventSequence,
        }),
      ),
    ) as SerializedGameState;
    const {
      activeTimeMs: _activeTimeMs,
      pendingProgression: _pendingProgression,
      ...p1State
    } = initializedState;
    const migratedState = migrateLegacyState(p1State, 1);
    if (migratedState === undefined) return reject(raw, "state", "Save state is invalid.");
    const p6State = migrateP5ToP6(migratedState, migrationNotices);
    if (p6State === undefined) return reject(raw, "state", "Save state is invalid.");
    const p7State = migrateP6ToP7(p6State, migrationNotices);
    if (p7State === undefined) return reject(raw, "state", "Save state is invalid.");
    const p8State = migrateP7ToP8(p7State, migrationNotices);
    if (p8State === undefined) return reject(raw, "state", "Save state is invalid.");
    current = {
      version: 2,
      savedAtMs: e.savedAtMs,
      progressionVersion: CURRENT_PROGRESSION_VERSION,
      state: p8State,
    };
  } else if (
    e.version === 2 &&
    exact(e, ["version", "savedAtMs", "progressionVersion", "state"]) &&
    natural(e.progressionVersion) &&
    e.progressionVersion >= 1 &&
    e.progressionVersion <= CURRENT_PROGRESSION_VERSION
  ) {
    let state: SerializedGameState | undefined;
    if (e.progressionVersion === CURRENT_PROGRESSION_VERSION) state = e.state;
    else if (e.progressionVersion === 1) state = migrateLegacyState(e.state, 1);
    else if (e.progressionVersion === 2) state = migrateLegacyState(e.state, 2);
    else if (e.progressionVersion === 3) state = migrateLegacyState(e.state, 3);
    else if (e.progressionVersion === 4) state = migrateLegacyState(e.state, 4);
    else if (e.progressionVersion === 5) state = e.state;
    else if (e.progressionVersion === 6 || e.progressionVersion === 7) state = e.state;
    else return reject(raw, "envelope", "Save version is unsupported.");
    if (state === undefined) return reject(raw, "state", "Save state is invalid.");
    if (e.progressionVersion <= 5) {
      state = migrateP5ToP6(state, migrationNotices);
      if (state === undefined) return reject(raw, "state", "Save state is invalid.");
    }
    if (e.progressionVersion <= 6) {
      state = migrateP6ToP7(state, migrationNotices);
      if (state === undefined) return reject(raw, "state", "Save state is invalid.");
    }
    if (e.progressionVersion <= 7) {
      state = migrateP7ToP8(state, migrationNotices);
      if (state === undefined) return reject(raw, "state", "Save state is invalid.");
    }
    current = {
      version: 2,
      savedAtMs: e.savedAtMs,
      progressionVersion: CURRENT_PROGRESSION_VERSION,
      state,
    };
  } else return reject(raw, "envelope", "Save version is unsupported.");
  const notices: SaveNotice[] = [...migrationNotices];
  const state = parseState(current.state, notices);
  return state === undefined
    ? reject(raw, "state", "Save state is invalid.")
    : {
        status: "loaded",
        state,
        notices,
        version: 2,
        savedAtMs: current.savedAtMs,
        progressionVersion: current.progressionVersion,
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
    result.progressionVersion !== CURRENT_PROGRESSION_VERSION ||
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
