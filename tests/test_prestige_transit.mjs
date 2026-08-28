import assert from "node:assert/strict";
import test from "node:test";
import { eventId, routeId } from "../src/brands.ts";
import { createInitialGameState } from "../src/state/game_state.ts";
import { recordEvent } from "../src/state/events.ts";

function transitState(outcome = "arrived") {
  return {
    ...createInitialGameState(),
    activeTimeMs: 40,
    pendingTransitEvents: [{ id: eventId("transit-1"), routeId: routeId("venous-exit"), outcome }],
  };
}

test("arrived transit creates a local region and records only catalog organ history", () => {
  const before = transitState();
  const after = recordEvent(before, {
    type: "resolve-transit",
    transitEventId: "transit-1",
    destinationSiteId: "lung",
    atMs: 40,
  });
  assert.equal(after.eventSequence, before.eventSequence + 1);
  assert.equal(after.pendingTransitEvents.length, 0);
  assert.deepEqual(after.seededSites, ["seeded-region-v1:transit-1"]);
  assert.equal(after.regions[0]?.capacity, 6);
  assert.deepEqual(after.lineageLedger.organTagsSeen, ["pulmonary"]);
  assert.equal(after.lineageLedger.successfulTransitCount, 1);
});

test("lost transit consumes its pending projection without lineage history", () => {
  const before = transitState("lost");
  const after = recordEvent(before, {
    type: "resolve-transit",
    transitEventId: "transit-1",
    destinationSiteId: "lung",
    atMs: 40,
  });
  assert.equal(after.eventSequence, 1);
  assert.deepEqual(after.regions, []);
  assert.deepEqual(after.seededSites, []);
  assert.deepEqual(after.lineageLedger.organTagsSeen, []);
  assert.equal(after.lineageLedger.successfulTransitCount, 0);
});

test("transit validates route compatibility and duplicate consumption atomically", () => {
  const before = transitState();
  const snapshot = structuredClone(before);
  assert.throws(
    () =>
      recordEvent(before, {
        type: "resolve-transit",
        transitEventId: "transit-1",
        destinationSiteId: "brain",
        atMs: 40,
      }),
    /unavailable/,
  );
  assert.deepEqual(before, snapshot);
  const after = recordEvent(before, {
    type: "resolve-transit",
    transitEventId: "transit-1",
    destinationSiteId: "lung",
    atMs: 40,
  });
  assert.throws(
    () =>
      recordEvent(after, {
        type: "resolve-transit",
        transitEventId: "transit-1",
        destinationSiteId: "lung",
        atMs: 40,
      }),
    /unavailable/,
  );
});
