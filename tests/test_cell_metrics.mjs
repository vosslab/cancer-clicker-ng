import assert from "node:assert/strict";
import test from "node:test";

import { bigNum } from "../src/brands.ts";
import {
  formatCellInventory,
  formatCellRate,
  formatCompactCellInventory,
  formatCompactCellRate,
} from "../src/render/cell_metrics.ts";

test("cell inventory stays whole even while internal economy values are fractional", () => {
  assert.equal(formatCellInventory(bigNum(601, -2), "short"), "6 cells");
  assert.equal(formatCellInventory(bigNum(1, 0), "short"), "1 cell");
  assert.equal(formatCellInventory(bigNum(123, 3), "short"), "123.0 K cells");
});

test("compact rack metrics retain the price and rate magnitude without repeating cells", () => {
  assert.equal(formatCompactCellInventory(bigNum(123, 3), "short"), "123.0 K");
  assert.equal(formatCompactCellRate(bigNum(1, -1), "short"), "1/10 s");
  assert.equal(formatCompactCellRate(bigNum(15, -1), "short"), "1.5/s");
});

test("sub-one production uses time per cell instead of fractional cell objects", () => {
  assert.equal(formatCellRate(bigNum(0, 0), "short"), "0 cells/s");
  assert.equal(formatCellRate(bigNum(1, -2), "short"), "1 cell / 100 s");
  assert.equal(formatCellRate(bigNum(1, -1), "short"), "1 cell / 10 s");
  assert.equal(formatCellRate(bigNum(4, -1), "short"), "1 cell / 2.5 s");
  assert.equal(formatCellRate(bigNum(15, -1), "short"), "1.5 cells/s");
});
