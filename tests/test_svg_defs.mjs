import assert from "node:assert/strict";
import test from "node:test";

import { createInitialGameState } from "../src/state/game_state.ts";
import {
  createColonySvgDefinitions,
  localSvgReference,
  sharedDefinitionNodeCount,
} from "../src/svg/defs.ts";
import { createGameColonyScene } from "../src/svg/colony_visual_state.ts";

test("scene-local definitions are frozen, uniquely named, and resolve every renderer paint reference", () => {
  const definitions = createColonySvgDefinitions(createGameColonyScene(createInitialGameState()));
  const ids = definitions.definitions.map((item) => item.id);
  const references = Object.values(definitions.ids).map((id) => localSvgReference(id).slice(5, -1));

  assert.equal(Object.isFrozen(definitions), true);
  assert.equal(Object.isFrozen(definitions.ids), true);
  assert.equal(new Set(ids).size, ids.length);
  for (const target of references)
    assert.equal(ids.filter((id) => id === target).length, 1, target);
  assert.ok(sharedDefinitionNodeCount(definitions) > 0);
});

test("definitions remain self-contained editable vector data", () => {
  const definitions = createColonySvgDefinitions(createGameColonyScene(createInitialGameState()));
  const serialized = JSON.stringify(definitions);

  assert.equal(/https?:|data:|\.svg|\.png|@font-face|<script/i.test(serialized), false);
  assert.ok(definitions.definitions.some((item) => item.element === "radialGradient"));
  assert.ok(definitions.definitions.some((item) => item.element === "linearGradient"));
});
