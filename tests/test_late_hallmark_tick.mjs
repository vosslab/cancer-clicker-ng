import assert from "node:assert/strict";
import test from "node:test";

import { hallmarkId, stageId } from "../src/brands.ts";
import { applyEconomyTick, advanceLiveTick } from "../src/economy/tick.ts";
import {
  MICROBIOME_COMPOSITION_CATALOG,
  MICROBIOME_OFFER_DURATION_MS,
} from "../src/hallmarks/microbiome_catalog.ts";
import { projectLateHallmarkDurableTickEffects } from "../src/hallmarks/late_hallmark_tick.ts";
import { createInitialGameState } from "../src/state/game_state.ts";
import { replayOffline } from "../src/state/offline.ts";
import { recordEvent } from "../src/state/events.ts";
import { parseSave, serializeGameState } from "../src/state/save_load.ts";

function microbiomeState() {
  return {
    ...createInitialGameState(),
    deterministicSeed: 7,
    currentStage: stageId("global_lab_contamination"),
    hallmarkLevels: [{ id: hallmarkId("polymorphic_microbiomes"), level: 1 }],
  };
}

test("microbiome tick saves three catalog cards, preserves them before expiry, and rotates at a durable boundary", () => {
  const state = microbiomeState();
  const initial = projectLateHallmarkDurableTickEffects(state, 1).microbiome;
  assert.ok(initial.pendingOffer);
  assert.equal(initial.pendingOffer.compositions.length, 3);
  assert.equal(
    initial.pendingOffer.compositions.every((item) =>
      MICROBIOME_COMPOSITION_CATALOG.includes(item),
    ),
    true,
  );
  const preserved = projectLateHallmarkDurableTickEffects(
    { ...state, lateHallmarks: { ...state.lateHallmarks, microbiome: initial } },
    MICROBIOME_OFFER_DURATION_MS - 2,
  ).microbiome;
  assert.equal(preserved.pendingOffer?.id, initial.pendingOffer.id);
  const rotated = projectLateHallmarkDurableTickEffects(
    { ...state, lateHallmarks: { ...state.lateHallmarks, microbiome: initial } },
    MICROBIOME_OFFER_DURATION_MS,
  ).microbiome;
  assert.notEqual(rotated.pendingOffer?.id, initial.pendingOffer.id);
  assert.equal(rotated.activeComposition, null);
});

test("live tick and its isolated economy projection carry the same microbiome durable state", () => {
  const game = microbiomeState();
  const duration = MICROBIOME_OFFER_DURATION_MS + 1;
  const projected = applyEconomyTick(game, duration, "live").lateHallmarkProjection;
  assert.ok(projected);
  const runtime = advanceLiveTick(
    { game, lastTickAtMs: 0, pendingOfflineMs: 0, saveStatus: "idle" },
    duration,
  );
  assert.deepEqual(runtime.game.lateHallmarks.microbiome, projected.microbiome);
});

test("normalized live and offline simulation agree across a microbiome rotation boundary", () => {
  const game = microbiomeState();
  const duration = MICROBIOME_OFFER_DURATION_MS + 1;
  const live = advanceLiveTick(
    { game, lastTickAtMs: 0, pendingOfflineMs: 0, saveStatus: "idle" },
    duration,
  ).game;
  const offline = replayOffline(
    game,
    { kind: "ready", requestedElapsedMs: duration },
    applyEconomyTick,
    recordEvent,
  );
  assert.equal(offline.kind, "applied");
  if (offline.kind !== "applied") return;
  assert.deepEqual(offline.state.lateHallmarks, live.lateHallmarks);
});

test("install keeps its composition, waits through its scheduled boundary, then saves the next offer", () => {
  const base = microbiomeState();
  const offered = projectLateHallmarkDurableTickEffects(base, 1).microbiome;
  assert.ok(offered.pendingOffer);
  const installed = recordEvent(
    { ...base, lateHallmarks: { ...base.lateHallmarks, microbiome: offered } },
    {
      type: "install-microbiome-composition",
      offerId: offered.pendingOffer.id,
      compositionId: offered.pendingOffer.compositions[0].id,
      atMs: 0,
    },
  );
  assert.equal(installed.lateHallmarks.microbiome.pendingOffer, null);
  assert.equal(
    installed.lateHallmarks.microbiome.nextRotationDeadlineMs,
    MICROBIOME_OFFER_DURATION_MS,
  );
  const reloaded = parseSave(serializeGameState(installed, 0));
  assert.equal(reloaded.status, "loaded");
  if (reloaded.status !== "loaded") return;
  const before = projectLateHallmarkDurableTickEffects(
    { ...reloaded.state, activeTimeMs: MICROBIOME_OFFER_DURATION_MS - 1 },
    0,
  ).microbiome;
  assert.equal(before.pendingOffer, null);
  const atBoundary = projectLateHallmarkDurableTickEffects(
    { ...reloaded.state, activeTimeMs: MICROBIOME_OFFER_DURATION_MS - 1 },
    1,
  ).microbiome;
  assert.ok(atBoundary.pendingOffer);
  assert.equal(
    atBoundary.activeComposition?.composition.id,
    installed.lateHallmarks.microbiome.activeComposition?.composition.id,
  );
  const hostile = structuredClone(installed);
  hostile.lateHallmarks.microbiome.nextRotationDeadlineMs = null;
  assert.throws(() => serializeGameState(hostile, 0), /invalid/);
  const duration = MICROBIOME_OFFER_DURATION_MS + 1;
  const live = advanceLiveTick(
    { game: installed, lastTickAtMs: 0, pendingOfflineMs: 0, saveStatus: "idle" },
    duration,
  ).game;
  const offline = replayOffline(
    installed,
    { kind: "ready", requestedElapsedMs: duration },
    applyEconomyTick,
    recordEvent,
  );
  assert.equal(offline.kind, "applied");
  if (offline.kind === "applied") assert.deepEqual(offline.state.lateHallmarks, live.lateHallmarks);
});

test("offline replay rejects a hostile microbiome durable projection before recording", () => {
  const state = microbiomeState();
  const result = replayOffline(
    state,
    { kind: "ready", requestedElapsedMs: 1 },
    (prior, duration, mode) => {
      const expected = applyEconomyTick(prior, duration, mode);
      assert.ok(expected.lateHallmarkProjection);
      return {
        ...expected,
        lateHallmarkProjection: {
          microbiome: {
            ...expected.lateHallmarkProjection.microbiome,
            rotationSequence: 999,
          },
        },
      };
    },
    recordEvent,
  );
  assert.equal(result.kind, "rejected");
  assert.equal(result.state, state);
});
