import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { createInitialGameState } from "../src/state/game_state.ts";
import { createRepresentativeColonyScene } from "../src/render/colony_panel.tsx";

test("the colony panel derives one deterministic living scene from authoritative game state", () => {
  const game = createInitialGameState();
  const first = createRepresentativeColonyScene(game);
  const second = createRepresentativeColonyScene(game);
  assert.deepEqual(first, second);
  assert.equal(first.stageId, game.currentStage);
  assert.equal(first.layout.stageId, game.currentStage);
  assert.equal(first.visual.growthState, "quiet");
});

test("the colony panel owns one native action and delegates pointer intent from cell geometry", async () => {
  const source = await readFile("src/render/colony_panel.tsx", "utf8");
  assert.match(source, /id="divide-button"/);
  assert.match(source, /data-colony-action="divide"/);
  assert.match(source, /target\.closest\("\[data-colony-cell\]"\)/);
  assert.match(source, /event\.detail === 0 \|\| targetIsVisibleColonyCell\(event\.target\)/);
  assert.match(source, /<Colony scene=\{ready\(\)\.scene\} decorative \/>/);
  assert.equal(/setGame|recordEvent|persistSnapshot|createStore/.test(source), false);
});
