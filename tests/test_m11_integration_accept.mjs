import assert from "node:assert/strict";
import test from "node:test";

import { bigNum, hallmarkId, regionId, stageId } from "../src/brands.ts";
import { compare } from "../src/bignum/bignum.ts";
import { quoteProducerPurchase } from "../src/economy/costs.ts";
import { replayEconomyOffline } from "../src/economy/offline.ts";
import { advanceLiveTick, economyTick } from "../src/economy/tick.ts";
import { createMutationOffer } from "../src/hallmarks/mutation_offer_generator.ts";
import { createInitialGameState } from "../src/state/game_state.ts";
import { recordEvent } from "../src/state/events.ts";

function m11State(overrides = {}) {
  const initial = createInitialGameState();
  return {
    ...initial,
    cells: bigNum(1, 9),
    substrate: bigNum(9, 0),
    atp: bigNum(10, 0),
    currentStage: stageId("angiogenic_primary"),
    activeTimeMs: 100,
    deterministicSeed: 19,
    hallmarkLevels: [
      { id: hallmarkId("metabolic_deregulation"), level: 1 },
      { id: hallmarkId("immune_destruction_avoidance"), level: 1 },
      { id: hallmarkId("tumor_promoting_inflammation"), level: 1 },
      { id: hallmarkId("genome_instability_mutation"), level: 1 },
    ],
    producerLevels: initial.producerLevels.map((level) => ({ ...level, level: 1 })),
    regions: [
      {
        id: regionId("accept-rim"),
        capacity: 4,
        viability: 1,
        phenotype: "proliferative",
        vesselLinkIds: ["vessel:accept-rim"],
        routeIds: [],
      },
    ],
    concealmentTokens: 1,
    ...overrides,
  };
}

test("M11 integration: ATP allocation changes a real quote, debits once, and preserves live/offline parity", () => {
  const funded = m11State({ atpBudget: { acceleration: 100 }, atpSinks: ["acceleration"] });
  const unfunded = m11State({
    atp: bigNum(0, 0),
    atpBudget: { acceleration: 100 },
    atpSinks: ["acceleration"],
  });
  const quoteFunded = quoteProducerPurchase(funded, "myc", 1).debit;
  const quoteUnfunded = quoteProducerPurchase(unfunded, "myc", 1).debit;
  assert.notEqual(compare(quoteFunded, quoteUnfunded), 0);
  const tick = economyTick(funded, 1_000, "live");
  assert.deepEqual(tick.resourceSnapshot.atp, bigNum(6, 0));
  const live = advanceLiveTick(
    { game: funded, lastTickAtMs: 0, pendingOfflineMs: 0, saveStatus: "idle" },
    1_000,
  );
  const offline = replayEconomyOffline(funded, { kind: "ready", requestedElapsedMs: 1_000 });
  assert.equal(offline.kind, "applied");
  assert.deepEqual(offline.state.atp, live.game.atp);
  assert.deepEqual(offline.state.cells, live.game.cells);
});

test("M11 integration: each visible operation is event-funnel atomic and leaves a save-ready state", () => {
  const initial = m11State();
  const converted = recordEvent(initial, {
    type: "convert-substrate",
    amount: { mantissa: 2, exponent: 0 },
    atMs: 100,
  });
  const concealed = recordEvent(converted, {
    type: "set-region-mask",
    regionId: regionId("accept-rim"),
    masked: true,
    atMs: 100,
  });
  assert.equal(concealed.concealmentTokens, 0);
  const restored = recordEvent(concealed, {
    type: "set-region-mask",
    regionId: regionId("accept-rim"),
    masked: false,
    atMs: 100,
  });
  const inflamed = recordEvent(restored, {
    type: "activate-inflammation",
    regionId: regionId("accept-rim"),
    atMs: 100,
  });
  assert.equal(inflamed.inflammationEpisodes.length, 1);
  const beforeHostile = structuredClone(inflamed);
  assert.throws(() =>
    recordEvent(inflamed, {
      type: "activate-inflammation",
      regionId: regionId("accept-rim"),
      atMs: 100,
    }),
  );
  assert.deepEqual(inflamed, beforeHostile);
});

test("M11 integration: vessel reservation is a hard gate and a selected draft debits one ATP", () => {
  const vesselBase = m11State({
    hallmarkLevels: [
      { id: hallmarkId("angiogenesis"), level: 1 },
      { id: hallmarkId("metabolic_deregulation"), level: 1 },
    ],
    vesselMaintenanceAtp: 1,
  });
  const underReserved = {
    ...vesselBase,
    atpBudget: { "vessel-maintenance": 24 },
    atpSinks: ["vessel-maintenance"],
  };
  const properlyReserved = {
    ...vesselBase,
    atpBudget: { "vessel-maintenance": 25 },
    atpSinks: ["vessel-maintenance"],
  };
  const underReservedLive = advanceLiveTick(
    { game: underReserved, lastTickAtMs: 0, pendingOfflineMs: 0, saveStatus: "idle" },
    1_000,
  );
  const reservedLive = advanceLiveTick(
    { game: properlyReserved, lastTickAtMs: 0, pendingOfflineMs: 0, saveStatus: "idle" },
    1_000,
  );
  assert.deepEqual(underReservedLive.game.regions[0]?.vesselLinkIds, []);
  assert.equal(underReservedLive.game.vesselMaintenanceAtp, 0);
  assert.equal(reservedLive.game.regions[0]?.vesselLinkIds.length, 1);
  assert.equal(reservedLive.game.vesselMaintenanceAtp, 1);
  assert.deepEqual(reservedLive.game.atp, bigNum(9, 0));

  const draftBase = m11State({
    atp: bigNum(2, 0),
    atpBudget: { "mutation-drafting": 25 },
    atpSinks: ["mutation-drafting"],
  });
  const offer = createMutationOffer({
    deterministicSeed: draftBase.deterministicSeed,
    eventSequence: draftBase.eventSequence,
    currentStage: draftBase.currentStage,
    genomeBurden: draftBase.genomeBurden,
  });
  const selectedCard = offer.cards[0];
  assert.ok(selectedCard);
  const selected = recordEvent(
    { ...draftBase, mutationOffers: [offer] },
    {
      type: "select-mutation",
      offerId: offer.id,
      mutationId: selectedCard.id,
      atMs: draftBase.activeTimeMs,
    },
  );
  assert.deepEqual(selected.atp, bigNum(1, 0));
  assert.deepEqual(selected.chosenMutations, [selectedCard.id]);
  assert.deepEqual(selected.mutationLiabilities, [selectedCard.id]);
});
