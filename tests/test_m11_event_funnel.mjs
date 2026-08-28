import assert from "node:assert/strict";
import test from "node:test";

import { bigNum, hallmarkId, regionId, stageId } from "../src/brands.ts";
import { createMutationOffer } from "../src/hallmarks/mutation_offer_generator.ts";
import { recordEvent } from "../src/state/events.ts";
import { createInitialGameState } from "../src/state/game_state.ts";
import { parseSave, serializeGameState } from "../src/state/save_load.ts";

function region() {
  return {
    id: regionId("m11-region"),
    capacity: 3,
    viability: 1,
    phenotype: "proliferative",
    vesselLinkIds: ["m11-vessel"],
    routeIds: [],
  };
}

function stateFor(key, currentStage) {
  const initial = createInitialGameState();
  return {
    ...initial,
    currentStage,
    activeTimeMs: 10,
    stageStartedAtMs: 10,
    deterministicSeed: 17,
    eventSequence: 4,
    hallmarkLevels: [{ id: hallmarkId(key), level: 1 }],
    regions: [region()],
  };
}

function roundTrip(state) {
  const result = parseSave(serializeGameState(state, 99));
  assert.equal(result.status, "loaded");
  if (result.status !== "loaded") throw new Error("Expected current M11 save to load.");
  assert.deepEqual(result.state, state);
}

function atomicallyRejects(state, raw) {
  const before = structuredClone(state);
  assert.throws(() => recordEvent(state, raw));
  assert.deepEqual(state, before);
}

test("M11 amended events parse exactly, dispatch once, and preserve save identity", () => {
  const metabolism = {
    ...stateFor("metabolic_deregulation", stageId("avascular_lesion")),
    substrate: bigNum(25, 0),
  };
  const converted = recordEvent(metabolism, {
    type: "convert-substrate",
    amount: { mantissa: 5, exponent: 0 },
    atMs: 10,
  });
  assert.deepEqual(converted.substrate, bigNum(20, 0));
  assert.deepEqual(converted.atp, bigNum(5, 0));
  assert.equal(converted.eventSequence, 5);
  roundTrip(converted);

  const immune = {
    ...stateFor("immune_destruction_avoidance", stageId("angiogenic_primary")),
    concealmentTokens: 1,
    immuneVisibilityByRegion: { "m11-region": 1 },
  };
  const masked = recordEvent(immune, {
    type: "set-region-mask",
    regionId: regionId("m11-region"),
    masked: true,
    atMs: 10,
  });
  assert.deepEqual(masked.maskedRegions, [regionId("m11-region")]);
  assert.equal(masked.concealmentTokens, 0);
  roundTrip(masked);

  const inflammation = {
    ...stateFor("tumor_promoting_inflammation", stageId("angiogenic_primary")),
    immuneVisibilityByRegion: { "m11-region": 1 },
  };
  const activated = recordEvent(inflammation, {
    type: "activate-inflammation",
    regionId: regionId("m11-region"),
    atMs: 10,
  });
  assert.equal(activated.inflammationEpisodes.length, 1);
  assert.equal(activated.inflammationEpisodes[0]?.deadlineMs, 30_010);
  roundTrip(activated);

  const mutationBase = stateFor("genome_instability_mutation", stageId("angiogenic_primary"));
  const offer = createMutationOffer({
    deterministicSeed: mutationBase.deterministicSeed,
    eventSequence: mutationBase.eventSequence,
    currentStage: mutationBase.currentStage,
    genomeBurden: 0,
  });
  const mutation = {
    ...mutationBase,
    atp: bigNum(1, 0),
    atpSinks: ["mutation-drafting"],
    atpBudget: { "mutation-drafting": 25 },
    mutationOffers: [offer],
  };
  const selected = recordEvent(mutation, {
    type: "select-mutation",
    offerId: offer.id,
    mutationId: offer.cards[0].id,
    atMs: 10,
  });
  assert.deepEqual(selected.mutationOffers, []);
  assert.deepEqual(selected.chosenMutations, [offer.cards[0].id]);
  roundTrip(selected);
});

test("M11 parser and reducer reject hostile, stale, duplicate, and no-op records atomically", () => {
  const immune = {
    ...stateFor("immune_destruction_avoidance", stageId("angiogenic_primary")),
    concealmentTokens: 1,
    immuneVisibilityByRegion: { "m11-region": 1 },
  };
  atomicallyRejects(immune, {
    type: "set-region-mask",
    regionId: "m11-region",
    masked: true,
    atMs: 10,
    extra: true,
  });
  const accessor = { type: "convert-substrate", atMs: 10 };
  Object.defineProperty(accessor, "amount", {
    enumerable: true,
    get: () => ({ mantissa: 1, exponent: 0 }),
  });
  atomicallyRejects(
    { ...stateFor("metabolic_deregulation", stageId("avascular_lesion")), substrate: bigNum(1, 0) },
    accessor,
  );
  atomicallyRejects(immune, {
    type: "set-region-mask",
    regionId: "m11-region",
    masked: true,
    atMs: 9,
  });
  const masked = recordEvent(immune, {
    type: "set-region-mask",
    regionId: "m11-region",
    masked: true,
    atMs: 10,
  });
  atomicallyRejects(masked, {
    type: "set-region-mask",
    regionId: "m11-region",
    masked: true,
    atMs: 10,
  });
});

test("M11 save rejects impossible ATP, visibility, episode, and offer relations", () => {
  const initial = createInitialGameState();
  for (const state of [
    { ...initial, atpBudget: { unknown: 1 }, atpSinks: ["unknown"] },
    {
      ...initial,
      atpBudget: { acceleration: 100, "vessel-maintenance": 100, "mutation-drafting": 1 },
      atpSinks: ["acceleration", "vessel-maintenance", "mutation-drafting"],
    },
    { ...initial, maskedRegions: [regionId("missing")] },
    {
      ...initial,
      regions: [region()],
      inflammationEpisodes: [{ id: "episode", regionId: regionId("m11-region"), deadlineMs: 0 }],
    },
  ]) {
    assert.throws(() => serializeGameState(state, 1));
  }
});

test("M11 save rejects forged or divergent chosen-mutation and liability graphs", () => {
  const state = createInitialGameState();
  const raw = JSON.parse(serializeGameState(state, 1));
  const hostilePairs = [
    [["forged"], ["forged"]],
    [["repair_bypass"], ["other-forged"]],
    [
      ["repair_bypass", "repair_bypass"],
      ["repair_bypass", "repair_bypass"],
    ],
    [
      ["glycolytic_shift", "repair_bypass"],
      ["glycolytic_shift", "repair_bypass"],
    ],
  ];
  for (const [chosenMutations, mutationLiabilities] of hostilePairs) {
    const mutated = structuredClone(raw);
    mutated.state.chosenMutations = chosenMutations;
    mutated.state.mutationLiabilities = mutationLiabilities;
    const loaded = parseSave(JSON.stringify(mutated));
    assert.equal(loaded.status, "rejected");
  }
  for (const stateWithForgery of [
    { ...state, chosenMutations: ["forged"], mutationLiabilities: ["forged"] },
    { ...state, chosenMutations: ["repair_bypass"], mutationLiabilities: ["other-forged"] },
  ]) {
    assert.throws(() => serializeGameState(stateWithForgery, 1));
  }
});
