import { subtract } from "../bignum/bignum.js";
import { bigNum, prestigeId, stageId } from "../brands.js";
import type { ApplyOfflineAccrualEvent } from "../types/events.js";
import type {
  GameState,
  PendingProgression,
  TrackedResourceKey,
  TrackedResourceSnapshot,
} from "../types/state.js";
import { MAX_PENDING_PROGRESSION, TRACKED_RESOURCE_KEYS } from "../types/state.js";
import { recordEvent } from "./events.js";
import type { EconomyTick } from "../economy/tick.js";
import { isPrestigeId, isStageId } from "./catalog.js";
import {
  projectElapsedHallmarkDurableEffects,
  type ElapsedHallmarkDurableProjection,
} from "../hallmarks/elapsed_effects.js";
import {
  projectExtendedHallmarkDurableTickEffects,
  type ExtendedHallmarkDurableTickProjection,
} from "../hallmarks/extended_hallmark_tick.js";
import {
  projectLateHallmarkDurableTickEffects,
  type LateHallmarkDurableTickProjection,
} from "../hallmarks/late_hallmark_tick.js";

export const OFFLINE_STEP_MS = 60_000;
export const MAX_OFFLINE_MS = 604_800_000;
export const MAX_OFFLINE_STEPS = 10_080;

export type OfflineElapsed =
  | Readonly<{ kind: "ready"; requestedElapsedMs: number }>
  | Readonly<{
      kind: "clock-skew";
      requestedElapsedMs: 0;
      notice: Readonly<{ code: "clock-skew"; savedAtMs: number; nowMs: number }>;
    }>
  | Readonly<{ kind: "rejected"; code: "invalid-saved-at" | "invalid-now-at" }>;
export type { EconomyTick, OfflineStepResult, TickMode } from "../economy/tick.js";
export type OfflineNotice =
  | Readonly<{ code: "clock-skew"; savedAtMs: number; nowMs: number }>
  | Readonly<{ code: "offline-cap"; requestedElapsedMs: number; appliedElapsedMs: number }>;
export type OfflineReplayPlan = Readonly<{
  requestedElapsedMs: number;
  appliedElapsedMs: number;
  fullSteps: number;
  remainderMs: number;
  capped: boolean;
  notices: readonly OfflineNotice[];
}>;
export type OfflineErrorCode =
  | "invalid-saved-at"
  | "invalid-now-at"
  | "invalid-active-time"
  | "invalid-configuration"
  | "unsafe-total-offline"
  | "step-failed"
  | "delta-failed"
  | "accounting-failed";
export type OfflineResourceRecord = Readonly<{
  before: GameState[TrackedResourceKey];
  after: GameState[TrackedResourceKey];
  delta: GameState[TrackedResourceKey];
}>;
export type OfflineReplayReport = Readonly<{
  requestedElapsedMs: number;
  appliedElapsedMs: number;
  accountedAtMs: number;
  capped: boolean;
  executedSteps: number;
  notices: readonly OfflineNotice[];
  resources: Readonly<Record<TrackedResourceKey, OfflineResourceRecord>>;
  pendingProgression: readonly PendingProgression[];
  newlyObservedProgression: readonly PendingProgression[];
}>;
export type OfflineReplayResult =
  | Readonly<{
      kind: "applied";
      state: GameState;
      pendingProgression: readonly PendingProgression[];
      report: OfflineReplayReport;
    }>
  | Readonly<{
      kind: "rejected";
      state: GameState;
      code: OfflineErrorCode;
      appliedElapsedMs: 0;
      executedSteps: 0;
      pendingProgression: readonly [];
    }>;
export type OfflineAccrualRecorder = (
  state: GameState,
  event: ApplyOfflineAccrualEvent,
) => GameState;

function natural(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}
function plainExact(value: unknown, keys: readonly string[]): Record<string, unknown> | undefined {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype ||
    Object.getOwnPropertySymbols(value).length !== 0
  )
    return undefined;
  const actualKeys = Object.getOwnPropertyNames(value);
  if (actualKeys.length !== keys.length || actualKeys.some((key) => !keys.includes(key)))
    return undefined;
  const result: Record<string, unknown> = {};
  for (const key of keys) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor || !("value" in descriptor) || !descriptor.enumerable) return undefined;
    result[key] = descriptor.value;
  }
  return result;
}

/** ASVS 1.5.2/2.2.1/2.3.3/15.3.3/15.3.5/15.3.6/16.5.3: accept only the trusted effect. */
function projectElapsedHallmarkProjection(
  raw: unknown,
  prior: GameState,
  duration: number,
): ElapsedHallmarkDurableProjection {
  const expected = projectElapsedHallmarkDurableEffects(prior, duration);
  if (!exactDataEqual(raw, expected))
    throw new Error("Offline durable projection does not match the expected elapsed effect.");
  return expected;
}

/** ASVS 1.5.2/2.2.1/2.2.3/2.3.3/15.3.3/15.3.5/15.3.6/16.5.3: exact extended-hallmark allowlist. */
function projectExtendedHallmarkProjection(
  raw: unknown,
  prior: GameState,
  duration: number,
): ExtendedHallmarkDurableTickProjection {
  const expected = projectExtendedHallmarkDurableTickEffects(prior, duration);
  if (!exactDataEqual(raw, expected)) {
    throw new Error(
      "Offline extended-hallmark projection does not match the expected durable effect.",
    );
  }
  return expected;
}

function projectLateHallmarkProjection(
  raw: unknown,
  prior: GameState,
  duration: number,
): LateHallmarkDurableTickProjection {
  const expected = projectLateHallmarkDurableTickEffects(prior, duration);
  if (!exactDataEqual(raw, expected))
    throw new Error("Offline late-hallmark projection does not match the expected durable effect.");
  return expected;
}

type TrustedStepResult = Readonly<{
  resourceSnapshot: unknown;
  stageEligibility: unknown;
  prestigeEligibility: unknown;
  stateProjection?: unknown;
  extendedHallmarkProjection?: unknown;
  lateHallmarkProjection?: unknown;
}>;

/** ASVS 15.3.3/15.3.5/15.3.6/16.5.3: reject unsafe adapter records before any field is read. */
function trustedStepResult(raw: unknown): TrustedStepResult {
  const baseKeys = ["resourceSnapshot", "stageEligibility", "prestigeEligibility"];
  const candidates: ReadonlyArray<readonly string[]> = [
    baseKeys,
    [...baseKeys, "stateProjection"],
    [...baseKeys, "extendedHallmarkProjection"],
    [...baseKeys, "lateHallmarkProjection"],
    [...baseKeys, "stateProjection", "extendedHallmarkProjection"],
    [...baseKeys, "stateProjection", "lateHallmarkProjection"],
    [...baseKeys, "extendedHallmarkProjection", "lateHallmarkProjection"],
    [...baseKeys, "stateProjection", "extendedHallmarkProjection", "lateHallmarkProjection"],
  ];
  let withProjection: Record<string, unknown> | undefined;
  for (const keys of candidates) {
    const candidate = plainExact(raw, keys);
    if (candidate) {
      withProjection = candidate;
      break;
    }
  }
  if (!withProjection) throw new Error("Offline adapter result is invalid.");
  return {
    resourceSnapshot: withProjection.resourceSnapshot,
    stageEligibility: withProjection.stageEligibility,
    prestigeEligibility: withProjection.prestigeEligibility,
    stateProjection: withProjection.stateProjection,
    extendedHallmarkProjection: withProjection.extendedHallmarkProjection,
    lateHallmarkProjection: withProjection.lateHallmarkProjection,
  };
}

/** ASVS 2.2.1: validate injected wall-clock samples before calculating absence. */
export function deriveOfflineElapsed(savedAtMs: number, nowMs: number): OfflineElapsed {
  if (!natural(savedAtMs)) return { kind: "rejected", code: "invalid-saved-at" };
  if (!natural(nowMs)) return { kind: "rejected", code: "invalid-now-at" };
  if (nowMs < savedAtMs)
    return {
      kind: "clock-skew",
      requestedElapsedMs: 0,
      notice: { code: "clock-skew", savedAtMs, nowMs },
    };
  return { kind: "ready", requestedElapsedMs: nowMs - savedAtMs };
}

/** Rebuild the adapter resource projection so structural TypeScript extras cannot cross this boundary. */
export function projectExactTrackedResourceSnapshot(raw: unknown): TrackedResourceSnapshot {
  const record = plainExact(raw, TRACKED_RESOURCE_KEYS);
  if (!record) throw new Error("Offline resource snapshot has an invalid shape.");
  const output: Record<string, GameState[TrackedResourceKey]> = {};
  for (const key of TRACKED_RESOURCE_KEYS) {
    const value = record[key];
    const fields = plainExact(value, ["mantissa", "exponent"]);
    if (
      !fields ||
      typeof fields.mantissa !== "number" ||
      !Number.isFinite(fields.mantissa) ||
      typeof fields.exponent !== "number" ||
      !Number.isSafeInteger(fields.exponent)
    )
      throw new Error("Offline resource snapshot is invalid.");
    // The trusted BigNum constructor is the canonicality authority.
    const candidate = bigNum(fields.mantissa, fields.exponent);
    if (candidate.mantissa !== fields.mantissa || candidate.exponent !== fields.exponent)
      throw new Error("Offline resource snapshot is not canonical.");
    output[key] = candidate;
  }
  return output as TrackedResourceSnapshot;
}
function resourceSnapshotFromState(state: GameState): TrackedResourceSnapshot {
  const snapshot: Record<string, GameState[TrackedResourceKey]> = {};
  for (const key of TRACKED_RESOURCE_KEYS) snapshot[key] = state[key];
  return projectExactTrackedResourceSnapshot(snapshot);
}

/** Reject sparse, accessor-backed, or oversized adapter arrays before iteration. */
function boundedArray(raw: unknown): readonly unknown[] {
  if (
    !Array.isArray(raw) ||
    raw.length > MAX_PENDING_PROGRESSION ||
    Object.getPrototypeOf(raw) !== Array.prototype ||
    Object.getOwnPropertySymbols(raw).length !== 0 ||
    Object.getOwnPropertyNames(raw).length !== raw.length + 1
  )
    throw new Error("Offline progression observations are invalid.");
  for (let index = 0; index < raw.length; index += 1) {
    const descriptor = Object.getOwnPropertyDescriptor(raw, String(index));
    if (!descriptor || !("value" in descriptor) || !descriptor.enumerable)
      throw new Error("Offline progression observations are invalid.");
  }
  return raw;
}

function observations(
  raw: unknown,
  kind: "stage" | "prestige",
  atMs: number,
): readonly PendingProgression[] {
  const values = boundedArray(raw);
  const result: PendingProgression[] = [];
  for (const item of values) {
    const record = plainExact(item, ["kind", "id"]);
    if (
      !record ||
      record.kind !== kind ||
      typeof record.id !== "string" ||
      (kind === "stage" && !isStageId(record.id)) ||
      (kind === "prestige" && !isPrestigeId(record.id))
    )
      throw new Error("Offline progression observation is invalid.");
    result.push(
      kind === "stage"
        ? { kind, id: stageId(record.id), firstObservedAtActiveMs: atMs }
        : { kind, id: prestigeId(record.id), firstObservedAtActiveMs: atMs },
    );
  }
  return result;
}

/** Compare a recorder return value without invoking accessors or accepting structural extras. */
function exactDataEqual(actual: unknown, expected: unknown): boolean {
  if (Object.is(actual, expected)) return true;
  if (
    typeof actual !== "object" ||
    actual === null ||
    typeof expected !== "object" ||
    expected === null
  )
    return false;
  if (Array.isArray(actual) || Array.isArray(expected)) {
    if (!Array.isArray(actual) || !Array.isArray(expected) || actual.length !== expected.length)
      return false;
    if (
      Object.getPrototypeOf(actual) !== Array.prototype ||
      Object.getOwnPropertySymbols(actual).length !== 0
    )
      return false;
    for (let index = 0; index < expected.length; index += 1) {
      const descriptor = Object.getOwnPropertyDescriptor(actual, String(index));
      if (!descriptor || !("value" in descriptor) || !descriptor.enumerable) return false;
      if (!exactDataEqual(descriptor.value, expected[index])) return false;
    }
    return Object.getOwnPropertyNames(actual).length === expected.length + 1;
  }
  if (
    Object.getPrototypeOf(actual) !== Object.prototype ||
    Object.getPrototypeOf(expected) !== Object.prototype ||
    Object.getOwnPropertySymbols(actual).length !== 0
  )
    return false;
  const actualKeys = Object.getOwnPropertyNames(actual);
  const expectedKeys = Object.getOwnPropertyNames(expected);
  if (
    actualKeys.length !== expectedKeys.length ||
    actualKeys.some((key) => !expectedKeys.includes(key))
  )
    return false;
  for (const key of expectedKeys) {
    const actualDescriptor = Object.getOwnPropertyDescriptor(actual, key);
    const expectedDescriptor = Object.getOwnPropertyDescriptor(expected, key);
    if (
      !actualDescriptor ||
      !("value" in actualDescriptor) ||
      !actualDescriptor.enumerable ||
      !expectedDescriptor ||
      !("value" in expectedDescriptor)
    )
      return false;
    if (!exactDataEqual(actualDescriptor.value, expectedDescriptor.value)) return false;
  }
  return true;
}

/** ASVS 2.2.1/2.3.3: callbacks receive data copies, never caller-owned durable state. */
function isolated<T>(value: T): T {
  return structuredClone(value);
}
function configurationIsValid(): boolean {
  return (
    natural(OFFLINE_STEP_MS) &&
    natural(MAX_OFFLINE_MS) &&
    natural(MAX_OFFLINE_STEPS) &&
    OFFLINE_STEP_MS > 0 &&
    MAX_OFFLINE_STEPS > 0 &&
    MAX_OFFLINE_MS === OFFLINE_STEP_MS * MAX_OFFLINE_STEPS
  );
}

/** Own the cap and macro-step partition before any economy callback executes. */
export function planOfflineReplay(requestedElapsedMs: number): OfflineReplayPlan {
  if (!natural(requestedElapsedMs)) throw new Error("Offline elapsed time is invalid.");
  if (!configurationIsValid()) throw new Error("Offline replay configuration is invalid.");
  const appliedElapsedMs = Math.min(requestedElapsedMs, MAX_OFFLINE_MS);
  const fullSteps = Math.floor(appliedElapsedMs / OFFLINE_STEP_MS);
  const remainderMs = appliedElapsedMs % OFFLINE_STEP_MS;
  const capped = appliedElapsedMs !== requestedElapsedMs;
  const notices: readonly OfflineNotice[] = capped
    ? [{ code: "offline-cap", requestedElapsedMs, appliedElapsedMs }]
    : [];
  return {
    requestedElapsedMs,
    appliedElapsedMs,
    fullSteps,
    remainderMs,
    capped,
    notices,
  };
}

function rejected(state: GameState, code: OfflineErrorCode): OfflineReplayResult {
  return {
    kind: "rejected",
    state,
    code,
    appliedElapsedMs: 0,
    executedSteps: 0,
    pendingProgression: [],
  };
}
function zeroDeltaReport(
  state: GameState,
  elapsed: Extract<OfflineElapsed, { kind: "ready" | "clock-skew" }>,
  notices: readonly OfflineNotice[],
): OfflineReplayReport {
  const resources: Record<string, OfflineResourceRecord> = {};
  for (const key of TRACKED_RESOURCE_KEYS)
    resources[key] = {
      before: state[key],
      after: state[key],
      delta: { mantissa: 0, exponent: 0 } as GameState[TrackedResourceKey],
    };
  return {
    requestedElapsedMs: elapsed.requestedElapsedMs,
    appliedElapsedMs: 0,
    accountedAtMs: state.activeTimeMs,
    capped: false,
    executedSteps: 0,
    notices,
    resources: resources as Record<TrackedResourceKey, OfflineResourceRecord>,
    pendingProgression: state.pendingProgression,
    newlyObservedProgression: [],
  };
}

/** Pure bounded replay: no wall clock, DOM, storage, formula, or direct durable mutation. */
export function replayOffline(
  state: GameState,
  elapsed: OfflineElapsed,
  tick: EconomyTick,
  recordAccrual: OfflineAccrualRecorder,
): OfflineReplayResult {
  if (elapsed.kind === "rejected") return rejected(state, elapsed.code);
  if (!natural(state.activeTimeMs)) return rejected(state, "invalid-active-time");
  if (!configurationIsValid()) return rejected(state, "invalid-configuration");
  if (elapsed.kind === "clock-skew" || elapsed.requestedElapsedMs === 0) {
    const notices = elapsed.kind === "clock-skew" ? [elapsed.notice] : [];
    return {
      kind: "applied",
      state,
      pendingProgression: state.pendingProgression,
      report: zeroDeltaReport(state, elapsed, notices),
    };
  }
  if (!natural(elapsed.requestedElapsedMs)) return rejected(state, "invalid-now-at");
  const plan = planOfflineReplay(elapsed.requestedElapsedMs);
  if (
    !natural(state.totalOfflineMs) ||
    state.totalOfflineMs > Number.MAX_SAFE_INTEGER - plan.appliedElapsedMs
  )
    return rejected(state, "unsafe-total-offline");
  let working = state;
  let additions: readonly PendingProgression[] = [];
  try {
    const applyStep = (duration: number): void => {
      const result = trustedStepResult(tick(isolated(working), duration, "offline"));
      const resourceSnapshot = projectExactTrackedResourceSnapshot(result.resourceSnapshot);
      const stageRaw = boundedArray(result.stageEligibility);
      const prestigeRaw = boundedArray(result.prestigeEligibility);
      if (stageRaw.length + prestigeRaw.length > MAX_PENDING_PROGRESSION)
        throw new Error("Offline progression observations exceed durable capacity.");
      const stage = observations(stageRaw, "stage", state.activeTimeMs);
      const prestige = observations(prestigeRaw, "prestige", state.activeTimeMs);
      const known = new Set(
        [...state.pendingProgression, ...additions].map((item) => `${item.kind}:${item.id}`),
      );
      const fresh = [...stage, ...prestige].filter((item) => {
        const identity = `${item.kind}:${item.id}`;
        if (known.has(identity)) return false;
        known.add(identity);
        return true;
      });
      if (
        state.pendingProgression.length + additions.length + fresh.length >
        MAX_PENDING_PROGRESSION
      )
        throw new Error("Offline progression queue exceeds durable capacity.");
      additions = [...additions, ...fresh];
      const projected =
        result.stateProjection === undefined
          ? working
          : {
              ...working,
              ...projectElapsedHallmarkProjection(result.stateProjection, working, duration),
            };
      const extendedHallmarkProjected =
        result.extendedHallmarkProjection === undefined
          ? projected
          : {
              ...projected,
              ...projectExtendedHallmarkProjection(
                result.extendedHallmarkProjection,
                working,
                duration,
              ),
            };
      const lateHallmarkProjected =
        result.lateHallmarkProjection === undefined
          ? extendedHallmarkProjected
          : {
              ...extendedHallmarkProjected,
              lateHallmarks: {
                ...extendedHallmarkProjected.lateHallmarks,
                microbiome: projectLateHallmarkProjection(
                  result.lateHallmarkProjection,
                  working,
                  duration,
                ).microbiome,
              },
            };
      const elapsedSoFar = working.totalOfflineMs + duration;
      if (!natural(elapsedSoFar)) throw new Error("Offline elapsed state is invalid.");
      working = {
        ...working,
        ...lateHallmarkProjected,
        ...resourceSnapshot,
        totalOfflineMs: elapsedSoFar,
      };
    };
    for (let index = 0; index < plan.fullSteps; index += 1) applyStep(OFFLINE_STEP_MS);
    if (plan.remainderMs > 0) applyStep(plan.remainderMs);
  } catch {
    return rejected(state, "step-failed");
  }
  let resources: Record<string, OfflineResourceRecord>;
  try {
    resources = {};
    for (const key of TRACKED_RESOURCE_KEYS)
      resources[key] = {
        before: state[key],
        after: working[key],
        delta: subtract(working[key], state[key]),
      };
  } catch {
    return rejected(state, "delta-failed");
  }
  const event: ApplyOfflineAccrualEvent = {
    type: "apply-offline-accrual",
    elapsedMs: plan.appliedElapsedMs,
    atMs: state.activeTimeMs,
    resourceSnapshot: resourceSnapshotFromState(working),
    newlyObservedProgression: additions,
  };
  try {
    const expected = recordEvent(state, event);
    const recorded = recordAccrual(isolated(state), isolated(event));
    if (!exactDataEqual(recorded, expected)) return rejected(state, "accounting-failed");
    const report: OfflineReplayReport = {
      requestedElapsedMs: elapsed.requestedElapsedMs,
      appliedElapsedMs: plan.appliedElapsedMs,
      accountedAtMs: state.activeTimeMs,
      capped: plan.capped,
      executedSteps: plan.fullSteps + (plan.remainderMs > 0 ? 1 : 0),
      notices: plan.notices,
      resources: resources as Record<TrackedResourceKey, OfflineResourceRecord>,
      pendingProgression: expected.pendingProgression,
      newlyObservedProgression: additions,
    };
    return {
      kind: "applied",
      state: expected,
      pendingProgression: expected.pendingProgression,
      report,
    };
  } catch {
    return rejected(state, "accounting-failed");
  }
}
