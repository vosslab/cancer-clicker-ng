import {
  eventId,
  hallmarkId,
  mutationId,
  prestigeId,
  producerId,
  regionId,
  stageId,
} from "../brands.js";
import type { SaveFileV2, SerializedGameState } from "../types/save.js";
import type { GameState } from "../types/state.js";
import { isHallmarkId, isPrestigeId, isStageId } from "./catalog.js";
import { createInitialGameState } from "./game_state.js";
import {
  parseDamage,
  parseEpisodes,
  parseOffers,
  parseRegions,
  parseTransit,
  parseTransition,
} from "./save_parse/domains.js";
import { parseMicrobiome, parsePrograms } from "./save_parse/state_fields.js";
import {
  array,
  exact,
  finite,
  hasOversizedCollection,
  identifier,
  ids,
  natural,
  nonnegative,
  numberValue,
  numericRecord,
  object,
  serial,
  unique,
} from "./save_parse/guards.js";
export { MAX_COLLECTION } from "./save_parse/guards.js";

export const SAVE_KEY = "cancer-clicker-ng.save.v2";
const MAX_SAVE_BYTES = 250_000;
const STATE_KEYS = [
  "cells",
  "substrate",
  "atp",
  "producerLevels",
  "hallmarkLevels",
  "currentStage",
  "stageStartedAtMs",
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
export type RecoveryNotice = Readonly<{
  code: "field-defaulted" | "storage-error" | "save-rejected";
  field: string;
  message: string;
}>;
export type LoadResult = Readonly<{
  status: "absent" | "loaded" | "rejected";
  state?: GameState;
  notices: readonly RecoveryNotice[];
  retainedRaw?: string;
  version?: 2;
  savedAtMs?: number;
  progressionVersion?: number;
}>;

function field<T>(
  source: Record<string, unknown>,
  name: string,
  fallback: T,
  parse: (v: unknown) => T | undefined,
  notices: RecoveryNotice[],
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
export function serializeGameState(
  state: GameState,
  savedAtMs: number,
  progressionVersion = 1,
): string {
  if (!natural(savedAtMs) || !natural(progressionVersion) || progressionVersion < 1)
    throw new Error("Save metadata is invalid.");
  return JSON.stringify({
    version: 2,
    savedAtMs,
    progressionVersion,
    state: serial(state) as SerializedGameState,
  } satisfies SaveFileV2);
}

function hasDuplicateRecordIds(value: unknown): boolean {
  const values = array(value);
  if (!values) return false;
  const ids = values.map((item) => (object(item) && typeof item.id === "string" ? item.id : null));
  return ids.some((id) => id === null) || new Set(ids).size !== ids.length;
}
function parseState(
  source: Record<string, unknown>,
  notices: RecoveryNotice[],
): GameState | undefined {
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
  const i = createInitialGameState();
  let state: GameState = {
    ...i,
    cells: field(source, "cells", i.cells, numberValue, notices),
    substrate: field(source, "substrate", i.substrate, numberValue, notices),
    atp: field(source, "atp", i.atp, numberValue, notices),
    producerLevels: field(
      source,
      "producerLevels",
      i.producerLevels,
      (v) => {
        const a = array(v);
        if (!a) return undefined;
        const r = [];
        for (const x of a) {
          if (!exact(x, ["id", "level"]) || !identifier(x.id) || !natural(x.level))
            return undefined;
          r.push({ id: producerId(x.id), level: x.level });
        }
        return unique(r.map((x) => x.id)) ? r : undefined;
      },
      notices,
    ),
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
    ...(source.lastStageTransition === undefined
      ? {}
      : {
          lastStageTransition: field(
            source,
            "lastStageTransition",
            undefined,
            parseTransition,
            notices,
          ),
        }),
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
      (v) => numericRecord(v, nonnegative),
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
  const routeSet = new Set(Object.keys(state.committedCellCommitments));
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
    !Object.keys(state.routeRiskById).every((key) => routeSet.has(key)) ||
    !Object.keys(state.atpBudget).every((key) => state.atpSinks.includes(key)) ||
    !state.pendingDamageEvents.every((x) => regionSet.has(x.regionId)) ||
    !state.inflammationEpisodes.every((x) => regionSet.has(x.regionId)) ||
    !state.regions.every(
      (x) =>
        x.routeIds.every((id) => routeSet.has(id)) &&
        (x.senescenceEventId === undefined || clearanceSet.has(x.senescenceEventId)),
    ) ||
    !state.pendingTransitEvents.every((x) => routeSet.has(x.routeId)) ||
    state.clearanceQueue.length !== senescenceIds.length ||
    !state.clearanceQueue.every((id) => senescenceIds.includes(id))
  )
    return undefined;
  return state;
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
  let current: SaveFileV2;
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
    current = {
      version: 2,
      savedAtMs: e.savedAtMs,
      progressionVersion: 1,
      state: JSON.parse(
        JSON.stringify(
          serial({
            ...createInitialGameState(),
            cells: numberValue(e.state.cells),
            atp: numberValue(e.state.atp),
            currentStage: stageId(e.state.stageId),
            eventSequence: e.state.eventSequence,
          }),
        ),
      ) as SerializedGameState,
    };
  } else if (
    e.version === 2 &&
    exact(e, ["version", "savedAtMs", "progressionVersion", "state"]) &&
    natural(e.progressionVersion) &&
    e.progressionVersion >= 1
  ) {
    current = {
      version: 2,
      savedAtMs: e.savedAtMs,
      progressionVersion: e.progressionVersion,
      state: e.state,
    };
  } else return reject(raw, "envelope", "Save version is unsupported.");
  const notices: RecoveryNotice[] = [];
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
): readonly RecoveryNotice[] {
  try {
    storage.setItem(SAVE_KEY, serializeGameState(state, savedAtMs));
    return [];
  } catch {
    return [
      { code: "storage-error", field: "storage", message: "Saved game could not be written." },
    ];
  }
}
export function browserStorage(): StorageLike | undefined {
  try {
    return globalThis.localStorage;
  } catch {
    return undefined;
  }
}
