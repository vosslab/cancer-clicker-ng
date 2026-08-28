import assert from "node:assert/strict";
import test from "node:test";

import {
  add,
  approximatelyEquals,
  compare,
  multiply,
  multiplyByNumber,
  subtract,
  sum,
  zero,
} from "../src/bignum/bignum.ts";
import { geometricCost } from "../src/bignum/solve.ts";
import { bigNum, producerId } from "../src/brands.ts";
import { quoteProducerPurchase } from "../src/economy/costs.ts";
import { replayEconomyOffline } from "../src/economy/offline.ts";
import { STAGE_ONE_PRODUCERS } from "../src/economy/producers.ts";
import { advanceLiveTick, applyEconomyTick, economyTick } from "../src/economy/tick.ts";
import { recordEvent } from "../src/state/events.ts";
import { createInitialGameState } from "../src/state/game_state.ts";
import { MAX_OFFLINE_MS, deriveOfflineElapsed } from "../src/state/offline.ts";
import { TRACKED_RESOURCE_KEYS } from "../src/types/state.ts";

function withCells(cells) {
  return { ...createInitialGameState(), cells };
}

function recurrence(definition, owned, quantity) {
  let term = definition.firstCost;
  for (let index = 0; index < owned; index += 1)
    term = multiply(term, { mantissa: definition.growth, exponent: 0 });
  const terms = [];
  for (let index = 0; index < quantity; index += 1) {
    terms.push(term);
    term = multiply(term, { mantissa: definition.growth, exponent: 0 });
  }
  return sum(terms);
}

const EXPECTED_CATALOG = [
  ["producer", "Cyclin D", 1, -1, 1, 0, 1.12, "transformed_cell"],
  ["cdk4", "CDK4", 4, -1, 1.2, 1, 1.13, "transformed_cell"],
  ["myc", "MYC", 1.5, 0, 7, 1, 1.14, "transformed_cell"],
  ["ras", "RAS", 6, 0, 4.2, 2, 1.15, "transformed_cell"],
  ["telomerase", "Telomerase", 2.5, 1, 2, 3, 1.16, "transformed_cell"],
  ["egfr", "EGFR", 1.1, 2, 1.2, 4, 1.17, "transformed_cell"],
  ["pi3k", "PI3K", 5, 2, 7.5, 4, 1.18, "transformed_cell"],
  ["replication_fork", "Replication Fork", 2.2, 3, 5, 5, 1.19, "transformed_cell"],
];
const EXPECTED_TOTAL_CELL_RATE = bigNum(2843, 0);

function allLevelOneState() {
  const state = createInitialGameState();
  return {
    ...state,
    producerLevels: state.producerLevels.map((level) => ({ ...level, level: 1 })),
  };
}

function literalMaxQuantity(firstCost, growth, budget) {
  let quantity = 0;
  while (compare(recurrence({ firstCost, growth }, 0, quantity + 1), budget) <= 0) quantity += 1;
  return quantity;
}

test("eight unique stage-one producers start at exactly one zero level each", () => {
  const state = createInitialGameState();
  assert.equal(STAGE_ONE_PRODUCERS.length, 8);
  assert.equal(new Set(STAGE_ONE_PRODUCERS.map((producer) => producer.id)).size, 8);
  assert.deepEqual(
    state.producerLevels.map((level) => level.id),
    STAGE_ONE_PRODUCERS.map((p) => p.id),
  );
  assert.ok(state.producerLevels.every((level) => level.level === 0));
  assert.deepEqual(
    STAGE_ONE_PRODUCERS.map((producer) => [
      producer.id,
      producer.displayName,
      producer.baseCellRate.mantissa,
      producer.baseCellRate.exponent,
      producer.firstCost.mantissa,
      producer.firstCost.exponent,
      producer.growth,
      producer.unlockStage,
    ]),
    EXPECTED_CATALOG,
  );
});

test("production offline wrapper shares fixed macro/remainder and irregular live results", () => {
  const initial = allLevelOneState();
  const duration = 132_345;
  let fixed = { game: initial, lastTickAtMs: 0, pendingOfflineMs: 0, saveStatus: "idle" };
  for (const now of [60_000, 120_000, duration]) fixed = advanceLiveTick(fixed, now);
  const offline = replayEconomyOffline(initial, deriveOfflineElapsed(0, duration));
  assert.equal(offline.kind, "applied");
  const expectedCells = multiplyByNumber(EXPECTED_TOTAL_CELL_RATE, duration / 1000);
  for (const key of TRACKED_RESOURCE_KEYS) {
    assert.deepEqual(offline.state[key], fixed.game[key]);
  }
  assert.deepEqual(offline.state.cells, expectedCells);
  assert.equal(offline.report.executedSteps, 3);
  const evenDuration = 180_000;
  let irregular = { game: initial, lastTickAtMs: 0, pendingOfflineMs: 0, saveStatus: "idle" };
  for (const now of [30_000, 90_000, evenDuration]) irregular = advanceLiveTick(irregular, now);
  const evenOffline = replayEconomyOffline(initial, deriveOfflineElapsed(0, evenDuration));
  assert.equal(evenOffline.kind, "applied");
  for (const key of TRACKED_RESOURCE_KEYS)
    assert.deepEqual(evenOffline.state[key], irregular.game[key]);
});

test("production offline cap has the same 10080-step result as live work", () => {
  const initial = allLevelOneState();
  let live = { game: initial, lastTickAtMs: 0, pendingOfflineMs: 0, saveStatus: "idle" };
  for (let index = 1; index <= 10_080; index += 1) live = advanceLiveTick(live, index * 60_000);
  const offline = replayEconomyOffline(initial, deriveOfflineElapsed(0, MAX_OFFLINE_MS + 60_000));
  assert.equal(offline.kind, "applied");
  assert.equal(offline.report.executedSteps, 10_080);
  assert.equal(offline.report.appliedElapsedMs, MAX_OFFLINE_MS);
  assert.equal(offline.report.capped, true);
  for (const key of TRACKED_RESOURCE_KEYS) assert.deepEqual(offline.state[key], live.game[key]);
  let expectedCells = zero();
  const expectedStep = multiplyByNumber(EXPECTED_TOTAL_CELL_RATE, 60);
  for (let index = 0; index < 10_080; index += 1) expectedCells = add(expectedCells, expectedStep);
  assert.deepEqual(offline.state.cells, expectedCells);
});

test("one, ten, and hundred quotes follow independent ordered recurrences", () => {
  const state = withCells(bigNum(1, 300));
  for (const producer of STAGE_ONE_PRODUCERS) {
    for (const quantity of [1, 10, 100]) {
      const quote = quoteProducerPurchase(state, producer.id, quantity);
      assert.deepEqual(quote.debit, recurrence(producer, 0, quantity));
      assert.equal(quote.affordable, true);
    }
    const ownedState = {
      ...state,
      producerLevels: state.producerLevels.map((level) =>
        level.id === producer.id ? { ...level, level: 3 } : level,
      ),
    };
    assert.equal(
      approximatelyEquals(
        quoteProducerPurchase(ownedState, producer.id, 10).debit,
        recurrence(producer, 3, 10),
        1e-12,
      ),
      true,
    );
  }
});

test("max quotes use independent one-more boundaries and zero max is disabled", () => {
  for (const producer of STAGE_ONE_PRODUCERS) {
    const targetQuantity = 5;
    const state = withCells(recurrence(producer, 0, targetQuantity));
    const quote = quoteProducerPurchase(state, producer.id, "max");
    assert.equal(quote.quantity, targetQuantity);
    assert.equal(quote.affordable, true);
    assert.ok(
      compare(geometricCost(producer.firstCost, producer.growth, 0, quote.quantity), state.cells) <=
        0,
    );
    assert.ok(
      compare(
        geometricCost(producer.firstCost, producer.growth, 0, quote.quantity + 1),
        state.cells,
      ) > 0,
    );
  }
  const producer = STAGE_ONE_PRODUCERS[0];
  assert.ok(producer);
  const empty = quoteProducerPurchase(withCells(bigNum(0, 0)), producer.id, "max");
  assert.equal(empty.quantity, 0);
  assert.equal(empty.affordable, false);
  assert.deepEqual(empty.debit, bigNum(0, 0));
});

test("event-funnel purchases debit exactly once and reject invalid inventory or affordability atomically", () => {
  const producer = STAGE_ONE_PRODUCERS[0];
  assert.ok(producer);
  const before = withCells(bigNum(1_000, 0));
  const quote = quoteProducerPurchase(before, producer.id, 10);
  const after = recordEvent(before, {
    type: "purchase-producer",
    producerId: producer.id,
    quantity: 10,
    execution: "manual",
    atMs: 0,
  });
  assert.deepEqual(after.cells, subtract(before.cells, quote.debit));
  assert.equal(after.producerLevels[0]?.level, 10);
  assert.equal(after.eventSequence, before.eventSequence + 1);
  assert.deepEqual(after.substrate, before.substrate);
  assert.deepEqual(after.atp, before.atp);
  assert.deepEqual(after.producerLevels.slice(1), before.producerLevels.slice(1));
  const maxAfter = recordEvent(before, {
    type: "purchase-producer",
    producerId: producer.id,
    quantity: "max",
    execution: "manual",
    atMs: 0,
  });
  const literalFirstCost = bigNum(1, 0);
  const literalGrowth = 1.12;
  const expectedMax = literalMaxQuantity(literalFirstCost, literalGrowth, before.cells);
  const expectedDebit = recurrence(
    { firstCost: literalFirstCost, growth: literalGrowth },
    0,
    expectedMax,
  );
  assert.ok(expectedMax > 1);
  assert.ok(
    compare(
      recurrence({ firstCost: literalFirstCost, growth: literalGrowth }, 0, expectedMax + 1),
      before.cells,
    ) > 0,
  );
  assert.notDeepEqual(
    expectedDebit,
    recurrence({ firstCost: literalFirstCost, growth: literalGrowth }, 0, expectedMax - 1),
  );
  assert.notDeepEqual(expectedDebit, multiplyByNumber(literalFirstCost, expectedMax));
  const maxQuote = quoteProducerPurchase(before, producer.id, "max");
  assert.equal(maxQuote.quantity, expectedMax);
  assert.deepEqual(maxQuote.debit, expectedDebit);
  assert.deepEqual(maxAfter.cells, subtract(before.cells, expectedDebit));
  assert.equal(maxAfter.producerLevels[0].level, expectedMax);
  assert.deepEqual(maxAfter.producerLevels.slice(1), before.producerLevels.slice(1));
  assert.deepEqual(maxAfter.substrate, before.substrate);
  assert.deepEqual(maxAfter.atp, before.atp);
  assert.equal(maxAfter.eventSequence, before.eventSequence + 1);
  for (const invalid of [
    { ...before, cells: bigNum(0, 0) },
    { ...before, producerLevels: before.producerLevels.slice(1) },
    { ...before, producerLevels: [...before.producerLevels, before.producerLevels[0]] },
    { ...before, producerLevels: [...before.producerLevels].reverse() },
    {
      ...before,
      producerLevels: [
        { ...before.producerLevels[0], id: producerId("unknown") },
        ...before.producerLevels.slice(1),
      ],
    },
    {
      ...before,
      producerLevels: [
        { ...before.producerLevels[0], level: -1 },
        ...before.producerLevels.slice(1),
      ],
    },
  ]) {
    const original = structuredClone(invalid);
    assert.throws(() =>
      recordEvent(invalid, {
        type: "purchase-producer",
        producerId: producer.id,
        quantity: 1,
        execution: "manual",
        atMs: 0,
      }),
    );
    assert.deepEqual(invalid, original);
  }
  const empty = withCells(bigNum(0, 0));
  assert.throws(() =>
    recordEvent(empty, {
      type: "purchase-producer",
      producerId: producer.id,
      quantity: "max",
      execution: "manual",
      atMs: 0,
    }),
  );
  assert.deepEqual(empty, withCells(bigNum(0, 0)));
  for (const quantity of [0, 2, 1.5, Number.MAX_SAFE_INTEGER + 1, "other"]) {
    assert.throws(() => quoteProducerPurchase(before, producer.id, quantity));
    assert.throws(() =>
      recordEvent(before, {
        type: "purchase-producer",
        producerId: producer.id,
        quantity,
        execution: "manual",
        atMs: 0,
      }),
    );
  }
});

test("authoritative growing debit defeats flat and rounded display substitutions", () => {
  const producer = STAGE_ONE_PRODUCERS[1];
  assert.ok(producer);
  const before = withCells(bigNum(1_000, 0));
  const quote = quoteProducerPurchase(before, producer.id, 10);
  const flat = multiplyByNumber(producer.firstCost, 10);
  const roundedDisplay = bigNum(Math.round(quote.debit.mantissa), quote.debit.exponent);
  assert.notDeepEqual(quote.debit, flat);
  assert.notDeepEqual(quote.debit, roundedDisplay);
  const after = recordEvent(before, {
    type: "purchase-producer",
    producerId: producer.id,
    quantity: 10,
    execution: "manual",
    atMs: 0,
  });
  assert.deepEqual(after.cells, subtract(before.cells, quote.debit));
});

test("click division gains its canonical cell and charge through one event", () => {
  const before = createInitialGameState();
  const after = recordEvent(before, { type: "click-divide", atMs: 0 });
  assert.deepEqual(after.cells, bigNum(1, 0));
  assert.equal(after.manualDivisionCharge, 1);
  assert.equal(after.eventSequence, 1);
});

test("fixed and irregular injected clocks delegate to one exact resource-only tick", () => {
  const initial = {
    ...withCells(bigNum(0, 0)),
    producerLevels: createInitialGameState().producerLevels.map((level, index) => ({
      ...level,
      level: index + 1,
    })),
  };
  let fixed = { game: initial, lastTickAtMs: 0, pendingOfflineMs: 0, saveStatus: "idle" };
  for (const now of [10_000, 20_000, 60_000]) fixed = advanceLiveTick(fixed, now);
  let irregular = { game: initial, lastTickAtMs: 0, pendingOfflineMs: 0, saveStatus: "idle" };
  for (const now of [7_000, 23_000, 60_000]) irregular = advanceLiveTick(irregular, now);
  assert.deepEqual(fixed.game.cells, irregular.game.cells);
  const expectedRate = sum(
    STAGE_ONE_PRODUCERS.map((producer, index) =>
      multiplyByNumber(producer.baseCellRate, index + 1),
    ),
  );
  assert.deepEqual(fixed.game.cells, multiplyByNumber(expectedRate, 60));
  assert.deepEqual(fixed.game.substrate, initial.substrate);
  assert.deepEqual(fixed.game.atp, initial.atp);
  assert.equal(fixed.game.activeTimeMs, 60_000);
  assert.deepEqual(economyTick(initial, 0, "live").resourceSnapshot, {
    cells: initial.cells,
    substrate: initial.substrate,
    atp: initial.atp,
  });
  for (const [elapsedMs, mode] of [
    [-1, "live"],
    [1.5, "offline"],
    [Number.NaN, "live"],
    [Infinity, "offline"],
    [Number.MAX_SAFE_INTEGER + 1, "live"],
    [1, "bad"],
  ])
    assert.throws(() => applyEconomyTick(initial, elapsedMs, mode));
});

test("hostile clocks and BigNum extremes are atomic or deliberately reject", () => {
  const runtime = {
    game: createInitialGameState(),
    lastTickAtMs: 10,
    pendingOfflineMs: 0,
    saveStatus: "idle",
  };
  for (const now of [-1, 1.5, Number.NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, 9]) {
    assert.throws(() => advanceLiveTick(runtime, now));
    assert.equal(runtime.lastTickAtMs, 10);
  }
  const overflowing = {
    ...runtime,
    game: { ...runtime.game, activeTimeMs: Number.MAX_SAFE_INTEGER },
  };
  assert.throws(() => advanceLiveTick(overflowing, 11));
  for (const runtimeBad of [
    { ...runtime, pendingOfflineMs: -1 },
    { ...runtime, pendingOfflineMs: 1.5 },
    { ...runtime, saveStatus: "bad" },
  ])
    assert.throws(() => advanceLiveTick(runtimeBad, 11));
  const extreme = {
    ...runtime.game,
    cells: bigNum(9.999, 3000),
    producerLevels: runtime.game.producerLevels.map((level, index) => ({
      ...level,
      level: index === 0 ? 1 : 0,
    })),
  };
  const extremeResult = economyTick(extreme, 60_000, "offline");
  assert.deepEqual(extremeResult.resourceSnapshot.cells, extreme.cells);
  assert.equal(compare(add(extreme.cells, bigNum(1, 0)), extreme.cells), 0);
  const expensive = STAGE_ONE_PRODUCERS[7];
  assert.ok(expensive);
  const extremeQuote = quoteProducerPurchase(withCells(bigNum(9.999, 3000)), expensive.id, 100);
  assert.equal(extremeQuote.affordable, true);
  assert.ok(Number.isFinite(extremeQuote.debit.mantissa));
  assert.ok(Number.isSafeInteger(extremeQuote.debit.exponent));
});
