import assert from "node:assert/strict";
import test from "node:test";
import { eventId, hallmarkId, regionId, stageId, bigNum } from "../src/brands.ts";
import { equals } from "../src/bignum/bignum.ts";
import { advanceLiveTick, economyTick } from "../src/economy/tick.ts";
import { replayEconomyOffline } from "../src/economy/offline.ts";
import {
  manualDivisionAllowed,
  projectElapsedHallmarkEffects,
  projectManualDivisionHallmarkEffects,
  replicativeCapacityExhausted,
} from "../src/hallmarks/elapsed_effects.ts";
import { createInitialGameState } from "../src/state/game_state.ts";
import { recordEvent } from "../src/state/events.ts";

function elapsedFixture(overrides = {}) {
  const state = createInitialGameState();
  const region = {
    id: regionId("elapsed-rim"),
    capacity: 5,
    viability: 1,
    phenotype: "proliferative",
    vesselLinkIds: [eventId("vessel:elapsed-rim")],
    routeIds: [],
  };
  return {
    ...state,
    currentStage: stageId("hypoxic_lesion"),
    activeTimeMs: 0,
    atp: bigNum(8, 0),
    hallmarkLevels: [
      { id: hallmarkId("replicative_immortality"), level: 1 },
      { id: hallmarkId("angiogenesis"), level: 1 },
    ],
    regions: [region],
    telomereReserveByRegion: { [region.id]: 3 },
    reserveFloor: 1,
    vesselMaintenanceAtp: 1,
    ...overrides,
  };
}

function advanceActiveTime(state, elapsedMs) {
  return { ...state, activeTimeMs: state.activeTimeMs + elapsedMs };
}

test("core-six manual divisions consume viable reserve to, but never below, the banked floor", () => {
  const initial = elapsedFixture();
  const first = projectManualDivisionHallmarkEffects(initial);
  const second = projectManualDivisionHallmarkEffects(first);
  assert.equal(first.telomereReserveByRegion["elapsed-rim"], 2);
  assert.equal(second.telomereReserveByRegion["elapsed-rim"], 1);
  assert.equal(replicativeCapacityExhausted(second), false);
  assert.equal(manualDivisionAllowed(second), true);
  assert.equal(
    projectManualDivisionHallmarkEffects(second).telomereReserveByRegion["elapsed-rim"],
    1,
  );
});

test("core-six elapsed reserve and perfusion maintenance are segmentation invariant at whole-second crossings", () => {
  const initial = elapsedFixture();
  const oneShot = projectElapsedHallmarkEffects(initial, 2_500);
  const first = projectElapsedHallmarkEffects(initial, 1_000);
  const second = projectElapsedHallmarkEffects(advanceActiveTime(first, 1_000), 1_500);
  assert.deepEqual(oneShot.telomereReserveByRegion, second.telomereReserveByRegion);
  assert.deepEqual(oneShot.regions, second.regions);
  assert.deepEqual(oneShot.atp, second.atp);
  assert.equal(oneShot.telomereReserveByRegion["elapsed-rim"], 1);
  assert.equal(oneShot.atp.mantissa, 6);
});

test("core-six unpaid perfusion deterministically removes its capacity and oxygen benefit", () => {
  const state = elapsedFixture({ atp: bigNum(1, 0) });
  const result = economyTick(state, 2_000, "live");
  const projected = result.stateProjection;
  assert.ok(projected);
  assert.equal(result.resourceSnapshot.atp.mantissa, 0);
  assert.equal(projected.vesselMaintenanceAtp, 0);
  assert.deepEqual(projected.regions[0]?.vesselLinkIds, []);
  assert.equal(projected.regions[0]?.capacity, 3);
  assert.equal(projected.oxygenPressure, 2);
});

test("core-six unprotected exhaustion halts producer output until a refill restores capacity", () => {
  const exhausted = elapsedFixture({
    reserveFloor: 0,
    telomereReserveByRegion: { "elapsed-rim": 0 },
  });
  const result = economyTick(exhausted, 1_000, "live");
  assert.ok(equals(result.resourceSnapshot.cells, exhausted.cells));
});

function assertEquivalentElapsedState(live, offline) {
  assert.deepEqual(offline.cells, live.cells);
  assert.deepEqual(offline.substrate, live.substrate);
  assert.deepEqual(offline.atp, live.atp);
  assert.deepEqual(offline.telomereReserveByRegion, live.telomereReserveByRegion);
  assert.deepEqual(offline.regions, live.regions);
  assert.equal(offline.oxygenPressure, live.oxygenPressure);
  assert.equal(offline.vesselMaintenanceAtp, live.vesselMaintenanceAtp);
}

test("core-six advanceLiveTick and full offline replay agree across exhaustion and unpaid upkeep", () => {
  const state = elapsedFixture({
    atp: bigNum(1, 0),
    reserveFloor: 0,
    telomereReserveByRegion: { "elapsed-rim": 1 },
  });
  let live = { game: state, lastTickAtMs: 0, pendingOfflineMs: 0, saveStatus: "idle" };
  live = advanceLiveTick(live, 1_000);
  live = advanceLiveTick(live, 2_000);
  const replay = replayEconomyOffline(state, { kind: "ready", requestedElapsedMs: 2_000 });
  assert.equal(replay.kind, "applied");
  assertEquivalentElapsedState(live.game, replay.state);
});

test("core-six advanceLiveTick and offline replay retain a refilled positive floor", () => {
  const readyToRefill = elapsedFixture({
    reserveFloor: 0,
    telomeraseCharges: 1,
    telomereReserveByRegion: { "elapsed-rim": 0 },
  });
  const productiveRefillState = {
    ...readyToRefill,
    producerLevels: readyToRefill.producerLevels.map((level) => ({ ...level, level: 1 })),
  };
  const refilled = recordEvent(productiveRefillState, {
    type: "spend-telomerase",
    target: "refill-region",
    regionId: regionId("elapsed-rim"),
    charges: 1,
    atMs: productiveRefillState.activeTimeMs,
  });
  const floored = { ...refilled, reserveFloor: 1 };
  let live = { game: floored, lastTickAtMs: 0, pendingOfflineMs: 0, saveStatus: "idle" };
  live = advanceLiveTick(live, 1_000);
  live = advanceLiveTick(live, 2_000);
  const replay = replayEconomyOffline(floored, { kind: "ready", requestedElapsedMs: 2_000 });
  assert.equal(replay.kind, "applied");
  assertEquivalentElapsedState(live.game, replay.state);
  assert.equal(replay.state.telomereReserveByRegion["elapsed-rim"], 1);
  assert.ok(!equals(replay.state.cells, floored.cells));
});

test("core-six live and offline ticks share elapsed reserve and ATP outcomes", () => {
  const state = elapsedFixture();
  const live = economyTick(state, 2_000, "live");
  const offline = economyTick(state, 2_000, "offline");
  assert.deepEqual(live.resourceSnapshot, offline.resourceSnapshot);
  assert.deepEqual(live.stateProjection, offline.stateProjection);
});
