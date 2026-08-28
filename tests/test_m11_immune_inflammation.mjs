import assert from "node:assert/strict";
import test from "node:test";
import { hallmarkId, regionId, stageId } from "../src/brands.ts";
import {
  applyImmuneVisibility,
  CONCEALMENT_TOKEN_COST,
  MAX_CONCEALMENT_TOKENS,
} from "../src/hallmarks/handlers/immune_visibility.ts";
import {
  applyInflammation,
  inflammationEpisodeId,
} from "../src/hallmarks/handlers/inflammation.ts";
import {
  applyM11InflammationTimeline,
  INFLAMMATION_DURATION_MS,
  MASKED_REGION_EFFICIENCY_MULTIPLIER,
  projectM11InflammationTimeline,
  regionalVisibilityEfficiency,
} from "../src/hallmarks/m11_timeline.ts";
import { createInitialGameState } from "../src/state/game_state.ts";

function region(name, { linked = true } = {}) {
  return {
    id: regionId(name),
    capacity: 3,
    viability: 1,
    phenotype: "proliferative",
    vesselLinkIds: linked ? ["vessel:fixture"] : [],
    routeIds: [],
  };
}

function state(overrides = {}) {
  const base = createInitialGameState();
  return {
    ...base,
    currentStage: stageId("angiogenic_primary"),
    activeTimeMs: 100,
    deterministicSeed: 19,
    eventSequence: 7,
    hallmarkLevels: [
      { id: hallmarkId("immune_destruction_avoidance"), level: 1 },
      { id: hallmarkId("tumor_promoting_inflammation"), level: 1 },
    ],
    concealmentTokens: 2,
    regions: [region("one"), region("two")],
    ...overrides,
  };
}

function maskOperation(regionIdValue, masked) {
  return {
    type: "set-region-mask",
    hallmark: "immune_destruction_avoidance",
    regionId: regionIdValue,
    masked,
  };
}

function inflammationOperation(regionIdValue) {
  return {
    type: "activate-inflammation",
    hallmark: "tumor_promoting_inflammation",
    regionId: regionIdValue,
  };
}

test("M11 masking is token-conserving, local, and exposes a real efficiency tradeoff", () => {
  const before = state();
  const after = applyImmuneVisibility({
    state: before,
    operation: maskOperation(regionId("one"), true),
    appliedAtMs: before.activeTimeMs,
  });
  assert.equal(after.concealmentTokens, before.concealmentTokens - CONCEALMENT_TOKEN_COST);
  assert.deepEqual(after.maskedRegions, [regionId("one")]);
  assert.equal(after.immuneVisibilityByRegion.one, 0);
  assert.equal(
    regionalVisibilityEfficiency(after, regionId("one")),
    MASKED_REGION_EFFICIENCY_MULTIPLIER,
  );
  assert.equal(regionalVisibilityEfficiency(after, regionId("two")), 1);
  assert.deepEqual(after.regions, before.regions);
  const restored = applyImmuneVisibility({
    state: after,
    operation: maskOperation(regionId("one"), false),
    appliedAtMs: after.activeTimeMs,
  });
  assert.equal(restored.concealmentTokens, before.concealmentTokens);
  assert.deepEqual(restored.maskedRegions, []);
  assert.deepEqual(restored.immuneVisibilityByRegion, {});
  assert.equal(restored.eventSequence, before.eventSequence);
});

test("M11 visibility rejects repeated, stale, unsafe, and insufficient-token decisions atomically", () => {
  const masked = applyImmuneVisibility({
    state: state(),
    operation: maskOperation(regionId("one"), true),
    appliedAtMs: 100,
  });
  const cases = [
    [masked, maskOperation(regionId("one"), true), 100],
    [state(), maskOperation(regionId("one"), true), 99],
    [state({ concealmentTokens: 0 }), maskOperation(regionId("one"), true), 100],
    [
      state({
        concealmentTokens: MAX_CONCEALMENT_TOKENS,
        maskedRegions: [regionId("one")],
        immuneVisibilityByRegion: { one: 0 },
      }),
      maskOperation(regionId("one"), false),
      100,
    ],
  ];
  for (const [input, operation, appliedAtMs] of cases) {
    const before = structuredClone(input);
    assert.throws(() => applyImmuneVisibility({ state: input, operation, appliedAtMs }));
    assert.deepEqual(input, before);
  }
});

test("M11 inflammation has deterministic identity, changes opportunity and pressure, and isolates regions", () => {
  const before = state();
  const after = applyInflammation({
    state: before,
    operation: inflammationOperation(regionId("one")),
    appliedAtMs: before.activeTimeMs,
  });
  const episode = after.inflammationEpisodes[0];
  assert.ok(episode);
  assert.equal(episode.id, inflammationEpisodeId(before, regionId("one")));
  assert.equal(episode.deadlineMs, before.activeTimeMs + INFLAMMATION_DURATION_MS);
  const timeline = projectM11InflammationTimeline(after, 0);
  assert.equal(timeline.modifiers.routeDiscoveryOpportunity, 1);
  assert.equal(timeline.modifiers.damagePressure, 1);
  assert.equal(timeline.modifiers.immunePressure, 1);
  assert.equal(timeline.modifiers.byRegion.one?.substrateAccessMultiplier, 1.2);
  assert.equal(timeline.modifiers.byRegion.two, undefined);
  assert.equal(after.eventSequence, before.eventSequence);
  const duplicateBefore = structuredClone(after);
  assert.throws(() =>
    applyInflammation({
      state: after,
      operation: inflammationOperation(regionId("one")),
      appliedAtMs: 100,
    }),
  );
  assert.deepEqual(after, duplicateBefore);
});

test("M11 inflammation timeline expires first and is segmentation invariant without input mutation", () => {
  const activated = applyInflammation({
    state: state(),
    operation: inflammationOperation(regionId("one")),
    appliedAtMs: 100,
  });
  const snapshot = structuredClone(activated);
  const partial = applyM11InflammationTimeline(activated, INFLAMMATION_DURATION_MS - 1);
  const afterFirstTick = {
    ...partial,
    activeTimeMs: partial.activeTimeMs + INFLAMMATION_DURATION_MS - 1,
  };
  const chunked = applyM11InflammationTimeline(afterFirstTick, 1);
  const direct = applyM11InflammationTimeline(activated, INFLAMMATION_DURATION_MS);
  assert.deepEqual(chunked.inflammationEpisodes, direct.inflammationEpisodes);
  assert.deepEqual(chunked.regionalInflammation, direct.regionalInflammation);
  assert.deepEqual(direct.inflammationEpisodes, []);
  assert.deepEqual(direct.regionalInflammation, {});
  assert.deepEqual(activated, snapshot);
});

test("M11 inflammation rejects masked, unperfused, expired, and malformed targets atomically", () => {
  const masked = state({ maskedRegions: [regionId("one")], immuneVisibilityByRegion: { one: 0 } });
  const unperfused = state({ regions: [region("one", { linked: false }), region("two")] });
  const expired = state({
    inflammationEpisodes: [{ id: "expired", regionId: regionId("two"), deadlineMs: 100 }],
    regionalInflammation: { two: 1 },
  });
  for (const input of [masked, unperfused, expired]) {
    const before = structuredClone(input);
    assert.throws(() =>
      applyInflammation({
        state: input,
        operation: inflammationOperation(regionId("one")),
        appliedAtMs: 100,
      }),
    );
    assert.deepEqual(input, before);
  }
});
