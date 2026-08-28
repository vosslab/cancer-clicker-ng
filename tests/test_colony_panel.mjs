import assert from "node:assert/strict";
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
