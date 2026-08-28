import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { createInitialGameState } from "../src/state/game_state.ts";
import { createCellBlobPaths } from "../src/svg/blob.ts";
import { describeCellSvg } from "../src/svg/cell.tsx";
import { createColonySvgDefinitions } from "../src/svg/defs.ts";
import { createGameColonyScene } from "../src/svg/colony_visual_state.ts";
import { createCellRenderModel } from "../src/svg/render_types.ts";

function fixture() {
  const scene = createGameColonyScene(createInitialGameState());
  const slot = scene.layout.slots[0];
  assert.ok(slot, "game colony scene has a visible cell");
  const cell = createCellRenderModel(scene, createCellBlobPaths(slot, scene.morphology));
  return Object.freeze({
    cell,
    definitionIds: createColonySvgDefinitions(scene).ids,
    growthState: scene.visual.growthState,
  });
}

test("Cell projects immutable paths and exposes each real cell as a pointer target", () => {
  const input = fixture();
  const first = describeCellSvg(input);
  const second = describeCellSvg(input);

  assert.deepEqual(first, second);
  assert.equal(Object.isFrozen(first), true);
  assert.match(first.className, /colony-cell--(quiet|cycling|energized)/);
  assert.equal(first.membrane.d, input.cell.membranePath);
  assert.equal(first.nucleus.d, input.cell.nucleusPath);
  assert.equal(first.membrane.fill, `url(#${input.definitionIds.cytoplasmGradient})`);
  assert.equal(first.nucleus.fill, `url(#${input.definitionIds.nucleusGradient})`);
});

test("Cell stays presentational while the parent button owns accessibility", async () => {
  const source = await readFile("src/svg/cell.tsx", "utf8");
  assert.match(source, /data-colony-cell=\{props\.cell\.key\}/);
  assert.match(source, /<g class="colony-cell__visual">/);
  assert.equal(source.includes('pointer-events="none"'), false);
  assert.equal((source.match(/pointer-events="all"/g) ?? []).length, 2);
  assert.equal(
    /\b(?:document|window|innerHTML|tabindex|onClick|onKey|Math\.random)\b/.test(source),
    false,
  );
  assert.equal(
    /from "\.\/colony_layout|from "\.\/morphology|createCellBlobPaths/.test(source),
    false,
  );
});
