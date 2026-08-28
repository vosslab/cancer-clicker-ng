import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
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
  assert.ok(model.cells.every((cell) => /^translate\(/.test(cell.transform)));
  assert.ok(model.cells.every((cell) => /^M -?[\d.]+ -?[\d.]+/.test(cell.membranePath)));
});

test("the colony projection keeps ordered biological layers and its own geometry-free boundary", async () => {
  const source = await readFile("src/svg/colony.tsx", "utf8");
  const layers = [
    "colony-figure__tissue",
    "colony-figure__silhouette-regions",
    "<OxygenOverlays",
    "<PerfusionOverlays",
    "colony-figure__cells",
    "<HallmarkOverlays",
    "<InvasionOverlays",
    "colony-figure__outline",
  ].map((marker) => source.indexOf(marker));

  assert.ok(layers.every((position) => position >= 0));
  assert.deepEqual(
    [...layers].sort((left, right) => left - right),
    layers,
  );
  assert.match(source, /scene\.visual/);
  assert.equal(/from "\.\/colony_layout\.js"/.test(source), false);
  assert.equal(
    /\b(?:createColonyLayout|Math\.random|document|window|localStorage)\b/.test(source),
    false,
  );
});
