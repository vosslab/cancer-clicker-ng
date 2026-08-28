import assert from "node:assert/strict";
import test from "node:test";

import { bigNum, passageUpgradeId } from "../src/brands.ts";
import { createGameController, plainGameSnapshot } from "../src/render/game_controller.ts";
import { createInitialGameState } from "../src/state/game_state.ts";

function clock(value) {
  return { now: () => value };
}

function runtime(game) {
  return { game, lastTickAtMs: 0, pendingOfflineMs: 0, saveStatus: "idle" };
}

test("controller observes each accepted durable event after its matching save", () => {
  const writes = [];
  const observed = [];
  const controller = createGameController(
    createInitialGameState(),
    clock(20),
    clock(30),
    (state, savedAtMs) => {
      writes.push({ state, savedAtMs });
      return { ok: true };
    },
    undefined,
    (event, durableStateAfter, savedAtMs) => observed.push({ event, durableStateAfter, savedAtMs }),
  );

  assert.deepEqual(controller.divide(), { ok: true });
  assert.equal(writes.length, 1);
  assert.equal(observed.length, 1);
  assert.deepEqual(observed[0].event, { type: "click-divide", atMs: 20 });
  assert.equal(observed[0].savedAtMs, 30);
  assert.equal(observed[0].durableStateAfter.eventSequence, 1);
  assert.equal(writes[0].state.eventSequence, observed[0].durableStateAfter.eventSequence);

  observed[0].durableStateAfter.eventSequence = 999;
  assert.equal(controller.game.eventSequence, 1);
  assert.throws(() => controller.debugOrImportedEvent({ type: "click-divide", atMs: -1 }));
  assert.equal(observed.length, 1);
});

test("controller keeps rejected, failed, snapshot, tick, and recovery writes out of replay observation", () => {
  const observed = [];
  const failed = createGameController(
    createInitialGameState(),
    clock(20),
    clock(30),
    () => ({ ok: false, notices: [] }),
    undefined,
    (event) => observed.push(event),
  );
  assert.deepEqual(failed.divide(), { ok: false, kind: "persistence", notices: [] });
  assert.equal(observed.length, 0);

  const throwing = createGameController(
    createInitialGameState(),
    clock(20),
    clock(30),
    () => {
      throw new Error("storage unavailable");
    },
    undefined,
    (event) => observed.push(event),
  );
  assert.deepEqual(throwing.divide(), { ok: false, kind: "persistence", notices: [] });
  assert.equal(observed.length, 0);

  const successful = createGameController(
    createInitialGameState(),
    clock(20),
    clock(30),
    () => ({ ok: true }),
    undefined,
    (event) => observed.push(event),
  );
  assert.deepEqual(successful.persistSnapshot(plainGameSnapshot(successful.game)), { ok: true });
  successful.tick(runtime(successful.game));
  assert.equal(observed.length, 0);

  const protectedController = createGameController(
    createInitialGameState(),
    clock(20),
    clock(30),
    () => ({ ok: true }),
    "retained-unreadable",
    (event) => observed.push(event),
  );
  assert.deepEqual(protectedController.divide(), {
    ok: false,
    kind: "recovery-blocked",
    notices: [],
  });
  assert.deepEqual(protectedController.replaceUnreadableSave(), { ok: true });
  assert.equal(observed.length, 0);
});

test("controller observes the separately persisted queued assay action", () => {
  const initial = createInitialGameState();
  const queuedState = {
    ...initial,
    cells: bigNum(1, 6),
    culture: {
      ...initial.culture,
      purchasedPassageUpgrades: [{ upgradeId: passageUpgradeId("assay_discipline"), rank: 1 }],
      queuedProducerAction: {
        producerId: initial.producerLevels[0].id,
        queuedAtEventSequence: 0,
        queuedAtActiveMs: 0,
      },
    },
  };
  const observed = [];
  const controller = createGameController(
    queuedState,
    clock(20),
    clock(30),
    () => ({ ok: true }),
    undefined,
    (event, stateAfter, savedAtMs) => observed.push({ event, stateAfter, savedAtMs }),
  );

  assert.equal(observed.length, 1);
  assert.equal(observed[0].event.type, "purchase-producer");
  assert.equal(observed[0].event.execution, "assay");
  assert.equal(observed[0].stateAfter.culture.queuedProducerAction, null);
  assert.equal(observed[0].stateAfter.eventSequence, 1);
  assert.equal(observed[0].savedAtMs, 30);
  assert.equal(controller.game.producerLevels[0].level, 1);
});

test("observer diagnostics leave the already durable action successful", () => {
  const controller = createGameController(
    createInitialGameState(),
    clock(20),
    clock(30),
    () => ({ ok: true }),
    undefined,
    () => {
      throw new Error("diagnostic sink unavailable");
    },
  );

  assert.deepEqual(controller.divide(), { ok: true });
  assert.equal(controller.game.eventSequence, 1);
});
