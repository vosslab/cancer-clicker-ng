import assert from "node:assert/strict";
import test from "node:test";

import { EVOLUTION_TABS, createGameUiState } from "../src/render/game_ui_state.ts";

test("game UI keeps exactly one named evolution route active", () => {
  const ui = createGameUiState();
  assert.equal(ui.activeEvolutionTab(), "stage");
  for (const route of EVOLUTION_TABS) {
    ui.setActiveEvolutionTab(route);
    assert.equal(ui.activeEvolutionTab(), route);
  }
});
