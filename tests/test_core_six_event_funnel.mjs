import assert from "node:assert/strict";
import test from "node:test";

import { bigNum, eventId, hallmarkId, regionId, routeId, stageId } from "../src/brands.ts";
import { advanceLiveTick, economyTick } from "../src/economy/tick.ts";
import { emptyLateHallmarksState } from "../src/hallmarks/late_hallmark_types.ts";
import {
  createEmptyHostTransferState,
  createEmptyLineageLedger,
  createEmptyMetastasisState,
} from "../src/prestige/layers.ts";
import { deriveSeedV1 } from "../src/state/deterministic_random.ts";
import { recordEvent } from "../src/state/events.ts";
import { createInitialGameState } from "../src/state/game_state.ts";
import { parseSave, serializeGameState } from "../src/state/save_load.ts";
import { stageGateFixture } from "./stage_fixture.mjs";

function baseState() {
  const state = createInitialGameState();
  return {
    ...state,
    cells: bigNum(2.5, 8),
    substrate: bigNum(3, 4),
    atp: bigNum(4, 5),
    currentStage: stageId("microcolony"),
    stageStartedAtMs: 2,
    activeTimeMs: 2,
    stageProgress: 3,
    stageGateProgress: { microcolony: 4 },
    regions: [
      {
        ...state.regions[0],
        id: regionId("r"),
        capacity: 1,
        viability: 1,
        vesselLinkIds: ["vessel"],
        routeIds: [routeId("route")],
      },
    ],
    telomereReserveByRegion: { r: 2 },
    routeRiskById: { route: 1 },
    pendingDamageEvents: [
      { id: eventId("damage"), regionId: regionId("r"), outcome: "repairable" },
    ],
    lineageLedger: createEmptyLineageLedger(
      deriveSeedV1("lineage-v1", state.deterministicSeed, state.eventSequence),
    ),
    metastasis: createEmptyMetastasisState(),
    hostTransfer: createEmptyHostTransferState(),
  };
}

function clone(value) {
  return structuredClone(value);
}

function withHallmark(state, id) {
  return {
    ...state,
    hallmarkLevels: [{ id: hallmarkId(id), level: 1 }],
  };
}

function assertAccepted(state, event, verify) {
  const before = clone(state);
  const after = recordEvent(state, event);
  assert.deepEqual(state, before, event.type);
  assert.equal(after.eventSequence, state.eventSequence + 1, event.type);
  verify(after, state);
}

function assertRejected(state, raw, label) {
  const before = clone(state);
  assert.throws(() => recordEvent(state, raw), label);
  assert.deepEqual(state, before, label);
}

test("core-six routes every core-six event through one pure projection and one sequence advance", () => {
  const division = withHallmark(
    { ...baseState(), currentStage: stageId("transformed_cell"), signalingAllocation: "cycle" },
    "proliferative_signaling",
  );
  assertAccepted(
    division,
    { type: "set-signaling-allocation", allocation: "burst", atMs: 2 },
    (after) => assert.equal(after.signalingAllocation, "burst"),
  );

  const checkpoint = withHallmark(
    { ...baseState(), currentStage: stageId("microcolony"), bypassedCheckpoints: [] },
    "growth_suppressor_evasion",
  );
  assertAccepted(
    checkpoint,
    { type: "select-checkpoint", checkpoint: "contact-inhibition", atMs: 2 },
    (after) => assert.deepEqual(after.bypassedCheckpoints, ["contact-inhibition"]),
  );

  const triage = withHallmark(
    {
      ...baseState(),
      currentStage: stageId("avascular_lesion"),
      survivalCapacity: 1,
      damagePressure: 1,
    },
    "cell_death_resistance",
  );
  assertAccepted(
    triage,
    { type: "resolve-triage", eventId: eventId("damage"), action: "repair", atMs: 2 },
    (after) => assert.equal(after.pendingDamageEvents.length, 0),
  );

  const telomerase = withHallmark(
    {
      ...baseState(),
      currentStage: stageId("hypoxic_lesion"),
      activeTimeMs: 10,
      telomeraseCharges: 3,
      reserveFloor: 0,
      telomereReserveByRegion: { r: 0 },
      lateHallmarks: emptyLateHallmarksState(),
    },
    "replicative_immortality",
  );
  assertAccepted(
    telomerase,
    {
      type: "spend-telomerase",
      target: "refill-region",
      regionId: regionId("r"),
      charges: 1,
      atMs: 10,
    },
    (after, before) => {
      assert.equal(after.telomeraseCharges, before.telomeraseCharges - 1);
      assert.equal(after.telomereReserveByRegion.r, 2);
    },
  );

  const perfusion = withHallmark(
    {
      ...baseState(),
      currentStage: stageId("hypoxic_lesion"),
      activeTimeMs: 10,
      vesselMaintenanceAtp: 0,
      regions: [{ ...baseState().regions[0], vesselLinkIds: [], capacity: 2 }],
    },
    "angiogenesis",
  );
  assertAccepted(
    perfusion,
    { type: "set-vessel-link", regionId: regionId("r"), linked: true, atMs: 10 },
    (after) => assert.equal(after.regions[0].vesselLinkIds.length, 1),
  );

  const invasion = withHallmark(
    {
      ...baseState(),
      currentStage: stageId("invasive_carcinoma"),
      cells: bigNum(20, 0),
      routeRiskById: { route: 0 },
      committedCellCommitments: {},
    },
    "invasion_metastasis",
  );
  assertAccepted(
    invasion,
    { type: "commit-route", routeId: routeId("route"), cells: 3, atMs: 2 },
    (after) => assert.equal(after.committedCellCommitments.route, 3),
  );
});

test("spend-telomerase parser rejects hostile exact-shape variants without reaching the reducer", () => {
  const state = baseState();
  const valid = {
    type: "spend-telomerase",
    target: "refill-region",
    regionId: "r",
    charges: 1,
    atMs: 10,
  };
  assertRejected(state, { ...valid, extra: true }, "extra field");
  assertRejected(state, { ...valid, target: "unknown" }, "unknown target");
  assertRejected(state, { ...valid, charges: 0 }, "zero charges");
  assertRejected(state, { ...valid, charges: 1.5 }, "fractional charges");
  assertRejected(state, { ...valid, charges: Number.MAX_SAFE_INTEGER + 1 }, "unsafe charges");
  assertRejected(
    state,
    { type: "spend-telomerase", target: "bank-reserve-floor", charges: 1, atMs: 10, regionId: "r" },
    "bank target forbids region",
  );
  const accessor = { ...valid };
  Object.defineProperty(accessor, "charges", { enumerable: true, get: () => 1 });
  assertRejected(state, accessor, "accessor charges");
  assertRejected(state, Object.create(valid), "prototype event");
});

test("every core-six operation rejects stale simulation time before its handler can mutate", () => {
  const state = baseState();
  const staleEvents = [
    { type: "set-signaling-allocation", allocation: "burst", atMs: 3 },
    { type: "select-checkpoint", checkpoint: "contact-inhibition", atMs: 3 },
    { type: "resolve-triage", eventId: eventId("damage"), action: "repair", atMs: 3 },
    {
      type: "spend-telomerase",
      target: "refill-region",
      regionId: regionId("r"),
      charges: 1,
      atMs: 3,
    },
    { type: "set-vessel-link", regionId: regionId("r"), linked: true, atMs: 3 },
    { type: "commit-route", routeId: routeId("route"), cells: 1, atMs: 3 },
  ];
  for (const event of staleEvents) assertRejected(state, event, event.type);
});

test("an accepted telomerase spend survives the canonical save round trip", () => {
  const baseline = stageGateFixture("angiogenic_primary");
  const target = baseline.regions[0];
  assert.ok(target);
  const state = {
    ...baseline,
    hallmarkLevels: [{ id: hallmarkId("replicative_immortality"), level: 1 }],
    telomeraseCharges: 3,
    reserveFloor: 0,
    telomereReserveByRegion: { [target.id]: 0 },
  };
  const after = recordEvent(state, {
    type: "spend-telomerase",
    target: "refill-region",
    regionId: target.id,
    charges: 1,
    atMs: state.activeTimeMs,
  });
  const loaded = parseSave(serializeGameState(after, 903));
  assert.equal(loaded.status, "loaded");
  assert.deepEqual(loaded.state, after);
});

test("core-six acquisition is catalog-gated and atomic", () => {
  const locked = { ...baseState(), hallmarkLevels: [{ id: hallmarkId("angiogenesis"), level: 0 }] };
  assertRejected(
    locked,
    { type: "purchase-hallmark", hallmarkId: hallmarkId("angiogenesis"), atMs: 10 },
    "locked hallmark",
  );
  const ready = {
    ...locked,
    currentStage: stageId("hypoxic_lesion"),
  };
  assertAccepted(
    ready,
    { type: "purchase-hallmark", hallmarkId: hallmarkId("angiogenesis"), atMs: 10 },
    (after) => assert.equal(after.hallmarkLevels[0].level, 1),
  );
  assertRejected(
    { ...ready, hallmarkLevels: [{ id: hallmarkId("angiogenesis"), level: 1 }] },
    { type: "purchase-hallmark", hallmarkId: hallmarkId("angiogenesis"), atMs: 10 },
    "repeat purchase",
  );
  assertRejected(
    { ...ready, hallmarkLevels: [{ id: hallmarkId("angiogenesis"), level: 2 }] },
    { type: "purchase-hallmark", hallmarkId: hallmarkId("angiogenesis"), atMs: 10 },
    "noncanonical core level",
  );
});

test("core-six acquisition creates a first ownership record from a sparse new game", () => {
  const state = createInitialGameState();
  assert.deepEqual(state.hallmarkLevels, []);
  assertAccepted(
    state,
    {
      type: "purchase-hallmark",
      hallmarkId: hallmarkId("proliferative_signaling"),
      atMs: state.activeTimeMs,
    },
    (after) =>
      assert.deepEqual(after.hallmarkLevels, [
        { id: hallmarkId("proliferative_signaling"), level: 1 },
      ]),
  );
});

test("checkpoint routing resets only through an accepted stage transition", () => {
  const transitionSource = stageGateFixture("avascular_lesion");
  assert.equal(transitionSource.currentStage, stageId("microcolony"));
  const available = {
    ...transitionSource,
    hallmarkLevels: [{ id: hallmarkId("growth_suppressor_evasion"), level: 0 }],
    bypassedCheckpoints: [],
  };
  const acquired = recordEvent(available, {
    type: "purchase-hallmark",
    hallmarkId: hallmarkId("growth_suppressor_evasion"),
    atMs: available.activeTimeMs,
  });
  const selectedAtMicrocolony = recordEvent(acquired, {
    type: "select-checkpoint",
    checkpoint: "contact-inhibition",
    atMs: acquired.activeTimeMs,
  });
  assert.deepEqual(selectedAtMicrocolony.bypassedCheckpoints, ["contact-inhibition"]);
  const advanced = recordEvent(selectedAtMicrocolony, {
    type: "advance-stage",
    fromStageId: stageId("microcolony"),
    toStageId: stageId("avascular_lesion"),
    atMs: selectedAtMicrocolony.activeTimeMs,
  });
  assert.deepEqual(advanced.bypassedCheckpoints, []);
  const selectedAtAvascular = recordEvent(advanced, {
    type: "select-checkpoint",
    checkpoint: "nutrient-arrest",
    atMs: advanced.activeTimeMs,
  });
  assert.deepEqual(selectedAtAvascular.bypassedCheckpoints, ["nutrient-arrest"]);
  const loaded = parseSave(serializeGameState(selectedAtAvascular, 904));
  assert.equal(loaded.status, "loaded");
  assert.deepEqual(loaded.state, selectedAtAvascular);
});

test("manual divisions consume unbanked reserve, preserve the banked floor, and round trip", () => {
  const baseline = stageGateFixture("angiogenic_primary");
  const target = baseline.regions[0];
  assert.ok(target);
  const state = {
    ...baseline,
    hallmarkLevels: [{ id: hallmarkId("replicative_immortality"), level: 1 }],
    reserveFloor: 1,
    telomereReserveByRegion: { [target.id]: 3 },
  };
  const first = recordEvent(state, { type: "click-divide", atMs: state.activeTimeMs });
  const second = recordEvent(first, { type: "click-divide", atMs: first.activeTimeMs });
  const protectedClick = recordEvent(second, { type: "click-divide", atMs: second.activeTimeMs });
  assert.equal(first.telomereReserveByRegion[target.id], 2);
  assert.equal(second.telomereReserveByRegion[target.id], 1);
  assert.equal(protectedClick.telomereReserveByRegion[target.id], 1);
  const loaded = parseSave(serializeGameState(protectedClick, 905));
  assert.equal(loaded.status, "loaded");
  assert.deepEqual(loaded.state, protectedClick);
});

test("offline hallmark projection consumes reserves at whole-second boundaries atomically", () => {
  const baseline = stageGateFixture("angiogenic_primary");
  const target = baseline.regions[0];
  assert.ok(target);
  const state = {
    ...baseline,
    hallmarkLevels: [{ id: hallmarkId("replicative_immortality"), level: 1 }],
    reserveFloor: 1,
    telomereReserveByRegion: { [target.id]: 3 },
  };
  const after = recordEvent(state, {
    type: "apply-offline-accrual",
    elapsedMs: 1_900,
    atMs: state.activeTimeMs,
    resourceSnapshot: { cells: state.cells, substrate: state.substrate, atp: state.atp },
    newlyObservedProgression: [],
  });
  assert.equal(after.telomereReserveByRegion[target.id], 1);
  assert.equal(after.totalOfflineMs, state.totalOfflineMs + 1_900);
  const loaded = parseSave(serializeGameState(after, 906));
  assert.equal(loaded.status, "loaded");
  assert.deepEqual(loaded.state, after);
});

function perfusionElapsedState(atp) {
  const initial = createInitialGameState();
  const target = {
    id: regionId("offline-perfusion"),
    capacity: 5,
    viability: 1,
    phenotype: "proliferative",
    vesselLinkIds: [eventId("vessel:offline-perfusion")],
    routeIds: [],
  };
  return {
    ...initial,
    currentStage: stageId("global_lab_contamination"),
    atp: bigNum(atp, 0),
    hallmarkLevels: [{ id: hallmarkId("angiogenesis"), level: 1 }],
    regions: [target],
    vesselMaintenanceAtp: 1,
  };
}

function expectedOfflineFromLive(state, elapsedMs) {
  const live = advanceLiveTick(
    { game: state, lastTickAtMs: state.activeTimeMs, pendingOfflineMs: 0, saveStatus: "idle" },
    state.activeTimeMs + elapsedMs,
  );
  return {
    ...live.game,
    activeTimeMs: state.activeTimeMs,
    eventSequence: state.eventSequence + 1,
    totalOfflineMs: state.totalOfflineMs + elapsedMs,
  };
}

test("offline upkeep uses the economy snapshot ATP exactly once at one and multiple boundaries", () => {
  for (const [atp, elapsedMs, expectedAtp] of [
    [2, 1_000, 1],
    [3, 2_000, 1],
  ]) {
    const state = perfusionElapsedState(atp);
    const tick = economyTick(state, elapsedMs, "offline");
    const after = recordEvent(state, {
      type: "apply-offline-accrual",
      elapsedMs,
      atMs: state.activeTimeMs,
      resourceSnapshot: tick.resourceSnapshot,
      newlyObservedProgression: [],
    });
    assert.equal(after.atp.mantissa, expectedAtp);
    assert.deepEqual(after, expectedOfflineFromLive(state, elapsedMs));
  }
});

test("offline insufficient upkeep degrades exactly as live without a second ATP debit", () => {
  const state = perfusionElapsedState(1);
  const elapsedMs = 2_000;
  const tick = economyTick(state, elapsedMs, "offline");
  const after = recordEvent(state, {
    type: "apply-offline-accrual",
    elapsedMs,
    atMs: state.activeTimeMs,
    resourceSnapshot: tick.resourceSnapshot,
    newlyObservedProgression: [],
  });
  assert.equal(after.atp.mantissa, 0);
  assert.equal(after.vesselMaintenanceAtp, 0);
  assert.deepEqual(after.regions[0].vesselLinkIds, []);
  assert.equal(after.regions[0].capacity, 3);
  assert.equal(after.oxygenPressure, 2);
  assert.deepEqual(after, expectedOfflineFromLive(state, elapsedMs));
});
