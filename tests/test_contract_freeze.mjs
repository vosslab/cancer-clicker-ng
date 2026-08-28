import assert from "node:assert/strict";
import test from "node:test";

import { createGameController, plainGameSnapshot } from "../src/render/game_controller.ts";
import { createInitialGameState } from "../src/state/game_state.ts";
import { parseSave, serializeGameState } from "../src/state/save_load.ts";

function clock(value) {
  return { now: () => value };
}

function runtime(game) {
  return { game, lastTickAtMs: 1, pendingOfflineMs: 0, saveStatus: "idle" };
}

test("recovery-blocked controller preserves its visible snapshot until explicit replacement succeeds", () => {
  const writes = [];
  let acceptsWrites = true;
  const initial = createInitialGameState();
  const controller = createGameController(
    initial,
    clock(2_000),
    clock(2_000),
    (state, savedAtMs) => {
      writes.push({ state: structuredClone(state), savedAtMs });
      return acceptsWrites ? { ok: true } : { ok: false, notices: [] };
    },
    "retained-unreadable",
  );
  const before = plainGameSnapshot(controller.game);

  assert.deepEqual(controller.divide(), { ok: false, kind: "recovery-blocked", notices: [] });
  assert.deepEqual(controller.tick(runtime(controller.game)), runtime(controller.game));
  assert.deepEqual(plainGameSnapshot(controller.game), before);
  assert.equal(writes.length, 0);
  assert.equal(controller.recoveryBlocked(), true);

  acceptsWrites = false;
  assert.deepEqual(controller.replaceUnreadableSave(), {
    ok: false,
    kind: "persistence",
    notices: [],
  });
  assert.equal(controller.recoveryBlocked(), true);
  assert.equal(writes.length, 1);
  assert.deepEqual(plainGameSnapshot(controller.game), before);

  acceptsWrites = true;
  assert.deepEqual(controller.replaceUnreadableSave(), { ok: true });
  assert.equal(controller.recoveryBlocked(), false);
  assert.equal(writes.length, 2);
  assert.deepEqual(plainGameSnapshot(controller.game), before);
  assert.deepEqual(controller.divide(), { ok: true });
  assert.equal(writes.length, 3);
});

test("a storage read failure blocks ordinary writes until an explicit replacement", () => {
  let writes = 0;
  const storage = {
    getItem: () => {
      throw new Error("read denied");
    },
    setItem: () => {
      writes += 1;
    },
  };
  const controller = createGameController(
    createInitialGameState(),
    clock(10),
    clock(20),
    (state, savedAtMs) => {
      void state;
      void savedAtMs;
      storage.setItem();
      return { ok: true };
    },
    "storage-read-failed",
  );
  const before = plainGameSnapshot(controller.game);

  assert.deepEqual(controller.divide(), { ok: false, kind: "recovery-blocked", notices: [] });
  assert.deepEqual(controller.tick(runtime(controller.game)), runtime(controller.game));
  assert.equal(writes, 0);
  assert.deepEqual(plainGameSnapshot(controller.game), before);
  assert.equal(controller.recoveryReason(), "storage-read-failed");

  assert.deepEqual(controller.replaceUnreadableSave(), { ok: true });
  assert.equal(writes, 1);
  assert.equal(controller.recoveryReason(), undefined);
});

test("loaded p4 result has the closed current progression contract", () => {
  const raw = serializeGameState(createInitialGameState(), 10);
  const loaded = parseSave(raw);
  assert.equal(loaded.status, "loaded");
  if (loaded.status !== "loaded") throw new Error("Expected current save to load.");
  assert.equal(loaded.progressionVersion, 4);
  assert.equal(loaded.version, 2);
});
