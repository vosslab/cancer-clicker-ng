import assert from "node:assert/strict";
import test from "node:test";
import { compare, divide, multiplyByNumber, subtract } from "../src/bignum/bignum.ts";
import { bigNum, producerId, stageId } from "../src/brands.ts";
import { quoteProducerPurchase } from "../src/economy/costs.ts";
import { STAGE_ONE_PRODUCERS } from "../src/economy/producers.ts";
import { advanceLiveTick, economyTick } from "../src/economy/tick.ts";
import { STAGE_IDS, nextStageId } from "../src/state/catalog.ts";
import { recordEvent } from "../src/state/events.ts";
import { deriveOfflineElapsed, replayOffline } from "../src/state/offline.ts";
import { parseSave, serializeGameState } from "../src/state/save_load.ts";
import {
  assertStageEconomyCatalog,
  STAGE_ECONOMY_ENVELOPE,
  stageDefinitionsInOrder,
} from "../src/stages/catalog.ts";
import { eligibleNextStage, stageGateResult } from "../src/stages/gates.ts";
import { stageGateFixture } from "./stage_fixture.mjs";

function clone(value) {
  return structuredClone(value);
}

function falseGateState(target) {
  const state = stageGateFixture(target);
  switch (target) {
    case "microcolony":
      return { ...state, cells: bigNum(0, 0) };
    case "avascular_lesion":
      return {
        ...state,
        producerLevels: state.producerLevels.map((level) => ({ ...level, level: 0 })),
      };
    case "hypoxic_lesion":
      return { ...state, oxygenPressure: 0 };
    case "angiogenic_primary":
      return { ...state, regions: [] };
    case "invasive_carcinoma":
      return { ...state, routeDiscoveryProgress: 0 };
    case "intravasation":
      return { ...state, committedCellCommitments: {} };
    case "micrometastatic_seeding":
      return { ...state, seededSites: [] };
    case "metastatic_burden":
      return { ...state, seededSites: [] };
    case "host_collapse":
      return { ...state, oxygenPressure: 0 };
    case "immortalized_culture":
      return { ...state, prestigeAvailability: [] };
    case "global_lab_contamination":
      return { ...state, routeDiscoveryProgress: 0 };
    default:
      throw new Error("No transition exists into the initial stage.");
  }
}

function oneSecondPurchaseScores(state) {
  const scored = [];
  for (const producer of STAGE_ONE_PRODUCERS) {
    const quote = quoteProducerPurchase(state, producer.id, 1);
    assert.equal(quote.affordable, true, producer.id);
    const purchased = recordEvent(state, {
      type: "purchase-producer",
      producerId: producer.id,
      quantity: 1,
      execution: "manual",
      atMs: state.activeTimeMs,
    });
    const afterTick = economyTick(purchased, 1_000, "live").resourceSnapshot.cells;
    const marginalGain = subtract(afterTick, purchased.cells);
    const score = divide(marginalGain, quote.debit);
    scored.push({ id: producer.id, score });
  }
  return scored.sort((left, right) => {
    const scoreOrder = compare(right.score, left.score);
    return scoreOrder === 0 ? left.id.localeCompare(right.id) : scoreOrder;
  });
}

function scoreFor(scores, id) {
  const found = scores.find((score) => score.id === id);
  assert.ok(found, id);
  return found.score;
}

function uniformlyScaledOrder(scores) {
  return [...scores]
    .map((score) => ({ ...score, score: multiplyByNumber(score.score, 7) }))
    .sort((left, right) => {
      const scoreOrder = compare(right.score, left.score);
      return scoreOrder === 0 ? left.id.localeCompare(right.id) : scoreOrder;
    })
    .map((score) => score.id);
}

function assertPurchaseOrderChanged(beforeScores, afterScores, label) {
  const beforeOrder = beforeScores.map((score) => score.id);
  const afterOrder = afterScores.map((score) => score.id);
  assert.notDeepEqual(beforeOrder, afterOrder, label);
  assert.notEqual(beforeOrder[0], afterOrder[0], label);
  return { beforeOrder, afterOrder };
}

test("stage progression stage definitions exactly cover the canonical ladder with distinct operational modes", () => {
  const definitions = stageDefinitionsInOrder();
  assert.deepEqual(
    definitions.map((definition) => definition.id),
    STAGE_IDS,
  );
  assert.equal(new Set(definitions.map((definition) => definition.uiMode)).size, STAGE_IDS.length);
  assert.equal(
    new Set(definitions.map((definition) => definition.operationalChange.actionId)).size,
    STAGE_IDS.length,
  );
  for (const definition of definitions) {
    assert.ok(definition.title.length > 0);
    assert.ok(definition.retires.length > 0);
    assert.ok(definition.gameplayIdentity.length > 0);
    assert.ok(definition.pressure.length > 0);
    assert.ok(definition.opportunity.length > 0);
    assert.ok(definition.operationalChange.feasibilityRule.length > 0);
    const economy = definition.operationalChange.economy;
    assert.ok(Number.isFinite(economy.productionMultiplier));
    assert.ok(Number.isFinite(economy.favoredProducerCostMultiplier));
    assert.ok(Number.isFinite(economy.favoredProducerRateMultiplier));
    assert.ok(
      economy.productionMultiplier >= STAGE_ECONOMY_ENVELOPE.productionMultiplier.minimum &&
        economy.productionMultiplier <= STAGE_ECONOMY_ENVELOPE.productionMultiplier.maximum,
    );
    assert.ok(
      economy.favoredProducerCostMultiplier >=
        STAGE_ECONOMY_ENVELOPE.favoredProducerCostMultiplier.minimum &&
        economy.favoredProducerCostMultiplier <=
          STAGE_ECONOMY_ENVELOPE.favoredProducerCostMultiplier.maximum,
    );
    assert.ok(
      economy.favoredProducerRateMultiplier >=
        STAGE_ECONOMY_ENVELOPE.favoredProducerRateMultiplier.minimum &&
        economy.favoredProducerRateMultiplier <=
          STAGE_ECONOMY_ENVELOPE.favoredProducerRateMultiplier.maximum,
    );
  }
  assertStageEconomyCatalog();
  const corrupted = definitions.map((definition) => ({
    ...definition,
    operationalChange: {
      ...definition.operationalChange,
      economy: { ...definition.operationalChange.economy },
    },
  }));
  corrupted[1].operationalChange.economy.productionMultiplier = Number.POSITIVE_INFINITY;
  assert.throws(() => assertStageEconomyCatalog(corrupted));
});

test("every semantic gate rejects atomically when false and permits only its immediate successor", () => {
  const initial = stageGateFixture("transformed_cell");
  assert.equal(stageGateResult(initial, stageId("transformed_cell")).eligible, false);
  const afterDivision = recordEvent(initial, { type: "click-divide", atMs: 1 });
  assert.equal(stageGateResult(afterDivision, stageId("transformed_cell")).eligible, true);
  for (const target of STAGE_IDS.slice(1)) {
    const falseState = falseGateState(target);
    const before = clone(falseState);
    assert.equal(stageGateResult(falseState, stageId(target)).eligible, false, target);
    assert.equal(eligibleNextStage(falseState), undefined, target);
    const from = falseState.currentStage;
    assert.throws(
      () =>
        recordEvent(falseState, {
          type: "advance-stage",
          fromStageId: from,
          toStageId: stageId(target),
          atMs: falseState.activeTimeMs + 1,
        }),
      target,
    );
    assert.deepEqual(falseState, before, target);
  }
});

test("deterministic fast-forward records all eleven legal boundaries and p4 round-trips", () => {
  let working = stageGateFixture("microcolony");
  for (const target of STAGE_IDS.slice(1)) {
    const gateState = stageGateFixture(target);
    const from = working.currentStage;
    const atMs = working.activeTimeMs + 1;
    working = {
      ...working,
      ...gateState,
      currentStage: from,
      activeTimeMs: working.activeTimeMs,
      stageStartedAtMs: working.stageStartedAtMs,
      lastStageTransition: working.lastStageTransition,
      eventSequence: working.eventSequence,
    };
    assert.equal(eligibleNextStage(working), stageId(target), target);
    working = recordEvent(working, {
      type: "advance-stage",
      fromStageId: from,
      toStageId: stageId(target),
      atMs,
    });
    assert.deepEqual(working.lastStageTransition, { from, to: target, atMs }, target);
    assert.equal(
      working.pendingProgression.some((item) => item.kind === "stage"),
      false,
      target,
    );
    const reread = parseSave(serializeGameState(working, 500));
    assert.equal(reread.status, "loaded", target);
    assert.deepEqual(reread.state, working, target);
  }
  assert.equal(nextStageId(working.currentStage), undefined);
  assert.equal(eligibleNextStage(working), undefined);
});

test("host collapse requires earned L3 and has no fabricated prestige reward", () => {
  const blocked = stageGateFixture("immortalized_culture", { earnedL3: false });
  const before = clone(blocked);
  assert.equal(eligibleNextStage(blocked), undefined);
  assert.throws(() =>
    recordEvent(blocked, {
      type: "advance-stage",
      fromStageId: stageId("host_collapse"),
      toStageId: stageId("immortalized_culture"),
      atMs: 101,
    }),
  );
  assert.deepEqual(blocked, before);
  const allowed = stageGateFixture("immortalized_culture");
  const after = recordEvent(allowed, {
    type: "advance-stage",
    fromStageId: stageId("host_collapse"),
    toStageId: stageId("immortalized_culture"),
    atMs: 101,
  });
  assert.deepEqual(after.prestigeAvailability, allowed.prestigeAvailability);
});

test("every boundary changes the independently ranked best legal producer purchase", () => {
  for (const target of STAGE_IDS.slice(1)) {
    const before = { ...stageGateFixture(target), cells: bigNum(1, 12) };
    const after = recordEvent(before, {
      type: "advance-stage",
      fromStageId: before.currentStage,
      toStageId: stageId(target),
      atMs: 101,
    });
    const beforeScores = oneSecondPurchaseScores(before);
    const afterScores = oneSecondPurchaseScores(after);
    const { beforeOrder } = assertPurchaseOrderChanged(beforeScores, afterScores, target);

    // A uniform global multiplier preserves rank; the observed reversal therefore requires a
    // producer-specific, tick-consumed relation rather than metadata or a cosmetic scalar.
    assert.deepEqual(uniformlyScaledOrder(beforeScores), beforeOrder, target);
    assert.notEqual(
      compare(
        scoreFor(beforeScores, producerId("producer")),
        scoreFor(beforeScores, producerId("cdk4")),
      ),
      compare(
        scoreFor(afterScores, producerId("producer")),
        scoreFor(afterScores, producerId("cdk4")),
      ),
      target,
    );
  }
});

test("purchase-order oracle rejects no-op and uniform-only stage effect mutations", () => {
  const scores = oneSecondPurchaseScores({
    ...stageGateFixture("microcolony"),
    cells: bigNum(1, 12),
  });
  const uniformlyScaled = scores.map((score) => ({
    ...score,
    score: multiplyByNumber(score.score, 7),
  }));
  assert.throws(() => assertPurchaseOrderChanged(scores, scores, "no-op"));
  assert.throws(() => assertPurchaseOrderChanged(scores, uniformlyScaled, "uniform-only"));
});

test("live and offline economy paths observe the same immediate eligible stage without auto-transition", () => {
  const state = stageGateFixture("microcolony");
  const live = advanceLiveTick(
    { game: state, lastTickAtMs: state.activeTimeMs, pendingOfflineMs: 0, saveStatus: "idle" },
    state.activeTimeMs + 1,
  );
  const offline = replayOffline(state, deriveOfflineElapsed(0, 1), economyTick, recordEvent);
  assert.equal(offline.kind, "applied");
  assert.equal(live.game.currentStage, state.currentStage);
  assert.equal(offline.state.currentStage, state.currentStage);
  assert.deepEqual(
    live.game.pendingProgression.map((item) => [item.kind, item.id]),
    offline.state.pendingProgression.map((item) => [item.kind, item.id]),
  );
  assert.deepEqual(
    live.game.pendingProgression.map((item) => item.id),
    [stageId("microcolony")],
  );
});
