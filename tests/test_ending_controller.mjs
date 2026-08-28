import assert from "node:assert/strict";
import test from "node:test";

import { stageId } from "../src/brands.ts";
import { CHICAGO_SKYSCRAPER_CELL_EQUIVALENT } from "../src/ending/trigger.ts";
import { createGameController, plainGameSnapshot } from "../src/render/game_controller.ts";
import { createInitialGameState } from "../src/state/game_state.ts";

function clock(value) {
  return { now: () => value };
}

function eligibleState() {
  const initial = createInitialGameState();
  return {
    ...initial,
    activeTimeMs: 900,
    currentStage: stageId("global_lab_contamination"),
    cells: CHICAGO_SKYSCRAPER_CELL_EQUIVALENT,
    network: { ...initial.network, globalTier: 1 },
  };
}

test("controller persists the explicit Chicago report before exposing its reached state", () => {
  const writes = [];
  const controller = createGameController(eligibleState(), clock(999), clock(1_000), (next) => {
    writes.push(next);
    return { ok: true };
  });
  const before = plainGameSnapshot(controller.game);

  assert.deepEqual(controller.reachSoftEnding(), { ok: true });
  assert.equal(writes.length, 1);
  assert.equal(writes[0].ending.phase, "reached");
  assert.equal(controller.game.ending.phase, "reached");
  assert.equal(controller.game.ending.sourceEventSequence, before.eventSequence);
});

test("controller keeps the report unavailable on a failed persistence write", () => {
  const controller = createGameController(eligibleState(), clock(999), clock(1_000), () => ({
    ok: false,
    notices: [],
  }));
  const before = plainGameSnapshot(controller.game);

  assert.deepEqual(controller.reachSoftEnding(), { ok: false, kind: "persistence", notices: [] });
  assert.deepEqual(plainGameSnapshot(controller.game), before);
});
