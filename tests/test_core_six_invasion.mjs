import assert from "node:assert/strict";
import test from "node:test";
import { bigNum, hallmarkId, regionId, routeId, stageId } from "../src/brands.ts";
import { compare, fromSafeInteger } from "../src/bignum/bignum.ts";
import { applyRouteCommitment } from "../src/hallmarks/handlers/route_commitment.ts";
import { createInitialGameState } from "../src/state/game_state.ts";

function readyState() {
  const state = createInitialGameState();
  return {
    ...state,
    cells: bigNum(12, 0),
    currentStage: stageId("invasive_carcinoma"),
    hallmarkLevels: [{ id: hallmarkId("invasion_metastasis"), level: 1 }],
    regions: [
      {
        id: regionId("primary"),
        capacity: 12,
        viability: 1,
        phenotype: "migratory",
        vesselLinkIds: [],
        routeIds: [routeId("local-front"), routeId("venous-exit")],
      },
    ],
    routeRiskById: { "local-front": 0, "venous-exit": 0.4 },
    seededSites: [regionId("existing-site")],
    eventSequence: 19,
  };
}

function operation(route, cells) {
  return {
    type: "commit-route",
    hallmark: "invasion_metastasis",
    routeId: routeId(route),
    cells,
  };
}

function apply(state, route, cells) {
  return applyRouteCommitment({ state, operation: operation(route, cells), appliedAtMs: 200 });
}

function invalid(state, route, cells, label) {
  const before = structuredClone(state);
  assert.throws(() => apply(state, route, cells), label);
  assert.deepEqual(state, before, label);
}

test("M10 invasion commits exact available biomass without advancing the reducer sequence", () => {
  const state = readyState();
  const after = apply(state, "venous-exit", 5);
  assert.equal(after.committedCellCommitments["venous-exit"], 5);
  assert.equal(compare(after.cells, fromSafeInteger(7)), 0);
  assert.equal(after.eventSequence, state.eventSequence);
  assert.deepEqual(state.committedCellCommitments, {});
});

test("M10 invasion distinguishes local expansion from risky dissemination without premature seeding", () => {
  const state = readyState();
  const local = apply(state, "local-front", 2);
  const dissemination = apply(local, "venous-exit", 3);
  assert.deepEqual(dissemination.committedCellCommitments, { "local-front": 2, "venous-exit": 3 });
  assert.deepEqual(dissemination.routeRiskById, { "local-front": 0, "venous-exit": 0.4 });
  assert.deepEqual(dissemination.seededSites, ["existing-site"]);
});

test("M10 invasion rejects unavailable, stale, unknown, duplicate, invalid, and overcommitted parcels atomically", () => {
  const unavailable = { ...readyState(), hallmarkLevels: [] };
  invalid(unavailable, "venous-exit", 1, "unowned hallmark");
  const stale = { ...readyState(), currentStage: stageId("angiogenic_primary") };
  invalid(stale, "venous-exit", 1, "pre-unlock stage");
  invalid(readyState(), "unknown-route", 1, "unknown route");
  const unknownRisk = { ...readyState(), routeRiskById: { "local-front": 0 } };
  invalid(unknownRisk, "venous-exit", 1, "route without revealed risk");
  const duplicate = { ...readyState(), committedCellCommitments: { "venous-exit": 1 } };
  invalid(duplicate, "venous-exit", 1, "duplicate route commitment");
  invalid(readyState(), "venous-exit", 0, "zero cells");
  invalid(readyState(), "venous-exit", 1.5, "fractional cells");
  invalid(readyState(), "venous-exit", 13, "overcommit");
});
