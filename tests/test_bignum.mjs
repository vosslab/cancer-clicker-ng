import assert from "node:assert/strict";
import test from "node:test";

import { bigNum } from "../src/brands.ts";
import {
  abs,
  add,
  approximatelyEquals,
  compare,
  divide,
  divideByNumber,
  equals,
  fromNumber,
  fromSafeInteger,
  isNegative,
  isPositive,
  isZero,
  log10,
  max,
  min,
  multiply,
  multiplyByNumber,
  negate,
  one,
  pow,
  subtract,
  sum,
  toNumber,
  toNumberClamped,
  zero,
} from "../src/bignum/bignum.ts";
import { formatBigNum, formatQuantity } from "../src/bignum/format.ts";
import { illionNameForGroup, shortSuffixForGroup } from "../src/bignum/illion.ts";

function fields(value) {
  return { mantissa: value.mantissa, exponent: value.exponent };
}

function expectBigNum(value, mantissa, exponent) {
  assert.deepEqual(fields(value), { mantissa, exponent });
}

function expectRelative(actual, expected, tolerance = 1e-12) {
  assert.ok(Math.abs(actual - expected) <= Math.abs(expected) * tolerance + tolerance);
}

test("BigNum constructors normalize, canonicalize zero, and reconstruct trusted fields", () => {
  expectBigNum(bigNum(0, 42), 0, 0);
  expectBigNum(bigNum(-0, -42), 0, 0);
  expectBigNum(bigNum(123.4, -2), 1.234, 0);
  expectBigNum(fromNumber(-0.012), -1.2, -2);
  expectBigNum(fromSafeInteger(42), 4.2, 1);
  expectBigNum(zero(), 0, 0);
  expectBigNum(one(), 1, 0);

  const trusted = bigNum(-987.6, 12);
  assert.deepEqual(fields(bigNum(trusted.mantissa, trusted.exponent)), fields(trusted));
  assert.throws(() => bigNum(Number.NaN, 0));
  assert.throws(() => bigNum(99, Number.MAX_SAFE_INTEGER));
  assert.throws(() => fromNumber(Number.POSITIVE_INFINITY));
  assert.throws(() => fromSafeInteger(1.5));
});

test("BigNum predicates, unary operations, and total comparison respect sign", () => {
  const values = [
    bigNum(-1, 20),
    bigNum(-9, 2),
    bigNum(-1, -20),
    zero(),
    bigNum(1, -20),
    bigNum(9, 2),
    bigNum(1, 20),
  ];
  for (let index = 0; index < values.length; index += 1) {
    assert.equal(compare(values[index], values[index]), 0);
    if (index > 0) {
      assert.equal(compare(values[index - 1], values[index]), -1);
      assert.equal(compare(values[index], values[index - 1]), 1);
    }
  }
  assert.equal(isZero(zero()), true);
  assert.equal(isPositive(bigNum(1, -200)), true);
  assert.equal(isNegative(bigNum(-1, 200)), true);
  expectBigNum(abs(bigNum(-4, 3)), 4, 3);
  expectBigNum(negate(bigNum(4, 3)), -4, 3);
  assert.equal(equals(min(bigNum(2, 3), bigNum(1, 4)), bigNum(2, 3)), true);
  assert.equal(equals(max(bigNum(-2, 3), bigNum(-1, 4)), bigNum(-2, 3)), true);
});

test("BigNum comparison remains a total order across safe extreme exponents", () => {
  const ordered = [
    bigNum(-1, Number.MAX_SAFE_INTEGER - 1),
    bigNum(-9, Number.MIN_SAFE_INTEGER + 1),
    zero(),
    bigNum(1, Number.MIN_SAFE_INTEGER + 1),
    bigNum(9, Number.MAX_SAFE_INTEGER - 1),
  ];
  for (let leftIndex = 0; leftIndex < ordered.length; leftIndex += 1) {
    for (let rightIndex = 0; rightIndex < ordered.length; rightIndex += 1) {
      const expected = leftIndex === rightIndex ? 0 : leftIndex < rightIndex ? -1 : 1;
      assert.equal(compare(ordered[leftIndex], ordered[rightIndex]), expected);
      assert.equal(
        compare(ordered[rightIndex], ordered[leftIndex]),
        expected === 0 ? 0 : -expected,
      );
    }
  }
  assert.equal(compare(bigNum(-1, Number.MIN_SAFE_INTEGER + 1), zero()), -1);
  assert.equal(compare(zero(), bigNum(1, Number.MAX_SAFE_INTEGER - 1)), -1);
});

test("BigNum arithmetic preserves exact identities, cancellation, and precision boundaries", () => {
  expectBigNum(add(bigNum(1.2, 3), bigNum(3.4, 3)), 4.6, 3);
  expectBigNum(subtract(bigNum(1.2, 3), bigNum(3.4, 3)), -2.2, 3);
  expectBigNum(multiply(bigNum(2, 4), bigNum(-3, 2)), -6, 6);
  expectBigNum(divide(bigNum(6, 6), bigNum(-3, 2)), -2, 4);
  expectBigNum(multiplyByNumber(bigNum(2, 3), 2.5), 5, 3);
  expectBigNum(divideByNumber(bigNum(5, 3), 2.5), 2, 3);
  expectBigNum(sum([]), 0, 0);
  expectBigNum(sum([bigNum(1, 0), bigNum(2, 0), bigNum(-3, 0)]), 0, 0);
  expectBigNum(add(bigNum(1, 20), bigNum(9, 4)), 1, 20);
  expectBigNum(add(bigNum(1, 20), bigNum(9, 5)), 1.000000000000009, 20);
  expectBigNum(subtract(bigNum(1, 30), bigNum(1, 30)), 0, 0);
  expectBigNum(subtract(bigNum(1.000000000000001, 30), bigNum(1, 30)), 1.1102230246251565, 15);
  assert.throws(() => divide(one(), zero()));
  assert.throws(() => multiplyByNumber(one(), Number.NaN));
  assert.throws(() => divideByNumber(one(), 0));
  assert.throws(() => multiply(bigNum(1, Number.MAX_SAFE_INTEGER), bigNum(1, 1)));
  assert.throws(() => divide(bigNum(1, Number.MIN_SAFE_INTEGER), bigNum(1, 1)));
});

test("BigNum safe-gap arithmetic never subtracts unsafe exponent gaps", () => {
  const maximum = bigNum(2, Number.MAX_SAFE_INTEGER - 1);
  const minimum = bigNum(3, Number.MIN_SAFE_INTEGER + 1);
  assert.deepEqual(fields(add(maximum, minimum)), fields(maximum));
  assert.deepEqual(fields(add(minimum, maximum)), fields(maximum));
  const negativeMaximum = bigNum(-2, Number.MAX_SAFE_INTEGER - 1);
  assert.deepEqual(fields(add(negativeMaximum, minimum)), fields(negativeMaximum));
});

test("BigNum powers cover domain, parity, fractional, and safe exponent boundary behavior", () => {
  expectBigNum(pow(bigNum(2, 3), 0), 1, 0);
  expectBigNum(pow(zero(), 2), 0, 0);
  expectBigNum(pow(bigNum(-2, 1), 3), -8, 3);
  expectBigNum(pow(bigNum(-2, 1), 2), 4, 2);
  expectBigNum(pow(bigNum(9, 2), -1), 1.111111111111111, -3);
  const squareRootMantissa = 3 * Math.sqrt(10);
  const positiveExtremeRoot = pow(bigNum(9, Number.MAX_SAFE_INTEGER), 0.5);
  const negativeExtremeRoot = pow(bigNum(9, Number.MIN_SAFE_INTEGER), 0.5);
  assert.equal(positiveExtremeRoot.exponent, 4_503_599_627_370_495);
  expectRelative(positiveExtremeRoot.mantissa, squareRootMantissa, 1e-14);
  assert.equal(negativeExtremeRoot.exponent, -4_503_599_627_370_496);
  expectRelative(negativeExtremeRoot.mantissa, squareRootMantissa, 1e-14);
  assert.throws(() => pow(zero(), 0));
  assert.throws(() => pow(zero(), -1));
  assert.throws(() => pow(bigNum(-2, 0), 0.5));
  assert.throws(() => pow(bigNum(-2, 0), Number.MAX_SAFE_INTEGER + 2));
  assert.throws(() => pow(one(), Number.NaN));
  assert.throws(() => pow(bigNum(9, Number.MAX_SAFE_INTEGER), 2));
});

test("BigNum conversion and logarithm cover clamps, overflow, and signed underflow", () => {
  assert.equal(log10(bigNum(1, 3)), 3);
  assert.throws(() => log10(zero()));
  assert.equal(toNumber(bigNum(1, 400)), Infinity);
  assert.equal(toNumber(bigNum(-1, 400)), -Infinity);
  assert.equal(toNumber(bigNum(1, -400)), 0);
  assert.equal(Object.is(toNumber(bigNum(-1, -400)), -0), true);
  assert.equal(toNumberClamped(bigNum(5, 3), 100), 100);
  assert.equal(toNumberClamped(bigNum(-5, 3), 100), -100);
  assert.equal(toNumberClamped(bigNum(5, 3), 0), 0);
  assert.equal(Object.is(toNumberClamped(bigNum(-1, -400), 1), -0), true);
  assert.throws(() => toNumberClamped(one(), -1));
  assert.throws(() => toNumberClamped(one(), Number.POSITIVE_INFINITY));
});

test("BigNum relative tolerance works across finite, tiny, and huge scales", () => {
  assert.equal(approximatelyEquals(one(), one(), 0), true);
  assert.equal(approximatelyEquals(one(), bigNum(1.1, 0), 0), false);
  assert.equal(approximatelyEquals(one(), negate(one()), Number.MAX_VALUE), false);
  assert.equal(approximatelyEquals(zero(), one(), 1), true);
  assert.equal(approximatelyEquals(zero(), one(), 0.5), false);
  assert.equal(
    approximatelyEquals(
      bigNum(1, Number.MAX_SAFE_INTEGER),
      bigNum(9, Number.MAX_SAFE_INTEGER),
      Number.MAX_VALUE,
    ),
    true,
  );
  assert.equal(
    approximatelyEquals(
      bigNum(1, Number.MAX_SAFE_INTEGER),
      bigNum(9, Number.MAX_SAFE_INTEGER),
      0.5,
    ),
    false,
  );
  assert.equal(
    approximatelyEquals(
      bigNum(1, Number.MIN_SAFE_INTEGER),
      bigNum(9, Number.MIN_SAFE_INTEGER),
      0.5,
    ),
    false,
  );
  assert.equal(approximatelyEquals(bigNum(1, 10), bigNum(1.0000000000005, 10), 1e-12), true);
  assert.throws(() => approximatelyEquals(one(), one(), -1));
  assert.throws(() => approximatelyEquals(one(), one(), Number.NaN));
});

test("illion names use CGW forms and exactly one product spelling override", () => {
  const lowNames = [
    "million",
    "billion",
    "trillion",
    "quadrillion",
    "quintillion",
    "sextillion",
    "septillion",
    "octillion",
    "nonillion",
  ];
  for (let ordinal = 1; ordinal <= lowNames.length; ordinal += 1) {
    assert.equal(illionNameForGroup(ordinal + 1), lowNames[ordinal - 1]);
  }
  const vectors = new Map([
    [23, "tresvigintillion"],
    [36, "sestrigintillion"],
    [86, "sexoctogintillion"],
    [17, "septendecillion"],
    [19, "novendecillion"],
    [29, "novemvigintillion"],
    [303, "trestrecentillion"],
    [806, "sexoctingentillion"],
    [807, "septemoctingentillion"],
    [123, "tresviginticentillion"],
    [333, "trestrigintatrecentillion"],
    [999, "novenonagintanongentillion"],
    [1000, "millinillion"],
  ]);
  for (const [ordinal, name] of vectors) {
    assert.equal(illionNameForGroup(ordinal + 1), name);
  }
  const authenticOrdinalTwentySeven = ["septe", "m", "vigint", "illion"].join("");
  assert.equal(authenticOrdinalTwentySeven, "septemvigintillion");
  assert.equal(illionNameForGroup(28), "septenvigintillion");
  assert.notEqual(illionNameForGroup(28), authenticOrdinalTwentySeven);
  assert.equal(illionNameForGroup(29), "octovigintillion");
  assert.equal(illionNameForGroup(1002), undefined);
  assert.equal(illionNameForGroup(1), undefined);
  assert.throws(() => illionNameForGroup(-1));
});

test("BigNum suffixes and format rendering cover named checkpoints and fallbacks", () => {
  assert.deepEqual(
    Array.from({ length: 12 }, (_value, group) => shortSuffixForGroup(group)),
    ["", "K", "M", "B", "T", "Qa", "Qi", "Sx", "Sp", "Oc", "No", "Dc"],
  );
  assert.equal(shortSuffixForGroup(12), undefined);
  assert.throws(() => shortSuffixForGroup(1.5));
  assert.equal(formatBigNum(bigNum(1, 2), "short", 2), "100.00");
  assert.equal(formatBigNum(bigNum(1, 3), "short", 0), "1 K");
  assert.equal(formatBigNum(bigNum(1, 33), "full", 0), "1 decillion");
  assert.equal(formatBigNum(bigNum(1, 84), "full", 0), "1 septenvigintillion");
  assert.equal(formatBigNum(bigNum(1, 303), "full", 0), "1 centillion");
  assert.equal(formatBigNum(bigNum(1, 3000), "full", 0), "1 novenonagintanongentillion");
  assert.equal(formatBigNum(bigNum(1, 3003), "full", 0), "1 millinillion");
  assert.equal(formatBigNum(bigNum(9.99999, 5), "short", 2), "1.00 M");
  assert.equal(formatBigNum(bigNum(9.99999, 35), "short", 2), "1.00e36");
  assert.equal(formatBigNum(bigNum(1, 36), "short", 2), "1.00e36");
  assert.equal(formatBigNum(bigNum(1, 3006), "full", 2), "1.00e3006");
  assert.equal(formatBigNum(bigNum(-1.2, 3), "short", 2), "-1.20 K");
  assert.equal(formatBigNum(bigNum(1.2, 0), "short", 0), "1");
  assert.equal(formatBigNum(one(), "full", 6), "1.000000");
  assert.throws(() => formatBigNum(one(), "short", 7));
});

test("formatQuantity has fixed precision and exact singular handling", () => {
  assert.equal(formatQuantity(one(), "full", 0, "cell", "cells"), "1 cell");
  assert.equal(formatQuantity(negate(one()), "full", 0, "cell", "cells"), "-1 cell");
  assert.equal(formatQuantity(zero(), "short", 2, "cell", "cells"), "0.00 cells");
  assert.equal(formatQuantity(bigNum(2, 0), "short", 0, "cell", "cells"), "2 cells");
});

test("representative prestige-shaped fixture is monotonic using public BigNum operations", () => {
  const prestige = (cells) => pow(add(one(), cells), 0.5);
  const fixtures = [zero(), bigNum(1, 3), bigNum(1, 6), bigNum(1, 12)];
  for (let index = 1; index < fixtures.length; index += 1) {
    assert.equal(compare(prestige(fixtures[index - 1]), prestige(fixtures[index])) < 0, true);
  }
});
