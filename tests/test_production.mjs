import assert from "node:assert/strict";
import test from "node:test";

import { bigNum, hallmarkId, regionId } from "../src/brands.ts";
import { equals, subtract, sum, zero } from "../src/bignum/bignum.ts";
import {
  cellProductionRate,
  producerCellProductionRate,
  producerCellProductionRates,
} from "../src/economy/production.ts";
import { STAGE_ONE_PRODUCERS } from "../src/economy/producers.ts";
import { economyTick } from "../src/economy/tick.ts";
import { createInitialGameState } from "../src/state/game_state.ts";

function productiveState(overrides = {}) {
  const state = createInitialGameState();
  return {
    ...state,
    cells: bigNum(0, 0),
    producerLevels: STAGE_ONE_PRODUCERS.map((producer, index) => ({
      id: producer.id,
      level: index + 1,
    })),
    ...overrides,
  };
}

test("production statistics expose the same per-producer contributions that a tick earns", () => {
  const state = productiveState();
  const contributions = producerCellProductionRates(state);
  const total = cellProductionRate(state);
  const oneSecond = economyTick(state, 1_000, "live");
  const earned = subtract(oneSecond.resourceSnapshot.cells, state.cells);

  assert.ok(equals(total, sum(contributions.map((entry) => entry.cellsPerSecond))));
  assert.ok(equals(total, earned));
  for (const contribution of contributions) {
    assert.ok(
      equals(
        contribution.cellsPerSecond,
        producerCellProductionRate(state, contribution.producerId),
      ),
    );
  }
});

test("replicative exhaustion suppresses both producer contributions and their total", () => {
  const exhausted = productiveState({
    hallmarkLevels: [{ id: hallmarkId("replicative_immortality"), level: 1 }],
    reserveFloor: 0,
    regions: [
      {
        id: regionId("exhausted-rim"),
        capacity: 1,
        viability: 1,
        phenotype: "proliferative",
        vesselLinkIds: [],
        routeIds: [],
      },
    ],
    telomereReserveByRegion: { "exhausted-rim": 0 },
  });
  const contributions = producerCellProductionRates(exhausted);

  assert.ok(equals(cellProductionRate(exhausted), zero()));
  for (const contribution of contributions) assert.ok(equals(contribution.cellsPerSecond, zero()));
});
