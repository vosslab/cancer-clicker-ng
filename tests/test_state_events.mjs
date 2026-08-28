import assert from "node:assert/strict";
import test from "node:test";
import { hallmarkId, regionId, stageId } from "../src/brands.ts";
import { fromSafeInteger } from "../src/bignum/bignum.ts";
import { MICROBIOME_COMPOSITION_CATALOG, MICROBIOME_POOL_ID } from "../src/hallmarks/microbiome_catalog.ts";
import { EVENT_TYPES } from "../src/types/events.ts";
import { createInitialGameState } from "../src/state/game_state.ts";
import { recordEvent } from "../src/state/events.ts";

function lateState() {
  const initial = createInitialGameState();
  const region = { id: regionId("colony"), capacity: 3, viability: 1, phenotype: "proliferative", vesselLinkIds: [], routeIds: [] };
  return {
    ...initial,
    atp: fromSafeInteger(100),
    activeTimeMs: 10,
    currentStage: stageId("global_lab_contamination"),
    regions: [region],
    hallmarkLevels: [
      { id: hallmarkId("proliferative_signaling"), level: 1 },
      { id: hallmarkId("phenotypic_plasticity"), level: 1 },
      { id: hallmarkId("epigenetic_reprogramming"), level: 1 },
      { id: hallmarkId("polymorphic_microbiomes"), level: 1 },
      { id: hallmarkId("senescent_cells"), level: 1 },
    ],
    lateHallmarks: {
      plasticity: { switchCooldownByRegion: {} },
      epigenetic: { assignments: [], cooldownDeadlineMs: null },
      microbiome: {
        activeComposition: null,
        pendingOffer: {
          id: "offer-1",
          poolId: MICROBIOME_POOL_ID,
          compositions: [MICROBIOME_COMPOSITION_CATALOG[0], MICROBIOME_COMPOSITION_CATALOG[1], MICROBIOME_COMPOSITION_CATALOG[2]],
          sourceSeed: 1,
          sourceSequence: 0,
          sourceStage: stageId("global_lab_contamination"),
          expiresAtMs: 30,
        },
        nextRotationDeadlineMs: 30,
        rotationSequence: 0,
      },
      senescence: { pendingDecisions: [], retainedRegions: [] },
    },
  };
}

test("late hallmark commands use the closed current event vocabulary", () => {
  assert.ok(EVENT_TYPES.includes("assign-region-phenotype"));
  assert.ok(EVENT_TYPES.includes("reconfigure-hallmark-program"));
  assert.ok(EVENT_TYPES.includes("install-microbiome-composition"));
  assert.ok(EVENT_TYPES.includes("resolve-senescence-decision"));
  assert.equal(EVENT_TYPES.some((type) => ["switch-phenotype", "edit-program", "select-microbiome", "resolve-senescence"].includes(type)), false);
});

test("late hallmark reducer commits each accepted command once and preserves rejected state atomically", () => {
  const before = lateState();
  const phenotype = recordEvent(before, { type: "assign-region-phenotype", regionId: "colony", phenotype: "migratory", atMs: 10 });
  assert.equal(phenotype.eventSequence, before.eventSequence + 1);
  assert.equal(phenotype.regions[0].phenotype, "migratory");
  assert.equal(phenotype.lateHallmarks.plasticity.switchCooldownByRegion.colony, 60_010);
  const program = recordEvent(phenotype, { type: "reconfigure-hallmark-program", hallmarkId: "proliferative_signaling", optionId: "signaling:burst-bias", atMs: 10 });
  assert.equal(program.eventSequence, phenotype.eventSequence + 1);
  assert.deepEqual(program.lateHallmarks.epigenetic.assignments, [{ hallmarkId: "proliferative_signaling", optionId: "signaling:burst-bias" }]);
  const installed = recordEvent(program, { type: "install-microbiome-composition", offerId: "offer-1", compositionId: "fermenter-commensal", atMs: 10 });
  assert.equal(installed.eventSequence, program.eventSequence + 1);
  assert.equal(installed.lateHallmarks.microbiome.activeComposition?.composition.id, "fermenter-commensal");
  assert.equal(installed.lateHallmarks.microbiome.pendingOffer, null);
  const snapshot = structuredClone(installed);
  assert.throws(() => recordEvent(installed, { type: "install-microbiome-composition", offerId: "offer-1", compositionId: "fermenter-commensal", atMs: 10 }), /unavailable/);
  assert.deepEqual(installed, snapshot);
});
