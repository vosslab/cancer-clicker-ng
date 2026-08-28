import assert from "node:assert/strict";
import test from "node:test";

import {
  bigNum,
  eventId,
  hallmarkId,
  lateProgramOptionId,
  microbiomeCompositionId,
  microbiomeOfferId,
  mutationId,
  regionId,
  routeId,
  stageId,
} from "../src/brands.ts";
import { findMicrobiomeComposition } from "../src/hallmarks/microbiome_catalog.ts";
import { createInitialGameState } from "../src/state/game_state.ts";
import { createColonySceneRequest } from "../src/svg/render_types.ts";
import { createGameColonyScene } from "../src/svg/colony_visual_state.ts";

function region(name, viability = 1, phenotype = "migratory") {
  return {
    id: regionId(name),
    capacity: 8,
    viability,
    phenotype,
    vesselLinkIds: [eventId(`vessel:${name}`)],
    routeIds: [routeId(`route:${name}`)],
  };
}

function lateHallmarkTumorState() {
  const composition = findMicrobiomeComposition(microbiomeCompositionId("fermenter-commensal"));
  assert.ok(composition);
  const retained = region("retained", 1, "migratory");
  const proliferative = region("proliferative", 1, "proliferative");
  const stressTolerant = region("stress-tolerant", 1, "stress-tolerant");
  const initial = createInitialGameState();
  return {
    ...initial,
    currentStage: stageId("global_lab_contamination"),
    deterministicSeed: 321,
    regions: [retained, proliferative, stressTolerant],
    hallmarkLevels: [
      "proliferative_signaling",
      "phenotypic_plasticity",
      "epigenetic_reprogramming",
      "polymorphic_microbiomes",
      "senescent_cells",
    ].map((id) => ({ id: hallmarkId(id), level: 1 })),
    lateHallmarks: {
      ...initial.lateHallmarks,
      epigenetic: {
        assignments: [
          {
            hallmarkId: hallmarkId("proliferative_signaling"),
            optionId: lateProgramOptionId("signaling:cycle-bias"),
          },
        ],
        cooldownDeadlineMs: null,
      },
      microbiome: {
        ...initial.lateHallmarks.microbiome,
        activeComposition: {
          offerId: microbiomeOfferId("installed-fermenter-commensal"),
          composition,
          installedAtMs: 0,
        },
      },
      senescence: {
        pendingDecisions: [],
        retainedRegions: [
          {
            decisionId: eventId("senescence:retained"),
            regionId: retained.id,
            cause: "damage-failure",
            createdAtMs: 0,
            retainedAtMs: 1,
          },
        ],
      },
    },
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

test("operational late hallmarks create frozen provenance-backed visual effects", () => {
  const scene = createGameColonyScene(lateHallmarkTumorState());
  const effects = new Map(scene.visual.effects.map((effect) => [effect.id, effect]));

  for (const [id, sourceId, referenceRowId, contributorId] of [
    [
      "phenotype-variance",
      "phenotypic_plasticity",
      "morphology:phenotype_variance",
      "hallmark:phenotypic_plasticity",
    ],
    [
      "chromatin-program",
      "epigenetic_reprogramming",
      "morphology:chromatin_texture",
      "hallmark:epigenetic_reprogramming",
    ],
    [
      "microbiome-surface",
      "polymorphic_microbiomes",
      "morphology:surface_motif",
      "hallmark:polymorphic_microbiomes",
    ],
    [
      "senescent-region",
      "senescent_cells",
      "morphology:senescent_shape",
      "hallmark:senescent_cells",
    ],
  ]) {
    const effect = effects.get(id);
    assert.ok(effect);
    assert.equal(effect.sourceId, sourceId);
    assert.equal(effect.referenceRowIds.includes(referenceRowId), true);
    assert.equal(
      effect.morphology.some((entry) => entry.source.contributorId === contributorId),
      true,
    );
    assert.equal(Object.isFrozen(effect), true);
  }

  assert.deepEqual(effects.get("phenotype-variance")?.regionIds, [
    regionId("proliferative"),
    regionId("stress-tolerant"),
  ]);
  assert.deepEqual(effects.get("senescent-region")?.regionIds, [regionId("retained")]);
  assert.deepEqual(effects.get("chromatin-program")?.regionIds, []);
  assert.deepEqual(effects.get("microbiome-surface")?.regionIds, []);
});

test("pending or cleared senescence has no retained visual evidence", () => {
  const game = lateHallmarkTumorState();
  const retained = regionId("retained");
  const pendingOnly = {
    ...game,
    lateHallmarks: {
      ...game.lateHallmarks,
      senescence: {
        pendingDecisions: [
          {
            id: eventId("senescence:pending"),
            regionId: retained,
            cause: "damage-failure",
            createdAtMs: 2,
          },
        ],
        retainedRegions: [],
      },
    },
  };
  const cleared = {
    ...pendingOnly,
    lateHallmarks: {
      ...pendingOnly.lateHallmarks,
      senescence: { pendingDecisions: [], retainedRegions: [] },
    },
  };

  for (const candidate of [pendingOnly, cleared]) {
    const visual = createGameColonyScene(candidate).visual;
    assert.equal(
      visual.effects.some((effect) => effect.id === "senescent-region"),
      false,
    );
    assert.equal(
      visual.overlays.some(
        (overlay) => overlay.sourceRegionId === retained && overlay.condition === "senescent",
      ),
      false,
    );
  }
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
