import assert from "node:assert/strict";
import test from "node:test";

import { createInitialGameState } from "../src/state/game_state.ts";
import { describeColonySvg } from "../src/svg/colony.tsx";
import { createColonySvgDefinitions, sharedDefinitionNodeCount } from "../src/svg/defs.ts";
import { endingOverlayNodeCount } from "../src/svg/ending_overlay.tsx";
import { colonyOverlayNodeCount } from "../src/svg/colony_overlays.tsx";
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

test("renderer diagnostics count the real bounded SVG inventory", () => {
  const scene = createGameColonyScene(createInitialGameState());
  const model = describeColonySvg(scene);
  const decorativeModel = describeColonySvg(scene, true);
  const definitions = createColonySvgDefinitions(scene);
  const cellNodes = model.cells.reduce(
    (total, cell) => total + (cell.mitosis === undefined ? 4 : 5),
    0,
  );
  const expected =
    1 + // svg
    2 + // meaningful title and description
    1 + // defs wrapper
    sharedDefinitionNodeCount(definitions) +
    4 + // tissue group, plate, and two fascia paths
    endingOverlayNodeCount(scene) +
    2 +
    scene.layout.regions.length +
    scene.layout.voids.length +
    colonyOverlayNodeCount(scene.layout, scene.visual) +
    1 + // cells wrapper
    cellNodes +
    2; // outline group and polygon

  assert.equal(model.nodeEstimate, expected);
  assert.equal(decorativeModel.nodeEstimate, expected - 2);
});
