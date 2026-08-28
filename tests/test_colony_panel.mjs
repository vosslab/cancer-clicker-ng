import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { stageId } from "../src/brands.ts";
import { STAGE_IDS } from "../src/state/catalog.ts";
import {
  createRepresentativeColonyScene,
  representativeSceneSeed,
} from "../src/render/colony_panel.tsx";

test("the colony panel derives one deterministic representative scene for every canonical stage", () => {
  for (const id of STAGE_IDS) {
    const stage = stageId(id);
    const first = createRepresentativeColonyScene(stage);
    const second = createRepresentativeColonyScene(stage);
    assert.deepEqual(first, second, id);
    assert.equal(first.stageId, stage, id);
    assert.equal(first.layout.stageId, stage, id);
    assert.equal(first.morphology.seed, representativeSceneSeed(stage), id);
    assert.equal(first.sceneSeed, representativeSceneSeed(stage), id);
    assert.equal(first.detail, "representative", id);
  }
});

test("the colony panel remains a read-only UI projection without hidden render sources", async () => {
  const source = await readFile("src/render/colony_panel.tsx", "utf8");
  assert.match(source, /createMemo\(\(\) => derivePanelScene\(props\.game\.currentStage\)\)/);
  assert.match(source, /<Colony scene=\{ready\(\)\.scene\} \/>/);
  assert.match(source, /detail: REPRESENTATIVE_DETAIL/);
  assert.equal(
    /inspection|Math\.random|setInterval|setTimeout|innerHTML|document|window/.test(source),
    false,
  );
  assert.equal(/setGame|recordEvent|persistSnapshot|createStore/.test(source), false);
});
