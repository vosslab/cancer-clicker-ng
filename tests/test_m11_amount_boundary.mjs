import assert from "node:assert/strict";
import test from "node:test";
import { parseRuntimeEvent } from "../src/state/event_parse.ts";

function conversionRecord(amount) {
  return { type: "convert-substrate", amount, atMs: 0 };
}

test("M11 raw conversion parser rejects hostile BigNum DTO ownership before reducer dispatch", () => {
  const nonEnumerableExtra = { mantissa: 2, exponent: 3 };
  Object.defineProperty(nonEnumerableExtra, "hidden", { value: true });
  const symbolExtra = { mantissa: 2, exponent: 3, [Symbol("hidden")]: true };
  const accessor = { exponent: 3 };
  Object.defineProperty(accessor, "mantissa", { enumerable: true, get: () => 2 });
  const nullPrototype = Object.assign(Object.create(null), { mantissa: 2, exponent: 3 });
  const customPrototype = Object.assign(Object.create({}), { mantissa: 2, exponent: 3 });
  for (const amount of [
    nonEnumerableExtra,
    symbolExtra,
    accessor,
    nullPrototype,
    customPrototype,
    { mantissa: 20, exponent: 2 },
    { mantissa: Number.NaN, exponent: 0 },
    { mantissa: 2, exponent: Number.POSITIVE_INFINITY },
    { mantissa: 2, exponent: Number.MAX_SAFE_INTEGER + 1 },
  ])
    assert.throws(() => parseRuntimeEvent(conversionRecord(amount)), /Conversion amount/);
});
