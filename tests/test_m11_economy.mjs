import assert from "node:assert/strict";
import test from "node:test";
import { bigNum, eventId, hallmarkId, regionId, stageId } from "../src/brands.ts";
import { compare, equals } from "../src/bignum/bignum.ts";
import { quoteProducerPurchase } from "../src/economy/costs.ts";
import { replayEconomyOffline } from "../src/economy/offline.ts";
import { advanceLiveTick, economyTick } from "../src/economy/tick.ts";
import {
  ATP_ACCELERATION_MAX_MULTIPLIER,
  atpAccelerationEconomyModifier,
  hasFundedAtpAcceleration,
} from "../src/hallmarks/m11_economy.ts";
import { STAGE_ONE_PRODUCERS } from "../src/economy/producers.ts";
import { createInitialGameState } from "../src/state/game_state.ts";

function acceleratedState(overrides = {}) {
  const initial = createInitialGameState();
  return {
    ...initial,
    cells: bigNum(1, 9),
    atp: bigNum(10, 0),
    currentStage: stageId("avascular_lesion"),
    hallmarkLevels: [{ id: hallmarkId("metabolic_deregulation"), level: 1 }],
    producerLevels: initial.producerLevels.map((level) => ({ ...level, level: 1 })),
    atpBudget: { acceleration: 100 },
    atpSinks: ["acceleration"],
    ...overrides,
  };
}

test("M11 acceleration changes all eight real quotes nonuniformly, with a bounded rate payoff", () => {
  const baseline = acceleratedState({ atp: bigNum(0, 0) });
  const funded = acceleratedState();
  const changes = STAGE_ONE_PRODUCERS.map((producer) => {
    const before = quoteProducerPurchase(baseline, producer.id, 1).debit;
    const after = quoteProducerPurchase(funded, producer.id, 1).debit;
    return compare(after, before);
  });
  assert.equal(changes.length, 8);
  assert.ok(changes.every((change) => change !== 0));
  assert.notEqual(changes[0], changes[2]);
  const lowFlux = atpAccelerationEconomyModifier(funded, STAGE_ONE_PRODUCERS[0].id);
  const highFlux = atpAccelerationEconomyModifier(funded, STAGE_ONE_PRODUCERS[2].id);
  assert.equal(lowFlux.productionMultiplier, 1.25);
  assert.equal(highFlux.productionMultiplier, ATP_ACCELERATION_MAX_MULTIPLIER);
  assert.equal(highFlux.purchaseCostMultiplier, 0.8);
  assert.equal(lowFlux.purchaseCostMultiplier, 1.1);
});

test("M11 unfunded or zero acceleration cannot improve output or quotes", () => {
  const baseline = acceleratedState({ atpBudget: {}, atpSinks: [] });
  const zeroBudget = acceleratedState({
    atpBudget: { acceleration: 0 },
    atpSinks: ["acceleration"],
  });
  const unfunded = acceleratedState({ atp: bigNum(0, 0) });
  assert.equal(hasFundedAtpAcceleration(unfunded), false);
  for (const candidate of [zeroBudget, unfunded]) {
    for (const producer of STAGE_ONE_PRODUCERS) {
      assert.deepEqual(
        quoteProducerPurchase(candidate, producer.id, 1).debit,
        quoteProducerPurchase(baseline, producer.id, 1).debit,
      );
    }
    assert.deepEqual(
      economyTick(candidate, 1_000, "live").resourceSnapshot.cells,
      economyTick(baseline, 1_000, "live").resourceSnapshot.cells,
    );
  }
});

test("M11 acceleration pays once per second, after vessel maintenance, with no double debit", () => {
  const vessel = {
    id: regionId("m11-vessel"),
    capacity: 4,
    viability: 1,
    phenotype: "proliferative",
    vesselLinkIds: [eventId("vessel:m11-vessel")],
    routeIds: [],
  };
  const scarce = acceleratedState({
    atp: bigNum(1, 0),
    hallmarkLevels: [
      { id: hallmarkId("metabolic_deregulation"), level: 1 },
      { id: hallmarkId("angiogenesis"), level: 1 },
    ],
    regions: [vessel],
    vesselMaintenanceAtp: 1,
  });
  const neutral = acceleratedState({
    atp: bigNum(1, 0),
    atpBudget: {},
    atpSinks: [],
    hallmarkLevels: scarce.hallmarkLevels,
    regions: [vessel],
    vesselMaintenanceAtp: 1,
  });
  assert.equal(hasFundedAtpAcceleration(scarce), false);
  const result = economyTick(scarce, 1_000, "live");
  assert.deepEqual(result.resourceSnapshot.atp, bigNum(0, 0));
  assert.deepEqual(
    result.resourceSnapshot.cells,
    economyTick(neutral, 1_000, "live").resourceSnapshot.cells,
  );
  const funded = economyTick(acceleratedState(), 2_000, "live");
  assert.deepEqual(funded.resourceSnapshot.atp, bigNum(2, 0));
});

test("M11 allocation is segmentation invariant and matches live and offline replay", () => {
  const initial = acceleratedState();
  const oneShot = economyTick(initial, 2_000, "live");
  const first = economyTick(initial, 1_000, "live");
  const second = economyTick(
    { ...initial, ...first.resourceSnapshot, activeTimeMs: 1_000 },
    1_000,
    "live",
  );
  assert.deepEqual(oneShot.resourceSnapshot, second.resourceSnapshot);
  let runtime = { game: initial, lastTickAtMs: 0, pendingOfflineMs: 0, saveStatus: "idle" };
  runtime = advanceLiveTick(runtime, 1_000);
  runtime = advanceLiveTick(runtime, 2_000);
  const offline = replayEconomyOffline(initial, { kind: "ready", requestedElapsedMs: 2_000 });
  assert.equal(offline.kind, "applied");
  assert.deepEqual(offline.state.cells, runtime.game.cells);
  assert.deepEqual(offline.state.substrate, runtime.game.substrate);
  assert.deepEqual(offline.state.atp, runtime.game.atp);
  assert.ok(!equals(oneShot.resourceSnapshot.cells, initial.cells));
});

test("M11 ATP allocation rejects unknown sinks and a total above its canonical cap", () => {
  assert.throws(
    () =>
      economyTick(
        acceleratedState({ atpBudget: { unknown: 1 }, atpSinks: ["unknown"] }),
        1,
        "live",
      ),
    /sink identifiers/,
  );
  assert.throws(
    () =>
      economyTick(
        acceleratedState({
          atpBudget: { acceleration: 100, "vessel-maintenance": 100, "mutation-drafting": 1 },
          atpSinks: ["acceleration", "vessel-maintenance", "mutation-drafting"],
        }),
        1,
        "live",
      ),
    /bounded cap/,
  );
});
