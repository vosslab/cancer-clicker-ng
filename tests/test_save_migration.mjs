import assert from "node:assert/strict";
import test from "node:test";
import { hallmarkId, regionId, stageId } from "../src/brands.ts";
import { fromSafeInteger } from "../src/bignum/bignum.ts";
import { MICROBIOME_COMPOSITION_CATALOG, MICROBIOME_POOL_ID } from "../src/hallmarks/microbiome_catalog.ts";
import { createInitialGameState } from "../src/state/game_state.ts";
import { parseSave, serializeGameState } from "../src/state/save_load.ts";

function populatedP5State() {
  const initial = createInitialGameState();
  const region = { id: regionId("colony"), capacity: 3, viability: 1, phenotype: "proliferative", vesselLinkIds: [], routeIds: [] };
  const offer = {
    id: "composition-offer",
    poolId: MICROBIOME_POOL_ID,
    compositions: [MICROBIOME_COMPOSITION_CATALOG[0], MICROBIOME_COMPOSITION_CATALOG[1], MICROBIOME_COMPOSITION_CATALOG[2]],
    sourceSeed: 7,
    sourceSequence: 2,
    sourceStage: stageId("global_lab_contamination"),
    expiresAtMs: 40,
  };
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
      plasticity: { switchCooldownByRegion: { colony: 15 } },
      epigenetic: { assignments: [{ hallmarkId: hallmarkId("proliferative_signaling"), optionId: "signaling:burst-bias" }], cooldownDeadlineMs: 20 },
      microbiome: { activeComposition: null, pendingOffer: offer, nextRotationDeadlineMs: 40, rotationSequence: 2 },
      senescence: {
        pendingDecisions: [{ id: "decision-1", regionId: region.id, cause: "damage-failure", createdAtMs: 9 }],
        retainedRegions: [],
      },
    },
  };
}

function loaded(raw) {
  const result = parseSave(raw);
  assert.equal(result.status, "loaded");
  return result.state;
}

test("p4 saves migrate to one empty p5 late-hallmark aggregate", () => {
  const current = JSON.parse(serializeGameState(populatedP5State(), 11));
  current.progressionVersion = 4;
  const { lateHallmarks: _p5Aggregate, ...p5WithoutAggregate } = current.state;
  const region = { ...p5WithoutAggregate.regions[0], senescenceEventId: "retired-decision" };
  current.state = {
    ...p5WithoutAggregate,
    regions: [region],
    phenotypeCooldowns: { colony: 15 },
    regionalModifiers: { colony: 1 },
    programs: { allowedByHallmark: {}, selectedByHallmark: {}, eligibleHallmarks: [], cooldownDeadlineMs: null },
    microbiome: { offerIds: [], seed: 0, sequence: 0, rotationCounter: 0, rotationDeadlineMs: null, pendingCompatibility: null, selectedNiches: [], compatibilitySnapshot: [] },
    senescentRegions: [],
    secretoryEffects: {},
    clearanceQueue: [],
  };
  const state = loaded(JSON.stringify(current));
  assert.deepEqual(state.lateHallmarks, createInitialGameState().lateHallmarks);
  assert.ok(!("senescenceEventId" in state.regions[0]));
});

test("populated p5 late hallmark state round-trips with exact writer version", () => {
  const state = populatedP5State();
  const raw = serializeGameState(state, 11);
  const envelope = JSON.parse(raw);
  assert.equal(envelope.progressionVersion, 5);
  assert.deepEqual(loaded(raw), state);
  assert.equal(serializeGameState(loaded(raw), 11), raw);
});

test("p5 reader and writer reject hostile aggregate shapes without recovery", () => {
  const raw = JSON.parse(serializeGameState(populatedP5State(), 11));
  raw.state.lateHallmarks.microbiome.pendingOffer.compositions[0].niches[0].label = "forged";
  assert.equal(parseSave(JSON.stringify(raw)).status, "rejected");
  assert.throws(
    () => serializeGameState({ ...populatedP5State(), lateHallmarks: { ...populatedP5State().lateHallmarks, extra: true } }, 11),
    /Current save state is invalid/,
  );
});
