import assert from "node:assert/strict";
import test from "node:test";

import { STAGE_IDS } from "../src/state/catalog.ts";
import { createColonyLayout } from "../src/svg/colony_layout.ts";
import { resolve_stage_morphology } from "../src/svg/morphology.ts";
import {
  createCellRenderModel,
  createColonySceneRequest,
  sceneSvgId,
} from "../src/svg/render_types.ts";

function fixture(stageId, seed = 17, detail = "representative") {
  const morphology = resolve_stage_morphology(seed, stageId);
  const layout = createColonyLayout({ stageId, sceneSeed: seed, morphology, detail });
  return Object.freeze({ layout, morphology, stageId, sceneSeed: seed, detail });
}

test("the render contract accepts every frozen M16/M17 stage fixture without changing either source", () => {
  for (const stageId of STAGE_IDS) {
    const source = fixture(stageId);
    const beforeLayout = structuredClone(source.layout);
    const beforeMorphology = structuredClone(source.morphology);
    const scene = createColonySceneRequest(source);
    assert.deepEqual(scene.layout, beforeLayout, stageId);
    assert.deepEqual(scene.morphology, beforeMorphology, stageId);
    assert.equal(Object.isFrozen(scene), true);
    assert.equal(scene.layout, source.layout);
    assert.equal(scene.morphology, source.morphology);
    assert.ok(
      scene.layout.slots.every(
        (slot) =>
          Number.isFinite(slot.centre.x) &&
          Number.isFinite(slot.centre.y) &&
          Number.isFinite(slot.orientation) &&
          slot.scale > 0 &&
          slot.rx > 0 &&
          slot.ry > 0,
      ),
    );
    assert.match(sceneSvgId(scene, "surface"), /^ccng-[a-z0-9]+-surface$/);
    assert.equal(sceneSvgId(scene, "surface").includes(stageId), false);
  }
});

test("the render contract rejects mismatched, unsafe, forged, accessor, prototype, and extra input", () => {
  const source = fixture(STAGE_IDS[1]);
  const untrusted = (value) => Object.freeze(value);
  assert.throws(() => createColonySceneRequest(untrusted({ ...source, sceneSeed: 18 })));
  assert.throws(() => createColonySceneRequest(untrusted({ ...source, stageId: STAGE_IDS[2] })));
  assert.throws(() => createColonySceneRequest(untrusted({ ...source, detail: "inspection" })));
  assert.throws(() => createColonySceneRequest(untrusted({ ...source, sceneSeed: -1 })));
  assert.throws(() => createColonySceneRequest(untrusted({ ...source, sceneSeed: 0x1_0000_0000 })));
  assert.throws(() => createColonySceneRequest(untrusted({ ...source, extra: true })));
  const inherited = Object.freeze(Object.assign(Object.create({ inherited: true }), source));
  assert.throws(() => createColonySceneRequest(inherited));
  const accessor = {};
  Object.defineProperties(accessor, {
    layout: { enumerable: true, get: () => source.layout },
    morphology: { enumerable: true, value: source.morphology },
    stageId: { enumerable: true, value: source.stageId },
    sceneSeed: { enumerable: true, value: source.sceneSeed },
    detail: { enumerable: true, value: source.detail },
  });
  assert.throws(() => createColonySceneRequest(Object.freeze(accessor)));
  const forgedLayout = Object.freeze({ ...source.layout, extra: true });
  assert.throws(() => createColonySceneRequest(untrusted({ ...source, layout: forgedLayout })));
  const badSlot = Object.freeze({
    ...source.layout.slots[0],
    centre: Object.freeze({ x: NaN, y: 1 }),
  });
  const badSlots = Object.freeze([badSlot, ...source.layout.slots.slice(1)]);
  const invalidGeometry = Object.freeze({ ...source.layout, slots: badSlots });
  assert.throws(() => createColonySceneRequest(untrusted({ ...source, layout: invalidGeometry })));
});

test("cell models retain accepted slot geometry and reject coordinate or cell injection", () => {
  const scene = createColonySceneRequest(fixture(STAGE_IDS[4]));
  const slot = scene.layout.slots[0];
  assert.ok(slot);
  const paths = Object.freeze({
    slotKey: slot.key,
    membranePath: "M 0 0 Z",
    nucleusPath: "M 1 1 Z",
    mitosis: undefined,
  });
  const model = createCellRenderModel(scene, paths);
  assert.equal(Object.isFrozen(model), true);
  assert.equal(model.key, slot.key);
  assert.equal(model.depth, slot.depth);
  assert.equal(model.regionKey, slot.regionKey);
  assert.match(model.transform, /^translate\(/);
  assert.throws(() => createCellRenderModel(scene, Object.freeze({ ...paths, x: 12 })));
  assert.throws(() =>
    createCellRenderModel(scene, Object.freeze({ ...paths, slotKey: "invented" })),
  );
  assert.throws(() => sceneSvgId(scene, "raw_stage"));
});
