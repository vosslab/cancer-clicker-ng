import assert from "node:assert/strict";
import test from "node:test";

import { hallmarkId, regionId, stageId } from "../src/brands.ts";
import {
  lateHallmarkPressure,
  lateHallmarkProductionMultiplier,
} from "../src/hallmarks/late_hallmark_effects.ts";
import { createInitialGameState } from "../src/state/game_state.ts";
import { recordEvent } from "../src/state/events.ts";
import { advanceLiveTick } from "../src/economy/tick.ts";

const REGION = regionId("replicative-senescence");

function eligibleState() {
  const state = createInitialGameState();
  return {
    ...state,
    deterministicSeed: 17,
    activeTimeMs: 40,
    currentStage: stageId("immortalized_culture"),
    hallmarkLevels: [
      { id: hallmarkId("replicative_immortality"), level: 1 },
      { id: hallmarkId("senescent_cells"), level: 1 },
    ],
    regions: [
      {
        id: REGION,
        capacity: 3,
        viability: 1,
        phenotype: "proliferative",
        vesselLinkIds: [],
        routeIds: [],
      },
    ],
    telomereReserveByRegion: { [REGION]: 1 },
  };
}

function factoryPath() {
  const before = eligibleState();
  const after = recordEvent(before, { type: "click-divide", atMs: before.activeTimeMs });
  const decision = after.lateHallmarks.senescence.pendingDecisions[0];
  assert.ok(decision);
  return { before, after, decision };
}

test("a real final division creates a deterministic pending senescence decision that keep retains", () => {
  const { before, after, decision } = factoryPath();
  assert.equal(after.eventSequence, before.eventSequence + 1);
  assert.equal(decision.cause, "replicative-limit");
  assert.equal(decision.regionId, REGION);
  assert.equal(decision.createdAtMs, before.activeTimeMs);
  assert.equal(
    decision.id,
    `senescence:replicative-limit:17:${before.eventSequence}:${before.activeTimeMs}:${REGION}`,
  );
  const kept = recordEvent(after, {
    type: "resolve-senescence-decision",
    decisionId: decision.id,
    action: "keep",
    atMs: after.activeTimeMs,
  });
  assert.equal(kept.eventSequence, after.eventSequence + 1);
  assert.equal(kept.lateHallmarks.senescence.pendingDecisions.length, 0);
  assert.equal(kept.lateHallmarks.senescence.retainedRegions[0]?.decisionId, decision.id);
  assert.equal(lateHallmarkProductionMultiplier(kept), 0);
  assert.equal(lateHallmarkPressure(kept) > 0, true);
});

test("clear consumes a real factory row through complete region projection and stale resolution is atomic", () => {
  const { after, decision } = factoryPath();
  const cleared = recordEvent(after, {
    type: "resolve-senescence-decision",
    decisionId: decision.id,
    action: "clear",
    atMs: after.activeTimeMs,
  });
  assert.equal(cleared.regions.length, 0);
  assert.equal(cleared.telomereReserveByRegion[REGION], undefined);
  assert.equal(cleared.lateHallmarks.senescence.pendingDecisions.length, 0);
  assert.equal(cleared.lateHallmarks.senescence.retainedRegions.length, 0);
  const snapshot = structuredClone(cleared);
  assert.throws(
    () =>
      recordEvent(cleared, {
        type: "resolve-senescence-decision",
        decisionId: decision.id,
        action: "keep",
        atMs: cleared.activeTimeMs,
      }),
    /unavailable/,
  );
  assert.deepEqual(cleared, snapshot);
});

test("pending and retained senescence relations atomically exclude phenotype reassignment", () => {
  const { after, decision } = factoryPath();
  for (const state of [
    after,
    recordEvent(after, {
      type: "resolve-senescence-decision",
      decisionId: decision.id,
      action: "keep",
      atMs: after.activeTimeMs,
    }),
  ]) {
    const snapshot = structuredClone(state);
    assert.throws(
      () =>
        recordEvent(state, {
          type: "assign-region-phenotype",
          regionId: REGION,
          phenotype: "migratory",
          atMs: state.activeTimeMs,
        }),
      /unavailable/,
    );
    assert.deepEqual(state, snapshot);
  }
});

test("the shared elapsed boundary creates the same pending decision at its simulation time", () => {
  const game = eligibleState();
  const advanced = advanceLiveTick(
    { game, lastTickAtMs: 0, pendingOfflineMs: 0, saveStatus: "idle" },
    1_000,
  ).game;
  const decision = advanced.lateHallmarks.senescence.pendingDecisions[0];
  assert.ok(decision);
  assert.equal(decision.createdAtMs, 1_000);
  assert.equal(decision.id, `senescence:replicative-limit:17:0:1000:${REGION}`);
  assert.equal(advanced.eventSequence, 0);
});

test("a shared elapsed projection retains its senescence decision while the microbiome offer rotates", () => {
  const game = {
    ...eligibleState(),
    currentStage: stageId("global_lab_contamination"),
    hallmarkLevels: [
      { id: hallmarkId("replicative_immortality"), level: 1 },
      { id: hallmarkId("senescent_cells"), level: 1 },
      { id: hallmarkId("polymorphic_microbiomes"), level: 1 },
    ],
  };
  const advanced = advanceLiveTick(
    { game, lastTickAtMs: 0, pendingOfflineMs: 0, saveStatus: "idle" },
    1_000,
  ).game;
  assert.equal(advanced.lateHallmarks.senescence.pendingDecisions.length, 1);
  assert.ok(advanced.lateHallmarks.microbiome.pendingOffer);
});
