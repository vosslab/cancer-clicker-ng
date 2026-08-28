import assert from "node:assert/strict";
import test from "node:test";

import {
  bigNum,
  eventId,
  hallmarkId,
  mutationId,
  regionId,
  routeId,
  stageId,
} from "../src/brands.ts";
import { createInitialGameState } from "../src/state/game_state.ts";
import { createColonySceneRequest } from "../src/svg/render_types.ts";
import { createGameColonyScene } from "../src/svg/colony_visual_state.ts";

function region(name, viability = 1) {
  return {
    id: regionId(name),
    capacity: 8,
    viability,
    phenotype: "migratory",
    vesselLinkIds: [eventId(`vessel:${name}`)],
    routeIds: [routeId(`route:${name}`)],
  };
}

function activeLivingTumorState() {
  const initial = createInitialGameState();
  const primary = region("primary", 0.5);
  return {
    ...initial,
    currentStage: stageId("angiogenic_primary"),
    deterministicSeed: 123,
    cells: bigNum(200, 0),
    atp: bigNum(3, 0),
    signalingAllocation: "cycle",
    cycleFillRate: 1,
    bypassedCheckpoints: ["contact-inhibition"],
    survivalCapacity: 1,
    telomeraseCharges: 1,
    regions: [primary],
    committedCellCommitments: { "route:primary": 3 },
    seededSites: [primary.id],
    maskedRegions: [primary.id],
    inflammationEpisodes: [
      { id: eventId("inflammation:primary"), regionId: primary.id, deadlineMs: 100 },
    ],
    regionalInflammation: { primary: 1 },
    chosenMutations: [mutationId("repair_bypass")],
    hallmarkLevels: [
      "proliferative_signaling",
      "growth_suppressor_evasion",
      "cell_death_resistance",
      "replicative_immortality",
      "angiogenesis",
      "invasion_metastasis",
      "metabolic_deregulation",
      "immune_destruction_avoidance",
      "tumor_promoting_inflammation",
      "genome_instability_mutation",
    ].map((id) => ({ id: hallmarkId(id), level: 1 })),
  };
}

test("game state produces one frozen finite renderer scene without mutation", () => {
  const game = activeLivingTumorState();
  const before = structuredClone(game);
  const scene = createGameColonyScene(game);

  assert.deepEqual(game, before);
  assert.equal(Object.isFrozen(scene) && Object.isFrozen(scene.visual), true);
  assert.doesNotThrow(() => createColonySceneRequest(scene));
  assert.equal(
    scene.layout.slots.every((slot) => Number.isFinite(slot.centre.x)),
    true,
  );
});

test("authoritative regional state creates named visual evidence and keeps its relation across unrelated state", () => {
  const game = activeLivingTumorState();
  const scene = createGameColonyScene(game);
  const unrelated = createGameColonyScene({ ...game, totalOfflineMs: 9000, numberFormat: "full" });
  const effectIds = new Set(scene.visual.effects.map((effect) => effect.id));
  const conditions = new Set(scene.visual.overlays.map((overlay) => overlay.condition));

  assert.equal(effectIds.has("perfusion-supply") && effectIds.has("mutation-heterogeneity"), true);
  assert.equal(
    conditions.has("hypoxic") && conditions.has("masked") && conditions.has("inflamed"),
    true,
  );
  assert.equal(
    scene.visual.overlays.some((overlay) => overlay.routeCommitted && overlay.seeded),
    true,
  );
  assert.deepEqual(scene.visual.invasion, { routeCommitted: true, seeded: true });
  assert.deepEqual(
    unrelated.visual.overlays.map((overlay) => [overlay.sourceRegionId, overlay.layoutRegionKey]),
    scene.visual.overlays.map((overlay) => [overlay.sourceRegionId, overlay.layoutRegionKey]),
  );
});

test("systemic invasion separates durable route commitment from seeded-site evidence", () => {
  const game = activeLivingTumorState();
  const routeOnly = createGameColonyScene({ ...game, seededSites: [] });
  const seededOnly = createGameColonyScene({ ...game, committedCellCommitments: {} });

  assert.deepEqual(routeOnly.visual.invasion, { routeCommitted: true, seeded: false });
  assert.deepEqual(seededOnly.visual.invasion, { routeCommitted: false, seeded: true });
});

test("render boundary rejects forged visual records before SVG projection", () => {
  const scene = createGameColonyScene(activeLivingTumorState());
  const extraVisual = Object.freeze({ ...scene.visual, extra: true });
  const forged = Object.freeze({ ...scene, visual: extraVisual });
  const inheritedVisual = Object.freeze(
    Object.assign(Object.create({ inherited: true }), scene.visual),
  );
  const inherited = Object.freeze({ ...scene, visual: inheritedVisual });
  const forgedInvasion = Object.freeze({ routeCommitted: true, seeded: false, extra: true });
  const forgedSystemic = Object.freeze({
    ...scene,
    visual: Object.freeze({ ...scene.visual, invasion: forgedInvasion }),
  });
  const accessor = { ...scene };
  Object.defineProperty(accessor, "visual", { enumerable: true, get: () => scene.visual });

  assert.throws(() => createColonySceneRequest(forged));
  assert.throws(() => createColonySceneRequest(inherited));
  assert.throws(() => createColonySceneRequest(forgedSystemic));
  assert.throws(() => createColonySceneRequest(Object.freeze(accessor)));
});
