import assert from "node:assert/strict";
import test from "node:test";
import { eventId, hallmarkId, regionId, stageId } from "../src/brands.ts";
import {
  applyReplicativeBudget,
  effectiveTelomereReserve,
  hasDivisionLimitWarning,
  REPLICATIVE_BUDGET_EFFECT,
  REPLICATIVE_BUDGET_HANDLER,
} from "../src/hallmarks/handlers/replicative_budget.ts";
import { emptyLateHallmarksState } from "../src/hallmarks/late_hallmark_types.ts";
import { createInitialGameState } from "../src/state/game_state.ts";
import { parseSave, serializeGameState } from "../src/state/save_load.ts";

function warnedRegion(name, reserve = 0) {
  return {
    id: regionId(name),
    capacity: 4,
    viability: 1,
    phenotype: "proliferative",
    vesselLinkIds: [],
    routeIds: [],
    reserve,
  };
}

function eligibleState({ charges = 3, floor = 0, regions = [warnedRegion("a")] } = {}) {
  const initial = createInitialGameState();
  return {
    ...initial,
    currentStage: stageId("hypoxic_lesion"),
    activeTimeMs: 40,
    telomeraseCharges: charges,
    reserveFloor: floor,
    hallmarkLevels: [{ id: hallmarkId("replicative_immortality"), level: 1 }],
    regions: regions.map(({ reserve: _reserve, ...region }) => region),
    telomereReserveByRegion: Object.fromEntries(
      regions.map((region) => [region.id, region.reserve]),
    ),
  };
}

function refill(regionIdValue = regionId("a"), charges = 1) {
  return {
    type: "spend-telomerase",
    hallmark: "replicative_immortality",
    target: "refill-region",
    regionId: regionIdValue,
    charges,
  };
}

function bank(charges = 1) {
  return {
    type: "spend-telomerase",
    hallmark: "replicative_immortality",
    target: "bank-reserve-floor",
    charges,
  };
}

function rejectsAtomically(state, operation, message, appliedAtMs = state.activeTimeMs) {
  const before = structuredClone(state);
  assert.throws(() => applyReplicativeBudget(state, operation, appliedAtMs), message);
  assert.strictEqual(state, state, "handler must not replace rejected input state");
  assert.deepEqual(state, before, "rejected operation must not mutate durable state");
}

test("core-six replicative budget offers mutually distinct local rescue and one host-run reserve bank", () => {
  const state = eligibleState({ charges: 3 });
  const rescued = applyReplicativeBudget(state, refill(regionId("a"), 2), 40);
  assert.equal(rescued.telomeraseCharges, 1);
  assert.equal(rescued.telomereReserveByRegion.a, 4);
  assert.equal(rescued.reserveFloor, 0);
  assert.equal(rescued.eventSequence, state.eventSequence, "handler does not own event recording");

  const banked = applyReplicativeBudget(state, bank(3), 40);
  assert.equal(banked.telomeraseCharges, 0);
  assert.equal(banked.reserveFloor, 3);
  assert.deepEqual(banked.telomereReserveByRegion, state.telomereReserveByRegion);
  assert.equal(banked.eventSequence, state.eventSequence, "handler does not own event recording");
  assert.equal(REPLICATIVE_BUDGET_HANDLER.hallmark, "replicative_immortality");
  assert.equal(REPLICATIVE_BUDGET_EFFECT.hallmarkId, hallmarkId("replicative_immortality"));
});

test("core-six refill has a bounded deterministic effect and resolves the selected warning", () => {
  const state = eligibleState({ charges: 1 });
  const next = applyReplicativeBudget(state, refill(), 40);
  assert.equal(next.telomereReserveByRegion.a, 2);
  assert.equal(next.telomeraseCharges, 0);
  rejectsAtomically(next, refill(), /insufficient/);
});

test("core-six replicative handler rejects hostile, stale, locked, spent, unknown, and insufficient inputs atomically", () => {
  const base = eligibleState();
  const hostileOperations = [
    [refill(regionId("missing")), /unavailable/],
    [{ ...refill(), charges: 0 }, /charges/],
    [{ ...refill(), charges: -1 }, /charges/],
    [{ ...refill(), charges: 1.5 }, /charges/],
    [{ ...refill(), charges: Number.NaN }, /charges/],
    [{ ...refill(), charges: Number.MAX_SAFE_INTEGER }, /charges/],
    [{ ...refill(), target: "unknown" }, /target/],
    [{ ...refill(), hallmark: "angiogenesis" }, /invalid/],
    [{ ...refill(), type: "unknown" }, /invalid/],
  ];
  for (const [operation, message] of hostileOperations) {
    rejectsAtomically(structuredClone(base), operation, message);
  }

  rejectsAtomically(eligibleState({ charges: 0 }), refill(), /insufficient/);
  rejectsAtomically(
    { ...eligibleState(), currentStage: stageId("avascular_lesion") },
    refill(),
    /locked/,
  );
  rejectsAtomically({ ...eligibleState(), hallmarkLevels: [] }, refill(), /not owned/);
  rejectsAtomically(eligibleState(), refill(), /stale/, 41);

  const spentBank = applyReplicativeBudget(eligibleState(), bank(), 40);
  rejectsAtomically(spentBank, bank(), /already banked/);
});

test("core-six warnings require a viable region and banking consumes one strategic opportunity", () => {
  const noWarning = eligibleState({ regions: [warnedRegion("a", 2)] });
  rejectsAtomically(noWarning, refill(), /unavailable/);
  rejectsAtomically(noWarning, bank(), /requires a division-limit warning/);

  const senescent = eligibleState();
  senescent.lateHallmarks = {
    ...emptyLateHallmarksState(),
    senescence: {
      pendingDecisions: [],
      retainedRegions: [
        {
          decisionId: eventId("senescence:a"),
          regionId: regionId("a"),
          cause: "replicative-limit",
          createdAtMs: 40,
          retainedAtMs: 40,
        },
      ],
    },
  };
  rejectsAtomically(senescent, refill(), /unavailable/);

  const multiRegion = eligibleState({
    charges: 3,
    regions: [warnedRegion("front", 0), warnedRegion("future", 0)],
  });
  const local = applyReplicativeBudget(multiRegion, refill(regionId("front"), 1), 40);
  const durable = applyReplicativeBudget(multiRegion, bank(1), 40);
  assert.equal(local.telomereReserveByRegion.front, 2);
  assert.equal(local.telomereReserveByRegion.future, 0);
  assert.equal(durable.reserveFloor, 1);
  assert.equal(durable.telomereReserveByRegion.front, 0);
});

test("core-six banking inverts exhausted-warning semantics without changing the saved state shape", () => {
  const state = eligibleState({ charges: 2, regions: [warnedRegion("a", 0)] });
  assert.equal(hasDivisionLimitWarning(state, state.regions[0]), true);
  assert.equal(effectiveTelomereReserve(state, "a"), 0);

  const banked = applyReplicativeBudget(state, bank(1), 40);
  assert.equal(banked.telomeraseCharges, 1, "bank debits exactly once");
  assert.equal(banked.reserveFloor, 1);
  assert.equal(banked.telomereReserveByRegion.a, 0, "bank preserves stored regional reserve");
  assert.equal(hasDivisionLimitWarning(banked, banked.regions[0]), false);
  assert.equal(effectiveTelomereReserve(banked, "a"), 1, "elapsed consumption clamps here");
  assert.equal(banked.eventSequence, state.eventSequence, "handler does not record a replay event");

  const roundTrip = parseSave(serializeGameState(banked, 100));
  assert.equal(roundTrip.status, "loaded");
  assert.equal(roundTrip.state.reserveFloor, 1);
  assert.deepEqual(roundTrip.state.telomereReserveByRegion, { a: 0 });
  assert.equal(effectiveTelomereReserve(roundTrip.state, "a"), 1);

  rejectsAtomically(banked, bank(), /already banked/);
  assert.equal(banked.telomeraseCharges, 1, "replayed bank cannot debit a second time");
});
