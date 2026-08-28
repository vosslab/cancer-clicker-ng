import assert from "node:assert/strict";
import test from "node:test";
import { bigNum, hallmarkId, regionId, routeId, stageId } from "../src/brands.ts";
import { subtract } from "../src/bignum/bignum.ts";
import { quoteProducerPurchase } from "../src/economy/costs.ts";
import { STAGE_ONE_PRODUCERS } from "../src/economy/producers.ts";
import { economyTick } from "../src/economy/tick.ts";
import {
  composeEconomyModifiers,
  hallmarkEconomyModifier,
} from "../src/hallmarks/economy_effects.ts";
import { createInitialGameState } from "../src/state/game_state.ts";
import { recordEvent } from "../src/state/events.ts";
import { stageEconomyModifier } from "../src/stages/effects.ts";

const CORE_SIX = [
  "proliferative_signaling",
  "growth_suppressor_evasion",
  "cell_death_resistance",
  "replicative_immortality",
  "angiogenesis",
  "invasion_metastasis",
];

function baseState(currentStage) {
  const state = createInitialGameState();
  const region = {
    id: regionId("core-six-rim"),
    capacity: 3,
    viability: 1,
    phenotype: "proliferative",
    vesselLinkIds: [],
    routeIds: [routeId("core-six-route")],
  };
  return {
    ...state,
    cells: bigNum(1, 7),
    substrate: bigNum(0, 0),
    currentStage: stageId(currentStage),
    activeTimeMs: 100,
    producerLevels: STAGE_ONE_PRODUCERS.map((producer) => ({ id: producer.id, level: 1 })),
    hallmarkLevels: CORE_SIX.map((id) => ({ id: hallmarkId(id), level: 0 })),
    regions: [region],
    survivalCapacity: 1,
    damagePressure: 1,
    pendingDamageEvents: [{ id: "core-six-damage", regionId: region.id, outcome: "repairable" }],
    telomeraseCharges: 1,
    telomereReserveByRegion: { [region.id]: 0 },
    routeRiskById: { "core-six-route": 1 },
  };
}

function purchaseHallmark(state, hallmark) {
  return recordEvent(state, {
    type: "purchase-hallmark",
    hallmarkId: hallmarkId(hallmark),
    atMs: state.activeTimeMs,
  });
}

function applyBranch(state, hallmark) {
  const purchased = purchaseHallmark(state, hallmark);
  if (hallmark === "proliferative_signaling") {
    return recordEvent(purchased, {
      type: "set-signaling-allocation",
      allocation: "cycle",
      atMs: purchased.activeTimeMs,
    });
  }
  if (hallmark === "growth_suppressor_evasion") {
    return recordEvent(purchased, {
      type: "select-checkpoint",
      checkpoint: "nutrient-arrest",
      atMs: purchased.activeTimeMs,
    });
  }
  if (hallmark === "cell_death_resistance") {
    return recordEvent(purchased, {
      type: "resolve-triage",
      eventId: "core-six-damage",
      action: "repair",
      atMs: purchased.activeTimeMs,
    });
  }
  if (hallmark === "replicative_immortality") {
    return recordEvent(purchased, {
      type: "spend-telomerase",
      target: "refill-region",
      regionId: regionId("core-six-rim"),
      charges: 1,
      atMs: purchased.activeTimeMs,
    });
  }
  if (hallmark === "angiogenesis") {
    return recordEvent(purchased, {
      type: "set-vessel-link",
      regionId: regionId("core-six-rim"),
      linked: true,
      atMs: purchased.activeTimeMs,
    });
  }
  return recordEvent(purchased, {
    type: "commit-route",
    routeId: routeId("core-six-route"),
    cells: 10,
    atMs: purchased.activeTimeMs,
  });
}

function marginalScore(gain, debit) {
  return gain.exponent - debit.exponent + Math.log10(gain.mantissa / debit.mantissa);
}

function rankActualPurchases(state) {
  const baselineTick = economyTick(state, 1_000, "live");
  const baselineProduction = subtract(baselineTick.resourceSnapshot.cells, state.cells);
  return STAGE_ONE_PRODUCERS.map((producer) => {
    const quote = quoteProducerPurchase(state, producer.id, 1);
    assert.equal(quote.affordable, true, producer.id);
    const purchased = recordEvent(state, {
      type: "purchase-producer",
      producerId: producer.id,
      quantity: 1,
      atMs: state.activeTimeMs,
    });
    const ticked = economyTick(purchased, 1_000, "live");
    const production = subtract(ticked.resourceSnapshot.cells, purchased.cells);
    const gain = subtract(production, baselineProduction);
    return { id: producer.id, score: marginalScore(gain, quote.debit) };
  }).sort((left, right) => right.score - left.score || left.id.localeCompare(right.id));
}

function assertActualOrderChanged(before, after, label = "") {
  assert.notEqual(after[0]?.id, before[0]?.id, `${label}: best producer must change`);
  assert.notDeepEqual(
    after.map((entry) => entry.id),
    before.map((entry) => entry.id),
    "full producer order must change",
  );
}

test("core-six each durable core-six operation changes real quote, debit, and one-second producer ranking", () => {
  const branches = [
    ["proliferative_signaling", "transformed_cell"],
    ["growth_suppressor_evasion", "microcolony"],
    ["cell_death_resistance", "avascular_lesion"],
    ["replicative_immortality", "hypoxic_lesion"],
    ["angiogenesis", "hypoxic_lesion"],
    ["invasion_metastasis", "invasive_carcinoma"],
  ];
  for (const [hallmark, stage] of branches) {
    const baseline = baseState(stage);
    const afterOperation = applyBranch(baseline, hallmark);
    const beforeOrder = rankActualPurchases(baseline);
    const afterOrder = rankActualPurchases(afterOperation);
    assertActualOrderChanged(beforeOrder, afterOrder, hallmark);
  }
});

test("core-six hallmark economy uses the same composed terms for live and offline production", () => {
  const state = applyBranch(baseState("hypoxic_lesion"), "angiogenesis");
  const live = economyTick(state, 36_000, "live");
  const offline = economyTick(state, 36_000, "offline");
  assert.deepEqual(live.resourceSnapshot, offline.resourceSnapshot);
  assert.deepEqual(live.stageEligibility, offline.stageEligibility);
});

test("core-six rejects a no-op and a uniform scalar as evidence of an economy order change", () => {
  const baseline = rankActualPurchases(baseState("hypoxic_lesion"));
  assert.throws(() => assertActualOrderChanged(baseline, baseline));
  const uniform = baseline.map((entry) => ({ ...entry, score: entry.score + 2 }));
  assert.throws(() => assertActualOrderChanged(baseline, uniform));
});

test("core-six composed stage and hallmark producer terms stay finite, positive, and bounded", () => {
  const state = applyBranch(baseState("hypoxic_lesion"), "angiogenesis");
  for (const producer of STAGE_ONE_PRODUCERS) {
    const hallmark = hallmarkEconomyModifier(state, producer.id);
    const composed = composeEconomyModifiers(stageEconomyModifier(state, producer.id), hallmark);
    assert.ok(Number.isFinite(composed.productionMultiplier));
    assert.ok(Number.isFinite(composed.purchaseCostMultiplier));
    assert.ok(composed.productionMultiplier > 0);
    assert.ok(composed.purchaseCostMultiplier > 0);
    assert.ok(composed.productionMultiplier <= 32);
    assert.ok(composed.purchaseCostMultiplier <= 32);
  }
});
