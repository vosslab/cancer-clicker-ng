import { projectVisibleProgression } from "./decision_surface.js";
import { parseRuntimeEvent } from "./event_parse.js";
import { recordEvent } from "./events.js";
import { normalizeCurrentGameState, parseNormalizedGameState } from "./save_load.js";
import { EVENT_TYPE_REGISTRY_IS_EXHAUSTIVE } from "../types/events.js";
import { REPLAY_FORMAT_VERSION } from "../types/replay.js";
import type { GameEvent } from "../types/events.js";
import type {
  ReplayEntry,
  ReplayLog,
  ReplayParseResult,
  ReplayRejectionCode,
  ReplayResult,
  ReplaySource,
  ReplayVisibleProgression,
} from "../types/replay.js";
import type { SerializedGameState } from "../types/save.js";
import type { GameState } from "../types/state.js";

export const MAX_REPLAY_ENTRIES = 10_000;
const RESERVED_KEYS = new Set(["__proto__", "prototype", "constructor"]);

export type ReplayRuntime = Readonly<{
  stateSchemaVersion: number;
  semanticRevision: string;
  sourceRevision: string;
}>;

export type ReplayRecorder = Readonly<{
  recordAccepted: (event: GameEvent, stateAfter: GameState, recordedAtMs: number) => void;
  snapshot: () => ReplayLog;
}>;

type PlainRecord = Readonly<Record<string, unknown>>;

function isNatural(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function isPlainDataRecord(value: unknown): value is PlainRecord {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype ||
    Object.getOwnPropertySymbols(value).length !== 0
  ) {
    return false;
  }
  return Object.entries(Object.getOwnPropertyDescriptors(value)).every(
    ([key, descriptor]) =>
      !RESERVED_KEYS.has(key) && "value" in descriptor && descriptor.enumerable,
  );
}

function isPlainDataArray(value: unknown): value is readonly unknown[] {
  if (
    !Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Array.prototype ||
    Object.getOwnPropertySymbols(value).length !== 0 ||
    value.length > MAX_REPLAY_ENTRIES
  ) {
    return false;
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  return (
    Object.keys(value).length === value.length &&
    Array.from({ length: value.length }, (_, index) => {
      const descriptor = descriptors[String(index)];
      return descriptor !== undefined && "value" in descriptor && descriptor.enumerable;
    }).every(Boolean)
  );
}

function hasExactKeys(value: unknown, keys: readonly string[]): value is PlainRecord {
  return (
    isPlainDataRecord(value) &&
    Object.keys(value).length === keys.length &&
    Object.keys(value).every((key) => keys.includes(key))
  );
}

function copyPlainData(value: unknown): unknown {
  if (isPlainDataArray(value)) {
    const descriptors = Object.getOwnPropertyDescriptors(value);
    return Object.freeze(
      Array.from({ length: value.length }, (_, index) => {
        const descriptor = descriptors[String(index)];
        if (!descriptor || !("value" in descriptor)) throw new Error("Replay array is invalid.");
        return copyPlainData(descriptor.value);
      }),
    );
  }
  if (Array.isArray(value)) throw new Error("Replay array is invalid.");
  if (isPlainDataRecord(value)) {
    const result: Record<string, unknown> = {};
    for (const [key, descriptor] of Object.entries(Object.getOwnPropertyDescriptors(value))) {
      if (!("value" in descriptor)) throw new Error("Replay record is invalid.");
      result[key] = copyPlainData(descriptor.value);
    }
    return Object.freeze(result);
  }
  if (value === null || ["string", "number", "boolean"].includes(typeof value)) return value;
  throw new Error("Replay value is invalid.");
}

function structurallyEqual(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) return true;
  if (Array.isArray(left) || Array.isArray(right)) {
    return (
      Array.isArray(left) &&
      Array.isArray(right) &&
      left.length === right.length &&
      left.every((item, index) => structurallyEqual(item, right[index]))
    );
  }
  if (isPlainDataRecord(left) || isPlainDataRecord(right)) {
    if (!isPlainDataRecord(left) || !isPlainDataRecord(right)) return false;
    const leftKeys = Object.keys(left).sort();
    const rightKeys = Object.keys(right).sort();
    return (
      leftKeys.length === rightKeys.length &&
      leftKeys.every(
        (key, index) => key === rightKeys[index] && structurallyEqual(left[key], right[key]),
      )
    );
  }
  return false;
}

function replaySource(runtime: ReplayRuntime): ReplaySource {
  return Object.freeze({
    formatVersion: REPLAY_FORMAT_VERSION,
    stateSchemaVersion: runtime.stateSchemaVersion,
    semanticRevision: runtime.semanticRevision,
    sourceRevision: runtime.sourceRevision,
  });
}

function validRuntime(runtime: ReplayRuntime): boolean {
  return (
    isNatural(runtime.stateSchemaVersion) &&
    typeof runtime.semanticRevision === "string" &&
    runtime.semanticRevision.length > 0 &&
    typeof runtime.sourceRevision === "string" &&
    runtime.sourceRevision.length > 0
  );
}

function runtimeRejection(source: ReplaySource, runtime: ReplayRuntime): ReplayResult | undefined {
  if (
    source.formatVersion !== REPLAY_FORMAT_VERSION ||
    source.stateSchemaVersion !== runtime.stateSchemaVersion ||
    source.semanticRevision !== runtime.semanticRevision
  ) {
    return { kind: "rejected", code: "stale-trace" };
  }
  if (source.sourceRevision !== runtime.sourceRevision)
    return { kind: "rejected", code: "source-mismatch" };
  return undefined;
}

function rejection(code: ReplayRejectionCode, entryIndex?: number): ReplayResult {
  return entryIndex === undefined
    ? { kind: "rejected", code }
    : { kind: "rejected", code, entryIndex };
}

/** Validates through the save boundary and returns canonical data without browser storage. */
export function normalizeDurableState(state: GameState): SerializedGameState {
  return normalizeCurrentGameState(state);
}

export { projectVisibleProgression } from "./decision_surface.js";

/** Creates a recorder that captures only already-accepted, durable events. */
export function createReplayRecorder(
  initial: GameState,
  startedAtMs: number,
  runtime: ReplayRuntime,
): ReplayRecorder {
  if (!isNatural(startedAtMs) || !validRuntime(runtime))
    throw new Error("Replay runtime is invalid.");
  const initialDurableState = normalizeDurableState(initial);
  const entries: ReplayEntry[] = [];
  let lastRecordedAtMs = startedAtMs;
  return Object.freeze({
    recordAccepted(event, stateAfter, recordedAtMs) {
      if (!isNatural(recordedAtMs) || recordedAtMs < lastRecordedAtMs)
        throw new Error("Replay record time is invalid.");
      const parsedEvent = parseRuntimeEvent(event);
      const normalizedDurableState = normalizeDurableState(stateAfter);
      entries.push(
        Object.freeze({
          recordedOffsetMs: recordedAtMs - startedAtMs,
          event: parsedEvent,
          outcome: Object.freeze({
            eventSequence: stateAfter.eventSequence,
            normalizedDurableState,
            visibleProgression: projectVisibleProgression(stateAfter),
          }),
        }),
      );
      lastRecordedAtMs = recordedAtMs;
    },
    snapshot() {
      return Object.freeze({
        source: replaySource(runtime),
        startedAtMs,
        seed: initial.deterministicSeed,
        initialDurableState,
        entries: Object.freeze([...entries]),
      });
    },
  });
}

function parseSource(raw: unknown): ReplaySource | undefined {
  if (
    !hasExactKeys(raw, [
      "formatVersion",
      "stateSchemaVersion",
      "semanticRevision",
      "sourceRevision",
    ])
  )
    return undefined;
  if (
    raw.formatVersion !== REPLAY_FORMAT_VERSION ||
    !isNatural(raw.stateSchemaVersion) ||
    typeof raw.semanticRevision !== "string" ||
    raw.semanticRevision.length === 0 ||
    typeof raw.sourceRevision !== "string" ||
    raw.sourceRevision.length === 0
  ) {
    return undefined;
  }
  return Object.freeze({
    formatVersion: REPLAY_FORMAT_VERSION,
    stateSchemaVersion: raw.stateSchemaVersion,
    semanticRevision: raw.semanticRevision,
    sourceRevision: raw.sourceRevision,
  });
}

function plainArrayValues(raw: unknown): readonly unknown[] | undefined {
  if (!isPlainDataArray(raw)) return undefined;
  const descriptors = Object.getOwnPropertyDescriptors(raw);
  const values: unknown[] = [];
  for (let index = 0; index < raw.length; index += 1) {
    const descriptor = descriptors[String(index)];
    if (!descriptor || !("value" in descriptor)) return undefined;
    values.push(descriptor.value);
  }
  return values;
}

function parseIdentifierArray(raw: unknown): readonly string[] | undefined {
  const values = plainArrayValues(raw);
  if (values === undefined) return undefined;
  const parsed: string[] = [];
  for (const value of values) {
    if (typeof value !== "string" || value.length === 0 || parsed.includes(value)) return undefined;
    parsed.push(value);
  }
  return Object.freeze(parsed);
}

function parseNullableIdentifier(raw: unknown): string | null | undefined {
  if (raw === null) return null;
  return typeof raw === "string" && raw.length > 0 ? raw : undefined;
}

function parseProgressionProjection(
  raw: unknown,
): ReplayVisibleProgression["pendingProgression"] | undefined {
  const values = plainArrayValues(raw);
  if (values === undefined) return undefined;
  const parsed: Array<ReplayVisibleProgression["pendingProgression"][number]> = [];
  const identities = new Set<string>();
  for (const value of values) {
    if (!hasExactKeys(value, ["kind", "id"])) return undefined;
    if ((value.kind !== "stage" && value.kind !== "prestige") || typeof value.id !== "string")
      return undefined;
    const identity = `${value.kind}:${value.id}`;
    if (value.id.length === 0 || identities.has(identity)) return undefined;
    identities.add(identity);
    parsed.push(Object.freeze({ kind: value.kind, id: value.id }));
  }
  return Object.freeze(parsed);
}

function parseNodeStatuses(
  raw: unknown,
): ReplayVisibleProgression["network"]["nodeStatuses"] | undefined {
  const values = plainArrayValues(raw);
  if (values === undefined) return undefined;
  const parsed: Array<ReplayVisibleProgression["network"]["nodeStatuses"][number]> = [];
  const identities = new Set<string>();
  for (const value of values) {
    if (!hasExactKeys(value, ["nodeId", "status"])) return undefined;
    if (
      typeof value.nodeId !== "string" ||
      value.nodeId.length === 0 ||
      (value.status !== "established" && value.status !== "stable") ||
      identities.has(value.nodeId)
    )
      return undefined;
    identities.add(value.nodeId);
    parsed.push(Object.freeze({ nodeId: value.nodeId, status: value.status }));
  }
  return Object.freeze(parsed);
}

function parseEdgeStatuses(
  raw: unknown,
): ReplayVisibleProgression["network"]["edgeStatuses"] | undefined {
  const values = plainArrayValues(raw);
  if (values === undefined) return undefined;
  const parsed: Array<ReplayVisibleProgression["network"]["edgeStatuses"][number]> = [];
  const identities = new Set<string>();
  for (const value of values) {
    if (!hasExactKeys(value, ["edgeId", "status"])) return undefined;
    if (
      typeof value.edgeId !== "string" ||
      value.edgeId.length === 0 ||
      (value.status !== "committed" && value.status !== "retired") ||
      identities.has(value.edgeId)
    )
      return undefined;
    identities.add(value.edgeId);
    parsed.push(Object.freeze({ edgeId: value.edgeId, status: value.status }));
  }
  return Object.freeze(parsed);
}

function parseVisibleProgression(raw: unknown): ReplayVisibleProgression | undefined {
  if (
    !hasExactKeys(raw, [
      "currentStageId",
      "endingPhase",
      "pendingProgression",
      "earnedPrestigeIds",
      "activeHost",
      "pendingHostDraft",
      "culture",
      "network",
    ]) ||
    typeof raw.currentStageId !== "string" ||
    raw.currentStageId.length === 0 ||
    (raw.endingPhase !== "unreached" && raw.endingPhase !== "reached")
  ) {
    return undefined;
  }
  const pendingProgression = parseProgressionProjection(raw.pendingProgression);
  const earnedPrestigeIds = parseIdentifierArray(raw.earnedPrestigeIds);
  if (pendingProgression === undefined || earnedPrestigeIds === undefined) return undefined;
  let activeHost: ReplayVisibleProgression["activeHost"] = null;
  if (raw.activeHost !== null) {
    if (
      !hasExactKeys(raw.activeHost, ["hostRunId", "cardId"]) ||
      typeof raw.activeHost.hostRunId !== "string" ||
      typeof raw.activeHost.cardId !== "string" ||
      raw.activeHost.hostRunId.length === 0 ||
      raw.activeHost.cardId.length === 0
    )
      return undefined;
    activeHost = Object.freeze({
      hostRunId: raw.activeHost.hostRunId,
      cardId: raw.activeHost.cardId,
    });
  }
  let pendingHostDraft: ReplayVisibleProgression["pendingHostDraft"] = null;
  if (raw.pendingHostDraft !== null) {
    if (!hasExactKeys(raw.pendingHostDraft, ["draftId", "revealedCardIds", "consumedCardIds"]))
      return undefined;
    const revealedCardIds = parseIdentifierArray(raw.pendingHostDraft.revealedCardIds);
    const consumedCardIds = parseIdentifierArray(raw.pendingHostDraft.consumedCardIds);
    if (
      typeof raw.pendingHostDraft.draftId !== "string" ||
      raw.pendingHostDraft.draftId.length === 0 ||
      revealedCardIds === undefined ||
      consumedCardIds === undefined
    )
      return undefined;
    pendingHostDraft = Object.freeze({
      draftId: raw.pendingHostDraft.draftId,
      revealedCardIds,
      consumedCardIds,
    });
  }
  if (
    !hasExactKeys(raw.culture, [
      "passages",
      "purchasedUpgrades",
      "cryobankProgramId",
      "queuedProducerId",
    ])
  )
    return undefined;
  const purchasedUpgrades = plainArrayValues(raw.culture.purchasedUpgrades);
  if (
    !isNatural(raw.culture.passages) ||
    purchasedUpgrades === undefined ||
    (raw.culture.cryobankProgramId !== null && typeof raw.culture.cryobankProgramId !== "string") ||
    (raw.culture.queuedProducerId !== null && typeof raw.culture.queuedProducerId !== "string")
  )
    return undefined;
  const cultureEntries: Array<ReplayVisibleProgression["culture"]["purchasedUpgrades"][number]> =
    [];
  const upgradeIds = new Set<string>();
  for (const upgrade of purchasedUpgrades) {
    if (!hasExactKeys(upgrade, ["upgradeId", "rank"])) return undefined;
    if (
      typeof upgrade.upgradeId !== "string" ||
      upgrade.upgradeId.length === 0 ||
      !isNatural(upgrade.rank)
    )
      return undefined;
    if (upgradeIds.has(upgrade.upgradeId)) return undefined;
    upgradeIds.add(upgrade.upgradeId);
    cultureEntries.push(Object.freeze({ upgradeId: upgrade.upgradeId, rank: upgrade.rank }));
  }
  if (
    !hasExactKeys(raw.network, [
      "globalTier",
      "transmissionPressure",
      "pendingFrontierId",
      "activeMandateId",
      "activeCampaignId",
      "nodeStatuses",
      "edgeStatuses",
    ])
  )
    return undefined;
  const pressure = raw.network.transmissionPressure;
  if (!hasExactKeys(pressure, ["mantissa", "exponent"])) return undefined;
  const pressureMantissa = pressure.mantissa;
  const pressureExponent = pressure.exponent;
  if (!isNatural(raw.network.globalTier)) return undefined;
  if (
    typeof pressureMantissa !== "number" ||
    !Number.isFinite(pressureMantissa) ||
    typeof pressureExponent !== "number" ||
    !Number.isSafeInteger(pressureExponent)
  )
    return undefined;
  const pendingFrontierId = parseNullableIdentifier(raw.network.pendingFrontierId);
  const activeMandateId = parseNullableIdentifier(raw.network.activeMandateId);
  const activeCampaignId = parseNullableIdentifier(raw.network.activeCampaignId);
  if (
    pendingFrontierId === undefined ||
    activeMandateId === undefined ||
    activeCampaignId === undefined
  )
    return undefined;
  const nodeStatuses = parseNodeStatuses(raw.network.nodeStatuses);
  const edgeStatuses = parseEdgeStatuses(raw.network.edgeStatuses);
  if (nodeStatuses === undefined || edgeStatuses === undefined) return undefined;
  return Object.freeze({
    currentStageId: raw.currentStageId,
    endingPhase: raw.endingPhase,
    pendingProgression,
    earnedPrestigeIds,
    activeHost,
    pendingHostDraft,
    culture: Object.freeze({
      passages: raw.culture.passages,
      purchasedUpgrades: Object.freeze(cultureEntries),
      cryobankProgramId: raw.culture.cryobankProgramId,
      queuedProducerId: raw.culture.queuedProducerId,
    }),
    network: Object.freeze({
      globalTier: raw.network.globalTier,
      transmissionPressure: Object.freeze({
        mantissa: pressureMantissa,
        exponent: pressureExponent,
      }),
      pendingFrontierId,
      activeMandateId,
      activeCampaignId,
      nodeStatuses,
      edgeStatuses,
    }),
  });
}

function parseOutcome(raw: unknown): ReplayEntry["outcome"] | undefined {
  if (!hasExactKeys(raw, ["eventSequence", "normalizedDurableState", "visibleProgression"]))
    return undefined;
  if (!isNatural(raw.eventSequence) || !isPlainDataRecord(raw.normalizedDurableState))
    return undefined;
  try {
    const parsed = parseNormalizedGameState(copyPlainData(raw.normalizedDurableState));
    if (parsed === undefined) return undefined;
    const visibleProgression = parseVisibleProgression(copyPlainData(raw.visibleProgression));
    if (visibleProgression === undefined) return undefined;
    return Object.freeze({
      eventSequence: raw.eventSequence,
      normalizedDurableState: parsed,
      visibleProgression,
    });
  } catch {
    return undefined;
  }
}

function parseEntry(raw: unknown, previousOffsetMs: number): ReplayEntry | undefined {
  if (!hasExactKeys(raw, ["recordedOffsetMs", "event", "outcome"])) return undefined;
  if (!isNatural(raw.recordedOffsetMs) || raw.recordedOffsetMs < previousOffsetMs) return undefined;
  try {
    const event = parseRuntimeEvent(copyPlainData(raw.event));
    const outcome = parseOutcome(raw.outcome);
    return outcome === undefined
      ? undefined
      : Object.freeze({ recordedOffsetMs: raw.recordedOffsetMs, event, outcome });
  } catch {
    return undefined;
  }
}

/** Parses an untrusted development trace without consuming any caller-owned objects. */
export function parseReplayLog(raw: unknown, runtime: ReplayRuntime): ReplayParseResult {
  if (!validRuntime(runtime)) return { kind: "rejected", code: "invalid-log" };
  if (!hasExactKeys(raw, ["source", "startedAtMs", "seed", "initialDurableState", "entries"]))
    return { kind: "rejected", code: "invalid-log" };
  const source = parseSource(raw.source);
  if (source === undefined || !isNatural(raw.startedAtMs) || !isNatural(raw.seed))
    return { kind: "rejected", code: "invalid-log" };
  const versionResult = runtimeRejection(source, runtime);
  if (versionResult?.kind === "rejected") return versionResult;
  if (!Array.isArray(raw.entries)) return { kind: "rejected", code: "invalid-log" };
  if (raw.entries.length > MAX_REPLAY_ENTRIES) return { kind: "rejected", code: "oversized-log" };
  if (!isPlainDataArray(raw.entries)) return { kind: "rejected", code: "invalid-log" };
  let initialDurableState: SerializedGameState;
  try {
    const parsedInitial = parseNormalizedGameState(copyPlainData(raw.initialDurableState));
    if (parsedInitial === undefined) return { kind: "rejected", code: "invalid-initial-state" };
    initialDurableState = parsedInitial;
  } catch {
    return { kind: "rejected", code: "invalid-initial-state" };
  }
  const initialState = parseNormalizedGameState(initialDurableState);
  if (initialState === undefined || initialState.deterministicSeed !== raw.seed)
    return { kind: "rejected", code: "seed-mismatch" };
  const entries: ReplayEntry[] = [];
  let previousOffsetMs = 0;
  const entryDescriptors = Object.getOwnPropertyDescriptors(raw.entries);
  for (let entryIndex = 0; entryIndex < raw.entries.length; entryIndex += 1) {
    const descriptor = entryDescriptors[String(entryIndex)];
    if (!descriptor || !("value" in descriptor))
      return { kind: "rejected", code: "invalid-event", entryIndex };
    const value: unknown = descriptor.value;
    const entry = parseEntry(value, previousOffsetMs);
    if (entry === undefined) return { kind: "rejected", code: "invalid-event", entryIndex };
    entries.push(entry);
    previousOffsetMs = entry.recordedOffsetMs;
  }
  return {
    kind: "accepted",
    log: Object.freeze({
      source,
      startedAtMs: raw.startedAtMs,
      seed: raw.seed,
      initialDurableState,
      entries: Object.freeze(entries),
    }),
  };
}

/** Re-enters the exact parser and reducer for each event, comparing semantic outcomes only. */
export function replayLog(log: ReplayLog, runtime: ReplayRuntime): ReplayResult {
  void EVENT_TYPE_REGISTRY_IS_EXHAUSTIVE;
  if (!validRuntime(runtime)) return rejection("invalid-log");
  const versionResult = runtimeRejection(log.source, runtime);
  if (versionResult !== undefined) return versionResult;
  if (log.entries.length > MAX_REPLAY_ENTRIES) return rejection("oversized-log");
  const initial = parseNormalizedGameState(log.initialDurableState);
  if (initial === undefined) return rejection("invalid-initial-state");
  if (initial.deterministicSeed !== log.seed) return rejection("seed-mismatch");
  let state = initial;
  let previousOffsetMs = 0;
  for (const [entryIndex, entry] of log.entries.entries()) {
    if (!isNatural(entry.recordedOffsetMs) || entry.recordedOffsetMs < previousOffsetMs)
      return rejection("invalid-event", entryIndex);
    let parsedEvent: GameEvent;
    try {
      parsedEvent = parseRuntimeEvent(entry.event);
    } catch {
      return rejection("invalid-event", entryIndex);
    }
    let next: GameState;
    try {
      next = recordEvent(state, parsedEvent);
    } catch {
      return rejection("event-rejected", entryIndex);
    }
    const normalized = normalizeDurableState(next);
    const visibleProgression = projectVisibleProgression(next);
    if (
      next.eventSequence !== entry.outcome.eventSequence ||
      !structurallyEqual(normalized, entry.outcome.normalizedDurableState) ||
      !structurallyEqual(visibleProgression, entry.outcome.visibleProgression)
    ) {
      return rejection("outcome-mismatch", entryIndex);
    }
    state = next;
    previousOffsetMs = entry.recordedOffsetMs;
  }
  return Object.freeze({
    kind: "replayed",
    finalState: normalizeDurableState(state),
    finalVisibleProgression: projectVisibleProgression(state),
  });
}
