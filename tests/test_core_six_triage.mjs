import assert from "node:assert/strict";
import test from "node:test";
import { bigNum, eventId, hallmarkId, regionId, routeId, stageId } from "../src/brands.ts";
import { add } from "../src/bignum/bignum.ts";
import { applyDamageTriage } from "../src/hallmarks/handlers/damage_triage.ts";
import { createInitialGameState } from "../src/state/game_state.ts";

function triageState(overrides = {}) {
  const state = createInitialGameState();
  const target = {
    id: regionId("damaged"),
    capacity: 4,
    viability: 0.4,
    phenotype: "stress-tolerant",
    vesselLinkIds: [eventId("vessel:damaged")],
    routeIds: [routeId("departing"), routeId("shared")],
    senescenceEventId: eventId("senescence:damaged"),
  };
  const survivor = {
    id: regionId("survivor"),
    capacity: 3,
    viability: 1,
    phenotype: "proliferative",
    vesselLinkIds: [],
    routeIds: [routeId("shared")],
  };
  return {
    ...state,
    currentStage: stageId("avascular_lesion"),
    eventSequence: 19,
    survivalCapacity: 3,
    damagePressure: 2,
    substrate: bigNum(3, 0),
    hallmarkLevels: [{ id: hallmarkId("cell_death_resistance"), level: 1 }],
    regions: [target, survivor],
    seededSites: [target.id],
    maskedRegions: [target.id],
    senescentRegions: [target.id],
    telomereReserveByRegion: { damaged: 2 },
    immuneVisibilityByRegion: { damaged: 3 },
    regionalInflammation: { damaged: 4 },
    phenotypeCooldowns: { damaged: 5 },
    regionalModifiers: { "region:damaged:stress": 6 },
    clearanceQueue: [eventId("senescence:damaged")],
    secretoryEffects: { damaged: 1, "senescence:senescence:damaged": 1 },
    pendingDamageEvents: [
      { id: eventId("damage-a"), regionId: target.id, outcome: "repairable" },
      { id: eventId("damage-b"), regionId: target.id, outcome: "fatal" },
    ],
    pendingTransitEvents: [
      { id: eventId("departing-transit"), routeId: routeId("departing"), outcome: "lost" },
      { id: eventId("shared-transit"), routeId: routeId("shared"), outcome: "arrived" },
    ],
    committedCellCommitments: { departing: 2, shared: 3 },
    routeRiskById: { departing: 4, shared: 5 },
    inflammationEpisodes: [{ id: eventId("inflammation"), regionId: target.id, deadlineMs: 20 }],
    ...overrides,
  };
}

function apply(state, action) {
  return applyDamageTriage({
    state,
    operation: {
      type: "resolve-triage",
      hallmark: "cell_death_resistance",
      eventId: eventId("damage-a"),
      action,
    },
    appliedAtMs: 100,
  });
}

test("M10 cell-death resistance makes absorb, repair, and regional loss distinct decisions", () => {
  const absorbBefore = triageState();
  const absorbAfter = apply(absorbBefore, "absorb");
  assert.equal(absorbAfter.survivalCapacity, 2);
  assert.equal(absorbAfter.damagePressure, 2);
  assert.equal(absorbAfter.regions[0]?.viability, 0.4);
  assert.deepEqual(
    absorbAfter.pendingDamageEvents.map((event) => event.id),
    [eventId("damage-b")],
  );
  assert.equal(absorbAfter.regionalModifiers["triage:damage-a"], 2);

  const repairBefore = triageState();
  const repairAfter = apply(repairBefore, "repair");
  assert.equal(repairAfter.survivalCapacity, 2);
  assert.equal(repairAfter.damagePressure, 1);
  assert.equal(repairAfter.regions[0]?.viability, 1);
  assert.equal(repairAfter.regionalModifiers["triage:damage-a"], 1);

  const lossBefore = triageState();
  const lossAfter = apply(lossBefore, "lose-region");
  assert.deepEqual(
    lossAfter.regions.map((region) => region.id),
    [regionId("survivor")],
  );
  assert.deepEqual(lossAfter.pendingDamageEvents, []);
  assert.deepEqual(lossAfter.substrate, bigNum(7, 0));
  assert.deepEqual(
    lossAfter.substrate,
    add(lossBefore.substrate, bigNum(lossBefore.regions[0]?.capacity ?? 0, 0)),
  );
  assert.equal(lossAfter.survivalCapacity, 3);
  assert.notDeepEqual(lossAfter, absorbAfter);
  assert.notDeepEqual(lossAfter, repairAfter);

  for (const [before, after] of [
    [absorbBefore, absorbAfter],
    [repairBefore, repairAfter],
    [lossBefore, lossAfter],
  ]) {
    assert.equal(after.eventSequence, before.eventSequence);
    assert.deepEqual(before, triageState());
  }
});

test("M10 cell-death loss remains a capacity-free substrate recovery choice", () => {
  const before = triageState({ survivalCapacity: 0 });
  const after = apply(before, "lose-region");
  const target = before.regions[0];
  assert.ok(target);
  assert.equal(after.survivalCapacity, 0);
  assert.deepEqual(after.substrate, add(before.substrate, bigNum(target.capacity, 0)));
  assert.equal(after.eventSequence, before.eventSequence);
  assert.deepEqual(before, triageState({ survivalCapacity: 0 }));
});

test("M10 cell-death loss uses the single destructive-region projection", () => {
  const after = apply(triageState(), "lose-region");
  assert.deepEqual(after.seededSites, []);
  assert.deepEqual(after.maskedRegions, []);
  assert.deepEqual(after.senescentRegions, []);
  assert.deepEqual(after.telomereReserveByRegion, {});
  assert.deepEqual(after.immuneVisibilityByRegion, {});
  assert.deepEqual(after.regionalInflammation, {});
  assert.deepEqual(after.phenotypeCooldowns, {});
  assert.deepEqual(after.regionalModifiers, {});
  assert.deepEqual(after.clearanceQueue, []);
  assert.deepEqual(after.secretoryEffects, {});
  assert.deepEqual(after.inflammationEpisodes, []);
  assert.deepEqual(after.committedCellCommitments, { shared: 3 });
  assert.deepEqual(after.routeRiskById, { shared: 5 });
  assert.deepEqual(after.pendingTransitEvents, [
    { id: eventId("shared-transit"), routeId: routeId("shared"), outcome: "arrived" },
  ]);
});

test("M10 cell-death resistance rejects locked, unowned, hostile, and capacity-invalid choices atomically", () => {
  const cases = [
    [triageState({ currentStage: stageId("microcolony") }), "absorb", /not owned or unlocked/],
    [triageState({ hallmarkLevels: [] }), "absorb", /not owned or unlocked/],
    [triageState({ survivalCapacity: 0 }), "absorb", /survival capacity/],
    [triageState({ damagePressure: 0 }), "repair", /positive damage pressure/],
    [triageState({ pendingDamageEvents: [] }), "absorb", /unavailable/],
    [
      triageState({
        pendingDamageEvents: [
          { id: eventId("damage-a"), regionId: regionId("missing"), outcome: "fatal" },
        ],
      }),
      "absorb",
      /has no region/,
    ],
  ];
  for (const [state, action, message] of cases) {
    const before = structuredClone(state);
    assert.throws(() => apply(state, action), message);
    assert.deepEqual(state, before);
  }
});
