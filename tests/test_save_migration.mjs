import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createInitialGameState } from "../src/state/game_state.ts";
import {
  MAX_COLLECTION,
  SAVE_KEY,
  loadFromStorage,
  parseSave,
  saveToStorage,
  serializeGameState,
} from "../src/state/save_load.ts";

const fixtureUrl = new URL("./fixtures/m4_populated_v2.json", import.meta.url);
const legacyUrl = new URL("./fixtures/m4_legacy_v1.json", import.meta.url);
const hostileManifestUrl = new URL("./fixtures/m4_hostile_manifest.json", import.meta.url);

function fixtureRaw() {
  return readFileSync(fixtureUrl, "utf8");
}

function fixtureRecord() {
  return JSON.parse(fixtureRaw());
}

function loadedFixture() {
  const result = parseSave(fixtureRaw());
  assert.equal(result.status, "loaded");
  assert.deepEqual(result.notices, []);
  return result;
}

function clone(value) {
  return structuredClone(value);
}

function notice(field) {
  return {
    code: "field-defaulted",
    field,
    message: `Recovered ${field} with its safe default.`,
  };
}

function expectRejected(raw, name) {
  const result = parseSave(raw);
  assert.equal(result.status, "rejected", name);
  assert.equal(result.state, undefined, name);
  assert.equal(result.retainedRaw, raw, name);
  assert.equal(result.notices.length, 1, name);
  assert.equal(result.notices[0]?.code, "save-rejected", name);
}

function expectRecovered(raw, state, field, name) {
  const result = parseSave(raw);
  assert.equal(result.status, "loaded", name);
  assert.deepEqual(result.state, state, name);
  assert.deepEqual(result.notices, [notice(field)], name);
}

function mutateRaw(mutator) {
  const record = fixtureRecord();
  mutator(record);
  return JSON.stringify(record);
}

function storage(initial = null, failures = {}) {
  let raw = initial;
  return {
    getItem(key) {
      if (failures.read) throw new Error("read failure");
      return key === SAVE_KEY ? raw : null;
    },
    setItem(key, value) {
      if (failures.write) throw new Error("write failure");
      if (key === SAVE_KEY) raw = value;
    },
    raw() {
      return raw;
    },
  };
}

test("external populated V2 fixture round-trips with exact metadata and stable serialization", () => {
  const first = loadedFixture();
  assert.equal(first.version, 2);
  assert.equal(first.savedAtMs, 101);
  assert.equal(first.progressionVersion, 2);
  assert.deepEqual(first.state, fixtureRecord().state);

  const once = serializeGameState(first.state, first.savedAtMs, first.progressionVersion);
  const second = parseSave(once);
  assert.equal(second.status, "loaded");
  assert.deepEqual(second.state, first.state);
  assert.deepEqual(second.notices, []);
  assert.equal(serializeGameState(second.state, second.savedAtMs, second.progressionVersion), once);
});

test("V1 fixture migration has an exact whole-state result and stable V2 reserialization", () => {
  const result = parseSave(readFileSync(legacyUrl, "utf8"));
  const expected = {
    ...createInitialGameState(),
    cells: { mantissa: 4.2, exponent: 3 },
    atp: { mantissa: 1, exponent: 2 },
    currentStage: "microcolony",
    eventSequence: 7,
  };
  assert.equal(result.status, "loaded");
  assert.deepEqual(result.state, expected);
  assert.equal(result.version, 2);
  assert.equal(result.savedAtMs, 120);
  assert.equal(result.progressionVersion, 1);
  assert.deepEqual(result.notices, []);

  const reserialized = serializeGameState(
    result.state,
    result.savedAtMs,
    result.progressionVersion,
  );
  const reread = parseSave(reserialized);
  assert.equal(reread.status, "loaded");
  assert.deepEqual(reread.state, expected);
  assert.deepEqual(reread.notices, []);
  assert.equal(
    serializeGameState(reread.state, reread.savedAtMs, reread.progressionVersion),
    reserialized,
  );
});

test("recoverable scalar and nested relation leaves preserve all nondependent siblings", () => {
  const original = loadedFixture().state;
  const scalarRaw = mutateRaw((record) => {
    record.state.damagePressure = "bad";
  });
  const scalar = parseSave(scalarRaw);
  assert.equal(scalar.status, "loaded");
  assert.deepEqual(scalar.state, { ...original, damagePressure: 0 });
  assert.deepEqual(scalar.notices, [notice("damagePressure")]);

  const relationRaw = mutateRaw((record) => {
    record.state.regions[0].senescenceEventId = 7;
  });
  const relation = parseSave(relationRaw);
  const expectedRelation = clone(original);
  delete expectedRelation.regions[0].senescenceEventId;
  expectedRelation.clearanceQueue = [];
  assert.equal(relation.status, "loaded");
  assert.deepEqual(relation.state, expectedRelation);
  assert.deepEqual(relation.notices, [notice("regions[0].senescenceEventId")]);

  const microbiomeRaw = mutateRaw((record) => {
    record.state.microbiome.pendingCompatibility = "invalid";
  });
  const microbiome = parseSave(microbiomeRaw);
  const expectedMicrobiome = clone(original);
  expectedMicrobiome.microbiome.pendingCompatibility = null;
  assert.equal(microbiome.status, "loaded");
  assert.deepEqual(microbiome.state, expectedMicrobiome);
  assert.deepEqual(microbiome.notices, [notice("microbiome.pendingCompatibility")]);
});

test("missing V2 leaves are visible recoveries across durable field classes", () => {
  for (const field of ["damagePressure", "stageGateProgress", "producerLevels", "cells"]) {
    const original = loadedFixture().state;
    const raw = mutateRaw((record) => {
      delete record.state[field];
    });
    const result = parseSave(raw);
    const expected = clone(original);
    expected[field] = createInitialGameState()[field];
    assert.equal(result.status, "loaded", field);
    assert.deepEqual(result.state, expected, field);
    assert.deepEqual(result.notices, [notice(field)], field);
  }
});

test("named hostile fixture corpus rejects exact raw without prototype pollution", () => {
  const manifest = JSON.parse(readFileSync(hostileManifestUrl, "utf8"));
  const cases = {
    "malformed-json": "{",
    "unsupported-version": mutateRaw((r) => (r.version = 3)),
    "non-object-envelope": "[]",
    "bad-envelope": mutateRaw((r) => delete r.savedAtMs),
    "unknown-envelope-key": mutateRaw((r) => (r.extra = true)),
    "reserved-envelope-key":
      '{"version":2,"savedAtMs":1,"progressionVersion":1,"state":{},"__proto__":{}}',
    "oversized-raw": "x".repeat(250001),
    "oversized-collection": mutateRaw(
      (r) => (r.state.producerLevels = Array(MAX_COLLECTION + 1).fill({ id: "p", level: 1 })),
    ),
    "unsafe-numeric": mutateRaw((r) => (r.state.eventSequence = Number.MAX_SAFE_INTEGER + 1)),
    "noncanonical-bignum": mutateRaw((r) => (r.state.cells = { mantissa: 25, exponent: 7 })),
    "unknown-state-key": mutateRaw((r) => (r.state.extra = true)),
    "reserved-state-key": mutateRaw((r) => (r.state.constructor = {})),
    "unknown-nested-key": mutateRaw((r) => (r.state.regions[0].extra = true)),
    "reserved-nested-key": mutateRaw((r) => (r.state.regions[0].constructor = {})),
    "unknown-program-key": mutateRaw((r) => (r.state.programs.extra = true)),
    "reserved-program-key": mutateRaw((r) => (r.state.programs.constructor = {})),
    "unknown-microbiome-key": mutateRaw((r) => (r.state.microbiome.extra = true)),
    "reserved-microbiome-key": mutateRaw((r) => (r.state.microbiome.constructor = {})),
    "duplicate-offer": mutateRaw((r) =>
      r.state.mutationOffers.push(clone(r.state.mutationOffers[0])),
    ),
    "duplicate-event": mutateRaw((r) =>
      r.state.pendingDamageEvents.push(clone(r.state.pendingDamageEvents[0])),
    ),
    "cross-collection-event-collision": mutateRaw(
      (r) => (r.state.pendingTransitEvents[0].id = "damage"),
    ),
    "dangling-region": mutateRaw((r) => (r.state.pendingDamageEvents[0].regionId = "missing")),
    "dangling-route": mutateRaw((r) => (r.state.pendingTransitEvents[0].routeId = "missing")),
    "orphan-clearance": mutateRaw((r) => (r.state.clearanceQueue = ["orphan"])),
    "program-relation": mutateRaw(
      (r) => (r.state.programs.selectedByHallmark.proliferative_signaling = "missing"),
    ),
    "microbiome-relation": mutateRaw((r) => (r.state.microbiome.selectedNiches = ["microbe-a"])),
    "prototype-pollution":
      '{"version":2,"savedAtMs":1,"progressionVersion":1,"state":{"__proto__":{"polluted":true}}}',
  };
  assert.deepEqual(Object.keys(cases).sort(), manifest.rejected.slice().sort());
  for (const [name, raw] of Object.entries(cases)) expectRejected(raw, name);
  const original = loadedFixture().state;
  const recovered = {
    "reserved-map-key": [
      mutateRaw((r) => (r.state.atpBudget.constructor = 1)),
      { ...original, atpBudget: {} },
      "atpBudget",
    ],
  };
  assert.deepEqual(Object.keys(recovered).sort(), manifest.recovered.slice().sort());
  for (const [name, [raw, state, field]] of Object.entries(recovered)) {
    expectRecovered(raw, state, field, name);
  }
  assert.equal({}.polluted, undefined);
});

test("storage reports exact absence, read, corrupt, write, and successful full round-trip outcomes", () => {
  assert.deepEqual(loadFromStorage(storage()), { status: "absent", notices: [] });
  assert.deepEqual(loadFromStorage(storage(null, { read: true })), {
    status: "rejected",
    notices: [
      { code: "storage-error", field: "storage", message: "Saved game could not be read." },
    ],
  });

  const corrupt = "{bad";
  const corruptResult = loadFromStorage(storage(corrupt));
  assert.equal(corruptResult.status, "rejected");
  assert.equal(corruptResult.retainedRaw, corrupt);
  assert.equal(corruptResult.notices[0]?.code, "save-rejected");

  const state = loadedFixture().state;
  const failedStorage = storage(null, { write: true });
  assert.deepEqual(saveToStorage(failedStorage, state, 77), [
    { code: "storage-error", field: "storage", message: "Saved game could not be written." },
  ]);
  assert.equal(failedStorage.raw(), null);

  const successfulStorage = storage();
  assert.deepEqual(saveToStorage(successfulStorage, state, 77), []);
  const expectedRaw = serializeGameState(state, 77);
  assert.equal(successfulStorage.raw(), expectedRaw);
  const loaded = loadFromStorage(successfulStorage);
  assert.equal(loaded.status, "loaded");
  assert.deepEqual(loaded.state, state);
  assert.equal(loaded.savedAtMs, 77);
  assert.equal(loaded.progressionVersion, 1);
  assert.deepEqual(loaded.notices, []);
});
