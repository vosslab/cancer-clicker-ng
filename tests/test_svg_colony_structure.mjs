import assert from "node:assert/strict";
import test from "node:test";

import { createInitialGameState } from "../src/state/game_state.ts";
import { describeColonySvg } from "../src/svg/colony.tsx";
import { createGameColonyScene } from "../src/svg/colony_visual_state.ts";

test("the colony render model preserves its accepted layout and visual scene boundary", () => {
  const scene = createGameColonyScene(createInitialGameState());
  const before = structuredClone(scene);
  const model = describeColonySvg(scene);

  assert.deepEqual(scene, before);
  assert.equal(Object.isFrozen(model), true);
  assert.deepEqual(
    model.cells.map((cell) => cell.key),
    scene.layout.slots.map((slot) => slot.key),
  );
  assert.ok(model.cells.every((cell) => cell.transform.length > 0));
  assert.ok(model.cells.every((cell) => cell.membranePath.length > 0));
});
