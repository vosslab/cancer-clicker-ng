import assert from "node:assert/strict";
import test from "node:test";
import { bigNum, eventId, hallmarkId, regionId, routeId, stageId } from "../src/brands.ts";
import {
  applyCoreSixOperation,
  assertCoreSixHandlerRegistry,
  CORE_SIX_HANDLER_REGISTRY,
} from "../src/hallmarks/core_six_dispatch.ts";
import { createInitialGameState } from "../src/state/game_state.ts";

function stateForDivision() {
  return {
    ...createInitialGameState(),
    hallmarkLevels: [{ id: hallmarkId("proliferative_signaling"), level: 1 }],
    eventSequence: 10,
  };
}

function stateForCheckpoint() {
  return {
    ...createInitialGameState(),
    currentStage: stageId("microcolony"),
    hallmarkLevels: [{ id: hallmarkId("growth_suppressor_evasion"), level: 1 }],
    eventSequence: 11,
  };
}

function stateForTriage() {
  const target = {
    id: regionId("damaged"),
    capacity: 4,
    viability: 0.4,
    phenotype: "stress-tolerant",
    vesselLinkIds: [],
    routeIds: [],
  };
  return {
    ...createInitialGameState(),
    currentStage: stageId("avascular_lesion"),
    hallmarkLevels: [{ id: hallmarkId("cell_death_resistance"), level: 1 }],
    survivalCapacity: 1,
    regions: [target],
    pendingDamageEvents: [{ id: eventId("damage"), regionId: target.id, outcome: "repairable" }],
    eventSequence: 12,
  };
}

function warningRegion(id) {
  return {
    id: regionId(id),
    capacity: 3,
    viability: 1,
    phenotype: "proliferative",
    vesselLinkIds: [],
    routeIds: [],
  };
}

function stateForTelomerase() {
  const target = warningRegion("senescing");
  return {
    ...createInitialGameState(),
    currentStage: stageId("hypoxic_lesion"),
    activeTimeMs: 20,
    hallmarkLevels: [{ id: hallmarkId("replicative_immortality"), level: 1 }],
    regions: [target],
    telomeraseCharges: 1,
    telomereReserveByRegion: { senescing: 0 },
    reserveFloor: 0,
    eventSequence: 13,
  };
}

function stateForPerfusion() {
  const target = warningRegion("rim");
  return {
    ...createInitialGameState(),
    currentStage: stageId("hypoxic_lesion"),
    activeTimeMs: 20,
    hallmarkLevels: [{ id: hallmarkId("angiogenesis"), level: 1 }],
    regions: [target],
    oxygenPressure: 4,
    eventSequence: 14,
  };
}

function stateForRoute() {
  const route = routeId("front");
  return {
    ...createInitialGameState(),
    currentStage: stageId("invasive_carcinoma"),
    cells: bigNum(5, 0),
    hallmarkLevels: [{ id: hallmarkId("invasion_metastasis"), level: 1 }],
    regions: [
      {
        ...warningRegion("primary"),
        routeIds: [route],
      },
    ],
    routeRiskById: { front: 0 },
    eventSequence: 15,
  };
}

function assertAtomicRejection(state, operation, appliedAtMs, pattern) {
  const before = structuredClone(state);
  assert.throws(() => applyCoreSixOperation(state, operation, appliedAtMs), pattern);
  assert.deepEqual(state, before);
}

test("core-six dispatch registry has one coherent catalog-backed handler for every core-six row", () => {
  assert.deepEqual(
    CORE_SIX_HANDLER_REGISTRY.map((entry) => [
      entry.hallmark,
      entry.handlerId,
      entry.operationType,
    ]),
    [
      ["proliferative_signaling", "apply-division-allocation", "set-signaling-allocation"],
      ["growth_suppressor_evasion", "apply-checkpoint-routing", "select-checkpoint"],
      ["cell_death_resistance", "apply-damage-triage", "resolve-triage"],
      ["replicative_immortality", "apply-replicative-budget", "spend-telomerase"],
      ["angiogenesis", "apply-perfusion-layout", "set-vessel-link"],
      ["invasion_metastasis", "apply-route-commitment", "commit-route"],
    ],
  );
  assertCoreSixHandlerRegistry();
});

test("core-six dispatcher routes all six catalog operations through distinct pure handlers", () => {
  const cases = [
    [
      stateForDivision(),
      {
        type: "set-signaling-allocation",
        hallmark: "proliferative_signaling",
        allocation: "cycle",
      },
      0,
      (after) => assert.equal(after.signalingAllocation, "cycle"),
    ],
    [
      stateForCheckpoint(),
      {
        type: "select-checkpoint",
        hallmark: "growth_suppressor_evasion",
        checkpoint: "contact-inhibition",
      },
      0,
      (after) => assert.deepEqual(after.bypassedCheckpoints, ["contact-inhibition"]),
    ],
    [
      stateForTriage(),
      {
        type: "resolve-triage",
        hallmark: "cell_death_resistance",
        eventId: eventId("damage"),
        action: "absorb",
      },
      0,
      (after) => assert.equal(after.survivalCapacity, 0),
    ],
    [
      stateForTelomerase(),
      {
        type: "spend-telomerase",
        hallmark: "replicative_immortality",
        target: "refill-region",
        regionId: regionId("senescing"),
        charges: 1,
      },
      20,
      (after) => assert.equal(after.telomereReserveByRegion.senescing, 2),
    ],
    [
      stateForPerfusion(),
      {
        type: "set-vessel-link",
        hallmark: "angiogenesis",
        regionId: regionId("rim"),
        linked: true,
      },
      20,
      (after) => assert.equal(after.vesselMaintenanceAtp, 1),
    ],
    [
      stateForRoute(),
      {
        type: "commit-route",
        hallmark: "invasion_metastasis",
        routeId: routeId("front"),
        cells: 2,
      },
      0,
      (after) => assert.equal(after.committedCellCommitments.front, 2),
    ],
  ];
  for (const [state, operation, appliedAtMs, assertProjection] of cases) {
    const before = structuredClone(state);
    const after = applyCoreSixOperation(state, operation, appliedAtMs);
    assertProjection(after);
    assert.equal(after.eventSequence, before.eventSequence);
    assert.deepEqual(state, before);
  }
});

test("core-six dispatcher rejects mismatched, forged, wrong-handler, and locked commands atomically", () => {
  assertAtomicRejection(
    stateForDivision(),
    { type: "set-signaling-allocation", hallmark: "angiogenesis", allocation: "cycle" },
    0,
    /catalog row/,
  );
  assertAtomicRejection(
    stateForDivision(),
    {
      type: "set-signaling-allocation",
      hallmark: "proliferative_signaling",
      allocation: "cycle",
      forged: true,
    },
    0,
    /invalid shape/,
  );
  assertAtomicRejection(
    { ...stateForCheckpoint(), currentStage: stageId("transformed_cell") },
    {
      type: "select-checkpoint",
      hallmark: "growth_suppressor_evasion",
      checkpoint: "contact-inhibition",
    },
    0,
    /locked/,
  );

  const wrongHandler = CORE_SIX_HANDLER_REGISTRY.map((entry) => ({ ...entry }));
  wrongHandler[0].handler = CORE_SIX_HANDLER_REGISTRY[1].handler;
  assert.throws(() => assertCoreSixHandlerRegistry(wrongHandler), /catalog identity/);
});
