import assert from "node:assert/strict";
import test from "node:test";

import { stageId } from "../src/brands.ts";
import { STAGE_IDS } from "../src/state/catalog.ts";
import { createInitialGameState } from "../src/state/game_state.ts";
import { describeColonyScene } from "../src/svg/describe.ts";
import { createGameColonyScene } from "../src/svg/colony_visual_state.ts";

function fixture(stage) {
  const game = { ...createInitialGameState(), currentStage: stageId(stage), deterministicSeed: 17 };
  return createGameColonyScene(game);
}

const BANNED_LANGUAGE =
  /\b(?:diagnos(?:e|ed|is|tic)|prognos(?:is|tic)|patient|clinical|survival|treatment|grade|outcome)\b/i;
const RAW_STAGE_ID = new RegExp(`\\b(?:${STAGE_IDS.join("|")})\\b`);

test("all canonical stages receive deterministic, distinct, bounded, non-diagnostic SVG copy", () => {
  const seen = new Set();
  for (const stageId of STAGE_IDS) {
    const scene = fixture(stageId);
    const before = structuredClone(scene);
    const first = describeColonyScene(scene);
    const second = describeColonyScene(scene);
    assert.deepEqual(first, second, stageId);
    assert.deepEqual(scene, before, `${stageId}: input remains unchanged`);
    assert.equal(Object.isFrozen(first), true);
    assert.ok(first.title.length >= 20 && first.title.length <= 90, `${stageId}: title length`);
    assert.ok(
      first.description.length >= 120 && first.description.length <= 320,
      `${stageId}: description length`,
    );
    assert.ok(
      first.caption.length >= 20 && first.caption.length <= 110,
      `${stageId}: caption length`,
    );
    const combined = `${first.title} ${first.description} ${first.caption}`;
    assert.doesNotMatch(combined, BANNED_LANGUAGE, stageId);
    assert.doesNotMatch(combined, RAW_STAGE_ID, stageId);
    assert.match(first.description, /fictional game illustration/);
    assert.match(first.description, /depth layers/);
    seen.add(combined);
  }
  assert.equal(seen.size, STAGE_IDS.length);
});

test("stage-specific physical composition changes the accessible description", () => {
  const opening = describeColonyScene(fixture(STAGE_IDS[0]));
  const hypoxic = describeColonyScene(fixture(STAGE_IDS[3]));
  const culture = describeColonyScene(fixture(STAGE_IDS[10]));
  assert.notEqual(opening.description, hypoxic.description);
  assert.notEqual(hypoxic.description, culture.description);
  assert.match(hypoxic.caption, /central void/);
  assert.match(culture.caption, /moat/);
});

test("forged, mismatched, and metric-inconsistent render inputs reject before copy is made", () => {
  const scene = fixture(STAGE_IDS[1]);
  assert.throws(() => describeColonyScene(Object.freeze({ ...scene, sceneSeed: 18 })));
  assert.throws(() => describeColonyScene(Object.freeze({ ...scene, stageId: STAGE_IDS[2] })));
  const metrics = Object.freeze({ ...scene.layout.metrics, componentCount: 99 });
  const layout = Object.freeze({ ...scene.layout, metrics });
  assert.throws(() => describeColonyScene(Object.freeze({ ...scene, layout })));
  const malformed = Object.freeze({ ...scene, description: "injected" });
  assert.throws(() => describeColonyScene(malformed));
});
