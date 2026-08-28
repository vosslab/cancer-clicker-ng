import assert from "node:assert/strict";
import test from "node:test";
import { hallmarkId, regionId, stageId } from "../src/brands.ts";
import { fromSafeInteger } from "../src/bignum/bignum.ts";
import {
  MICROBIOME_COMPOSITION_CATALOG,
  MICROBIOME_POOL_ID,
} from "../src/hallmarks/microbiome_catalog.ts";
import { createInitialGameState } from "../src/state/game_state.ts";
import { parseSave, serializeGameState } from "../src/state/save_load.ts";

function populatedP5State() {
  const initial = createInitialGameState();
  const region = {
    id: regionId("colony"),
    capacity: 3,
    viability: 1,
    phenotype: "proliferative",
    vesselLinkIds: [],
    routeIds: [],
  };
  const senescentRegion = {
    id: regionId("senescent"),
    capacity: 2,
    viability: 0.6,
    phenotype: "stress-tolerant",
    vesselLinkIds: [],
    routeIds: [],
  };
  const offer = {
    id: "composition-offer",
    poolId: MICROBIOME_POOL_ID,
    compositions: [
      MICROBIOME_COMPOSITION_CATALOG[0],
      MICROBIOME_COMPOSITION_CATALOG[1],
      MICROBIOME_COMPOSITION_CATALOG[2],
    ],
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
    regions: [region, senescentRegion],
    hallmarkLevels: [
      { id: hallmarkId("proliferative_signaling"), level: 1 },
      { id: hallmarkId("genome_instability_mutation"), level: 1 },
      { id: hallmarkId("phenotypic_plasticity"), level: 1 },
      { id: hallmarkId("epigenetic_reprogramming"), level: 1 },
      { id: hallmarkId("polymorphic_microbiomes"), level: 1 },
      { id: hallmarkId("senescent_cells"), level: 1 },
    ],
    lateHallmarks: {
      plasticity: { switchCooldownByRegion: { colony: 15 } },
      epigenetic: {
        assignments: [
          { hallmarkId: hallmarkId("proliferative_signaling"), optionId: "signaling:burst-bias" },
        ],
        cooldownDeadlineMs: 20,
      },
      microbiome: {
        activeComposition: null,
        pendingOffer: offer,
        nextRotationDeadlineMs: 40,
        rotationSequence: 2,
      },
      senescence: {
        pendingDecisions: [
          {
            id: "decision-1",
            regionId: senescentRegion.id,
            cause: "damage-failure",
            createdAtMs: 9,
          },
        ],
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

test("p4 saves migrate through current empty prestige and ending aggregates", () => {
  const current = JSON.parse(serializeGameState(populatedP5State(), 11));
  current.progressionVersion = 4;
  const {
    lateHallmarks: _p5Aggregate,
    lineageLedger: _lineageLedger,
    metastasis: _metastasis,
    hostTransfer: _hostTransfer,
    culture: _culture,
    network: _network,
    ending: _ending,
    ...p5WithoutAggregate
  } = current.state;
  const region = { ...p5WithoutAggregate.regions[0], senescenceEventId: "retired-decision" };
  current.state = {
    ...p5WithoutAggregate,
    endingReached: false,
    regions: [region],
    phenotypeCooldowns: { colony: 15 },
    regionalModifiers: { colony: 1 },
    programs: {
      allowedByHallmark: {},
      selectedByHallmark: {},
      eligibleHallmarks: [],
      cooldownDeadlineMs: null,
    },
    microbiome: {
      offerIds: [],
      seed: 0,
      sequence: 0,
      rotationCounter: 0,
      rotationDeadlineMs: null,
      pendingCompatibility: null,
      selectedNiches: [],
      compatibilitySnapshot: [],
    },
    senescentRegions: [],
    secretoryEffects: {},
    clearanceQueue: [],
  };
  const state = loaded(JSON.stringify(current));
  assert.deepEqual(state.lateHallmarks, createInitialGameState().lateHallmarks);
  assert.deepEqual(state.metastasis, createInitialGameState().metastasis);
  assert.deepEqual(state.hostTransfer, createInitialGameState().hostTransfer);
  assert.deepEqual(state.culture, createInitialGameState().culture);
  assert.deepEqual(state.network, createInitialGameState().network);
  assert.deepEqual(state.ending, createInitialGameState().ending);
  assert.ok(state.lineageLedger.lineageSeed > 0);
  assert.ok(!("senescenceEventId" in state.regions[0]));
});

test("populated current late hallmark state round-trips with exact writer version", () => {
  const state = populatedP5State();
  const raw = serializeGameState(state, 11);
  const envelope = JSON.parse(raw);
  assert.equal(envelope.progressionVersion, 8);
  assert.deepEqual(loaded(raw), state);
  assert.equal(serializeGameState(loaded(raw), 11), raw);
});

test("p5 reader and writer reject hostile aggregate shapes without recovery", () => {
  const raw = JSON.parse(serializeGameState(populatedP5State(), 11));
  raw.state.lateHallmarks.microbiome.pendingOffer.compositions[0].niches[0].label = "forged";
  assert.equal(parseSave(JSON.stringify(raw)).status, "rejected");
  assert.throws(
    () =>
      serializeGameState(
        {
          ...populatedP5State(),
          lateHallmarks: { ...populatedP5State().lateHallmarks, extra: true },
        },
        11,
      ),
    /Current save state is invalid/,
  );
});

function assertCurrentReaderAndWriterReject(state, mutate) {
  const raw = JSON.parse(serializeGameState(state, 11));
  mutate(raw.state.lateHallmarks);
  assert.equal(parseSave(JSON.stringify(raw)).status, "rejected");
  const hostile = structuredClone(state);
  mutate(hostile.lateHallmarks);
  assert.throws(() => serializeGameState(hostile, 11), /Current save state is invalid/);
}

test("p5 rejects plasticity cooldowns attached to pending or retained senescence regions", () => {
  assertCurrentReaderAndWriterReject(populatedP5State(), (lateHallmarks) => {
    lateHallmarks.plasticity.switchCooldownByRegion = { senescent: 15 };
  });

  const retained = populatedP5State();
  retained.lateHallmarks = {
    ...retained.lateHallmarks,
    plasticity: { switchCooldownByRegion: {} },
    senescence: {
      pendingDecisions: [],
      retainedRegions: [
        {
          decisionId: "decision-1",
          regionId: regionId("senescent"),
          cause: "damage-failure",
          createdAtMs: 9,
          retainedAtMs: 10,
        },
      ],
    },
  };
  assertCurrentReaderAndWriterReject(retained, (lateHallmarks) => {
    lateHallmarks.plasticity.switchCooldownByRegion = { senescent: 15 };
  });
});

test("p5 rejects reordered assignments and senescence records while preserving canonical arrays", () => {
  const ordered = populatedP5State();
  ordered.lateHallmarks = {
    ...ordered.lateHallmarks,
    plasticity: { switchCooldownByRegion: {} },
    epigenetic: {
      assignments: [
        {
          hallmarkId: hallmarkId("genome_instability_mutation"),
          optionId: "mutation:contain-liability",
        },
        { hallmarkId: hallmarkId("proliferative_signaling"), optionId: "signaling:burst-bias" },
      ],
      cooldownDeadlineMs: 20,
    },
    senescence: {
      pendingDecisions: [
        {
          id: "decision-0",
          regionId: regionId("colony"),
          cause: "replicative-limit",
          createdAtMs: 8,
        },
        {
          id: "decision-1",
          regionId: regionId("senescent"),
          cause: "damage-failure",
          createdAtMs: 9,
        },
      ],
      retainedRegions: [],
    },
  };
  assert.deepEqual(
    loaded(serializeGameState(ordered, 11)).lateHallmarks.epigenetic.assignments,
    ordered.lateHallmarks.epigenetic.assignments,
  );
  assertCurrentReaderAndWriterReject(ordered, (lateHallmarks) => {
    lateHallmarks.epigenetic.assignments.reverse();
  });
  assertCurrentReaderAndWriterReject(ordered, (lateHallmarks) => {
    lateHallmarks.senescence.pendingDecisions.reverse();
  });

  const retained = structuredClone(ordered);
  retained.lateHallmarks = {
    ...retained.lateHallmarks,
    senescence: {
      pendingDecisions: [],
      retainedRegions: [
        {
          decisionId: "decision-0",
          regionId: regionId("colony"),
          cause: "replicative-limit",
          createdAtMs: 8,
          retainedAtMs: 8,
        },
        {
          decisionId: "decision-1",
          regionId: regionId("senescent"),
          cause: "damage-failure",
          createdAtMs: 9,
          retainedAtMs: 10,
        },
      ],
    },
  };
  assertCurrentReaderAndWriterReject(retained, (lateHallmarks) => {
    lateHallmarks.senescence.retainedRegions.reverse();
  });
});
