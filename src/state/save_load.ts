import {
  eventId,
  hallmarkId,
  mutationId,
  prestigeId,
  regionId,
  routeId,
  stageId,
} from "../brands.js";
import type { CurrentSaveFileV2, SaveNotice, SerializedGameState } from "../types/save.js";
import type { GameState } from "../types/state.js";
import { isHallmarkId, isPrestigeId, isStageId } from "./catalog.js";
import { createInitialGameState } from "./game_state.js";
import { assertM11SaveInvariants, hasM11RecoveryNotice } from "./m11_save_invariants.js";
import {
  parseDamage,
  parseEpisodes,
  parseOffers,
  parseRegions,
  parseTransit,
  parseTransition,
} from "./save_parse/domains.js";
import { parseMicrobiome, parsePrograms } from "./save_parse/state_fields.js";
import { parsePendingProgression } from "./save_parse/progression.js";
import {
  hasDuplicateRecordIds,
  normalizeParsedLegacyProducerLevels,
  parseCanonicalProducerLevels,
} from "./save_parse/producers.js";
import {
  array,
  exact,
  finite,
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
export const CURRENT_PROGRESSION_VERSION = 4;
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
  "phenotypeCooldowns",
  "regionalModifiers",
  "programs",
  "microbiome",
  "senescentRegions",
  "secretoryEffects",
  "clearanceQueue",
  "pendingDamageEvents",
  "pendingTransitEvents",
  "deterministicSeed",
  "eventSequence",
  "prestigeAvailability",
  "totalOfflineMs",
  "numberFormat",
  "endingReached",
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
      progressionVersion: 4;
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
  const raw = encodeCurrentP4Envelope(state, savedAtMs);
  validateCurrentP4Envelope(raw, savedAtMs);
  return raw;
}

function encodeCurrentP4Envelope(state: GameState, savedAtMs: number): string {
  const encoded = {
    version: 2,
    savedAtMs,
    progressionVersion: CURRENT_PROGRESSION_VERSION,
    state: serialGameState(state),
  } satisfies CurrentSaveFileV2;
  return JSON.stringify(encoded);
}
function parseState(source: Record<string, unknown>, notices: SaveNotice[]): GameState | undefined {
  if (
    !exact(source, STATE_KEYS) ||
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
    (Object.prototype.hasOwnProperty.call(source, "programs") &&
      parsePrograms(source.programs) === undefined) ||
    (Object.prototype.hasOwnProperty.call(source, "microbiome") &&
      parseMicrobiome(source.microbiome, []) === undefined)
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
    phenotypeCooldowns: field(
      source,
      "phenotypeCooldowns",
      i.phenotypeCooldowns,
      (v) => numericRecord(v, natural),
      notices,
    ),
    regionalModifiers: field(
      source,
      "regionalModifiers",
      i.regionalModifiers,
      (v) => numericRecord(v, finite),
      notices,
    ),
    programs: field(source, "programs", i.programs, parsePrograms, notices),
    microbiome: field(
      source,
      "microbiome",
      i.microbiome,
      (v) => parseMicrobiome(v, notices),
      notices,
    ),
    senescentRegions: field(
      source,
      "senescentRegions",
      i.senescentRegions,
      (v) => ids(v, regionId),
      notices,
    ),
    secretoryEffects: field(
      source,
      "secretoryEffects",
      i.secretoryEffects,
      (v) => numericRecord(v, finite),
      notices,
    ),
    clearanceQueue: field(
      source,
      "clearanceQueue",
      i.clearanceQueue,
      (v) => ids(v, eventId),
      notices,
    ),
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
    endingReached: field(
      source,
      "endingReached",
      i.endingReached,
      (v) => (typeof v === "boolean" ? v : undefined),
      notices,
    ),
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
  if (
    notices.some(
      (notice) =>
        notice.field.startsWith("regions[") && notice.field.endsWith(".senescenceEventId"),
    )
  ) {
    state = {
      ...state,
      // A malformed optional relation defaults away; remove only the queue edge it orphaned.
      clearanceQueue: state.clearanceQueue.filter((id) =>
        state.regions.some((region) => region.senescenceEventId === id),
      ),
    };
  }
  const regionSet = new Set(state.regions.map((x) => String(x.id)));
  // A revealed route exists when a region exposes it. Commitment is a later player choice,
  // so it cannot define the universe that durable risk and transit relations validate against.
  const discoveredRouteSet = new Set(state.regions.flatMap((region) => region.routeIds));
  const senescenceIds = state.regions.flatMap((region) =>
    region.senescenceEventId === undefined ? [] : [region.senescenceEventId],
  );
  const durableEventIds = [
    ...state.pendingDamageEvents.map((x) => x.id),
    ...state.pendingTransitEvents.map((x) => x.id),
    ...state.inflammationEpisodes.map((x) => x.id),
    ...senescenceIds,
  ];
  const eventSet = new Set(durableEventIds);
  const clearanceSet = new Set(state.clearanceQueue);
  if (
    eventSet.size !== durableEventIds.length ||
    clearanceSet.size !== state.clearanceQueue.length ||
    !state.seededSites.every((x) => regionSet.has(x)) ||
    !state.maskedRegions.every((x) => regionSet.has(x)) ||
    !state.senescentRegions.every((x) => regionSet.has(x)) ||
    !Object.keys(state.telomereReserveByRegion).every((key) => regionSet.has(key)) ||
    !Object.keys(state.immuneVisibilityByRegion).every((key) => regionSet.has(key)) ||
    !Object.keys(state.regionalInflammation).every((key) => regionSet.has(key)) ||
    !Object.keys(state.phenotypeCooldowns).every((key) => regionSet.has(key)) ||
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
    !state.regions.every(
      (x) => x.senescenceEventId === undefined || clearanceSet.has(x.senescenceEventId),
    ) ||
    !state.pendingTransitEvents.every((x) =>
      Object.prototype.hasOwnProperty.call(state.committedCellCommitments, x.routeId),
    ) ||
    state.clearanceQueue.length !== senescenceIds.length ||
    !state.clearanceQueue.every((id) => senescenceIds.includes(id))
  )
    return undefined;
  if (notices.some((notice) => hasM11RecoveryNotice(notice.field))) return undefined;
  try {
    assertM11SaveInvariants(state);
  } catch {
    return undefined;
  }
  return state.activeTimeMs < state.stageStartedAtMs ? undefined : state;
}

function migrateLegacyState(
  source: Record<string, unknown>,
  progressionVersion: 1 | 2 | 3,
): SerializedGameState | undefined {
  const legacyKeys = STATE_KEYS.filter(
    (key) => key !== "activeTimeMs" && key !== "pendingProgression",
  );
  const expectedKeys = progressionVersion === 3 ? STATE_KEYS : legacyKeys;
  if (!exact(source, expectedKeys) || !natural(source.stageStartedAtMs)) return undefined;
  const producerLevels = normalizeParsedLegacyProducerLevels(source.producerLevels);
  if (producerLevels === undefined) return undefined;
  const migrated: Record<string, unknown> = {};
  for (const key of expectedKeys) {
    if (Object.prototype.hasOwnProperty.call(source, key)) migrated[key] = source[key];
  }
  migrated.producerLevels = producerLevels;
  // M11 closes formerly provisional ATP/visibility/mutation placeholders. Historical p1-p3
  // saves cannot contain an M11 offer snapshot, so migrate them to the one canonical empty state.
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
  if (progressionVersion !== 3) {
    migrated.activeTimeMs = source.stageStartedAtMs;
    migrated.pendingProgression = [];
  }
  return migrated;
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
    current = {
      version: 2,
      savedAtMs: e.savedAtMs,
      progressionVersion: CURRENT_PROGRESSION_VERSION,
      state: migratedState,
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
    else state = migrateLegacyState(e.state, 3);
    if (state === undefined) return reject(raw, "state", "Save state is invalid.");
    current = {
      version: 2,
      savedAtMs: e.savedAtMs,
      progressionVersion: CURRENT_PROGRESSION_VERSION,
      state,
    };
  } else return reject(raw, "envelope", "Save version is unsupported.");
  const notices: SaveNotice[] = [];
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
function validateCurrentP4Envelope(raw: string, savedAtMs: number): void {
  const result = parseSave(raw);
  const loadedState = result.status === "loaded" ? result.state : undefined;
  if (
    result.status !== "loaded" ||
    loadedState === undefined ||
    result.notices.length !== 0 ||
    result.savedAtMs !== savedAtMs ||
    result.progressionVersion !== CURRENT_PROGRESSION_VERSION ||
    encodeCurrentP4Envelope(loadedState, savedAtMs) !== raw
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
