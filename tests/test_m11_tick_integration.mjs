import assert from "node:assert/strict";
import test from "node:test";

import { bigNum, hallmarkId, regionId, stageId } from "../src/brands.ts";
import { advanceLiveTick, economyTick } from "../src/economy/tick.ts";
import {
  INFLAMMATION_DURATION_MS,
  projectM11InflammationTimeline,
} from "../src/hallmarks/m11_timeline.ts";
import { projectM11DurableTickEffects } from "../src/hallmarks/m11_tick_effects.ts";
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
  const region = liveRegion("m11-tick-rim");
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

test("M11 after-offline activation uses the shared elapsed clock and retains a future deadline", () => {
  const before = inflammationState({ totalOfflineMs: 120_000 });
  const after = recordEvent(before, {
    type: "activate-inflammation",
    regionId: regionId("m11-tick-rim"),
    atMs: before.activeTimeMs,
  });
  const episode = after.inflammationEpisodes[0];
  assert.ok(episode);
  assert.equal(
    episode.deadlineMs,
    before.activeTimeMs + before.totalOfflineMs + INFLAMMATION_DURATION_MS,
  );
  assert.equal(projectM11InflammationTimeline(after, 0).episodes.length, 1);
});

test("M11 live and offline tick projections agree exactly across an episode deadline", () => {
  const base = inflammationState({
    inflammationEpisodes: [
      { id: "inflammation:fixture", regionId: regionId("m11-tick-rim"), deadlineMs: 1_100 },
    ],
    regionalInflammation: { "m11-tick-rim": 1 },
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

test("M11 mutation offers are created only by a funded valid tick, debit ATP once, and await selection", () => {
  const before = draftingState();
  assert.deepEqual(before.mutationOffers, []);
  assert.deepEqual(projectM11DurableTickEffects(before, 0).mutationOffers, []);
  const tick = economyTick(before, 1_000, "live");
  assert.ok(tick.m11Projection);
  assert.equal(tick.m11Projection.mutationOffers.length, 1);
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
  assert.deepEqual(projectM11DurableTickEffects(selected, 0).mutationOffers, []);
  assert.deepEqual(economyTick(selected, 1_000, "live").m11Projection?.mutationOffers, []);
});
