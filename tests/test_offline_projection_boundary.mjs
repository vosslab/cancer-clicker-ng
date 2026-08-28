import assert from "node:assert/strict";
import test from "node:test";
import { bigNum, eventId, hallmarkId, regionId } from "../src/brands.ts";
import { projectElapsedHallmarkDurableEffects } from "../src/hallmarks/elapsed_effects.ts";
import { projectM11DurableTickEffects } from "../src/hallmarks/m11_tick_effects.ts";
import { createInitialGameState } from "../src/state/game_state.ts";
import { deriveOfflineElapsed, replayOffline } from "../src/state/offline.ts";

function resourceSnapshot(state) {
  return { cells: state.cells, substrate: state.substrate, atp: state.atp };
}

function expectedProjection(state) {
  return projectElapsedHallmarkDurableEffects(state, 60_000);
}

function projectionFixture() {
  const region = {
    id: regionId("offline-projection-rim"),
    capacity: 5,
    viability: 1,
    phenotype: "proliferative",
    vesselLinkIds: [eventId("vessel:offline-projection-rim")],
    routeIds: [],
  };
  return {
    ...createInitialGameState(),
    oxygenPressure: 3,
    atp: bigNum(100, 0),
    hallmarkLevels: [
      { id: hallmarkId("replicative_immortality"), level: 1 },
      { id: hallmarkId("angiogenesis"), level: 1 },
    ],
    regions: [region],
    telomereReserveByRegion: { [region.id]: 200 },
    reserveFloor: 1,
    vesselMaintenanceAtp: 1,
  };
}

function assertAtomicRejection(buildProjection) {
  const initial = projectionFixture();
  const before = structuredClone(initial);
  let steps = 0;
  let recorderCalls = 0;
  const result = replayOffline(
    initial,
    deriveOfflineElapsed(0, 120_000),
    (working) => {
      steps += 1;
      const stateProjection = steps === 1 ? expectedProjection(working) : buildProjection(working);
      return {
        resourceSnapshot: resourceSnapshot(working),
        stageEligibility: [],
        prestigeEligibility: [],
        stateProjection,
      };
    },
    () => {
      recorderCalls += 1;
      return initial;
    },
  );
  assert.equal(result.kind, "rejected");
  assert.equal(result.code, "step-failed");
  assert.equal(result.state, initial);
  assert.equal(steps, 2);
  assert.equal(recorderCalls, 0);
  assert.deepEqual(initial, before);
  assert.deepEqual(result.state.cells, before.cells);
  assert.deepEqual(result.state.substrate, before.substrate);
  assert.deepEqual(result.state.atp, before.atp);
  assert.equal(result.state.eventSequence, before.eventSequence);
  assert.deepEqual(result.state.regions, before.regions);
  assert.deepEqual(result.state.telomereReserveByRegion, before.telomereReserveByRegion);
  assert.equal(result.state.oxygenPressure, before.oxygenPressure);
  assert.equal(result.state.vesselMaintenanceAtp, before.vesselMaintenanceAtp);
}

test("two-step hostile durable projections cannot alter offline relations or reach the recorder", () => {
  assertAtomicRejection((state) => ({
    ...expectedProjection(state),
    eventSequence: state.eventSequence + 1,
  }));
  assertAtomicRejection((state) => ({
    ...expectedProjection(state),
    telomereReserveByRegion: { "offline-projection-rim": 1 },
  }));
  assertAtomicRejection((state) => ({
    ...expectedProjection(state),
    regions: [{ ...state.regions[0], capacity: 3, vesselLinkIds: [] }],
    oxygenPressure: state.oxygenPressure + 2,
    vesselMaintenanceAtp: 0,
  }));
  assertAtomicRejection((state) => {
    const projection = expectedProjection(state);
    Object.defineProperty(projection, "regions", {
      enumerable: true,
      get: () => state.regions,
    });
    return projection;
  });
  assertAtomicRejection((state) => {
    const projection = expectedProjection(state);
    Object.setPrototypeOf(projection, null);
    return projection;
  });
  assertAtomicRejection((state) => ({
    ...expectedProjection(state),
    oxygenPressure: Number.POSITIVE_INFINITY,
  }));
  assertAtomicRejection((state) => ({
    ...expectedProjection(state),
    regions: [{ ...state.regions[0], id: "", capacity: 3, vesselLinkIds: [] }],
    oxygenPressure: state.oxygenPressure + 2,
    vesselMaintenanceAtp: 0,
  }));
});

test("hostile M11 durable projections reject atomically before offline accounting", () => {
  const hostile = [
    (projection) => ({ ...projection, unexpected: true }),
    (projection) => {
      const output = { ...projection };
      Object.defineProperty(output, "inflammationEpisodes", {
        enumerable: true,
        get: () => projection.inflammationEpisodes,
      });
      return output;
    },
    (projection) => {
      const output = { ...projection };
      Object.setPrototypeOf(output, null);
      return output;
    },
    (projection) => ({
      ...projection,
      inflammationEpisodes: [{ id: "forged", regionId: "offline-projection-rim", deadlineMs: 1 }],
    }),
    (projection) => ({
      ...projection,
      regionalInflammation: { "offline-projection-rim": Infinity },
    }),
    (projection) => ({ ...projection, mutationOffers: [{ id: "forged" }] }),
  ];
  for (const buildProjection of hostile) {
    const initial = projectionFixture();
    const before = structuredClone(initial);
    let recorderCalls = 0;
    const result = replayOffline(
      initial,
      deriveOfflineElapsed(0, 60_000),
      (working, duration) => ({
        resourceSnapshot: resourceSnapshot(working),
        stageEligibility: [],
        prestigeEligibility: [],
        m11Projection: buildProjection(projectM11DurableTickEffects(working, duration)),
      }),
      () => {
        recorderCalls += 1;
        return initial;
      },
    );
    assert.equal(result.kind, "rejected");
    assert.equal(result.code, "step-failed");
    assert.equal(recorderCalls, 0);
    assert.deepEqual(initial, before);
  }
});
