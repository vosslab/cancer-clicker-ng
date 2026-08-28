import assert from "node:assert/strict";
import test from "node:test";
import { hallmarkId, stageId } from "../src/brands.ts";
import {
  CHECKPOINT_ROUTING_HANDLER,
  checkpointPressureTradeoff,
  checkpointRoutingDecisionOrder,
} from "../src/hallmarks/handlers/checkpoint_routing.ts";
import { createInitialGameState } from "../src/state/game_state.ts";

function ownedMicrocolonyState() {
  const initial = createInitialGameState();
  return {
    ...initial,
    currentStage: stageId("microcolony"),
    hallmarkLevels: [{ id: hallmarkId("growth_suppressor_evasion"), level: 1 }],
    eventSequence: 41,
  };
}

function apply(state, checkpoint) {
  return CHECKPOINT_ROUTING_HANDLER.apply({
    state,
    operation: { type: "select-checkpoint", hallmark: "growth_suppressor_evasion", checkpoint },
    appliedAtMs: 1_000,
  });
}

test("core-six checkpoint routing applies one distinct named pressure tradeoff for every route", () => {
  const expected = [
    ["contact-inhibition", "contactPressure", 1],
    ["nutrient-arrest", "nutrientPressure", 2],
    ["damage-arrest", "damagePressure", 3],
  ];
  for (const [checkpoint, pressureKey, increase] of expected) {
    const state = ownedMicrocolonyState();
    const after = apply(state, checkpoint);
    assert.deepEqual(after.bypassedCheckpoints, [checkpoint]);
    assert.equal(after[pressureKey], increase);
    assert.equal(after.eventSequence, state.eventSequence);
    for (const otherKey of ["contactPressure", "nutrientPressure", "damagePressure"]) {
      if (otherKey !== pressureKey) assert.equal(after[otherKey], state[otherKey]);
    }
    assert.deepEqual(checkpointPressureTradeoff(checkpoint), {
      checkpoint,
      pressureKey,
      pressureIncrease: increase,
    });
  }
});

test("core-six checkpoint routing rejects locked, unowned, repeat, occupied, and hostile commands atomically", () => {
  const cases = [
    [
      "locked stage",
      { ...ownedMicrocolonyState(), currentStage: stageId("transformed_cell") },
      "contact-inhibition",
      /locked/,
    ],
    ["unowned hallmark", createInitialGameState(), "contact-inhibition", /not owned/],
    [
      "repeat checkpoint",
      { ...ownedMicrocolonyState(), bypassedCheckpoints: ["contact-inhibition"] },
      "contact-inhibition",
      /already bypassed/,
    ],
    [
      "occupied board",
      { ...ownedMicrocolonyState(), bypassedCheckpoints: ["contact-inhibition"] },
      "nutrient-arrest",
      /one checkpoint board slot/,
    ],
    ["hostile checkpoint", ownedMicrocolonyState(), "unknown-checkpoint", /invalid/],
  ];
  for (const [label, state, checkpoint, message] of cases) {
    const original = structuredClone(state);
    assert.throws(() => apply(state, checkpoint), message, label);
    assert.deepEqual(state, original, label);
  }
});

test("core-six checkpoint routing changes the ordered next decision from named pressures", () => {
  const baseline = ownedMicrocolonyState();
  assert.deepEqual(checkpointRoutingDecisionOrder(baseline), [
    "contact-inhibition",
    "nutrient-arrest",
    "damage-arrest",
  ]);
  const pressured = { ...baseline, contactPressure: 9, nutrientPressure: 2, damagePressure: 0 };
  assert.deepEqual(checkpointRoutingDecisionOrder(pressured), [
    "damage-arrest",
    "nutrient-arrest",
    "contact-inhibition",
  ]);
  assert.notDeepEqual(
    checkpointRoutingDecisionOrder(pressured),
    checkpointRoutingDecisionOrder(baseline),
  );
});
