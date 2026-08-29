import assert from "node:assert/strict";
import test from "node:test";

import { bigNum } from "../src/brands.ts";
import {
  formatCellInventory,
  formatCellRate,
  nextCellProgress,
} from "../src/render/cell_metrics.ts";

test("cell inventory stays whole while partial growth remains explicit", () => {
  assert.equal(formatCellInventory(bigNum(601, -2), "short"), "6 cells");
  assert.equal(nextCellProgress(bigNum(601, -2)), 1);
  assert.equal(formatCellInventory(bigNum(1, 0), "short"), "1 cell");
  assert.equal(nextCellProgress(bigNum(1, 0)), 0);
  assert.equal(formatCellInventory(bigNum(123, 3), "short"), "123.00 K cells");
  assert.equal(nextCellProgress(bigNum(123, 3)), undefined);
});

test("sub-one production uses time per cell instead of fractional cell objects", () => {
  assert.equal(formatCellRate(bigNum(0, 0), "short"), "0 cells/s");
  assert.equal(formatCellRate(bigNum(1, -2), "short"), "1 cell / 100 s");
  assert.equal(formatCellRate(bigNum(1, -1), "short"), "1 cell / 10 s");
  assert.equal(formatCellRate(bigNum(4, -1), "short"), "1 cell / 2.5 s");
  assert.equal(formatCellRate(bigNum(15, -1), "short"), "1.50 cells/s");
});
