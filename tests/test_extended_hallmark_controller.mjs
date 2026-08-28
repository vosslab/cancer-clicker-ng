import assert from "node:assert/strict";
import test from "node:test";

import { bigNum, eventId, hallmarkId, regionId, stageId } from "../src/brands.ts";
import { createMutationOffer } from "../src/hallmarks/mutation_offer_generator.ts";
import { hasFundedAtpAcceleration } from "../src/hallmarks/atp_allocation.ts";
import { createGameController, plainGameSnapshot } from "../src/render/game_controller.ts";
import { createInitialGameState } from "../src/state/game_state.ts";

function clock(value) {
  return { now: () => value };
}

function region(id, changes = {}) {
  return {
    id: regionId(id),
    capacity: 4,
    viability: 1,
    phenotype: "proliferative",
    vesselLinkIds: [],
    routeIds: [],
    ...changes,
  };
}

function stateFor(hallmark, changes = {}) {
  return {
    ...createInitialGameState(),
    currentStage: stageId("angiogenic_primary"),
    activeTimeMs: 60,
    hallmarkLevels: [{ id: hallmarkId(hallmark), level: 1 }],
    ...changes,
  };
}

function controllerFor(state, persisted) {
  return createGameController(state, clock(9_999), clock(700), (next, savedAtMs) => {
    persisted.push({ next: structuredClone(next), savedAtMs });
    return { ok: true };
  });
}

test("extended-hallmark controller intents use simulation time, persist once, and preserve reducer ownership", () => {
  const cases = [
    {
      state: stateFor("metabolic_deregulation", { substrate: bigNum(5, 0) }),
      invoke: (controller) => controller.convertSubstrate({ mantissa: 2, exponent: 0 }),
      verify: (next) => {
        assert.deepEqual(next.substrate, { mantissa: 3, exponent: 0 });
        assert.deepEqual(next.atp, { mantissa: 2, exponent: 0 });
      },
    },
    {
      state: stateFor("metabolic_deregulation"),
      invoke: (controller) => controller.setAtpBudget("acceleration", 25),
      verify: (next) => assert.equal(next.atpBudget.acceleration, 25),
    },
    {
      state: stateFor("immune_destruction_avoidance", {
        regions: [region("immune")],
        concealmentTokens: 1,
      }),
      invoke: (controller) => controller.setRegionMask(regionId("immune"), true),
      verify: (next) => assert.deepEqual(next.maskedRegions, [regionId("immune")]),
    },
    {
      state: stateFor("tumor_promoting_inflammation", {
        regions: [region("inflamed", { vesselLinkIds: [eventId("vessel:inflamed")] })],
      }),
      invoke: (controller) => controller.activateInflammation(regionId("inflamed")),
      verify: (next) => assert.equal(next.inflammationEpisodes.length, 1),
    },
  ];

  for (const intent of cases) {
    const persisted = [];
    const controller = controllerFor(intent.state, persisted);
    const before = plainGameSnapshot(controller.game);
    assert.deepEqual(intent.invoke(controller), { ok: true });
    const after = plainGameSnapshot(controller.game);
    assert.equal(after.eventSequence, before.eventSequence + 1);
    assert.equal(persisted.length, 1);
    assert.equal(persisted[0].savedAtMs, 700);
    assert.equal(persisted[0].next.activeTimeMs, 60);
    assert.deepEqual(after, persisted[0].next);
    intent.verify(after);
  }
});

test("extended-hallmark controller mutation selection consumes the saved keyed offer atomically", () => {
  const source = {
    deterministicSeed: 7,
    eventSequence: 0,
    currentStage: stageId("angiogenic_primary"),
    genomeBurden: 0,
  };
  const offer = createMutationOffer(source);
  const selected = offer.cards[1];
  assert.ok(selected);
  const persisted = [];
  const controller = controllerFor(
    stateFor("genome_instability_mutation", {
      deterministicSeed: source.deterministicSeed,
      atp: bigNum(1, 0),
      atpSinks: ["mutation-drafting"],
      atpBudget: { "mutation-drafting": 25 },
      mutationOffers: [offer],
    }),
    persisted,
  );
  const before = plainGameSnapshot(controller.game);

  assert.deepEqual(controller.selectMutation(offer.id, selected.id), { ok: true });
  const after = plainGameSnapshot(controller.game);
  assert.deepEqual(after.mutationOffers, []);
  assert.deepEqual(after.chosenMutations, [selected.id]);
  assert.equal(after.eventSequence, before.eventSequence + 1);
  assert.equal(persisted.length, 1);
});

test("extended-hallmark UI sink semantics follow the authoritative per-sink funding rules", () => {
  const acceleration = stateFor("metabolic_deregulation", {
    atp: bigNum(2, 0),
    atpSinks: ["acceleration"],
    atpBudget: { acceleration: 25 },
  });
  assert.equal(hasFundedAtpAcceleration(acceleration), true);

  const vesselFirst = {
    ...acceleration,
    hallmarkLevels: [
      { id: hallmarkId("metabolic_deregulation"), level: 1 },
      { id: hallmarkId("angiogenesis"), level: 1 },
    ],
    regions: [region("linked", { vesselLinkIds: [eventId("vessel:linked")] })],
    vesselMaintenanceAtp: 1,
    atpSinks: ["acceleration", "vessel-maintenance"],
    atpBudget: { acceleration: 25, "vessel-maintenance": 24 },
  };
  assert.throws(() => hasFundedAtpAcceleration(vesselFirst), /ATP acceleration debit is invalid/);
  assert.equal(
    hasFundedAtpAcceleration({
      ...vesselFirst,
      atpBudget: { acceleration: 25, "vessel-maintenance": 25 },
    }),
    true,
  );

  const source = {
    deterministicSeed: 9,
    eventSequence: 0,
    currentStage: stageId("angiogenic_primary"),
    genomeBurden: 0,
  };
  const offer = createMutationOffer(source);
  const card = offer.cards[0];
  assert.ok(card);
  let writes = 0;
  const controller = createGameController(
    stateFor("genome_instability_mutation", {
      deterministicSeed: source.deterministicSeed,
      atp: bigNum(1, 0),
      atpSinks: ["mutation-drafting"],
      atpBudget: { "mutation-drafting": 24 },
      mutationOffers: [offer],
    }),
    clock(9_999),
    clock(700),
    () => {
      writes += 1;
      return { ok: true };
    },
  );
  assert.throws(() => controller.selectMutation(offer.id, card.id), /one funded ATP draft/);
  assert.equal(writes, 0);
});

test("extended-hallmark controller recovery and persistence failures leave each typed action unchanged", () => {
  const state = stateFor("metabolic_deregulation", { substrate: bigNum(5, 0) });
  let writes = 0;
  const blocked = createGameController(
    state,
    clock(9_999),
    clock(700),
    () => {
      writes += 1;
      return { ok: true };
    },
    "retained-unreadable",
  );
  const beforeBlocked = plainGameSnapshot(blocked.game);
  assert.deepEqual(blocked.convertSubstrate({ mantissa: 1, exponent: 0 }), {
    ok: false,
    kind: "recovery-blocked",
    notices: [],
  });
  assert.deepEqual(plainGameSnapshot(blocked.game), beforeBlocked);
  assert.equal(writes, 0);

  const failing = createGameController(state, clock(9_999), clock(700), () => ({
    ok: false,
    notices: [],
  }));
  const beforeFailure = plainGameSnapshot(failing.game);
  assert.deepEqual(failing.convertSubstrate({ mantissa: 1, exponent: 0 }), {
    ok: false,
    kind: "persistence",
    notices: [],
  });
  assert.deepEqual(plainGameSnapshot(failing.game), beforeFailure);
});
