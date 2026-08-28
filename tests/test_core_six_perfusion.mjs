import assert from "node:assert/strict";
import test from "node:test";
import { eventId, hallmarkId, regionId, stageId } from "../src/brands.ts";
import {
  applyPerfusionLayout,
  countActiveVesselLinks,
  MAX_ACTIVE_VESSEL_LINKS,
  MAX_PERFUSED_REGION_CAPACITY,
  PERFUSION_CAPACITY_DELTA,
  PERFUSION_MAINTENANCE_ATP,
  PERFUSION_OXYGEN_PRESSURE_DELTA,
} from "../src/hallmarks/handlers/perfusion_layout.ts";
import { createInitialGameState } from "../src/state/game_state.ts";

function perfusionState(overrides = {}) {
  const state = createInitialGameState();
  return {
    ...state,
    currentStage: stageId("hypoxic_lesion"),
    activeTimeMs: 40,
    eventSequence: 7,
    oxygenPressure: 5,
    hallmarkLevels: [{ id: hallmarkId("angiogenesis"), level: 1 }],
    regions: [
      {
        id: regionId("rim"),
        capacity: 3,
        viability: 1,
        phenotype: "proliferative",
        vesselLinkIds: [],
        routeIds: [],
      },
    ],
    ...overrides,
  };
}

function operation(linked) {
  return operationFor(regionId("rim"), linked);
}

function operationFor(targetRegionId, linked) {
  return { type: "set-vessel-link", hallmark: "angiogenesis", regionId: targetRegionId, linked };
}

function apply(state, linked, appliedAtMs = state.activeTimeMs, targetRegionId = regionId("rim")) {
  return applyPerfusionLayout({
    state,
    operation: operationFor(targetRegionId, linked),
    appliedAtMs,
  });
}

test("M10 angiogenesis links one viable region with bounded capacity, oxygen relief, and upkeep", () => {
  const before = perfusionState();
  const after = apply(before, true);
  const region = after.regions[0];
  assert.ok(region);
  assert.equal(region.capacity, 3 + PERFUSION_CAPACITY_DELTA);
  assert.deepEqual(region.vesselLinkIds, [eventId("vessel:rim")]);
  assert.equal(after.oxygenPressure, 5 - PERFUSION_OXYGEN_PRESSURE_DELTA);
  assert.equal(after.vesselMaintenanceAtp, PERFUSION_MAINTENANCE_ATP);
  assert.equal(after.eventSequence, before.eventSequence);
  assert.equal(after.cells, before.cells);
  assert.equal(after.substrate, before.substrate);
  assert.equal(after.atp, before.atp);
  assert.deepEqual(before.regions[0]?.vesselLinkIds, []);
});

test("M10 angiogenesis unlink reverses only the local perfusion tradeoff", () => {
  const linked = apply(perfusionState(), true);
  const after = apply(linked, false);
  const region = after.regions[0];
  assert.ok(region);
  assert.equal(region.capacity, 3);
  assert.deepEqual(region.vesselLinkIds, []);
  assert.equal(after.oxygenPressure, 5);
  assert.equal(after.vesselMaintenanceAtp, 0);
  assert.equal(after.eventSequence, linked.eventSequence);
});

test("M10 angiogenesis applies a real multi-region active-link cap and frees it on unlink", () => {
  const regions = Array.from({ length: MAX_ACTIVE_VESSEL_LINKS + 1 }, (_, index) => ({
    ...perfusionState().regions[0],
    id: regionId(`rim-${index}`),
  }));
  let state = perfusionState({ regions });
  for (const region of regions.slice(0, MAX_ACTIVE_VESSEL_LINKS)) {
    state = apply(state, true, state.activeTimeMs, region.id);
  }
  assert.equal(countActiveVesselLinks(state), MAX_ACTIVE_VESSEL_LINKS);
  const blockedTarget = regions[MAX_ACTIVE_VESSEL_LINKS];
  assert.ok(blockedTarget);
  const beforeBlocked = structuredClone(state);
  assert.throws(() => apply(state, true, state.activeTimeMs, blockedTarget.id));
  assert.deepEqual(state, beforeBlocked);

  const releasedTarget = regions[0];
  assert.ok(releasedTarget);
  state = apply(state, false, state.activeTimeMs, releasedTarget.id);
  assert.equal(countActiveVesselLinks(state), MAX_ACTIVE_VESSEL_LINKS - 1);
  const relinked = apply(state, true, state.activeTimeMs, blockedTarget.id);
  assert.equal(countActiveVesselLinks(relinked), MAX_ACTIVE_VESSEL_LINKS);
});

test("M10 angiogenesis rejects absent ownership, early stage, unknown region, and stale operations atomically", () => {
  const missingOwnership = perfusionState({ hallmarkLevels: [] });
  const earlyStage = perfusionState({ currentStage: stageId("avascular_lesion") });
  const unknown = { ...operation(true), regionId: regionId("missing") };
  const stale = perfusionState();
  for (const [state, input, atMs] of [
    [missingOwnership, operation(true), 40],
    [earlyStage, operation(true), 40],
    [perfusionState(), unknown, 40],
    [stale, operation(true), 39],
  ]) {
    const before = structuredClone(state);
    assert.throws(() => applyPerfusionLayout({ state, operation: input, appliedAtMs: atMs }));
    assert.deepEqual(state, before);
  }
});

test("M10 angiogenesis rejects duplicate, over-capacity, unavailable unlink, and invalid maintenance atomically", () => {
  const linked = apply(perfusionState(), true);
  const capacityFull = perfusionState({
    regions: [{ ...perfusionState().regions[0], capacity: MAX_PERFUSED_REGION_CAPACITY }],
  });
  const noLink = perfusionState();
  const invalidMaintenance = {
    ...linked,
    vesselMaintenanceAtp: 0,
  };
  for (const [state, linkedValue] of [
    [linked, true],
    [capacityFull, true],
    [noLink, false],
    [invalidMaintenance, false],
  ]) {
    const before = structuredClone(state);
    assert.throws(() => apply(state, linkedValue));
    assert.deepEqual(state, before);
  }
});

test("M10 angiogenesis rejects corrupted links, inconsistent upkeep, and nonfinite counters atomically", () => {
  const corruptedLink = perfusionState({
    regions: [{ ...perfusionState().regions[0], vesselLinkIds: [eventId("vessel:other")] }],
  });
  const inconsistentUpkeep = perfusionState({ vesselMaintenanceAtp: 1 });
  const nonfiniteOxygen = perfusionState({ oxygenPressure: Number.POSITIVE_INFINITY });
  const unsafeOxygen = perfusionState({
    oxygenPressure: Number.MAX_SAFE_INTEGER,
    vesselMaintenanceAtp: 1,
    regions: [{ ...perfusionState().regions[0], vesselLinkIds: [eventId("vessel:rim")] }],
  });
  for (const state of [corruptedLink, inconsistentUpkeep, nonfiniteOxygen, unsafeOxygen]) {
    const before = structuredClone(state);
    assert.throws(() => apply(state, state === unsafeOxygen ? false : true));
    assert.deepEqual(state, before);
  }
});
