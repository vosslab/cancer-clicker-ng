import assert from "node:assert/strict";
import test from "node:test";
import { bigNum, hallmarkId, routeId, stageId } from "../src/brands.ts";
import { fromSafeInteger, subtract } from "../src/bignum/bignum.ts";
import { createInitialGameState } from "../src/state/game_state.ts";
import { recordEvent } from "../src/state/events.ts";
import {
  MAX_COLLECTION,
  SAVE_KEY,
  loadFromStorage,
  parseSave,
  saveToStorage,
  serializeGameState,
} from "../src/state/save_load.ts";

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
const LEGACY_V1_RECORD = {
  version: 1,
  savedAtMs: 120,
  state: {
    cells: {
      mantissa: 4.2,
      exponent: 3,
    },
    atp: {
      mantissa: 1,
      exponent: 2,
    },
    stageId: "microcolony",
    eventSequence: 7,
  },
};
const HOSTILE_CASE_NAMES = [
  "malformed-json",
  "unsupported-version",
  "non-object-envelope",
  "bad-envelope",
  "unknown-envelope-key",
  "reserved-envelope-key",
  "oversized-raw",
  "oversized-collection",
  "unsafe-numeric",
  "noncanonical-bignum",
  "unknown-state-key",
  "reserved-state-key",
  "unknown-nested-key",
  "reserved-nested-key",
  "unknown-program-key",
  "reserved-program-key",
  "unknown-microbiome-key",
  "reserved-microbiome-key",
  "duplicate-offer",
  "duplicate-event",
  "cross-collection-event-collision",
  "dangling-region",
  "dangling-route",
  "orphan-clearance",
  "program-relation",
  "microbiome-relation",
  "prototype-pollution",
  "reserved-map-key",
];

function populatedV2Record() {
  return structuredClone(POPULATED_V2_RECORD);
}

function populatedV2Raw() {
  return JSON.stringify(populatedV2Record());
}

function legacyV1Raw() {
  return JSON.stringify(LEGACY_V1_RECORD);
}

function loadedFixture() {
  const result = parseSave(populatedV2Raw());
  assert.equal(result.status, "loaded");
  assert.deepEqual(result.notices, []);
  assert.deepEqual(result.state, {
    ...populatedV2Record().state,
    producerLevels: createInitialGameState().producerLevels.map((entry) =>
      entry.id === "producer" ? { ...entry, level: 2 } : entry,
    ),
    atpBudget: {},
    atpSinks: [],
    immuneVisibilityByRegion: {},
    concealmentTokens: 0,
    maskedRegions: [],
    inflammationEpisodes: [],
    regionalInflammation: {},
    mutationOffers: [],
    chosenMutations: [],
    mutationLiabilities: [],
    genomeBurden: 0,
    activeTimeMs: populatedV2Record().state.stageStartedAtMs,
    pendingProgression: [],
  });
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

function expectRecovered(raw, state, fields, name) {
  const result = parseSave(raw);
  assert.equal(result.status, "loaded", name);
  assert.deepEqual(result.state, state, name);
  assert.deepEqual(result.notices, (Array.isArray(fields) ? fields : [fields]).map(notice), name);
}

function mutateRaw(mutator) {
  const record = JSON.parse(serializeGameState(loadedFixture().state, 101));
  mutator(record);
  return JSON.stringify(record);
}

function legacyMutateRaw(mutator) {
  const record = populatedV2Record();
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

function denseValidGraphState(regionCount, routeCount) {
  const routeIds = Array.from(
    { length: routeCount },
    (_, index) => `route-${String(index).padStart(110, "x")}`,
  );
  const committedCellCommitments = Object.fromEntries(routeIds.map((id) => [id, 0]));
  const routeRiskById = Object.fromEntries(routeIds.map((id) => [id, 0]));
  const regions = Array.from({ length: regionCount }, (_, index) => ({
    id: `region-${index}`,
    capacity: 1,
    viability: 1,
    phenotype: "proliferative",
    vesselLinkIds: [],
    routeIds,
  }));
  return { ...createInitialGameState(), committedCellCommitments, routeRiskById, regions };
}

function routeDiscoveryState() {
  const state = loadedFixture().state;
  const region = {
    ...state.regions[0],
    routeIds: [routeId("local-front"), routeId("risky-exit")],
  };
  return {
    ...state,
    cells: bigNum(25, 0),
    currentStage: stageId("invasive_carcinoma"),
    stageStartedAtMs: 2,
    activeTimeMs: 2,
    lastStageTransition: undefined,
    hallmarkLevels: [{ id: hallmarkId("invasion_metastasis"), level: 0 }],
    regions: [region],
    routeRiskById: { "local-front": 0, "risky-exit": 0.4 },
    committedCellCommitments: {},
    pendingTransitEvents: [],
    seededSites: [],
  };
}

test("populated V2 save round-trips with exact metadata and stable serialization", () => {
  const first = loadedFixture();
  assert.equal(first.version, 2);
  assert.equal(first.savedAtMs, 101);
  assert.equal(first.progressionVersion, 4);

  const once = serializeGameState(first.state, first.savedAtMs);
  const second = parseSave(once);
  assert.equal(second.status, "loaded");
  assert.deepEqual(second.state, first.state);
  assert.deepEqual(second.notices, []);
  assert.equal(serializeGameState(second.state, second.savedAtMs), once);
});

test("revealed routes persist before commitment and commit through the canonical event funnel", () => {
  const discovered = routeDiscoveryState();
  const beforeCommitRaw = serializeGameState(discovered, 301);
  const beforeCommit = parseSave(beforeCommitRaw);
  assert.equal(beforeCommit.status, "loaded");
  assert.deepEqual(beforeCommit.state.committedCellCommitments, {});
  assert.deepEqual(beforeCommit.state.routeRiskById, { "local-front": 0, "risky-exit": 0.4 });

  const acquired = recordEvent(beforeCommit.state, {
    type: "purchase-hallmark",
    hallmarkId: hallmarkId("invasion_metastasis"),
    atMs: beforeCommit.state.activeTimeMs,
  });
  const committed = recordEvent(acquired, {
    type: "commit-route",
    routeId: routeId("risky-exit"),
    cells: 7,
    atMs: acquired.activeTimeMs,
  });
  assert.deepEqual(committed.cells, subtract(acquired.cells, fromSafeInteger(7)));
  assert.deepEqual(committed.committedCellCommitments, { "risky-exit": 7 });
  assert.deepEqual(committed.seededSites, []);

  const afterCommitRaw = serializeGameState(committed, 302);
  const afterCommit = parseSave(afterCommitRaw);
  assert.equal(afterCommit.status, "loaded");
  assert.deepEqual(afterCommit.state, committed);
  assert.equal(serializeGameState(afterCommit.state, 302), afterCommitRaw);
});

test("route discovery relations reject orphans and preserve protected recovery on failed writes", () => {
  const validRaw = serializeGameState(routeDiscoveryState(), 303);
  const hostileCases = {
    "missing-revealed-route-risk": (record) => delete record.state.routeRiskById["risky-exit"],
    "risk-outside-revealed-routes": (record) => (record.state.routeRiskById.orphan = 0.2),
    "commitment-outside-revealed-routes": (record) =>
      (record.state.committedCellCommitments.orphan = 1),
    "transit-without-committed-route": (record) =>
      (record.state.pendingTransitEvents = [
        { id: "uncommitted-transit", routeId: "risky-exit", outcome: "lost" },
      ]),
    "duplicate-revealed-route-relation": (record) =>
      (record.state.regions[0].routeIds = ["local-front", "local-front"]),
  };
  for (const [name, mutate] of Object.entries(hostileCases)) {
    const record = JSON.parse(validRaw);
    mutate(record);
    expectRejected(JSON.stringify(record), name);
  }

  const orphanRecord = JSON.parse(validRaw);
  orphanRecord.state.committedCellCommitments.orphan = 1;
  const orphanRaw = JSON.stringify(orphanRecord);
  const protectedStorage = storage(orphanRaw);
  const rejected = loadFromStorage(protectedStorage);
  assert.equal(rejected.status, "rejected");
  assert.equal(rejected.retainedRaw, orphanRaw);

  const notices = saveToStorage(
    protectedStorage,
    {
      ...routeDiscoveryState(),
      routeRiskById: { "local-front": 0 },
    },
    304,
  );
  assert.deepEqual(notices, [
    { code: "storage-error", field: "storage", message: "Saved game could not be written." },
  ]);
  assert.equal(protectedStorage.raw(), orphanRaw);
});

test("V1 migration has an exact whole-state result and stable V2 reserialization", () => {
  const result = parseSave(legacyV1Raw());
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
  assert.equal(result.progressionVersion, 4);
  assert.deepEqual(result.notices, []);

  const reserialized = serializeGameState(result.state, result.savedAtMs);
  const reread = parseSave(reserialized);
  assert.equal(reread.status, "loaded");
  assert.deepEqual(reread.state, expected);
  assert.deepEqual(reread.notices, []);
  assert.equal(serializeGameState(reread.state, reread.savedAtMs), reserialized);
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

test("missing current V2 leaves are visible recoveries across nonstructural durable field classes", () => {
  for (const field of ["damagePressure", "stageGateProgress", "cells"]) {
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

test("current malformed V2 leaves recover independently and visibly at both numeric boundaries", () => {
  const initial = createInitialGameState();
  const original = loadedFixture().state;
  const cases = [
    ["hallmarkLevels[0].level", "hallmarkLevels", -1],
    ["hallmarkLevels[0].level", "hallmarkLevels", Number.MAX_SAFE_INTEGER + 1],
    ["lastStageTransition.atMs", "lastStageTransition", -1],
    ["lastStageTransition.atMs", "lastStageTransition", Number.MAX_SAFE_INTEGER + 1],
    ["deterministicSeed", "deterministicSeed", -1],
    ["deterministicSeed", "deterministicSeed", Number.MAX_SAFE_INTEGER + 1],
    ["totalOfflineMs", "totalOfflineMs", -1],
    ["totalOfflineMs", "totalOfflineMs", Number.MAX_SAFE_INTEGER + 1],
  ];
  for (const [path, field, badValue] of cases) {
    const raw = mutateRaw((record) => {
      if (path === "hallmarkLevels[0].level") record.state.hallmarkLevels[0].level = badValue;
      else if (path === "lastStageTransition.atMs")
        record.state.lastStageTransition.atMs = badValue;
      else record.state[path] = badValue;
    });
    const expected = clone(original);
    if (field in initial) expected[field] = initial[field];
    else delete expected[field];
    const fields = field === "stageStartedAtMs" ? [field, "lastStageTransition"] : field;
    if (field === "stageStartedAtMs") delete expected.lastStageTransition;
    const name = `${path}:${badValue < 0 ? "negative" : "unsafe"}`;
    assert.notDeepEqual(expected, original, `${name} must change independently expected state`);
    expectRecovered(raw, expected, fields, name);
  }
  for (const badValue of [-1, Number.MAX_SAFE_INTEGER + 1]) {
    expectRejected(
      legacyMutateRaw((record) => (record.state.stageStartedAtMs = badValue)),
      `legacy-stageStartedAtMs:${badValue < 0 ? "negative" : "unsafe"}`,
    );
  }
});

test("historical malformed nested cores fail closed for capacity and deadlines", () => {
  const cases = [
    ["regions[0].capacity", -1],
    ["regions[0].capacity", Number.MAX_SAFE_INTEGER + 1],
    ["programs.cooldownDeadlineMs", -1],
    ["programs.cooldownDeadlineMs", Number.MAX_SAFE_INTEGER + 1],
  ];
  for (const [path, badValue] of cases) {
    const raw = mutateRaw((record) => {
      if (path === "regions[0].capacity") record.state.regions[0].capacity = badValue;
      else record.state.programs.cooldownDeadlineMs = badValue;
    });
    const name = `${path}:${badValue < 0 ? "negative" : "unsafe"}`;
    expectRejected(raw, name);
  }
});

test("impossible persisted transition histories default only the optional transition leaf", () => {
  const original = loadedFixture().state;
  const cases = [
    ["skip", (state) => (state.lastStageTransition.to = "avascular_lesion")],
    [
      "backward",
      (state) => {
        state.lastStageTransition.from = "microcolony";
        state.lastStageTransition.to = "transformed_cell";
      },
    ],
    ["duplicate", (state) => (state.lastStageTransition.from = "microcolony")],
    [
      "terminal",
      (state) => {
        state.lastStageTransition.from = "global_lab_contamination";
        state.lastStageTransition.to = "transformed_cell";
      },
    ],
    ["current-mismatch", (state) => (state.currentStage = "avascular_lesion")],
    ["timestamp-mismatch", (state) => (state.stageStartedAtMs = 3)],
  ];
  for (const [name, mutate] of cases) {
    const raw = mutateRaw((record) => {
      mutate(record.state);
      if (name === "timestamp-mismatch") record.state.activeTimeMs = record.state.stageStartedAtMs;
    });
    const expected = clone(original);
    mutate(expected);
    if (name === "timestamp-mismatch") expected.activeTimeMs = expected.stageStartedAtMs;
    delete expected.lastStageTransition;
    assert.notDeepEqual(expected, original, `${name} must preserve its nontransition mutation`);
    expectRecovered(raw, expected, "lastStageTransition", name);
  }
});

test("named hostile save corpus rejects exact raw without prototype pollution", () => {
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
    "reserved-map-key": mutateRaw((r) => (r.state.atpBudget.constructor = 1)),
  };
  assert.deepEqual(Object.keys(cases).sort(), HOSTILE_CASE_NAMES.slice().sort());
  for (const [name, raw] of Object.entries(cases)) expectRejected(raw, name);
  const recovered = {};
  assert.deepEqual(Object.keys(recovered).sort(), []);
  for (const [name, [raw, state, field]] of Object.entries(recovered)) {
    expectRecovered(raw, state, field, name);
  }
  assert.equal({}.polluted, undefined);
});

test("all legacy progression envelopes migrate to p4 and populated p4 queue survives exact reload", () => {
  for (const progressionVersion of [1, 2, 3]) {
    const raw =
      progressionVersion === 3
        ? mutateRaw((record) => (record.progressionVersion = progressionVersion))
        : legacyMutateRaw((record) => (record.progressionVersion = progressionVersion));
    const result = parseSave(raw);
    assert.equal(result.status, "loaded", `p${progressionVersion}`);
    assert.equal(result.progressionVersion, 4, `p${progressionVersion}`);
    assert.equal(
      result.state.activeTimeMs,
      result.state.stageStartedAtMs,
      `p${progressionVersion}`,
    );
    assert.deepEqual(result.state.pendingProgression, [], `p${progressionVersion}`);
  }
  const populated = {
    ...loadedFixture().state,
    activeTimeMs: 91,
    totalOfflineMs: 61_000,
    pendingProgression: [
      { kind: "stage", id: "microcolony", firstObservedAtActiveMs: 4 },
      { kind: "prestige", id: "L1", firstObservedAtActiveMs: 5 },
      { kind: "stage", id: "avascular_lesion", firstObservedAtActiveMs: 6 },
    ],
  };
  const once = serializeGameState(populated, 123);
  const reread = parseSave(once);
  assert.equal(reread.status, "loaded");
  assert.deepEqual(reread.state.pendingProgression, populated.pendingProgression);
  assert.equal(reread.state.activeTimeMs, 91);
  assert.equal(reread.state.totalOfflineMs, 61_000);
  assert.deepEqual(reread.state.cells, populated.cells);
  assert.deepEqual(reread.state.substrate, populated.substrate);
  assert.deepEqual(reread.state.atp, populated.atp);
  assert.equal(serializeGameState(reread.state, reread.savedAtMs), once);
});

test("a populated p3 migration preserves its independent simulation clock and ordered mixed queue", () => {
  const p3 = JSON.parse(serializeGameState(loadedFixture().state, 211));
  p3.progressionVersion = 3;
  p3.state.activeTimeMs = 89;
  p3.state.pendingProgression = [
    { kind: "stage", id: "microcolony", firstObservedAtActiveMs: 4 },
    { kind: "prestige", id: "L1", firstObservedAtActiveMs: 7 },
    { kind: "stage", id: "avascular_lesion", firstObservedAtActiveMs: 12 },
  ];
  const raw = JSON.stringify(p3);
  const migrated = parseSave(raw);
  assert.equal(migrated.status, "loaded");
  assert.equal(migrated.progressionVersion, 4);
  assert.equal(migrated.state.activeTimeMs, 89);
  assert.notEqual(migrated.state.activeTimeMs, migrated.state.stageStartedAtMs);
  assert.deepEqual(migrated.state.pendingProgression, p3.state.pendingProgression);
  const once = serializeGameState(migrated.state, migrated.savedAtMs);
  const reread = parseSave(once);
  assert.equal(reread.status, "loaded");
  assert.deepEqual(reread.state, migrated.state);
  assert.deepEqual(reread.notices, []);
  assert.equal(serializeGameState(reread.state, reread.savedAtMs), once);
});

test("sparse and empty p3 inventories normalize only during the explicit p3 to p4 migration", () => {
  const p3 = JSON.parse(serializeGameState(loadedFixture().state, 31));
  p3.progressionVersion = 3;
  p3.state.producerLevels = [
    { id: "egfr", level: 7 },
    { id: "producer", level: 2 },
  ];
  const sparseRaw = JSON.stringify(p3);
  const sparse = parseSave(sparseRaw);
  assert.equal(sparse.status, "loaded");
  assert.equal(sparse.progressionVersion, 4);
  assert.deepEqual(sparse.state.producerLevels, [
    { id: "producer", level: 2 },
    { id: "cdk4", level: 0 },
    { id: "myc", level: 0 },
    { id: "ras", level: 0 },
    { id: "telomerase", level: 0 },
    { id: "egfr", level: 7 },
    { id: "pi3k", level: 0 },
    { id: "replication_fork", level: 0 },
  ]);

  p3.state.producerLevels = [];
  const emptyRaw = JSON.stringify(p3);
  const empty = parseSave(emptyRaw);
  assert.equal(empty.status, "loaded");
  assert.deepEqual(empty.state.producerLevels, createInitialGameState().producerLevels);
});

test("legacy catalog migration rejects unknown, duplicate, unsafe, and malformed levels without fallback", () => {
  const cases = [
    ["unknown", [{ id: "missing", level: 1 }]],
    [
      "duplicate",
      [
        { id: "producer", level: 1 },
        { id: "producer", level: 2 },
      ],
    ],
    ["negative", [{ id: "producer", level: -1 }]],
    ["unsafe", [{ id: "producer", level: Number.MAX_SAFE_INTEGER + 1 }]],
    ["malformed", [{ id: "producer", level: 1, extra: true }]],
  ];
  for (const [name, levels] of cases) {
    const raw = legacyMutateRaw((record) => {
      record.progressionVersion = 2;
      record.state.producerLevels = levels;
    });
    expectRejected(raw, `legacy-${name}`);
  }
});

test("progression migration and p4 queue schema reject hostile version, core, clock, and identity records", () => {
  const p4 = JSON.parse(serializeGameState({ ...loadedFixture().state, activeTimeMs: 20 }, 50));
  const p4Raw = (mutator) => {
    const record = clone(p4);
    mutator(record);
    return JSON.stringify(record);
  };
  const cases = [
    ["future-version", p4Raw((record) => (record.progressionVersion = 5))],
    [
      "p1-extra-core",
      legacyMutateRaw((record) => {
        record.progressionVersion = 1;
        record.state.extra = true;
      }),
    ],
    [
      "p2-missing-core",
      legacyMutateRaw((record) => {
        record.progressionVersion = 2;
        delete record.state.stageStartedAtMs;
      }),
    ],
    ["p4-missing-active", p4Raw((record) => delete record.state.activeTimeMs)],
    [
      "p4-unsafe-active",
      p4Raw((record) => (record.state.activeTimeMs = Number.MAX_SAFE_INTEGER + 1)),
    ],
    [
      "p4-bad-queue-key",
      p4Raw(
        (record) =>
          (record.state.pendingProgression = [
            { kind: "stage", id: "microcolony", firstObservedAtActiveMs: 1, extra: true },
          ]),
      ),
    ],
    [
      "p4-noncatalog-id",
      p4Raw(
        (record) =>
          (record.state.pendingProgression = [
            { kind: "stage", id: "missing", firstObservedAtActiveMs: 1 },
          ]),
      ),
    ],
    [
      "p4-duplicate-identity",
      p4Raw(
        (record) =>
          (record.state.pendingProgression = [
            { kind: "stage", id: "microcolony", firstObservedAtActiveMs: 1 },
            { kind: "stage", id: "microcolony", firstObservedAtActiveMs: 2 },
          ]),
      ),
    ],
    [
      "p4-future-observation",
      p4Raw(
        (record) =>
          (record.state.pendingProgression = [
            { kind: "prestige", id: "L1", firstObservedAtActiveMs: 21 },
          ]),
      ),
    ],
    ["p4-missing-levels", p4Raw((record) => delete record.state.producerLevels)],
    ["p4-empty-levels", p4Raw((record) => (record.state.producerLevels = []))],
    [
      "p4-sparse-levels",
      p4Raw((record) => (record.state.producerLevels = [{ id: "producer", level: 2 }])),
    ],
    [
      "p4-extra-level",
      p4Raw((record) => record.state.producerLevels.push({ id: "producer", level: 0 })),
    ],
    ["p4-out-of-order-levels", p4Raw((record) => record.state.producerLevels.reverse())],
    ["p4-unknown-level", p4Raw((record) => (record.state.producerLevels[0].id = "missing"))],
    ["p4-duplicate-level", p4Raw((record) => (record.state.producerLevels[1].id = "producer"))],
    [
      "p4-unsafe-level",
      p4Raw((record) => (record.state.producerLevels[0].level = Number.MAX_SAFE_INTEGER + 1)),
    ],
  ];
  for (const [name, raw] of cases) expectRejected(raw, name);
});

test("p4 writers fail closed before storage for every parser-rejected or recovered current state", () => {
  const state = loadedFixture().state;
  const sparse = { ...state, producerLevels: [state.producerLevels[0]] };
  const reordered = { ...state, producerLevels: [...state.producerLevels].reverse() };
  for (const [name, invalid] of [
    ["sparse", sparse],
    ["reordered", reordered],
    ["negative-active-time", { ...state, activeTimeMs: -1 }],
    ["unsafe-active-time", { ...state, activeTimeMs: Number.MAX_SAFE_INTEGER + 1 }],
    ["backward-active-time", { ...state, activeTimeMs: 1 }],
    [
      "future-queue-observation",
      {
        ...state,
        activeTimeMs: 8,
        pendingProgression: [{ kind: "stage", id: "microcolony", firstObservedAtActiveMs: 9 }],
      },
    ],
    ["noncanonical-bignum", { ...state, cells: { mantissa: 0, exponent: 12 } }],
    ["malformed-deadline", { ...state, programs: { ...state.programs, cooldownDeadlineMs: -1 } }],
    ["dangling-graph-relation", { ...state, seededSites: ["missing"] }],
    [
      "recoverable-transition",
      {
        ...state,
        lastStageTransition: { ...state.lastStageTransition, atMs: state.stageStartedAtMs + 1 },
      },
    ],
  ]) {
    assert.throws(
      () => serializeGameState(invalid, 44),
      /Current save state|Producer levels/,
      name,
    );
    const target = storage();
    assert.deepEqual(saveToStorage(target, invalid, 44), [
      { code: "storage-error", field: "storage", message: "Saved game could not be written." },
    ]);
    assert.equal(target.raw(), null, name);
  }

  const validStates = [createInitialGameState(), state, { ...state, activeTimeMs: 91 }];
  for (const [index, valid] of validStates.entries()) {
    const raw = serializeGameState(valid, 100 + index);
    const loaded = parseSave(raw);
    assert.equal(loaded.status, "loaded", `valid-${index}`);
    assert.deepEqual(loaded.state, valid, `valid-${index}`);
    assert.deepEqual(loaded.notices, [], `valid-${index}`);
    assert.equal(serializeGameState(loaded.state, loaded.savedAtMs), raw, `valid-${index}`);
  }
});

test("complete p4 writer envelope validation rejects over-limit graphs before storage", () => {
  const underLimit = denseValidGraphState(5, 5);
  const underLimitRaw = serializeGameState(underLimit, 17);
  const underLimitLoaded = parseSave(underLimitRaw);
  assert.equal(underLimitLoaded.status, "loaded");
  assert.deepEqual(underLimitLoaded.state, underLimit);
  assert.deepEqual(underLimitLoaded.notices, []);
  assert.equal(serializeGameState(underLimitLoaded.state, 17), underLimitRaw);

  const overLimit = denseValidGraphState(100, 100);
  assert.throws(() => serializeGameState(overLimit, 18), /Current save state/);
  const target = storage();
  assert.deepEqual(saveToStorage(target, overLimit, 18), [
    { code: "storage-error", field: "storage", message: "Saved game could not be written." },
  ]);
  assert.equal(target.raw(), null);
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
  assert.equal(loaded.progressionVersion, 4);
  assert.deepEqual(loaded.notices, []);
});
