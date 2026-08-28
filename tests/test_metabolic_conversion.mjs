import assert from "node:assert/strict";
import test from "node:test";
import { bigNum, hallmarkId, stageId } from "../src/brands.ts";
import { equals } from "../src/bignum/bignum.ts";
import {
  applyMetabolicConversion,
  METABOLIC_CONVERSION_HANDLER,
} from "../src/hallmarks/handlers/metabolism.ts";
import { createInitialGameState } from "../src/state/game_state.ts";
import { economyTick } from "../src/economy/tick.ts";

function metabolismState(overrides = {}) {
  return {
    ...createInitialGameState(),
    currentStage: stageId("avascular_lesion"),
    substrate: bigNum(9, 0),
    atp: bigNum(3, 0),
    hallmarkLevels: [{ id: hallmarkId("metabolic_deregulation"), level: 1 }],
    ...overrides,
  };
}

test("extended-hallmark metabolic conversion is exact, one-time, and leaves cells untouched", () => {
  const before = metabolismState();
  const operation = {
    type: "convert-substrate",
    hallmark: "metabolic_deregulation",
    amount: { mantissa: 8, exponent: 0 },
  };
  const after = applyMetabolicConversion({ state: before, operation, appliedAtMs: 0 });
  assert.deepEqual(after.substrate, bigNum(1, 0));
  assert.deepEqual(after.atp, bigNum(11, 0));
  assert.ok(equals(after.cells, before.cells));
  assert.equal(after.eventSequence, before.eventSequence);
  assert.equal(METABOLIC_CONVERSION_HANDLER.hallmark, "metabolic_deregulation");
  assert.throws(
    () => applyMetabolicConversion({ state: after, operation, appliedAtMs: 0 }),
    /exceeds available substrate/,
  );
});

test("extended-hallmark conversion rejects locked, unowned, and insufficient states without changing the input", () => {
  const operation = {
    type: "convert-substrate",
    hallmark: "metabolic_deregulation",
    amount: { mantissa: 10, exponent: 0 },
  };
  const insufficient = metabolismState();
  const snapshot = structuredClone(insufficient);
  assert.throws(
    () => applyMetabolicConversion({ state: insufficient, operation, appliedAtMs: 0 }),
    /exceeds available substrate/,
  );
  assert.deepEqual(insufficient, snapshot);
  assert.throws(
    () =>
      applyMetabolicConversion({
        state: metabolismState({ hallmarkLevels: [] }),
        operation: { ...operation, amount: { mantissa: 1, exponent: 0 } },
        appliedAtMs: 0,
      }),
    /not operational/,
  );
  assert.throws(
    () =>
      applyMetabolicConversion({
        state: metabolismState({ currentStage: stageId("transformed_cell") }),
        operation: { ...operation, amount: { mantissa: 1, exponent: 0 } },
        appliedAtMs: 0,
      }),
    /not operational/,
  );
});

test("extended-hallmark conversion does not create cells in an otherwise idle economy", () => {
  const before = metabolismState();
  const converted = applyMetabolicConversion({
    state: before,
    operation: {
      type: "convert-substrate",
      hallmark: "metabolic_deregulation",
      amount: { mantissa: 3, exponent: 0 },
    },
    appliedAtMs: 0,
  });
  const result = economyTick(converted, 1_000, "live");
  assert.ok(equals(result.resourceSnapshot.cells, before.cells));
  assert.deepEqual(result.resourceSnapshot.substrate, bigNum(6, 0));
  assert.deepEqual(result.resourceSnapshot.atp, bigNum(6, 0));
});
