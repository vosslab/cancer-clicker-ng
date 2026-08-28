import assert from "node:assert/strict";
import test from "node:test";

import { bigNum, hallmarkId, mutationId, stageId } from "../src/brands.ts";
import { applyMutationSelection } from "../src/hallmarks/handlers/mutation_draft.ts";
import {
  assertGeneratedMutationDraftOffer,
  createMutationOffer,
  mutationDraftEligibility,
  projectPendingMutationOffer,
} from "../src/hallmarks/mutation_offer_generator.ts";
import { createInitialGameState } from "../src/state/game_state.ts";

function draftableState(overrides = {}) {
  const state = createInitialGameState();
  return {
    ...state,
    currentStage: stageId("angiogenic_primary"),
    hallmarkLevels: [{ id: hallmarkId("genome_instability_mutation"), level: 1 }],
    atp: bigNum(4, 0),
    atpSinks: ["mutation-drafting"],
    atpBudget: { "mutation-drafting": 25 },
    deterministicSeed: 7,
    eventSequence: 11,
    ...overrides,
  };
}

function pendingState(overrides = {}) {
  const state = draftableState(overrides);
  const projected = projectPendingMutationOffer(state);
  assert.notEqual(projected, state, "fixture must create its one pending offer");
  return projected;
}

function selection(state, mutation) {
  const offer = state.mutationOffers[0];
  assert.ok(offer, "fixture must retain an offer");
  return applyMutationSelection({
    state,
    operation: {
      type: "select-mutation",
      hallmark: "genome_instability_mutation",
      offerId: offer.id,
      mutationId: mutation,
    },
    appliedAtMs: state.activeTimeMs,
  });
}

function snapshot(value) {
  return JSON.parse(JSON.stringify(value));
}

test("mutation offers are deterministic, closed, uniquely ordered saved snapshots", () => {
  const corpus = [
    { deterministicSeed: 0, eventSequence: 0 },
    { deterministicSeed: 7, eventSequence: 11 },
    { deterministicSeed: 19, eventSequence: 41 },
    { deterministicSeed: 0xffff_ffff, eventSequence: 99 },
  ];
  const identities = new Set();
  for (const item of corpus) {
    const sourceState = draftableState(item);
    const first = projectPendingMutationOffer(sourceState);
    const second = projectPendingMutationOffer(sourceState);
    assert.deepEqual(first, second, "same state must project byte-identically");
    assert.equal(first.eventSequence, sourceState.eventSequence);
    const offer = first.mutationOffers[0];
    assert.ok(offer);
    assert.equal(offer.cards.length, 3);
    assert.equal(new Set(offer.cards.map((card) => card.id)).size, 3);
    assert.equal(offer.sourceSeed, item.deterministicSeed);
    assert.equal(offer.sourceSequence, item.eventSequence);
    assert.equal(offer.sourceStage, sourceState.currentStage);
    assert.deepEqual(
      offer.cards.map((card) => [card.benefit.label, card.liability.label]),
      [
        ["Benefit", "Liability"],
        ["Benefit", "Liability"],
        ["Benefit", "Liability"],
      ],
    );
    assertGeneratedMutationDraftOffer(offer, {
      deterministicSeed: sourceState.deterministicSeed,
      eventSequence: sourceState.eventSequence,
      currentStage: sourceState.currentStage,
      genomeBurden: sourceState.genomeBurden,
    });
    identities.add(offer.id);
  }
  assert.equal(identities.size, corpus.length, "seed/sequence changes only offer provenance tuple");
});

test("threshold and ATP budget make exactly one outstanding offer eligible", () => {
  const pending = pendingState();
  assert.equal(mutationDraftEligibility(pending).eligible, false);
  assert.equal(projectPendingMutationOffer(pending), pending, "a saved offer never rerolls");

  const noBudget = draftableState({ atpSinks: [], atpBudget: {} });
  assert.deepEqual(mutationDraftEligibility(noBudget), {
    eligible: false,
    reason: "atp-unavailable",
  });
  const insufficientAtp = draftableState({ atp: bigNum(0.5, 0) });
  assert.deepEqual(mutationDraftEligibility(insufficientAtp), {
    eligible: false,
    reason: "atp-unavailable",
  });
  const beyondClosedThreshold = draftableState({ genomeBurden: 1 });
  assert.deepEqual(mutationDraftEligibility(beyondClosedThreshold), {
    eligible: false,
    reason: "threshold-unavailable",
  });
});

test("selection atomically consumes one card and permanently adds its paired liability", () => {
  const state = pendingState();
  const offer = state.mutationOffers[0];
  assert.ok(offer);
  const selected = offer.cards[1];
  const after = selection(state, selected.id);
  assert.deepEqual(after.mutationOffers, []);
  assert.deepEqual(after.chosenMutations, [selected.id]);
  assert.deepEqual(after.mutationLiabilities, [selected.id]);
  assert.equal(after.genomeBurden, selected.genomeBurden);
  assert.equal(after.eventSequence, state.eventSequence, "only the reducer records sequence");

  const beforeReplay = snapshot(after);
  assert.throws(() => selection(after, selected.id), /retain an offer/);
  assert.deepEqual(snapshot(after), beforeReplay, "replay rejection must leave state untouched");
});

test("a saved offer remains selectable after a later stage without rerolling", () => {
  const state = pendingState();
  const offer = state.mutationOffers[0];
  assert.ok(offer);
  const advanced = { ...state, currentStage: stageId("invasive_carcinoma") };
  const after = selection(advanced, offer.cards[0].id);
  assert.deepEqual(after.mutationOffers, []);
  assert.deepEqual(after.chosenMutations, [offer.cards[0].id]);
});

test("selection rejects unknown, mismatched, locked, stale, and unsafe offers without mutation", () => {
  const state = pendingState();
  const offer = state.mutationOffers[0];
  assert.ok(offer);
  const selected = offer.cards[0];
  const cases = [
    ["unknown-card", state, mutationId("unknown")],
    ["locked", { ...state, hallmarkLevels: [] }, selected.id],
    ["stale-seed", { ...state, deterministicSeed: state.deterministicSeed + 1 }, selected.id],
    [
      "unsafe-sequence",
      { ...state, mutationOffers: [{ ...offer, sourceSequence: -1 }] },
      selected.id,
    ],
    [
      "tampered-card",
      {
        ...state,
        mutationOffers: [{ ...offer, cards: [offer.cards[1], offer.cards[0], offer.cards[2]] }],
      },
      selected.id,
    ],
  ];
  for (const [name, candidate, mutation] of cases) {
    const before = snapshot(candidate);
    assert.throws(() => selection(candidate, mutation), String(name));
    assert.deepEqual(snapshot(candidate), before, `${name} rejection must be atomic`);
  }
});

test("different mutation choices create different durable operation states, not catalog scores", () => {
  const state = pendingState();
  const offer = state.mutationOffers[0];
  assert.ok(offer);
  const first = selection(state, offer.cards[0].id);
  const second = selection(state, offer.cards[1].id);
  assert.notDeepEqual(first.chosenMutations, second.chosenMutations);
  assert.notDeepEqual(first.mutationLiabilities, second.mutationLiabilities);
  assert.equal(first.genomeBurden, second.genomeBurden);
  assert.notDeepEqual(first, second, "the irreversible benefit/liability decision changes state");
});

test("direct generation rejects invalid deterministic provenance", () => {
  const state = draftableState();
  assert.throws(
    () =>
      createMutationOffer({
        deterministicSeed: -1,
        eventSequence: state.eventSequence,
        currentStage: state.currentStage,
        genomeBurden: 0,
      }),
    /provenance/,
  );
});
