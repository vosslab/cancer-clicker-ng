import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { STAGE_IDS } from "../src/state/catalog.ts";
import { createCellBlobPaths } from "../src/svg/blob.ts";
import { describeCellSvg } from "../src/svg/cell.tsx";
import { createColonyLayout } from "../src/svg/colony_layout.ts";
import { createColonySvgDefinitions } from "../src/svg/defs.ts";
import { resolve_stage_morphology } from "../src/svg/morphology.ts";
import { createCellRenderModel, createColonySceneRequest } from "../src/svg/render_types.ts";

function fixture(stageId, seed = 17) {
  const morphology = resolve_stage_morphology(seed, stageId);
  const layout = createColonyLayout({
    stageId,
    sceneSeed: seed,
    morphology,
    detail: "representative",
  });
  const scene = createColonySceneRequest(
    Object.freeze({ layout, morphology, stageId, sceneSeed: seed, detail: "representative" }),
  );
  const slot = scene.layout.slots[0];
  assert.ok(slot, "fixture has an accepted M17 slot");
  const paths = createCellBlobPaths(slot, scene.morphology);
  const cell = createCellRenderModel(scene, paths);
  const definitionIds = createColonySvgDefinitions(scene).ids;
  return Object.freeze({ cell, definitionIds });
}

function withMitosis(cell) {
  return Object.freeze({
    ...cell,
    mitosis: Object.freeze({ motif: "multipolar_spindle", placement: "peripheral" }),
  });
}

test("Cell projects one frozen model into exactly a group, membrane, nucleus, and bounded motif", () => {
  const first = fixture(STAGE_IDS[4]);
  const second = fixture(STAGE_IDS[4]);
  const normal = describeCellSvg(first);
  const repeated = describeCellSvg(second);
  const mitotic = describeCellSvg(Object.freeze({ ...first, cell: withMitosis(first.cell) }));

  assert.deepEqual(normal, repeated);
  assert.equal(Object.isFrozen(normal), true);
  assert.equal(normal.mitosis, undefined);
  assert.equal(Object.keys(normal).length, 5);
  assert.equal([normal.membrane, normal.nucleus].length, 2);
  assert.equal(mitotic.mitosis === undefined ? 0 : 1, 1);
  assert.equal([mitotic.membrane, mitotic.nucleus, mitotic.mitosis].filter(Boolean).length, 3);
  assert.match(normal.className, /^colony-cell colony-cell--depth-(deep|middle|surface) /);
  assert.match(normal.className, /colony-cell--region-[a-z0-9-]+/);
  assert.match(mitotic.className, /colony-cell--mitotic$/);
});

test("Cell maps immutable paths, transform, classes, and scene-local definition references", () => {
  const input = fixture(STAGE_IDS[5], 91);
  const structure = describeCellSvg(input);

  assert.equal(structure.transform, input.cell.transform);
  assert.equal(structure.membrane.d, input.cell.membranePath);
  assert.equal(structure.nucleus.d, input.cell.nucleusPath);
  assert.equal(structure.membrane.fill, `url(#${input.definitionIds.cytoplasmGradient})`);
  assert.equal(structure.membrane.stroke, `url(#${input.definitionIds.membranePattern})`);
  assert.equal(structure.nucleus.fill, `url(#${input.definitionIds.nucleusGradient})`);
  assert.equal(/#[0-9a-f]{3,8}\b/i.test(JSON.stringify(structure)), false);
});

test("Cell component stays presentational and accepts only an upstream-created render model", async () => {
  const source = await readFile("src/svg/cell.tsx", "utf8");
  assert.match(source, /function Cell\(props: CellProps\): JSX\.Element/);
  assert.equal(
    /\b(?:document|window|innerHTML|tabindex|onClick|onKey|setInterval|Math\.random)\b/.test(
      source,
    ),
    false,
  );
  assert.equal(
    /from "\.\/colony_layout|from "\.\/morphology|createCellBlobPaths/.test(source),
    false,
  );
  assert.equal(source.includes("aria-"), false);
  assert.equal(source.includes("<g"), true);
  assert.equal((source.match(/<path/g) ?? []).length, 3);
});
