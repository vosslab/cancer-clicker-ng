import assert from "node:assert/strict";
import test from "node:test";

import { producerId } from "../src/brands.ts";
import { producerDetailMetrics } from "../src/render/producer_detail_metrics.ts";
import { createInitialGameState } from "../src/state/game_state.ts";

test("producer detail facts expose one-unit, fleet, share, and context rates from live production", () => {
  const initial = createInitialGameState();
  const cyclin = producerId("producer");
  assert.deepEqual(producerDetailMetrics(initial, cyclin), {
    owned: 0,
    unitOutput: "1 cell / 10 s",
    fleetOutput: "0 cells/s",
    automaticGrowthShare: "0.0%",
    catalogRate: "100.0%",
  });

  const productive = {
    ...initial,
    producerLevels: initial.producerLevels.map((level) =>
      level.id === cyclin
        ? { ...level, level: 4 }
        : level.id === producerId("cdk4")
          ? { ...level, level: 2 }
          : level,
    ),
  };
  assert.deepEqual(producerDetailMetrics(productive, cyclin), {
    owned: 4,
    unitOutput: "1 cell / 10 s",
    fleetOutput: "1 cell / 2.5 s",
    automaticGrowthShare: "33.3%",
    catalogRate: "100.0%",
  });
});
