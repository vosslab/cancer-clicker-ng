import assert from "node:assert/strict";
import test from "node:test";

import { bigNum } from "../src/brands.ts";
import {
  approximatelyEquals,
  compare,
  divide,
  fromNumber,
  multiply,
  pow,
  subtract,
  sum,
  one,
  zero,
} from "../src/bignum/bignum.ts";
import { geometricCost, maxAffordable } from "../src/bignum/solve.ts";

function individualCost(firstCost, growth, owned, quantity) {
  const ratio = fromNumber(growth);
  const terms = [];
  let term = multiply(firstCost, pow(ratio, owned));
  for (let index = 0; index < quantity; index += 1) {
    terms.push(term);
    if (index + 1 < quantity) {
      term = multiply(term, ratio);
    }
  }
  return sum(terms);
}

function closedFormCost(firstCost, growth, owned, quantity) {
  const ratio = fromNumber(growth);
  const initialTerm = multiply(firstCost, pow(ratio, owned));
  const coefficient = divide(subtract(pow(ratio, quantity), one()), subtract(ratio, one()));
  return multiply(initialTerm, coefficient);
}

function expectAffordableBoundary(budget, firstCost, growth, owned, limit) {
  const quantity = maxAffordable(budget, firstCost, growth, owned, limit);
  assert.ok(compare(geometricCost(firstCost, growth, owned, quantity), budget) <= 0);
  if (quantity < limit) {
    assert.ok(compare(geometricCost(firstCost, growth, owned, quantity + 1), budget) > 0);
  }
  return quantity;
}

test("geometricCost validates all quote inputs before zero shortcuts", () => {
  const cost = bigNum(10, 0);
  assert.deepEqual(geometricCost(cost, 1.2, 3, 0), zero());
  assert.throws(() => geometricCost(cost, 0.9, 0, 0));
  assert.throws(() => geometricCost(bigNum(-1, 0), 1, 0, 0));
  assert.throws(() => geometricCost(zero(), Number.POSITIVE_INFINITY, 0, 1));
  assert.throws(() => geometricCost(zero(), 1, Number.MAX_SAFE_INTEGER, 1));
  assert.throws(() => geometricCost(cost, 1, -1, 1));
  assert.throws(() => geometricCost(cost, 1, 0, 1.5));
});

test("geometricCost is the exact ordered sum in its recurrence domain", () => {
  const firstCost = bigNum(2.5, 1);
  for (const quantity of [0, 1, 10, 100]) {
    assert.deepEqual(
      geometricCost(firstCost, 1.07, 4, quantity),
      individualCost(firstCost, 1.07, 4, quantity),
    );
  }
  assert.deepEqual(geometricCost(firstCost, 1, 4, 100), multiply(firstCost, fromNumber(100)));
  assert.deepEqual(geometricCost(zero(), Number.MAX_VALUE, Number.MAX_SAFE_INTEGER - 1, 1), zero());
});

test("geometricCost closed forms remain close to the mathematical formula after recurrence", () => {
  const firstCost = bigNum(3, 0);
  const growth = 1.0001;
  const quantity = 10_001;
  const actual = geometricCost(firstCost, growth, 2, quantity);
  const expected = closedFormCost(firstCost, growth, 2, quantity);
  assert.equal(approximatelyEquals(actual, expected, 1e-12), true);

  const recurrenceQuantity = 100;
  const recurrence = geometricCost(firstCost, growth, 2, recurrenceQuantity);
  const comparableClosedForm = closedFormCost(firstCost, growth, 2, recurrenceQuantity);
  assert.equal(approximatelyEquals(recurrence, comparableClosedForm, 1e-12), true);
});

test("geometricCost supports both large-quantity near-one routes without random retries", () => {
  const firstCost = bigNum(3, 0);
  const stableGrowth = 1.000000001;
  const stableQuantity = 10_001;
  const stable = geometricCost(firstCost, stableGrowth, 5, stableQuantity);
  const stableCoefficient =
    Math.expm1(Math.log1p(stableGrowth - 1) * stableQuantity) / (stableGrowth - 1);
  const stableExpected = multiply(
    multiply(firstCost, pow(fromNumber(stableGrowth), 5)),
    fromNumber(stableCoefficient),
  );
  assert.equal(approximatelyEquals(stable, stableExpected, 1e-12), true);

  const fallbackGrowth = 1.000000001;
  const fallbackQuantity = 1_000_000_000_000;
  assert.equal(
    Number.isFinite(Math.expm1(Math.log1p(fallbackGrowth - 1) * fallbackQuantity)),
    false,
  );
  const fallback = geometricCost(firstCost, fallbackGrowth, 5, fallbackQuantity);
  const fallbackExpected = closedFormCost(firstCost, fallbackGrowth, 5, fallbackQuantity);
  assert.equal(approximatelyEquals(fallback, fallbackExpected, 1e-12), true);
  assert.deepEqual(geometricCost(zero(), Number.MAX_VALUE, Number.MAX_SAFE_INTEGER - 1, 1), zero());
});

test("maxAffordable validates input, zero limits, and zero-cost terminal cases", () => {
  const budget = bigNum(100, 0);
  const cost = bigNum(10, 0);
  assert.equal(maxAffordable(budget, cost, 1, 0, 0), 0);
  assert.equal(maxAffordable(budget, zero(), 1, 0, 7), 7);
  assert.throws(() => maxAffordable(budget, zero(), 1, 0));
  assert.throws(() => maxAffordable(bigNum(-1, 0), cost, 1, 0, 1));
  assert.throws(() => maxAffordable(budget, cost, 0.5, 0, 1));
  assert.throws(() => maxAffordable(budget, cost, 1, Number.MAX_SAFE_INTEGER, 1));
  assert.throws(() => maxAffordable(budget, cost, 1, 0, -1));
});

test("maxAffordable finds exact greatest affordable quantity with no overspend", () => {
  const firstCost = bigNum(10, 0);
  assert.equal(expectAffordableBoundary(bigNum(99, 0), firstCost, 1, 0, 10), 9);
  assert.equal(expectAffordableBoundary(bigNum(100, 0), firstCost, 1, 0, 10), 10);
  assert.equal(expectAffordableBoundary(bigNum(75, 0), firstCost, 1.5, 0, 10), 3);
  assert.equal(expectAffordableBoundary(bigNum(10, 5), firstCost, 1.1, 5, 100), 91);
});

test("maxAffordable capacity terminal never needs an unsafe next purchase probe", () => {
  const owned = Number.MAX_SAFE_INTEGER - 1;
  const firstCost = bigNum(1, 0);
  assert.equal(maxAffordable(bigNum(10, 0), firstCost, 1, owned), 1);
  assert.equal(maxAffordable(bigNum(10, 0), firstCost, 1, Number.MAX_SAFE_INTEGER), 0);
  assert.equal(maxAffordable(bigNum(10, 0), zero(), 1, owned, 1), 1);
});

test("maxAffordable is monotonic across budgets and bounded huge budgets", () => {
  const firstCost = bigNum(4, 0);
  const budgets = [bigNum(0, 0), bigNum(4, 0), bigNum(100, 0), bigNum(1, 6), bigNum(1, 30)];
  let previous = -1;
  for (const budget of budgets) {
    const quantity = maxAffordable(budget, firstCost, 1.05, 2, 500);
    assert.ok(quantity >= previous);
    previous = quantity;
  }
  assert.equal(maxAffordable(bigNum(1, 300), firstCost, 1, 0, 25), 25);
});
