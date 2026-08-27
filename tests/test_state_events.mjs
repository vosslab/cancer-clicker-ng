import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  eventId,
  hallmarkId,
  mutationId,
  offerId,
  producerId,
  programOptionId,
  regionId,
  routeId,
  stageId,
} from "../src/brands.ts";
import { EVENT_TYPES } from "../src/types/events.ts";
import { STAGE_IDS, nextStageId } from "../src/state/catalog.ts";
import { recordEvent } from "../src/state/events.ts";
import { parseSave, serializeGameState } from "../src/state/save_load.ts";
import { CONTRACT_SLICE_LABELS } from "../tools/contract_slices.ts";

const fixtureUrl = new URL("./fixtures/m4_populated_v2.json", import.meta.url);
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
  "set-vessel-link",
  "commit-route",
  "set-atp-budget",
  "select-mutation",
  "switch-phenotype",
  "edit-program",
  "select-microbiome",
  "resolve-senescence",
];

function baseState() {
  const result = parseSave(readFileSync(fixtureUrl, "utf8"));
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
  const reread = parseSave(serializeGameState(after, 500, 2));
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
    routeRiskById: { route: 1, shared: 3 },
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

function stageState(currentStage, prestigeAvailability = baseState().prestigeAvailability) {
  return { ...baseState(), currentStage: stageId(currentStage), prestigeAvailability };
}

test("GameEvent runtime inventory has all 18 unique expected discriminants", () => {
  assert.equal(EVENT_TYPES.length, 18);
  assert.equal(new Set(EVENT_TYPES).size, 18);
  assert.deepEqual([...EVENT_TYPES], expectedTypes);
});

test("stage events follow every canonical immediate successor and retain exact saved state", () => {
  for (const fromStage of STAGE_IDS) {
    const toStage = nextStageId(stageId(fromStage));
    if (toStage === undefined) continue;
    const prestigeAvailability =
      fromStage === "host_collapse"
        ? [{ id: "L3", status: "earned" }]
        : baseState().prestigeAvailability;
    valid(
      stageState(fromStage, prestigeAvailability),
      { type: "advance-stage", fromStageId: stageId(fromStage), toStageId: toStage, atMs: 10 },
      (after) => {
        assert.equal(after.currentStage, toStage);
        assert.deepEqual(after.lastStageTransition, { from: fromStage, to: toStage, atMs: 10 });
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

test("every M4 event has payload-sensitive valid behavior and an atomic invalid counterpart", () => {
  valid(baseState(), { type: "click-divide", atMs: 10 }, (after, before) => {
    assert.equal(after.manualDivisionCharge, before.manualDivisionCharge + 1);
  });
  invalid(baseState(), { type: "click-divide", atMs: -1 });

  valid(
    baseState(),
    { type: "purchase-producer", producerId: producerId("producer"), quantity: 2, atMs: 10 },
    (after) => assert.equal(after.producerLevels[0]?.level, 4),
  );
  invalid(baseState(), {
    type: "purchase-producer",
    producerId: producerId("producer"),
    quantity: 0,
    atMs: 10,
  });

  valid(
    baseState(),
    { type: "purchase-hallmark", hallmarkId: hallmarkId("proliferative_signaling"), atMs: 10 },
    (after) => assert.equal(after.hallmarkLevels[0]?.level, 4),
  );
  invalid(baseState(), { type: "purchase-hallmark", hallmarkId: hallmarkId("missing"), atMs: 10 });

  valid(
    baseState(),
    {
      type: "advance-stage",
      fromStageId: stageId("microcolony"),
      toStageId: stageId("avascular_lesion"),
      atMs: 10,
    },
    (after) => {
      assert.equal(after.currentStage, "avascular_lesion");
      assert.deepEqual(after.lastStageTransition, {
        from: "microcolony",
        to: "avascular_lesion",
        atMs: 10,
      });
    },
  );
  invalid(baseState(), {
    type: "advance-stage",
    fromStageId: stageId("wrong"),
    toStageId: stageId("avascular_lesion"),
    atMs: 10,
  });

  // M13 owns reset rewards; M4's documented behavior is the atomic unavailable rejection.
  invalid(baseState(), { type: "perform-prestige-reset", atMs: 10 });

  valid(
    baseState(),
    { type: "apply-offline-accrual", elapsedMs: 11, atMs: 10 },
    (after, before) => {
      assert.equal(after.totalOfflineMs, before.totalOfflineMs + 11);
    },
  );
  valid(
    baseState(),
    { type: "apply-offline-accrual", elapsedMs: 17, atMs: 10 },
    (after, before) => {
      assert.equal(after.totalOfflineMs, before.totalOfflineMs + 17);
    },
  );
  invalid(baseState(), { type: "apply-offline-accrual", elapsedMs: -1, atMs: 10 });

  valid(baseState(), { type: "set-number-format", numberFormat: "short", atMs: 10 }, (after) => {
    assert.equal(after.numberFormat, "short");
  });
  invalid(baseState(), { type: "set-number-format", numberFormat: "bad", atMs: 10 });

  valid(
    baseState(),
    { type: "set-vessel-link", regionId: regionId("r"), linked: true, atMs: 10 },
    (after) => {
      assert.deepEqual(after.regions[0]?.vesselLinkIds, ["vessel", "vessel:r"]);
    },
  );
  valid(
    baseState(),
    { type: "set-signaling-allocation", allocation: "burst", atMs: 10 },
    (after) => {
      assert.equal(after.signalingAllocation, "burst");
    },
  );
  invalid(baseState(), { type: "set-signaling-allocation", allocation: "bad", atMs: 10 });

  valid(
    baseState(),
    { type: "select-checkpoint", checkpoint: "contact-inhibition", atMs: 10 },
    (after) => {
      assert.ok(after.bypassedCheckpoints.includes("contact-inhibition"));
    },
  );
  invalid(baseState(), { type: "select-checkpoint", checkpoint: "bad", atMs: 10 });

  valid(
    baseState(),
    { type: "resolve-triage", eventId: eventId("damage"), action: "repair", atMs: 10 },
    (after) => {
      assert.equal(after.pendingDamageEvents.length, 0);
      assert.equal(after.regions[0]?.viability, 1);
    },
  );
  invalid(baseState(), {
    type: "resolve-triage",
    eventId: eventId("damage"),
    action: "bad",
    atMs: 10,
  });

  valid(
    baseState(),
    { type: "set-vessel-link", regionId: regionId("r"), linked: false, atMs: 10 },
    (after) => {
      assert.deepEqual(after.regions[0]?.vesselLinkIds, []);
    },
  );
  invalid(baseState(), {
    type: "set-vessel-link",
    regionId: regionId("r"),
    linked: "false",
    atMs: 10,
  });

  valid(
    baseState(),
    { type: "commit-route", routeId: routeId("route"), cells: 9, atMs: 10 },
    (after) => {
      assert.equal(after.committedCellCommitments.route, 9);
    },
  );
  valid(
    baseState(),
    { type: "commit-route", routeId: routeId("route"), cells: 13, atMs: 10 },
    (after) => {
      assert.equal(after.committedCellCommitments.route, 13);
    },
  );
  invalid(baseState(), { type: "commit-route", routeId: routeId("route"), cells: 0, atMs: 10 });

  valid(baseState(), { type: "set-atp-budget", sink: "repair", amount: 9, atMs: 10 }, (after) => {
    assert.equal(after.atpBudget.repair, 9);
    assert.ok(after.atpSinks.includes("repair"));
  });
  valid(baseState(), { type: "set-atp-budget", sink: "repair", amount: 12, atMs: 10 }, (after) => {
    assert.equal(after.atpBudget.repair, 12);
  });
  invalid(baseState(), { type: "set-atp-budget", sink: "__proto__", amount: 9, atMs: 10 });

  valid(
    baseState(),
    {
      type: "select-mutation",
      offerId: offerId("mutation-offer"),
      mutationId: mutationId("mutation"),
      atMs: 10,
    },
    (after) => {
      assert.equal(after.mutationOffers.length, 0);
      assert.ok(after.chosenMutations.includes(mutationId("mutation")));
    },
  );
  invalid(baseState(), {
    type: "select-mutation",
    offerId: offerId("missing"),
    mutationId: mutationId("mutation"),
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
  valid(
    routeCascadeState(),
    { type: "resolve-triage", eventId: eventId("damage"), action: "lose-region", atMs: 10 },
    (after) => {
      assert.deepEqual(
        after.regions.map((region) => region.id),
        ["survivor"],
      );
      assert.deepEqual(after.seededSites, []);
      assert.deepEqual(after.maskedRegions, []);
      assert.deepEqual(after.senescentRegions, []);
      assert.deepEqual(after.pendingDamageEvents, []);
      assert.deepEqual(after.inflammationEpisodes, []);
      assert.deepEqual(after.clearanceQueue, []);
      assert.deepEqual(after.telomereReserveByRegion, {});
      assert.deepEqual(after.immuneVisibilityByRegion, {});
      assert.deepEqual(after.regionalInflammation, {});
      assert.deepEqual(after.phenotypeCooldowns, {});
      assert.deepEqual(after.regionalModifiers, {});
      assert.deepEqual(after.committedCellCommitments, { shared: 7 });
      assert.deepEqual(after.routeRiskById, { shared: 3 });
      assert.deepEqual(after.pendingTransitEvents, [
        { id: "shared-transit", routeId: "shared", outcome: "lost" },
      ]);
    },
  );

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
      assert.deepEqual(after.routeRiskById, { shared: 3 });
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
  assert.equal(parseSave(serializeGameState(selected, 500, 2)).status, "loaded");
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
