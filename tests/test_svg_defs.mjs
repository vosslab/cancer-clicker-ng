import assert from "node:assert/strict";
import test from "node:test";

import { STAGE_IDS } from "../src/state/catalog.ts";
import {
  createColonySvgDefinitions,
  localSvgReference,
  sharedDefinitionNodeCount,
} from "../src/svg/defs.ts";
import { SVG_ICON_NAMES, svgIconModel } from "../src/svg/icons.ts";
import { createColonyLayout } from "../src/svg/colony_layout.ts";
import { resolve_stage_morphology } from "../src/svg/morphology.ts";
import { createColonySceneRequest } from "../src/svg/render_types.ts";

function scene(stageId, seed = 17) {
  const morphology = resolve_stage_morphology(seed, stageId);
  const layout = createColonyLayout({
    stageId,
    sceneSeed: seed,
    morphology,
    detail: "representative",
  });
  return createColonySceneRequest(
    Object.freeze({ layout, morphology, stageId, sceneSeed: seed, detail: "representative" }),
  );
}

function allReferenceTargets(definitions) {
  return [
    localSvgReference(definitions.ids.cytoplasmGradient),
    localSvgReference(definitions.ids.nucleusGradient),
    localSvgReference(definitions.ids.membranePattern),
    localSvgReference(definitions.ids.plateMask),
  ].map((value) => value.slice(5, -1));
}

test("scene-local definitions are deterministic, bounded, frozen, and collision-free", () => {
  const first = createColonySvgDefinitions(scene(STAGE_IDS[0], 17));
  const same = createColonySvgDefinitions(scene(STAGE_IDS[0], 17));
  const second = createColonySvgDefinitions(scene(STAGE_IDS[0], 91));
  assert.deepEqual(first, same);
  assert.equal(Object.isFrozen(first), true);
  assert.equal(Object.isFrozen(first.ids), true);
  assert.equal(Object.isFrozen(first.definitions), true);
  assert.equal(first.definitions.length, 4);
  assert.ok(sharedDefinitionNodeCount(first) <= 14);

  const firstIds = first.definitions.map((item) => item.id);
  const secondIds = second.definitions.map((item) => item.id);
  assert.equal(new Set(firstIds).size, firstIds.length);
  assert.equal(new Set([...firstIds, ...secondIds]).size, firstIds.length + secondIds.length);
  for (const id of [...firstIds, ...secondIds]) assert.match(id, /^ccng-[a-z0-9]+-[a-z0-9-]+$/);
});

test("every generated local reference resolves once and never reaches an external resource", () => {
  const definitions = createColonySvgDefinitions(scene(STAGE_IDS[4], 2026));
  const ids = definitions.definitions.map((item) => item.id);
  for (const target of allReferenceTargets(definitions)) {
    assert.equal(ids.filter((id) => id === target).length, 1, target);
  }
  const serialized = JSON.stringify(definitions);
  assert.equal(/https?:|data:|\.svg|\.png|@font-face|<script/i.test(serialized), false);
  for (const item of definitions.definitions) {
    assert.equal(item.id.includes(" "), false);
    assert.equal(item.id.includes('"'), false);
    assert.equal(item.id.includes("'"), false);
  }
});

test("shared definitions remain fixed when a scene contains many cells", () => {
  const definitions = createColonySvgDefinitions(scene(STAGE_IDS[9], 91));
  const oneCellBudget = sharedDefinitionNodeCount(definitions);
  const thousandCellBudget = sharedDefinitionNodeCount(definitions);
  assert.equal(oneCellBudget, thousandCellBudget);
  assert.equal(
    definitions.definitions.some((item) => item.element === "filter"),
    false,
  );
  assert.equal(
    definitions.definitions.filter((item) => item.element === "linearGradient").length,
    2,
  );
});

test("hostile scene input and unsafe identifier suffixes are rejected at the definition boundary", () => {
  const trusted = scene(STAGE_IDS[1], 17);
  const hostile = Object.freeze({
    ...trusted,
    layout: Object.freeze({ ...trusted.layout, sceneKey: "<img src=x onerror=1>" }),
  });
  assert.throws(() => createColonySvgDefinitions(hostile));
  assert.throws(() => createColonySvgDefinitions(Object.freeze({ ...trusted, extra: true })));
});

test("all decorative glyphs are deterministic, unlabelled geometry without stateful SVG features", () => {
  for (const name of SVG_ICON_NAMES) {
    const first = svgIconModel(name);
    const second = svgIconModel(name);
    assert.equal(first, second);
    assert.equal(Object.isFrozen(first), true);
    assert.equal(first.viewBox, "0 0 24 24");
    assert.ok(first.primitives.length > 0);
    const serialized = JSON.stringify(first);
    const attributeKeys = first.primitives.flatMap((primitive) =>
      Object.keys(primitive.attributes),
    );
    for (const unsafeKey of ["id", "href", "aria-label", "tabindex", "onclick", "fillRule"])
      assert.equal(attributeKeys.includes(unsafeKey), false, unsafeKey);
    assert.equal(/url\(|https?:/i.test(serialized), false);
    assert.equal(serialized.includes("currentColor"), true);
  }
});
