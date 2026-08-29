import assert from "node:assert/strict";
import test from "node:test";

import {
  EVOLUTION_TABS,
  createGameUiState,
  visibleEvolutionTabs,
} from "../src/render/game_ui_state.ts";
import { hallmarkId, stageId } from "../src/brands.ts";
import { createInitialGameState } from "../src/state/game_state.ts";

test("game UI keeps exactly one named evolution route active", () => {
  const ui = createGameUiState();
  assert.equal(ui.activeEvolutionTab(), "stage");
  for (const route of EVOLUTION_TABS) {
    ui.setActiveEvolutionTab(route);
    assert.equal(ui.activeEvolutionTab(), route);
  }
});

test("opening navigation reveals only immediate systems and grows from saved capability", () => {
  const initial = createInitialGameState();
  assert.deepEqual(visibleEvolutionTabs(initial), ["stage", "hallmarks"]);
  const later = {
    ...initial,
    currentStage: stageId("global_lab_contamination"),
    hallmarkLevels: [{ id: hallmarkId("invasion_metastasis"), level: 1 }],
    prestigeAvailability: [
      { id: "L3", status: "earned" },
      { id: "L4", status: "earned" },
    ],
    lineageLedger: { ...initial.lineageLedger, networkSeed: 7 },
  };
  assert.deepEqual(visibleEvolutionTabs(later), [
    "stage",
    "hallmarks",
    "routes",
    "prestige",
    "culture",
    "network",
  ]);
});
