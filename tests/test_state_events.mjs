import assert from "node:assert/strict";
import test from "node:test";
import {
  eventId,
  hallmarkId,
  offerId,
  producerId,
  programOptionId,
  regionId,
  routeId,
  stageId,
  bigNum,
} from "../src/brands.ts";
import { createInitialGameState } from "../src/state/game_state.ts";
import { EVENT_TYPES } from "../src/types/events.ts";
import { STAGE_IDS, nextStageId } from "../src/state/catalog.ts";
import { recordEvent } from "../src/state/events.ts";
import { createMutationOffer } from "../src/hallmarks/mutation_offer_generator.ts";
import { parseSave, serializeGameState } from "../src/state/save_load.ts";
import { CONTRACT_SLICE_LABELS } from "../tools/contract_slices.ts";
import { stageGateFixture } from "./stage_fixture.mjs";

const expectedTypes = [
  "click-divide",
  "purchase-producer",
  "purchase-hallmark",
  "advance-stage",
  "perform-prestige-reset",
  "apply-offline-accrual",
  "set-number-format",
  "set-signaling-allocation",
  "select-checkpoint",
  "resolve-triage",
  "spend-telomerase",
  "set-vessel-link",
  "commit-route",
  "set-atp-budget",
  "convert-substrate",
  "set-region-mask",
  "activate-inflammation",
  "select-mutation",
  "switch-phenotype",
  "edit-program",
  "select-microbiome",
  "resolve-senescence",
];

const POPULATED_V2_RECORD = {
  version: 2,
  savedAtMs: 101,
  progressionVersion: 2,
  state: {
    cells: {
      mantissa: 2.5,
      exponent: 8,
    },
    substrate: {
      mantissa: 3,
      exponent: 4,
    },
    atp: {
      mantissa: 4,
      exponent: 5,
    },
    producerLevels: [
      {
        id: "producer",
        level: 2,
      },
    ],
    hallmarkLevels: [
      {
        id: "proliferative_signaling",
        level: 3,
      },
    ],
    currentStage: "microcolony",
    stageStartedAtMs: 2,
    stageProgress: 3,
    stageGateProgress: {
      microcolony: 4,
    },
    lastStageTransition: {
      from: "transformed_cell",
      to: "microcolony",
      atMs: 2,
    },
    oxygenPressure: 1,
    damagePressure: 2,
    immunePressure: 3,
    contactPressure: 4,
    nutrientPressure: 5,
    signalingAllocation: "cycle",
    manualDivisionCharge: 1,
    cycleFillRate: 2,
    bypassedCheckpoints: ["damage-arrest"],
    survivalCapacity: 2,
    regions: [
      {
        id: "r",
        capacity: 3,
        viability: 1,
        phenotype: "migratory",
        vesselLinkIds: ["vessel"],
        routeIds: ["route"],
        senescenceEventId: "sen",
      },
    ],
    telomereReserveByRegion: {
      r: 2,
    },
    telomeraseCharges: 1,
    reserveFloor: 1,
    vesselMaintenanceAtp: 1,
    committedCellCommitments: {
      route: 2,
    },
    routeRiskById: {
      route: 1,
    },
    seededSites: ["r"],
    atpBudget: {
      vessel: 1,
    },
    atpSinks: ["vessel"],
    immuneVisibilityByRegion: {
      r: 1,
    },
    concealmentTokens: 1,
    maskedRegions: ["r"],
    inflammationEpisodes: [
      {
        id: "episode",
        regionId: "r",
        deadlineMs: 6,
      },
    ],
    regionalInflammation: {
      r: 1,
    },
    routeDiscoveryProgress: 1,
    mutationOffers: [
      {
        id: "mutation-offer",
        poolId: "pool",
        mutationIds: ["mutation"],
        sourceSeed: 1,
        sourceSequence: 1,
      },
    ],
    chosenMutations: ["chosen"],
    mutationLiabilities: ["liability"],
    genomeBurden: 1,
    phenotypeCooldowns: {
      r: 7,
    },
    regionalModifiers: {
      r: 1,
    },
    programs: {
      allowedByHallmark: {
        proliferative_signaling: ["cycle"],
      },
      selectedByHallmark: {
        proliferative_signaling: "cycle",
      },
      eligibleHallmarks: ["proliferative_signaling"],
      cooldownDeadlineMs: 8,
    },
    microbiome: {
      poolId: "micro-pool",
      offerIds: ["microbe-c"],
      seed: 1,
      sequence: 2,
      rotationCounter: 3,
      rotationDeadlineMs: 9,
      pendingCompatibility: "compatible",
      selectedNiches: ["microbe-a", "microbe-b"],
      compatibilitySnapshot: ["microbe-a", "microbe-b"],
    },
    senescentRegions: ["r"],
    secretoryEffects: {
      r: 1,
    },
    clearanceQueue: ["sen"],
    pendingDamageEvents: [
      {
        id: "damage",
        regionId: "r",
        outcome: "repairable",
      },
    ],
    pendingTransitEvents: [
      {
        id: "transit",
        routeId: "route",
        outcome: "arrived",
      },
    ],
    deterministicSeed: 2,
    eventSequence: 3,
    prestigeAvailability: [
      {
        id: "L1",
        status: "earned",
      },
    ],
    totalOfflineMs: 4,
    numberFormat: "full",
    endingReached: true,
  },
};

function baseState() {
  const result = parseSave(JSON.stringify(structuredClone(POPULATED_V2_RECORD)));
  assert.equal(result.status, "loaded");
  return result.state;
}

function clone(value) {
  return structuredClone(value);
}

function valid(state, event, verify) {
  const before = clone(state);
  const after = recordEvent(state, event);
  assert.deepEqual(state, before, event.type);
  assert.equal(after.eventSequence, state.eventSequence + 1, event.type);
  verify(after, state);
  const reread = parseSave(serializeGameState(after, 500));
  assert.equal(reread.status, "loaded", event.type);
  assert.deepEqual(reread.state, after, event.type);
  assert.deepEqual(reread.notices, [], event.type);
}

function invalid(state, event) {
  const before = clone(state);
  assert.throws(() => recordEvent(state, event), event.type);
  assert.deepEqual(state, before, event.type);
}

function invalidRaw(state, raw, label) {
  const before = clone(state);
  assert.throws(() => recordEvent(state, raw), label);
  assert.deepEqual(state, before, label);
}

function routeCascadeState() {
  const state = baseState();
  const target = state.regions[0];
  assert.ok(target);
  const { senescenceEventId: _senescenceEventId, ...survivor } = target;
  const shared = routeId("shared");
  return {
    ...state,
    regions: [
      { ...target, routeIds: [routeId("route"), shared] },
      {
        ...survivor,
        id: regionId("survivor"),
        vesselLinkIds: [],
        routeIds: [shared],
      },
    ],
    committedCellCommitments: { route: 2, shared: 7 },
    routeRiskById: { route: 1, shared: 0.3 },
    pendingTransitEvents: [
      { id: eventId("transit"), routeId: routeId("route"), outcome: "arrived" },
      { id: eventId("shared-transit"), routeId: shared, outcome: "lost" },
    ],
  };
}

function microbiomeState() {
  const state = baseState();
  return {
    ...state,
    microbiome: {
      ...state.microbiome,
      offerIds: [offerId("niche-a"), offerId("niche-b"), offerId("niche-c")],
      selectedNiches: [],
      compatibilitySnapshot: [],
      pendingCompatibility: "compatible",
    },
  };
}

function extendedHallmarkMutationState() {
  const state = baseState();
  const { lastStageTransition: _previousTransition, ...withoutPreviousTransition } = state;
  const currentStage = stageId("angiogenic_primary");
  const source = {
    deterministicSeed: state.deterministicSeed,
    eventSequence: state.eventSequence,
    currentStage,
    genomeBurden: 0,
  };
  return {
    ...withoutPreviousTransition,
    currentStage,
    activeTimeMs: 10,
    atp: bigNum(1, 0),
    atpSinks: ["mutation-drafting"],
    atpBudget: { "mutation-drafting": 25 },
    hallmarkLevels: [{ id: hallmarkId("genome_instability_mutation"), level: 1 }],
    mutationOffers: [createMutationOffer(source)],
  };
}

function stageState(currentStage, prestigeAvailability = baseState().prestigeAvailability) {
  return { ...baseState(), currentStage: stageId(currentStage), prestigeAvailability };
}

test("GameEvent runtime inventory has all 22 unique expected discriminants", () => {
  assert.equal(EVENT_TYPES.length, 22);
  assert.equal(new Set(EVENT_TYPES).size, 22);
  assert.deepEqual([...EVENT_TYPES], expectedTypes);
});

test("stage events follow every canonical immediate successor and retain exact saved state", () => {
  for (const fromStage of STAGE_IDS) {
    const toStage = nextStageId(stageId(fromStage));
    if (toStage === undefined) continue;
    valid(
      stageGateFixture(toStage),
      { type: "advance-stage", fromStageId: stageId(fromStage), toStageId: toStage, atMs: 110 },
      (after) => {
        assert.equal(after.currentStage, toStage);
        assert.deepEqual(after.lastStageTransition, { from: fromStage, to: toStage, atMs: 110 });
      },
    );
  }
});

test("stage events reject skipped, backward, duplicate, terminal, mismatched, and unavailable transitions", () => {
  invalid(stageState("microcolony"), {
    type: "advance-stage",
    fromStageId: stageId("microcolony"),
    toStageId: stageId("global_lab_contamination"),
    atMs: 10,
  });
  invalid(stageState("angiogenic_primary"), {
    type: "advance-stage",
    fromStageId: stageId("angiogenic_primary"),
    toStageId: stageId("hypoxic_lesion"),
    atMs: 10,
  });
  invalid(stageState("microcolony"), {
    type: "advance-stage",
    fromStageId: stageId("microcolony"),
    toStageId: stageId("microcolony"),
    atMs: 10,
  });
  invalid(stageState("global_lab_contamination"), {
    type: "advance-stage",
    fromStageId: stageId("global_lab_contamination"),
    toStageId: stageId("global_lab_contamination"),
    atMs: 10,
  });
  invalid(stageState("microcolony"), {
    type: "advance-stage",
    fromStageId: stageId("transformed_cell"),
    toStageId: stageId("microcolony"),
    atMs: 10,
  });
  invalid(stageState("host_collapse", []), {
    type: "advance-stage",
    fromStageId: stageId("host_collapse"),
    toStageId: stageId("immortalized_culture"),
    atMs: 10,
  });
  invalid(stageState("host_collapse", [{ id: "L3", status: "unavailable" }]), {
    type: "advance-stage",
    fromStageId: stageId("host_collapse"),
    toStageId: stageId("immortalized_culture"),
    atMs: 10,
  });
});

test("every game event has payload-sensitive valid behavior and an atomic invalid counterpart", () => {
  valid(baseState(), { type: "click-divide", atMs: 10 }, (after, before) => {
    assert.equal(after.manualDivisionCharge, before.manualDivisionCharge + 1);
  });
  invalid(baseState(), { type: "click-divide", atMs: -1 });

  valid(
    { ...createInitialGameState(), cells: bigNum(1_000, 0) },
    { type: "purchase-producer", producerId: producerId("producer"), quantity: 1, atMs: 10 },
    (after) => assert.equal(after.producerLevels[0]?.level, 1),
  );
  invalid(
    { ...createInitialGameState(), cells: bigNum(1_000, 0) },
    {
      type: "purchase-producer",
      producerId: producerId("producer"),
      quantity: 0,
      atMs: 10,
    },
  );

  // core-six freezes each core-six acquisition at its catalog-owned first level.
  invalid(baseState(), {
    type: "purchase-hallmark",
    hallmarkId: hallmarkId("proliferative_signaling"),
    atMs: 10,
  });
  invalid(baseState(), { type: "purchase-hallmark", hallmarkId: hallmarkId("missing"), atMs: 10 });

  valid(
    stageGateFixture("avascular_lesion"),
    {
      type: "advance-stage",
      fromStageId: stageId("microcolony"),
      toStageId: stageId("avascular_lesion"),
      atMs: 110,
    },
    (after) => {
      assert.equal(after.currentStage, "avascular_lesion");
      assert.deepEqual(after.lastStageTransition, {
        from: "microcolony",
        to: "avascular_lesion",
        atMs: 110,
      });
    },
  );
  invalid(baseState(), {
    type: "advance-stage",
    fromStageId: stageId("wrong"),
    toStageId: stageId("avascular_lesion"),
    atMs: 10,
  });

  // Prestige rewards own their economic effects; unavailable resets reject atomically.
  invalid(baseState(), { type: "perform-prestige-reset", atMs: 10 });

  valid(
    baseState(),
    {
      type: "apply-offline-accrual",
      elapsedMs: 11,
      atMs: 2,
      resourceSnapshot: {
        cells: baseState().cells,
        substrate: baseState().substrate,
        atp: baseState().atp,
      },
      newlyObservedProgression: [],
    },
    (after, before) => {
      assert.equal(after.totalOfflineMs, before.totalOfflineMs + 11);
    },
  );
  valid(
    baseState(),
    {
      type: "apply-offline-accrual",
      elapsedMs: 17,
      atMs: 2,
      resourceSnapshot: {
        cells: baseState().cells,
        substrate: baseState().substrate,
        atp: baseState().atp,
      },
      newlyObservedProgression: [],
    },
    (after, before) => {
      assert.equal(after.totalOfflineMs, before.totalOfflineMs + 17);
    },
  );
  invalid(baseState(), {
    type: "apply-offline-accrual",
    elapsedMs: -1,
    atMs: 2,
    resourceSnapshot: {
      cells: baseState().cells,
      substrate: baseState().substrate,
      atp: baseState().atp,
    },
    newlyObservedProgression: [],
  });

  valid(baseState(), { type: "set-number-format", numberFormat: "short", atMs: 10 }, (after) => {
    assert.equal(after.numberFormat, "short");
  });
  invalid(baseState(), { type: "set-number-format", numberFormat: "bad", atMs: 10 });

  // Core-six routes core actions through catalog-gated handlers; the base state is intentionally locked.
  invalid(baseState(), {
    type: "set-vessel-link",
    regionId: regionId("r"),
    linked: true,
    atMs: 10,
  });
  invalid(baseState(), { type: "set-signaling-allocation", allocation: "burst", atMs: 10 });
  invalid(baseState(), { type: "set-signaling-allocation", allocation: "bad", atMs: 10 });

  invalid(baseState(), { type: "select-checkpoint", checkpoint: "contact-inhibition", atMs: 10 });
  invalid(baseState(), { type: "select-checkpoint", checkpoint: "bad", atMs: 10 });

  invalid(baseState(), {
    type: "resolve-triage",
    eventId: eventId("damage"),
    action: "repair",
    atMs: 10,
  });
  invalid(baseState(), {
    type: "resolve-triage",
    eventId: eventId("damage"),
    action: "bad",
    atMs: 10,
  });

  invalid(baseState(), {
    type: "set-vessel-link",
    regionId: regionId("r"),
    linked: false,
    atMs: 10,
  });
  invalid(baseState(), {
    type: "set-vessel-link",
    regionId: regionId("r"),
    linked: "false",
    atMs: 10,
  });

  invalid(baseState(), { type: "commit-route", routeId: routeId("route"), cells: 9, atMs: 10 });
  invalid(baseState(), { type: "commit-route", routeId: routeId("route"), cells: 13, atMs: 10 });
  invalid(baseState(), { type: "commit-route", routeId: routeId("route"), cells: 0, atMs: 10 });

  valid(
    baseState(),
    { type: "set-atp-budget", sink: "acceleration", amount: 9, atMs: 2 },
    (after) => {
      assert.equal(after.atpBudget.acceleration, 9);
      assert.ok(after.atpSinks.includes("acceleration"));
    },
  );
  valid(
    baseState(),
    { type: "set-atp-budget", sink: "acceleration", amount: 12, atMs: 2 },
    (after) => {
      assert.equal(after.atpBudget.acceleration, 12);
    },
  );
  invalid(baseState(), { type: "set-atp-budget", sink: "__proto__", amount: 9, atMs: 2 });

  valid(
    extendedHallmarkMutationState(),
    {
      type: "select-mutation",
      offerId: extendedHallmarkMutationState().mutationOffers[0].id,
      mutationId: extendedHallmarkMutationState().mutationOffers[0].cards[0].id,
      atMs: 10,
    },
    (after) => {
      assert.equal(after.mutationOffers.length, 0);
      assert.ok(
        after.chosenMutations.includes(
          extendedHallmarkMutationState().mutationOffers[0].cards[0].id,
        ),
      );
    },
  );
  invalid(extendedHallmarkMutationState(), {
    type: "select-mutation",
    offerId: offerId("missing"),
    mutationId: extendedHallmarkMutationState().mutationOffers[0].cards[0].id,
    atMs: 10,
  });

  valid(
    baseState(),
    {
      type: "switch-phenotype",
      regionId: regionId("r"),
      phenotype: "proliferative",
      cooldownDeadlineMs: 12,
      atMs: 10,
    },
    (after) => {
      assert.equal(after.regions[0]?.phenotype, "proliferative");
      assert.equal(after.phenotypeCooldowns.r, 12);
    },
  );
  invalid(baseState(), {
    type: "switch-phenotype",
    regionId: regionId("r"),
    phenotype: "bad",
    cooldownDeadlineMs: 12,
    atMs: 10,
  });

  valid(
    baseState(),
    {
      type: "edit-program",
      hallmarkId: hallmarkId("proliferative_signaling"),
      optionId: programOptionId("cycle"),
      cooldownDeadlineMs: 12,
      atMs: 10,
    },
    (after) => {
      assert.equal(after.programs.selectedByHallmark.proliferative_signaling, "cycle");
      assert.equal(after.programs.cooldownDeadlineMs, 12);
    },
  );
  invalid(baseState(), {
    type: "edit-program",
    hallmarkId: hallmarkId("proliferative_signaling"),
    optionId: programOptionId("bad"),
    cooldownDeadlineMs: 12,
    atMs: 10,
  });

  valid(
    microbiomeState(),
    { type: "select-microbiome", offerId: offerId("niche-a"), atMs: 10 },
    (after) => {
      assert.deepEqual(after.microbiome.selectedNiches, ["niche-a"]);
      assert.deepEqual(after.microbiome.compatibilitySnapshot, ["niche-a"]);
      assert.ok(!after.microbiome.offerIds.includes(offerId("niche-a")));
    },
  );
  invalid(microbiomeState(), { type: "select-microbiome", offerId: offerId("missing"), atMs: 10 });

  valid(
    baseState(),
    { type: "resolve-senescence", eventId: eventId("sen"), action: "keep", atMs: 10 },
    (after) => {
      assert.deepEqual(after.clearanceQueue, []);
      assert.ok(after.senescentRegions.includes(regionId("r")));
    },
  );
  invalid(baseState(), {
    type: "resolve-senescence",
    eventId: eventId("sen"),
    action: "bad",
    atMs: 10,
  });
});

test("destructive actions cascade every region relation and microbiome selection is bounded", () => {
  invalid(routeCascadeState(), {
    type: "resolve-triage",
    eventId: eventId("damage"),
    action: "lose-region",
    atMs: 10,
  });

  valid(
    routeCascadeState(),
    { type: "resolve-senescence", eventId: eventId("sen"), action: "clear", atMs: 10 },
    (after) => {
      assert.deepEqual(
        after.regions.map((region) => region.id),
        ["survivor"],
      );
      assert.deepEqual(after.seededSites, []);
      assert.deepEqual(after.clearanceQueue, []);
      assert.deepEqual(after.committedCellCommitments, { shared: 7 });
      assert.deepEqual(after.routeRiskById, { shared: 0.3 });
      assert.deepEqual(after.pendingTransitEvents, [
        { id: "shared-transit", routeId: "shared", outcome: "lost" },
      ]);
    },
  );

  const twoNiches = recordEvent(microbiomeState(), {
    type: "select-microbiome",
    offerId: offerId("niche-a"),
    atMs: 10,
  });
  const selected = recordEvent(twoNiches, {
    type: "select-microbiome",
    offerId: offerId("niche-b"),
    atMs: 11,
  });
  assert.deepEqual(selected.microbiome.selectedNiches, ["niche-a", "niche-b"]);
  assert.deepEqual(selected.microbiome.compatibilitySnapshot, ["niche-a", "niche-b"]);
  assert.equal(parseSave(serializeGameState(selected, 500)).status, "loaded");
  invalid(selected, { type: "select-microbiome", offerId: offerId("niche-c"), atMs: 12 });
  invalid(selected, { type: "select-microbiome", offerId: offerId("niche-a"), atMs: 12 });
});

test("unknown discriminants, unsafe timestamps, and sequence overflow are atomic runtime rejections", () => {
  invalid(baseState(), { type: "unknown", atMs: 10 });
  invalid(baseState(), { type: "click-divide", atMs: Number.MAX_SAFE_INTEGER + 1 });
  const state = { ...baseState(), eventSequence: Number.MAX_SAFE_INTEGER };
  invalid(state, { type: "click-divide", atMs: 10 });
});

test("runtime event parser rejects hostile records atomically before reducer dispatch", () => {
  const state = baseState();
  invalidRaw(state, Object.create({ type: "click-divide", atMs: 10 }), "inherited discriminator");
  const inheritedPayload = Object.create({ producerId: "producer" });
  Object.assign(inheritedPayload, { type: "purchase-producer", quantity: 1, atMs: 10 });
  invalidRaw(state, inheritedPayload, "inherited payload");

  let getterReads = 0;
  const accessor = { type: "click-divide", atMs: 10 };
  Object.defineProperty(accessor, "atMs", {
    enumerable: true,
    get() {
      getterReads += 1;
      return 10;
    },
  });
  invalidRaw(state, accessor, "accessor property");
  assert.equal(getterReads, 0);

  for (const key of ["__proto__", "prototype", "constructor"]) {
    const reserved = JSON.parse(`{"type":"click-divide","atMs":10,"${key}":0}`);
    invalidRaw(state, reserved, `reserved ${key}`);
  }
  invalidRaw(state, { type: "click-divide", atMs: 10, extra: true }, "unknown own key");
  invalidRaw(state, { type: "click-divide" }, "missing own key");
});

test("contract slices import and assert the deliberate pre-M13 prestige boundary", () => {
  assert.deepEqual(CONTRACT_SLICE_LABELS, [
    "transformed_cell",
    "microcolony",
    "unavailable-before-M13",
    "60000",
    "set number format full",
  ]);
});

test("M5 offline accrual parser and reducer reject hostile atomic payload variants", () => {
  const state = baseState();
  const snapshot = { cells: state.cells, substrate: state.substrate, atp: state.atp };
  const event = {
    type: "apply-offline-accrual",
    elapsedMs: 1,
    atMs: state.activeTimeMs,
    resourceSnapshot: snapshot,
    newlyObservedProgression: [],
  };
  const duplicateState = {
    ...state,
    pendingProgression: [
      { kind: "stage", id: stageId("microcolony"), firstObservedAtActiveMs: state.activeTimeMs },
    ],
  };
  const cases = [
    [state, { ...event, extra: true }, "event extra key"],
    [state, { ...event, atMs: state.activeTimeMs - 1 }, "stale atMs"],
    [state, { ...event, elapsedMs: -1 }, "negative elapsed"],
    [
      state,
      { ...event, resourceSnapshot: { cells: state.cells, substrate: state.substrate } },
      "missing tuple key",
    ],
    [
      state,
      { ...event, resourceSnapshot: { ...snapshot, lactate: state.cells } },
      "extra tuple key",
    ],
    [
      state,
      { ...event, resourceSnapshot: { ...snapshot, atp: { mantissa: 20, exponent: 1 } } },
      "noncanonical tuple",
    ],
    [
      state,
      {
        ...event,
        newlyObservedProgression: [
          { kind: "stage", id: "missing", firstObservedAtActiveMs: state.activeTimeMs },
        ],
      },
      "unknown progression",
    ],
    [
      state,
      {
        ...event,
        newlyObservedProgression: [
          { kind: "stage", id: "microcolony", firstObservedAtActiveMs: state.activeTimeMs },
          { kind: "stage", id: "microcolony", firstObservedAtActiveMs: state.activeTimeMs },
        ],
      },
      "duplicate additions",
    ],
    [
      duplicateState,
      {
        ...event,
        newlyObservedProgression: [
          { kind: "stage", id: "microcolony", firstObservedAtActiveMs: state.activeTimeMs },
        ],
      },
      "already queued",
    ],
  ];
  for (const [before, raw, label] of cases) invalidRaw(before, raw, label);
  const overflow = { ...state, totalOfflineMs: Number.MAX_SAFE_INTEGER };
  invalidRaw(overflow, event, "offline total overflow");
});
