import assert from "node:assert/strict";
import test from "node:test";

import { bigNum, eventId, hallmarkId, regionId, routeId, stageId } from "../src/brands.ts";
import { createInitialGameState } from "../src/state/game_state.ts";
import { CURRENT_PROGRESSION_VERSION } from "../src/state/save_load.ts";
import {
  createGameController,
  persistWithStorage,
  plainGameSnapshot,
} from "../src/render/game_controller.ts";

function clock(value) {
  return { now: () => value };
}

function notice() {
  return {
    code: "storage-error",
    field: "storage",
    message: "Saved game could not be written.",
  };
}

function stateSnapshot(controller) {
  return plainGameSnapshot(controller.game);
}

function oneRegion(id, changes = {}) {
  return {
    id: regionId(id),
    capacity: 4,
    viability: 1,
    phenotype: "proliferative",
    vesselLinkIds: [],
    routeIds: [],
    ...changes,
  };
}

function hallmarkState(stage, hallmark, changes = {}) {
  return {
    ...createInitialGameState(),
    currentStage: stageId(stage),
    activeTimeMs: 60,
    hallmarkLevels: [{ id: hallmarkId(hallmark), level: 1 }],
    ...changes,
  };
}

function controllerIntentCases() {
  const division = hallmarkState("transformed_cell", "proliferative_signaling");
  const checkpoint = hallmarkState("microcolony", "growth_suppressor_evasion");
  const triage = hallmarkState("avascular_lesion", "cell_death_resistance", {
    survivalCapacity: 1,
    regions: [oneRegion("damaged", { viability: 0.4 })],
    pendingDamageEvents: [
      { id: eventId("damage"), regionId: regionId("damaged"), outcome: "repairable" },
    ],
  });
  const telomerase = hallmarkState("hypoxic_lesion", "replicative_immortality", {
    telomeraseCharges: 1,
    regions: [oneRegion("limited")],
    telomereReserveByRegion: { limited: 0 },
  });
  const perfusion = hallmarkState("hypoxic_lesion", "angiogenesis", {
    oxygenPressure: 2,
    regions: [oneRegion("rim")],
  });
  const invasion = hallmarkState("invasive_carcinoma", "invasion_metastasis", {
    cells: bigNum(4, 0),
    regions: [oneRegion("primary", { routeIds: [routeId("local-front")] })],
    routeRiskById: { "local-front": 0 },
  });
  const purchase = hallmarkState("transformed_cell", "purchaseable");

  return [
    {
      name: "purchase-hallmark",
      state: purchase,
      invoke: (controller) => controller.purchaseHallmark(hallmarkId("purchaseable")),
      verify: (after) => assert.equal(after.hallmarkLevels[0]?.level, 2),
    },
    {
      name: "set-signaling-allocation",
      state: division,
      invoke: (controller) => controller.setSignalingAllocation("cycle"),
      verify: (after) => assert.equal(after.signalingAllocation, "cycle"),
    },
    {
      name: "select-checkpoint",
      state: checkpoint,
      invoke: (controller) => controller.selectCheckpoint("contact-inhibition"),
      verify: (after) => assert.deepEqual(after.bypassedCheckpoints, ["contact-inhibition"]),
    },
    {
      name: "resolve-triage",
      state: triage,
      invoke: (controller) => controller.resolveTriage(eventId("damage"), "absorb"),
      verify: (after) => assert.deepEqual(after.pendingDamageEvents, []),
    },
    {
      name: "spend-telomerase",
      state: telomerase,
      invoke: (controller) =>
        controller.spendTelomerase({
          target: "refill-region",
          regionId: regionId("limited"),
          charges: 1,
        }),
      verify: (after) => {
        assert.equal(after.telomeraseCharges, 0);
        assert.equal(after.telomereReserveByRegion.limited, 2);
      },
    },
    {
      name: "set-vessel-link",
      state: perfusion,
      invoke: (controller) => controller.setVesselLink(regionId("rim"), true),
      verify: (after) => assert.deepEqual(after.regions[0]?.vesselLinkIds, [eventId("vessel:rim")]),
    },
    {
      name: "commit-route",
      state: invasion,
      invoke: (controller) => controller.commitRoute(routeId("local-front"), 1),
      verify: (after) => assert.deepEqual(after.committedCellCommitments, { "local-front": 1 }),
    },
  ];
}

test("controller snapshots isolate Solid proxies and preserve canonical BigNums", () => {
  const initial = createInitialGameState();
  const controller = createGameController(initial, clock(10), clock(20), () => ({ ok: true }));
  const first = plainGameSnapshot(controller.game);
  const second = plainGameSnapshot(controller.game);

  assert.notStrictEqual(first, second);
  assert.notStrictEqual(first.cells, second.cells);
  assert.deepEqual(first.cells, { mantissa: 0, exponent: 0 });
  first.cells.mantissa = 99;
  assert.deepEqual(stateSnapshot(controller).cells, { mantissa: 0, exponent: 0 });

  const result = controller.divide();
  assert.deepEqual(result, { ok: true });
  assert.deepEqual(stateSnapshot(controller).cells, { mantissa: 1, exponent: 0 });
  assert.equal(stateSnapshot(controller).eventSequence, 1);
});

test("controller rejects hostile raw events before persistence and has no public store setter", () => {
  let writeCount = 0;
  const controller = createGameController(createInitialGameState(), clock(10), clock(20), () => {
    writeCount += 1;
    return { ok: true };
  });
  const before = stateSnapshot(controller);
  const inherited = Object.create({ type: "click-divide", atMs: 10 });
  const accessor = {};
  Object.defineProperty(accessor, "type", { enumerable: true, get: () => "click-divide" });
  Object.defineProperty(accessor, "atMs", { enumerable: true, get: () => 10 });

  assert.throws(() => controller.debugOrImportedEvent(inherited), /plain record/);
  assert.throws(() => controller.debugOrImportedEvent(accessor), /discriminant is invalid/);
  assert.throws(
    () => controller.debugOrImportedEvent({ type: "click-divide", atMs: -1 }),
    /Event time is invalid/,
  );
  assert.deepEqual(stateSnapshot(controller), before);
  assert.equal(writeCount, 0);
  assert.equal("setGame" in controller, false);
  assert.equal("applyRawEvent" in controller, false);
});

test("all exposed event intents use the one record-persist-reconcile funnel", () => {
  const snapshots = [];
  const controller = createGameController(
    createInitialGameState(),
    clock(25),
    clock(75),
    (state) => {
      snapshots.push(structuredClone(state));
      return { ok: true };
    },
  );

  assert.deepEqual(controller.divide(), { ok: true });
  assert.deepEqual(controller.toggleNumberFormat(), { ok: true });
  assert.deepEqual(
    controller.debugOrImportedEvent({ type: "set-number-format", numberFormat: "short", atMs: 25 }),
    { ok: true },
  );

  assert.equal(snapshots.length, 3);
  assert.deepEqual(
    snapshots.map((state) => state.eventSequence),
    [1, 2, 3],
  );
  assert.equal(stateSnapshot(controller).numberFormat, "short");
  assert.equal(stateSnapshot(controller).eventSequence, 3);
});

test("returned persistence notices leave the durable game untouched and isolate the UI error signal", () => {
  let healthy = false;
  const controller = createGameController(createInitialGameState(), clock(10), clock(20), () =>
    healthy ? { ok: true } : { ok: false, notices: [notice()] },
  );
  const before = stateSnapshot(controller);

  const failed = controller.divide();
  assert.deepEqual(failed, { ok: false, kind: "persistence", notices: [notice()] });
  assert.deepEqual(stateSnapshot(controller), before);
  assert.match(controller.saveError() ?? "", /Progress is not saved/);

  healthy = true;
  assert.deepEqual(controller.divide(), { ok: true });
  assert.deepEqual(stateSnapshot(controller).cells, { mantissa: 1, exponent: 0 });
  assert.equal(controller.saveError(), undefined);
});

test("thrown save clock or persistence adapter is atomic until the player intentionally reissues", () => {
  let throwPersist = true;
  const controller = createGameController(createInitialGameState(), clock(10), clock(20), () => {
    if (throwPersist) throw new Error("storage unavailable");
    return { ok: true };
  });
  const before = stateSnapshot(controller);

  assert.deepEqual(controller.divide(), { ok: false, kind: "persistence", notices: [] });
  assert.deepEqual(stateSnapshot(controller), before);
  assert.match(controller.saveError() ?? "", /Progress is not saved/);

  throwPersist = false;
  assert.deepEqual(controller.divide(), { ok: true });
  assert.deepEqual(stateSnapshot(controller).cells, { mantissa: 1, exponent: 0 });

  const badSaveClock = createGameController(
    createInitialGameState(),
    clock(10),
    { now: () => Number.NaN },
    persistWithStorage({
      getItem: () => null,
      setItem: () => {},
    }),
  );
  assert.deepEqual(badSaveClock.divide(), {
    ok: false,
    kind: "persistence",
    notices: [],
  });
  assert.deepEqual(stateSnapshot(badSaveClock).cells, { mantissa: 0, exponent: 0 });
});

test("dual clocks keep active event time distinct from saved envelope time", () => {
  const calls = [];
  const controller = createGameController(
    createInitialGameState(),
    clock(123),
    clock(456),
    (state, savedAtMs) => {
      calls.push({ state: structuredClone(state), savedAtMs });
      return { ok: true };
    },
  );

  assert.deepEqual(controller.divide(), { ok: true });
  assert.deepEqual(
    calls.map((call) => call.savedAtMs),
    [456],
  );
  assert.equal(calls[0].state.activeTimeMs, 0);
  assert.equal(calls[0].state.eventSequence, 1);

  const invalidActiveClock = createGameController(
    createInitialGameState(),
    clock(-1),
    clock(456),
    () => ({ ok: true }),
  );
  assert.throws(() => invalidActiveClock.divide(), /Active clock is invalid/);
});

test("storage adapter persists only complete game progress and reports write failure", () => {
  let written = "";
  const storage = {
    getItem: () => null,
    setItem: (_key, value) => {
      written = value;
    },
  };
  const persist = persistWithStorage(storage);
  assert.deepEqual(persist(createInitialGameState(), 100), { ok: true });
  assert.match(written, /"savedAtMs":100/);
  assert.match(written, new RegExp(`"progressionVersion":${CURRENT_PROGRESSION_VERSION}`));
  const envelope = JSON.parse(written);
  assert.equal(Object.hasOwn(envelope.state, "saveError"), false);
  assert.equal(Object.hasOwn(envelope.state, "password"), false);
  assert.equal(Object.hasOwn(envelope.state, "token"), false);
  assert.equal(Object.hasOwn(envelope.state, "secret"), false);

  const unavailable = persistWithStorage({
    getItem: () => null,
    setItem: () => {
      throw new Error("denied");
    },
  });
  assert.deepEqual(unavailable(createInitialGameState(), 100), {
    ok: false,
    notices: [notice()],
  });
});

test("core-six typed controller intents share record-persist-reconcile with canonical simulation time", () => {
  for (const intent of controllerIntentCases()) {
    const persisted = [];
    const controller = createGameController(
      intent.state,
      clock(9_999),
      clock(700),
      (state, atMs) => {
        persisted.push({ state: structuredClone(state), atMs });
        return { ok: true };
      },
    );
    const before = stateSnapshot(controller);

    assert.deepEqual(intent.invoke(controller), { ok: true }, intent.name);
    const after = stateSnapshot(controller);
    assert.equal(persisted.length, 1, intent.name);
    assert.equal(persisted[0]?.atMs, 700, intent.name);
    assert.equal(persisted[0]?.state.eventSequence, before.eventSequence + 1, intent.name);
    assert.deepEqual(after, persisted[0]?.state, intent.name);
    assert.equal(after.activeTimeMs, 60, intent.name);
    intent.verify(after);
  }
});

test("core-six recovery protection prevents every typed intent from writing or mutating", () => {
  for (const intent of controllerIntentCases()) {
    let writes = 0;
    const controller = createGameController(
      intent.state,
      clock(9_999),
      clock(700),
      () => {
        writes += 1;
        return { ok: true };
      },
      "retained-unreadable",
    );
    const before = stateSnapshot(controller);

    assert.deepEqual(intent.invoke(controller), {
      ok: false,
      kind: "recovery-blocked",
      notices: [],
    });
    assert.deepEqual(stateSnapshot(controller), before, intent.name);
    assert.equal(writes, 0, intent.name);
  }
});

test("core-six telomerase persistence failure preserves sequence until the player intentionally reissues", () => {
  let healthy = false;
  const telomerase = controllerIntentCases().find((intent) => intent.name === "spend-telomerase");
  assert.ok(telomerase);
  const controller = createGameController(telomerase.state, clock(9_999), clock(700), () =>
    healthy ? { ok: true } : { ok: false, notices: [notice()] },
  );
  const before = stateSnapshot(controller);

  assert.deepEqual(telomerase.invoke(controller), {
    ok: false,
    kind: "persistence",
    notices: [notice()],
  });
  assert.deepEqual(stateSnapshot(controller), before);

  healthy = true;
  assert.deepEqual(telomerase.invoke(controller), { ok: true });
  const after = stateSnapshot(controller);
  assert.equal(after.eventSequence, before.eventSequence + 1);
  assert.equal(after.telomeraseCharges, 0);
  assert.equal(after.telomereReserveByRegion.limited, 2);
});
