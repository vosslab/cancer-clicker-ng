import assert from "node:assert/strict";
import test from "node:test";

import { bigNum, hallmarkId, regionId, stageId } from "../src/brands.ts";
import { advanceLiveTick, economyTick } from "../src/economy/tick.ts";
import {
  INFLAMMATION_DURATION_MS,
  projectInflammationTimeline,
} from "../src/hallmarks/inflammation_timeline.ts";
import { projectExtendedHallmarkDurableTickEffects } from "../src/hallmarks/extended_hallmark_tick.ts";
import { createInitialGameState } from "../src/state/game_state.ts";
import { replayEconomyOffline } from "../src/economy/offline.ts";
import { recordEvent } from "../src/state/events.ts";

function liveRegion(name) {
  return {
    id: regionId(name),
    capacity: 3,
    viability: 1,
    phenotype: "proliferative",
    vesselLinkIds: ["vessel:fixture"],
    routeIds: [],
  };
}

function inflammationState(overrides = {}) {
  const region = liveRegion("extended-hallmark-tick-rim");
  return {
    ...createInitialGameState(),
    currentStage: stageId("angiogenic_primary"),
    activeTimeMs: 100,
    deterministicSeed: 17,
    hallmarkLevels: [{ id: hallmarkId("tumor_promoting_inflammation"), level: 1 }],
    regions: [region],
    ...overrides,
  };
}

function draftingState(overrides = {}) {
  return {
    ...createInitialGameState(),
    currentStage: stageId("angiogenic_primary"),
    hallmarkLevels: [{ id: hallmarkId("genome_instability_mutation"), level: 1 }],
    atp: bigNum(2, 0),
    atpSinks: ["mutation-drafting"],
    atpBudget: { "mutation-drafting": 25 },
    deterministicSeed: 17,
    eventSequence: 4,
    ...overrides,
  };
}

test("extended-hallmark after-offline activation uses the shared elapsed clock and retains a future deadline", () => {
  const before = inflammationState({ totalOfflineMs: 120_000 });
  const after = recordEvent(before, {
    type: "activate-inflammation",
    regionId: regionId("extended-hallmark-tick-rim"),
    atMs: before.activeTimeMs,
  });
  const episode = after.inflammationEpisodes[0];
  assert.ok(episode);
  assert.equal(
    episode.deadlineMs,
    before.activeTimeMs + before.totalOfflineMs + INFLAMMATION_DURATION_MS,
  );
  assert.equal(projectInflammationTimeline(after, 0).episodes.length, 1);
});

test("extended-hallmark live and offline tick projections agree exactly across an episode deadline", () => {
  const base = inflammationState({
    inflammationEpisodes: [
      {
        id: "inflammation:fixture",
        regionId: regionId("extended-hallmark-tick-rim"),
        deadlineMs: 1_100,
      },
    ],
    regionalInflammation: { "extended-hallmark-tick-rim": 1 },
  });
  const runtime = { game: base, lastTickAtMs: 0, pendingOfflineMs: 0, saveStatus: "idle" };
  const live = advanceLiveTick(runtime, 1_000);
  const offline = replayEconomyOffline(base, { kind: "ready", requestedElapsedMs: 1_000 });
  assert.equal(offline.kind, "applied");
  assert.deepEqual(offline.state.inflammationEpisodes, live.game.inflammationEpisodes);
  assert.deepEqual(offline.state.regionalInflammation, live.game.regionalInflammation);
  assert.deepEqual(offline.state.cells, live.game.cells);
  assert.deepEqual(offline.state.atp, live.game.atp);
});

test("recorded inflammation increases live route discovery only until its shared-clock expiry", () => {
  const before = inflammationState();
  const beforeSnapshot = structuredClone(before);
  const activated = recordEvent(before, {
    type: "activate-inflammation",
    regionId: regionId("extended-hallmark-tick-rim"),
    atMs: before.activeTimeMs,
  });
  assert.deepEqual(before, beforeSnapshot);

  const activeRuntime = advanceLiveTick(
    { game: activated, lastTickAtMs: 0, pendingOfflineMs: 0, saveStatus: "idle" },
    1_000,
  );
  assert.equal(activeRuntime.game.routeDiscoveryProgress, before.routeDiscoveryProgress + 1);

  const deadline = activated.inflammationEpisodes[0]?.deadlineMs;
  assert.ok(deadline);
  const expiredRuntime = advanceLiveTick(activeRuntime, deadline);
  assert.deepEqual(expiredRuntime.game.inflammationEpisodes, []);
  assert.deepEqual(expiredRuntime.game.regionalInflammation, {});

  const postExpiry = advanceLiveTick(expiredRuntime, deadline + 1_000);
  const uninflamedControl = advanceLiveTick(
    {
      game: {
        ...expiredRuntime.game,
        inflammationEpisodes: [],
        regionalInflammation: {},
      },
      lastTickAtMs: deadline,
      pendingOfflineMs: 0,
      saveStatus: "idle",
    },
    deadline + 1_000,
  );
  assert.equal(
    postExpiry.game.routeDiscoveryProgress,
    uninflamedControl.game.routeDiscoveryProgress,
  );
});

test("extended-hallmark mutation offers are created only by a funded valid tick, debit ATP once, and await selection", () => {
  const before = draftingState();
  assert.deepEqual(before.mutationOffers, []);
  assert.deepEqual(projectExtendedHallmarkDurableTickEffects(before, 0).mutationOffers, []);
  const tick = economyTick(before, 1_000, "live");
  assert.ok(tick.extendedHallmarkProjection);
  assert.equal(tick.extendedHallmarkProjection.mutationOffers.length, 1);
  assert.equal(tick.resourceSnapshot.atp.mantissa, 2);
  const offline = replayEconomyOffline(before, { kind: "ready", requestedElapsedMs: 1_000 });
  assert.equal(offline.kind, "applied");
  const runtime = advanceLiveTick(
    { game: before, lastTickAtMs: 0, pendingOfflineMs: 0, saveStatus: "idle" },
    1_000,
  );
  assert.deepEqual(offline.state.mutationOffers, runtime.game.mutationOffers);
  assert.deepEqual(offline.state.atp, runtime.game.atp);
  const offer = runtime.game.mutationOffers[0];
  assert.ok(offer);
  const selected = recordEvent(runtime.game, {
    type: "select-mutation",
    offerId: offer.id,
    mutationId: offer.cards[0].id,
    atMs: runtime.game.activeTimeMs,
  });
  assert.deepEqual(selected.mutationOffers, []);
  assert.equal(selected.atp.mantissa, 1);
  assert.deepEqual(projectExtendedHallmarkDurableTickEffects(selected, 0).mutationOffers, []);
  assert.deepEqual(
    economyTick(selected, 1_000, "live").extendedHallmarkProjection?.mutationOffers,
    [],
  );
});
