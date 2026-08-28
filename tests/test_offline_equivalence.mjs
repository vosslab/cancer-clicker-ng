import assert from "node:assert/strict";
import test from "node:test";
import { abs, add, compare, divide, isZero, max, subtract } from "../src/bignum/bignum.ts";
import { bigNum, prestigeId, stageId } from "../src/brands.ts";
import { renderOfflineReport } from "../src/render/offline_report.ts";
import { economyTick } from "../src/economy/tick.ts";
import { createInitialGameState } from "../src/state/game_state.ts";
import {
  MAX_OFFLINE_STEPS,
  OFFLINE_STEP_MS,
  deriveOfflineElapsed,
  replayOffline,
} from "../src/state/offline.ts";
import { recordEvent } from "../src/state/events.ts";
import { parseSave, serializeGameState } from "../src/state/save_load.ts";
import { TRACKED_RESOURCE_KEYS } from "../src/types/state.ts";

function snapshot(state) {
  return { cells: state.cells, substrate: state.substrate, atp: state.atp };
}

function nonlinearTick(state, elapsedMs) {
  const factor = elapsedMs === OFFLINE_STEP_MS ? 2 : 1;
  return {
    resourceSnapshot: {
      cells: add(state.cells, bigNum(factor, 0)),
      substrate: add(state.substrate, bigNum(3 * factor, 0)),
      atp: add(state.atp, bigNum(factor * factor, 0)),
    },
    stageEligibility: factor === 2 ? [{ kind: "stage", id: stageId("microcolony") }] : [],
    prestigeEligibility: factor === 2 ? [{ kind: "prestige", id: prestigeId("L1") }] : [],
  };
}

function exactRecorder(state, event) {
  return recordEvent(state, event);
}

function rejectedAtomic(result, state, code) {
  assert.equal(result.kind, "rejected");
  assert.equal(result.code, code);
  assert.equal(result.state, state);
  assert.equal(result.appliedElapsedMs, 0);
  assert.equal(result.executedSteps, 0);
  assert.deepEqual(result.pendingProgression, []);
}

function resourceTick(config) {
  return (state, elapsedMs) => {
    const steps = elapsedMs / 1000;
    const threshold = compare(state.cells, bigNum(config.hallmarkThreshold, 0)) >= 0 ? 3 : 1;
    const multiplier = config.mutationMultiplier * threshold;
    const cells = add(state.cells, bigNum(config.producerBaseline * steps * multiplier, 0));
    const substrate = add(
      state.substrate,
      bigNum(config.substrateBaseline * steps + multiplier, 0),
    );
    const atp = add(state.atp, bigNum(config.atpBaseline * steps * multiplier * threshold, 0));
    return {
      resourceSnapshot: { cells, substrate, atp },
      stageEligibility: [],
      prestigeEligibility: [],
    };
  };
}

function longHorizonTick(config) {
  return (state, elapsedMs) => {
    const minutes = elapsedMs / OFFLINE_STEP_MS;
    const curvature = minutes * minutes * config.curvature;
    return {
      resourceSnapshot: {
        cells: add(state.cells, bigNum(config.cells * minutes + curvature, 0)),
        substrate: add(state.substrate, bigNum(config.substrate * minutes + curvature, 0)),
        atp: add(state.atp, bigNum(config.atp * minutes + curvature, 0)),
      },
      stageEligibility: [],
      prestigeEligibility: [],
    };
  };
}

function replayLivePartitions(state, durations, tick) {
  let working = state;
  for (const duration of durations) {
    const result = tick(working, duration, "live");
    working = { ...working, ...result.resourceSnapshot };
  }
  return working;
}

function assertWithinTwoPercent(actual, expected, label) {
  if (isZero(actual) || isZero(expected)) {
    assert.equal(isZero(actual), isZero(expected), label);
    return;
  }
  const difference = abs(subtract(actual, expected));
  const relative = divide(difference, max(abs(actual), abs(expected)));
  assert.ok(compare(relative, bigNum(2, -2)) <= 0, label);
}

test("offline replay is bounded, records once, preserves simulation time, and queues ordered identities", () => {
  const initial = { ...createInitialGameState(), activeTimeMs: 9 };
  let calls = 0;
  let events = 0;
  const result = replayOffline(
    initial,
    deriveOfflineElapsed(0, 61_000),
    (state, elapsedMs, mode) => {
      calls += 1;
      assert.equal(mode, "offline");
      return nonlinearTick(state, elapsedMs);
    },
    (state, event) => {
      events += 1;
      assert.equal(event.atMs, 9);
      assert.equal(event.elapsedMs, 61_000);
      return recordEvent(state, event);
    },
  );
  assert.equal(result.kind, "applied");
  assert.equal(calls, 2);
  assert.equal(events, 1);
  assert.equal(result.state.activeTimeMs, 9);
  assert.deepEqual(result.state.pendingProgression, [
    { kind: "stage", id: "microcolony", firstObservedAtActiveMs: 9 },
    { kind: "prestige", id: "L1", firstObservedAtActiveMs: 9 },
  ]);
  assert.equal(result.state.totalOfflineMs, 61_000);
  assert.equal(result.report.executedSteps, 2);
  for (const key of TRACKED_RESOURCE_KEYS)
    assert.ok(compare(result.report.resources[key].after, initial[key]) > 0);
});

test("clock skew and zero never call the adapter or recorder", () => {
  const state = createInitialGameState();
  for (const elapsed of [deriveOfflineElapsed(10, 9), deriveOfflineElapsed(10, 10)]) {
    const result = replayOffline(
      state,
      elapsed,
      () => assert.fail("tick must not run"),
      () => assert.fail("recorder must not run"),
    );
    assert.equal(result.kind, "applied");
    assert.equal(result.state, state);
    assert.equal(result.report.appliedElapsedMs, 0);
  }
  assert.deepEqual(deriveOfflineElapsed(-1, 1), { kind: "rejected", code: "invalid-saved-at" });
});

test("M6 economy adapter is replayed at each macro step and remainder, never by substitute math", () => {
  const initial = {
    ...createInitialGameState(),
    producerLevels: createInitialGameState().producerLevels.map((level, index) => ({
      ...level,
      level: index + 1,
    })),
  };
  const durations = [OFFLINE_STEP_MS, OFFLINE_STEP_MS, 12_345];
  let live = initial;
  for (const duration of durations)
    live = { ...live, ...economyTick(live, duration, "live").resourceSnapshot };
  const calls = [];
  const result = replayOffline(
    initial,
    deriveOfflineElapsed(
      0,
      durations.reduce((total, duration) => total + duration, 0),
    ),
    (state, elapsedMs, mode) => {
      calls.push({ elapsedMs, mode });
      return economyTick(state, elapsedMs, mode);
    },
    recordEvent,
  );
  assert.equal(result.kind, "applied");
  assert.deepEqual(calls, [
    { elapsedMs: OFFLINE_STEP_MS, mode: "offline" },
    { elapsedMs: OFFLINE_STEP_MS, mode: "offline" },
    { elapsedMs: 12_345, mode: "offline" },
  ]);
  for (const key of TRACKED_RESOURCE_KEYS) assert.deepEqual(result.state[key], live[key], key);
});

test("cap count and hostile snapshots are atomic", () => {
  const state = createInitialGameState();
  let calls = 0;
  const capped = replayOffline(
    state,
    deriveOfflineElapsed(0, OFFLINE_STEP_MS * (MAX_OFFLINE_STEPS + 1)),
    (working) => {
      calls += 1;
      return { resourceSnapshot: snapshot(working), stageEligibility: [], prestigeEligibility: [] };
    },
    recordEvent,
  );
  assert.equal(capped.kind, "applied");
  assert.equal(calls, MAX_OFFLINE_STEPS);
  let recordings = 0;
  const hostile = replayOffline(
    state,
    deriveOfflineElapsed(0, 1),
    () => ({
      resourceSnapshot: { ...snapshot(state), extra: bigNum(1, 0) },
      stageEligibility: [],
      prestigeEligibility: [],
    }),
    () => {
      recordings += 1;
      return state;
    },
  );
  assert.equal(hostile.kind, "rejected");
  assert.equal(hostile.code, "step-failed");
  assert.equal(hostile.state, state);
  assert.equal(recordings, 0);
});

test("reports all resources and zero deltas remain canonical", () => {
  const state = createInitialGameState();
  const result = replayOffline(state, deriveOfflineElapsed(0, 0), nonlinearTick, recordEvent);
  assert.equal(result.kind, "applied");
  assert.deepEqual(Object.keys(result.report.resources), TRACKED_RESOURCE_KEYS);
  for (const key of TRACKED_RESOURCE_KEYS) assert.ok(isZero(result.report.resources[key].delta));
  assert.throws(() => assertWithinTwoPercent(bigNum(0, 0), bigNum(1, 0), "zero left"));
  assert.throws(() => assertWithinTwoPercent(bigNum(1, 0), bigNum(0, 0), "zero right"));
});

test("fixed and irregular live partitions share one nonlinear formula with offline replay", () => {
  const affectedCells = [];
  for (const config of [
    {
      fixtureName: "cyclin_d_producer with KRAS mutation and proliferative-signaling hallmark",
      producerBaseline: 1,
      substrateBaseline: 2,
      atpBaseline: 3,
      mutationMultiplier: 1,
      hallmarkThreshold: 2,
    },
    {
      fixtureName: "cyclin_d_producer with MYC mutation and proliferative-signaling hallmark",
      producerBaseline: 1,
      substrateBaseline: 2,
      atpBaseline: 3,
      mutationMultiplier: 2,
      hallmarkThreshold: 2,
    },
  ]) {
    const initial = { ...createInitialGameState(), cells: bigNum(1, 0) };
    const tick = resourceTick(config);
    const fixed = [60_000, 60_000, 60_000];
    const irregular = [60_000, 60_000, 30_000];
    const liveFixed = replayLivePartitions(initial, fixed, tick);
    const liveIrregular = replayLivePartitions(initial, irregular, tick);
    const offlineFixed = replayOffline(
      initial,
      deriveOfflineElapsed(0, 180_000),
      tick,
      exactRecorder,
    );
    const offlineIrregular = replayOffline(
      initial,
      deriveOfflineElapsed(0, 150_000),
      tick,
      exactRecorder,
    );
    assert.equal(offlineFixed.kind, "applied");
    assert.equal(offlineIrregular.kind, "applied");
    affectedCells.push(offlineFixed.state.cells);
    for (const key of TRACKED_RESOURCE_KEYS) {
      assert.deepEqual(
        offlineFixed.state[key],
        liveFixed[key],
        `${config.producerBaseline}:${key}:fixed`,
      );
      assertWithinTwoPercent(
        offlineIrregular.state[key],
        liveIrregular[key],
        `${config.producerBaseline}:${key}`,
      );
    }
    const shortcut = {
      cells: add(initial.cells, bigNum(config.producerBaseline * 180, 0)),
      substrate: add(initial.substrate, bigNum(config.substrateBaseline * 180, 0)),
      atp: add(initial.atp, bigNum(config.atpBaseline * 180, 0)),
    };
    assert.notDeepEqual(
      offlineFixed.state.atp,
      shortcut.atp,
      "threshold formula defeats rate shortcut",
    );
    assert.throws(() =>
      assertWithinTwoPercent(
        offlineFixed.state.cells,
        shortcut.cells,
        `${config.fixtureName}: rate shortcut is outside tolerance`,
      ),
    );
  }
  assert.notDeepEqual(
    affectedCells[0],
    affectedCells[1],
    "changing the named selected mutation changes cells",
  );
});

test("three-hour offline replay remains exact for fixed partitions and within tolerance for irregular live partitions", () => {
  const initial = createInitialGameState();
  const tick = longHorizonTick({ cells: 4, substrate: 3, atp: 2, curvature: 0.001 });
  const fixed = Array(180).fill(OFFLINE_STEP_MS);
  const irregular = Array(120).fill(90_000);
  const fixedLive = replayLivePartitions(initial, fixed, tick);
  const irregularLive = replayLivePartitions(initial, irregular, tick);
  const offline = replayOffline(initial, deriveOfflineElapsed(0, 10_800_000), tick, exactRecorder);
  assert.equal(offline.kind, "applied");
  assert.equal(offline.report.executedSteps, 180);
  for (const key of TRACKED_RESOURCE_KEYS) {
    assert.deepEqual(offline.state[key], fixedLive[key], `${key}: fixed three-hour replay`);
    assertWithinTwoPercent(
      offline.state[key],
      irregularLive[key],
      `${key}: irregular three-hour replay`,
    );
  }
});

test("replay handles BigNum extremes and rejects a signed delta exponent overflow atomically", () => {
  const huge = { ...createInitialGameState(), cells: bigNum(9.999, 3000) };
  const result = replayOffline(
    huge,
    deriveOfflineElapsed(0, 60_000),
    (state) => ({
      resourceSnapshot: { ...snapshot(state), cells: add(state.cells, bigNum(1, 2999)) },
      stageEligibility: [],
      prestigeEligibility: [],
    }),
    exactRecorder,
  );
  assert.equal(result.kind, "applied");
  assert.ok(compare(result.state.cells, huge.cells) > 0);
  const nearBoundary = {
    ...createInitialGameState(),
    cells: bigNum(-9.999, Number.MAX_SAFE_INTEGER),
  };
  const failure = replayOffline(
    nearBoundary,
    deriveOfflineElapsed(0, 1),
    (state) => ({
      resourceSnapshot: { ...snapshot(state), cells: bigNum(9.999, Number.MAX_SAFE_INTEGER) },
      stageEligibility: [],
      prestigeEligibility: [],
    }),
    exactRecorder,
  );
  rejectedAtomic(failure, nearBoundary, "delta-failed");
});

test("zero and small-positive BigNum resources survive end-to-end replay", () => {
  const zero = createInitialGameState();
  const noGain = replayOffline(
    zero,
    deriveOfflineElapsed(0, 1),
    (state) => ({
      resourceSnapshot: snapshot(state),
      stageEligibility: [],
      prestigeEligibility: [],
    }),
    exactRecorder,
  );
  assert.equal(noGain.kind, "applied");
  for (const key of TRACKED_RESOURCE_KEYS) assert.ok(isZero(noGain.report.resources[key].delta));
  const tiny = {
    ...zero,
    cells: bigNum(1, -300),
    substrate: bigNum(1, -300),
    atp: bigNum(1, -300),
  };
  const smallGain = replayOffline(
    tiny,
    deriveOfflineElapsed(0, 1),
    (state) => ({
      resourceSnapshot: {
        cells: add(state.cells, bigNum(1, -300)),
        substrate: add(state.substrate, bigNum(1, -300)),
        atp: add(state.atp, bigNum(1, -300)),
      },
      stageEligibility: [],
      prestigeEligibility: [],
    }),
    exactRecorder,
  );
  assert.equal(smallGain.kind, "applied");
  for (const key of TRACKED_RESOURCE_KEYS)
    assert.ok(compare(smallGain.report.resources[key].delta, bigNum(0, 0)) > 0, key);
});

test("untrusted tick and recorder callbacks cannot mutate rejected input or successful output", () => {
  const harmlessTick = (state) => ({
    resourceSnapshot: snapshot(state),
    stageEligibility: [],
    prestigeEligibility: [],
  });
  for (const attack of [
    (callbackState) => {
      callbackState.cells = bigNum(7, 0);
      callbackState.pendingProgression.push({
        kind: "stage",
        id: "microcolony",
        firstObservedAtActiveMs: 0,
      });
      callbackState.eventSequence = 77;
      throw new Error("tick attack");
    },
  ]) {
    const original = createInitialGameState();
    const before = structuredClone(original);
    let recorderCalls = 0;
    const result = replayOffline(original, deriveOfflineElapsed(0, 1), attack, () => {
      recorderCalls += 1;
      return original;
    });
    rejectedAtomic(result, original, "step-failed");
    assert.deepEqual(original, before);
    assert.equal(recorderCalls, 0);
  }
  for (const recorder of [
    (callbackState) => {
      callbackState.cells = bigNum(9, 0);
      callbackState.pendingProgression.push({
        kind: "stage",
        id: "microcolony",
        firstObservedAtActiveMs: 0,
      });
      callbackState.eventSequence = 99;
      throw new Error("recorder attack");
    },
    (callbackState) => {
      callbackState.cells = bigNum(10, 0);
      callbackState.pendingProgression.push({
        kind: "prestige",
        id: "L1",
        firstObservedAtActiveMs: 0,
      });
      callbackState.eventSequence = 100;
      return callbackState;
    },
  ]) {
    const original = createInitialGameState();
    const before = structuredClone(original);
    const result = replayOffline(original, deriveOfflineElapsed(0, 1), harmlessTick, recorder);
    rejectedAtomic(result, original, "accounting-failed");
    assert.deepEqual(original, before);
  }
  const original = createInitialGameState();
  let leakedRecorderResult;
  const success = replayOffline(
    original,
    deriveOfflineElapsed(0, 1),
    harmlessTick,
    (callbackState, event) => {
      leakedRecorderResult = recordEvent(callbackState, event);
      return leakedRecorderResult;
    },
  );
  assert.equal(success.kind, "applied");
  leakedRecorderResult.cells = bigNum(99, 0);
  assert.deepEqual(success.state.cells, original.cells);
  assert.deepEqual(success.report.pendingProgression, success.state.pendingProgression);
});

test("recorder accounting is authoritative and invalid adapter boundaries remain atomic", () => {
  const state = createInitialGameState();
  const tick = (working) => ({
    resourceSnapshot: { ...snapshot(working), cells: add(working.cells, bigNum(2, 0)) },
    stageEligibility: [],
    prestigeEligibility: [],
  });
  for (const recorder of [
    () => state,
    (before) => ({ ...before, totalOfflineMs: 1000 }),
    (before) => ({ ...before, eventSequence: before.eventSequence + 1, cells: bigNum(3, 0) }),
    (before, event) => ({
      ...recordEvent(before, event),
      pendingProgression: [{ kind: "stage", id: "microcolony", firstObservedAtActiveMs: 0 }],
    }),
    (before, event) => ({ ...recordEvent(before, event), eventSequence: before.eventSequence + 2 }),
    () => {
      throw new Error("write failed");
    },
  ]) {
    const result = replayOffline(state, deriveOfflineElapsed(0, 1), tick, recorder);
    rejectedAtomic(result, state, "accounting-failed");
  }
  const honest = replayOffline(state, deriveOfflineElapsed(0, 1), tick, exactRecorder);
  assert.equal(honest.kind, "applied");
  assert.deepEqual(honest.report.resources.cells.after, honest.state.cells);
  const accessorSnapshot = {};
  Object.defineProperty(accessorSnapshot, "cells", { enumerable: true, get: () => state.cells });
  Object.assign(accessorSnapshot, { substrate: state.substrate, atp: state.atp });
  const hostileCases = [
    () => null,
    () => ({ resourceSnapshot: snapshot(state), stageEligibility: [], prestigeEligibility: null }),
    () => ({ resourceSnapshot: accessorSnapshot, stageEligibility: [], prestigeEligibility: [] }),
    () => ({
      resourceSnapshot: { cells: state.cells, substrate: state.substrate },
      stageEligibility: [],
      prestigeEligibility: [],
    }),
    () => ({
      resourceSnapshot: snapshot(state),
      stageEligibility: [{ kind: "stage", id: "missing" }],
      prestigeEligibility: [],
    }),
    () => ({
      resourceSnapshot: snapshot(state),
      stageEligibility: [{ kind: "unexpected", id: "microcolony" }],
      prestigeEligibility: [],
    }),
    () => ({
      resourceSnapshot: snapshot(state),
      stageEligibility: Array(257).fill({ kind: "stage", id: "microcolony" }),
      prestigeEligibility: [],
    }),
    () => ({
      resourceSnapshot: snapshot(state),
      stageEligibility: Array(128).fill({ kind: "stage", id: "microcolony" }),
      prestigeEligibility: Array(129).fill({ kind: "prestige", id: "L1" }),
    }),
  ];
  for (const hostileTick of hostileCases) {
    let calls = 0;
    const failure = replayOffline(state, deriveOfflineElapsed(0, 1), hostileTick, () => {
      calls += 1;
      return state;
    });
    rejectedAtomic(failure, state, "step-failed");
    assert.equal(calls, 0);
  }
  const sparse = [];
  sparse.length = 1;
  let sparseRecorderCalls = 0;
  const sparseFailure = replayOffline(
    state,
    deriveOfflineElapsed(0, 1),
    () => ({
      resourceSnapshot: snapshot(state),
      stageEligibility: sparse,
      prestigeEligibility: [],
    }),
    () => {
      sparseRecorderCalls += 1;
      return state;
    },
  );
  rejectedAtomic(sparseFailure, state, "step-failed");
  assert.equal(sparseRecorderCalls, 0);
  let invalidClockRecorderCalls = 0;
  const unsafeElapsed = replayOffline(
    state,
    { kind: "ready", requestedElapsedMs: Number.MAX_SAFE_INTEGER + 1 },
    nonlinearTick,
    () => {
      invalidClockRecorderCalls += 1;
      return state;
    },
  );
  rejectedAtomic(unsafeElapsed, state, "invalid-now-at");
  const unsafeTotal = { ...state, totalOfflineMs: Number.MAX_SAFE_INTEGER };
  const totalOverflow = replayOffline(
    unsafeTotal,
    deriveOfflineElapsed(0, 1),
    nonlinearTick,
    () => {
      invalidClockRecorderCalls += 1;
      return unsafeTotal;
    },
  );
  rejectedAtomic(totalOverflow, unsafeTotal, "unsafe-total-offline");
  assert.equal(invalidClockRecorderCalls, 0);
  const almostFull = {
    ...state,
    pendingProgression: Array.from({ length: 255 }, (_, index) => ({
      kind: "stage",
      id: index % 2 === 0 ? "microcolony" : "avascular_lesion",
      firstObservedAtActiveMs: 0,
    })),
  };
  const nearFullDuplicates = replayOffline(
    almostFull,
    deriveOfflineElapsed(0, 1),
    () => ({
      resourceSnapshot: snapshot(almostFull),
      stageEligibility: [{ kind: "stage", id: "microcolony" }],
      prestigeEligibility: [{ kind: "prestige", id: "L1" }],
    }),
    exactRecorder,
  );
  assert.equal(nearFullDuplicates.kind, "applied");
  assert.equal(nearFullDuplicates.state.pendingProgression.length, 256);
  const boundary = replayOffline(
    state,
    deriveOfflineElapsed(0, 1),
    () => ({
      resourceSnapshot: snapshot(state),
      stageEligibility: Array(256).fill({ kind: "stage", id: "microcolony" }),
      prestigeEligibility: [],
    }),
    exactRecorder,
  );
  assert.equal(boundary.kind, "applied");
  let stepCalls = 0;
  const laterThrow = replayOffline(
    state,
    deriveOfflineElapsed(0, 120_000),
    (working) => {
      stepCalls += 1;
      if (stepCalls === 2) throw new Error("second macro step failed");
      return { resourceSnapshot: snapshot(working), stageEligibility: [], prestigeEligibility: [] };
    },
    exactRecorder,
  );
  rejectedAtomic(laterThrow, state, "step-failed");
  for (const [elapsed, code] of [
    [{ kind: "ready", requestedElapsedMs: -1 }, "invalid-now-at"],
    [deriveOfflineElapsed(0, 1), "invalid-active-time"],
  ]) {
    const candidate = code === "invalid-active-time" ? { ...state, activeTimeMs: -1 } : state;
    const failure = replayOffline(candidate, elapsed, nonlinearTick, exactRecorder);
    rejectedAtomic(failure, candidate, code);
  }
});

test("queue capacity, remainder, cap, frozen fields, and durable order are exact", () => {
  const initial = {
    ...createInitialGameState(),
    activeTimeMs: 41,
    programs: { ...createInitialGameState().programs, cooldownDeadlineMs: 900 },
    microbiome: { ...createInitialGameState().microbiome, rotationDeadlineMs: 901 },
  };
  const durations = [];
  let events = 0;
  const result = replayOffline(
    initial,
    deriveOfflineElapsed(0, 61_000),
    (state, elapsedMs) => {
      durations.push(elapsedMs);
      const stageEligibility =
        durations.length === 1
          ? [{ kind: "stage", id: "microcolony" }]
          : [{ kind: "stage", id: "avascular_lesion" }];
      return {
        resourceSnapshot: { ...snapshot(state), cells: add(state.cells, bigNum(1, 0)) },
        stageEligibility,
        prestigeEligibility: [{ kind: "prestige", id: "L1" }],
      };
    },
    (state, event) => {
      events += 1;
      return exactRecorder(state, event);
    },
  );
  assert.equal(result.kind, "applied");
  assert.deepEqual(durations, [60_000, 1000]);
  assert.equal(events, 1);
  assert.equal(result.state.activeTimeMs, initial.activeTimeMs);
  assert.deepEqual(result.state.programs, initial.programs);
  assert.deepEqual(result.state.microbiome, initial.microbiome);
  assert.deepEqual(result.state.pendingProgression, [
    { kind: "stage", id: "microcolony", firstObservedAtActiveMs: 41 },
    { kind: "prestige", id: "L1", firstObservedAtActiveMs: 41 },
    { kind: "stage", id: "avascular_lesion", firstObservedAtActiveMs: 41 },
  ]);
  const saved = serializeGameState(result.state, 99);
  const loaded = parseSave(saved);
  assert.equal(loaded.status, "loaded");
  assert.deepEqual(loaded.state.pendingProgression, result.state.pendingProgression);
  assert.equal(serializeGameState(loaded.state, loaded.savedAtMs), saved);

  let capCalls = 0;
  let capEvents = 0;
  const capped = replayOffline(
    initial,
    deriveOfflineElapsed(0, OFFLINE_STEP_MS * (MAX_OFFLINE_STEPS + 1) + 1000),
    (state, elapsedMs) => {
      capCalls += 1;
      assert.equal(elapsedMs, OFFLINE_STEP_MS);
      return { resourceSnapshot: snapshot(state), stageEligibility: [], prestigeEligibility: [] };
    },
    (state, event) => {
      capEvents += 1;
      return exactRecorder(state, event);
    },
  );
  assert.equal(capped.kind, "applied");
  assert.equal(capCalls, MAX_OFFLINE_STEPS);
  assert.equal(capEvents, 1);
  assert.equal(capped.report.appliedElapsedMs, OFFLINE_STEP_MS * MAX_OFFLINE_STEPS);
  assert.equal(capped.report.executedSteps, MAX_OFFLINE_STEPS);
  assert.deepEqual(capped.report.notices, [
    {
      code: "offline-cap",
      requestedElapsedMs: OFFLINE_STEP_MS * (MAX_OFFLINE_STEPS + 1) + 1000,
      appliedElapsedMs: OFFLINE_STEP_MS * MAX_OFFLINE_STEPS,
    },
  ]);
});

test("renderer is text-only and reports resources, cap, skew, and pending decisions", () => {
  const created = [];
  function element(tag) {
    const node = {
      tag,
      children: [],
      attributes: {},
      textContent: "",
      setAttribute(key, value) {
        this.attributes[key] = value;
      },
      append(...children) {
        this.children.push(...children);
      },
    };
    Object.defineProperty(node, "innerHTML", {
      get: () => {
        throw new Error("innerHTML forbidden");
      },
      set: () => {
        throw new Error("innerHTML forbidden");
      },
    });
    return node;
  }
  const document = {
    createElement(tag) {
      const node = element(tag);
      created.push(node);
      return node;
    },
  };
  const base = replayOffline(
    createInitialGameState(),
    deriveOfflineElapsed(10, 9),
    nonlinearTick,
    exactRecorder,
  );
  assert.equal(base.kind, "applied");
  const report = Object.freeze({
    ...base.report,
    capped: true,
    notices: [
      { code: "clock-skew", savedAtMs: 10, nowMs: 9 },
      { code: "offline-cap", requestedElapsedMs: 100, appliedElapsedMs: 60 },
    ],
    pendingProgression: [{ kind: "stage", id: "microcolony", firstObservedAtActiveMs: 4 }],
  });
  assert.doesNotThrow(() => renderOfflineReport(report, document));
  const text = created.map((node) => node.textContent).join(" ");
  for (const key of TRACKED_RESOURCE_KEYS) assert.match(text, new RegExp(key));
  assert.match(text, /clock skew/i);
  assert.match(text, /cap/i);
  assert.match(text, /microcolony/);
});
