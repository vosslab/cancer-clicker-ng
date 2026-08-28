import assert from "node:assert/strict";
import test from "node:test";

import { bigNum, networkNodeId, stageId } from "../src/brands.ts";
import { createInitialGameState } from "../src/state/game_state.ts";
import { describeColonyScene } from "../src/svg/describe.ts";
import { createGameColonyScene } from "../src/svg/colony_visual_state.ts";
import { createColonySceneRequest } from "../src/svg/render_types.ts";

function reachedChicagoState() {
  const initial = createInitialGameState();
  return {
    ...initial,
    currentStage: stageId("global_lab_contamination"),
    deterministicSeed: 91,
    cells: bigNum(3, 25),
    network: {
      ...initial.network,
      globalTier: 2,
      nodes: [
        {
          id: networkNodeId("authored-node-v1:primary-lab"),
          sourceKind: "authored",
          campaignId: null,
          status: "stable",
          establishedAtActiveMs: 1,
          stabilizedAtActiveMs: 2,
        },
        {
          id: networkNodeId("authored-node-v1:vascular-relay"),
          sourceKind: "authored",
          campaignId: null,
          status: "stable",
          establishedAtActiveMs: 1,
          stabilizedAtActiveMs: 2,
        },
      ],
    },
    ending: {
      phase: "reached",
      reachedAtActiveMs: 4,
      sourceEventSequence: 3,
      reachedCells: bigNum(2.5, 25),
      reachedNetworkTier: 1,
    },
  };
}

test("earned ending state maps network facts onto stable accepted colony anchors", () => {
  const scene = createGameColonyScene(reachedChicagoState());
  const ending = scene.visual.ending;

  assert.equal(ending.mode, "chicago-scale");
  assert.equal(ending.networkTier, 2);
  assert.equal(ending.connectedSiteCount, 2);
  assert.equal(ending.routeDensity, 2);
  assert.equal(Object.isFrozen(ending), true);
  assert.equal(Object.isFrozen(ending.routeAnchors), true);
  assert.equal(ending.routeAnchors.length, 2);
  assert.equal(
    ending.routeAnchors.every((anchor) =>
      scene.layout.slots.some((slot) => slot.centre.x === anchor.x && slot.centre.y === anchor.y),
    ),
    true,
  );
  assert.match(describeColonyScene(scene).title, /Chicago-scale/);
  assert.match(describeColonyScene(scene).description, /street grid/);
});

test("SVG scene boundary rejects a forged mutable Chicago ending payload", () => {
  const scene = createGameColonyScene(reachedChicagoState());
  const ending = Object.freeze({ ...scene.visual.ending, routeDensity: 7 });
  const visual = Object.freeze({ ...scene.visual, ending });
  assert.throws(() => createColonySceneRequest(Object.freeze({ ...scene, visual })));
});
