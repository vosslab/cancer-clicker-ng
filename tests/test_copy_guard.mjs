import assert from "node:assert/strict";
import test from "node:test";

import { GAME_COPY } from "../src/content/game_copy.ts";
import { ENDING_COPY } from "../src/content/ending_copy.ts";
import { STAGE_IDS } from "../src/state/catalog.ts";
import { createInitialGameState } from "../src/state/game_state.ts";
import { describeColonyScene } from "../src/svg/describe.ts";
import { createGameColonyScene } from "../src/svg/colony_visual_state.ts";

test("canonical boundary copy identifies the game as fictional", () => {
  assert.equal(GAME_COPY.mastheadEyebrow, "Fictional cancer-growth simulation");
  assert.match(GAME_COPY.mastheadEyebrow, /fictional/i);
});

test("Chicago-scale copy keeps the result modeled and play continuing", () => {
  const endingCopy = Object.values(ENDING_COPY).join(" ");
  assert.match(endingCopy, /modeled/i);
  assert.match(endingCopy, /metaphor/i);
  assert.match(ENDING_COPY.continuation, /continue/i);
});

test("canonical colony description identifies a fictional game illustration", () => {
  const game = { ...createInitialGameState(), currentStage: STAGE_IDS[0] };
  const scene = createGameColonyScene(game);
  assert.match(describeColonyScene(scene).description, /fictional game illustration/i);
});

test("deadpan subtitle names the transformed cell rather than a person", () => {
  assert.match(GAME_COPY.mastheadSubtitle, /^One transformed cell\./);
  assert.doesNotMatch(GAME_COPY.mastheadSubtitle, /\b(?:you|your|patient|person|people)\b/i);
});
