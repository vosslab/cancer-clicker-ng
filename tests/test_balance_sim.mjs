import assert from "node:assert/strict";
import test from "node:test";

import { selectVisibleAction } from "../tools/balance_sim.mjs";

function visibleAction(id, kind, effectTags, displayedCost, displayedBenefit = undefined) {
  return { id, kind, effectTags, displayedCost, displayedBenefit };
}

const KINDS = new Set(["divide", "producer", "hallmark", "stage", "prestige", "network"]);
const SURFACE = {
  actions: [
    visibleAction("divide", "divide", [], undefined),
    visibleAction("producer", "producer", ["producer"], { resource: "cells", value: 25 }),
    visibleAction("hallmark", "hallmark", ["hallmark"], undefined),
    visibleAction("stage", "stage", ["stage"], undefined),
    visibleAction("network", "network", ["network"], undefined),
  ],
};

test("canonical balance policies select their declared visible priorities", () => {
  const selected = {
    payback: selectVisibleAction("greedy-payback", SURFACE, KINDS, 0)?.id,
    cheapest: selectVisibleAction("naive-cheapest", SURFACE, KINDS, 0)?.id,
    hallmark: selectVisibleAction("hallmark-first", SURFACE, KINDS, 0)?.id,
    prestige: selectVisibleAction("prestige-rush", SURFACE, KINDS, 0)?.id,
  };

  assert.deepEqual(selected, {
    payback: "producer",
    cheapest: "divide",
    hallmark: "hallmark",
    prestige: "stage",
  });
});

test("check-in idle only acts on its deterministic check windows", () => {
  const check = selectVisibleAction("check-in-idle", SURFACE, KINDS, 0);
  const idle = selectVisibleAction("check-in-idle", SURFACE, KINDS, 1);

  assert.equal(check?.id, "network");
  assert.equal(idle, undefined);
});

test("greedy payback and naive cheapest diverge on disclosed producer benefits", () => {
  const producerKinds = new Set(["producer"]);
  const producerSurface = {
    actions: [
      visibleAction(
        "cheap-slow",
        "producer",
        ["producer"],
        { resource: "cells", value: { mantissa: 10, exponent: 0 } },
        { metric: "cells-per-second", value: { mantissa: 1, exponent: 0 } },
      ),
      visibleAction(
        "costly-fast",
        "producer",
        ["producer"],
        { resource: "cells", value: { mantissa: 20, exponent: 0 } },
        { metric: "cells-per-second", value: { mantissa: 20, exponent: 0 } },
      ),
    ],
  };

  assert.equal(
    selectVisibleAction("greedy-payback", producerSurface, producerKinds, 0)?.id,
    "costly-fast",
  );
  assert.equal(
    selectVisibleAction("naive-cheapest", producerSurface, producerKinds, 0)?.id,
    "cheap-slow",
  );
});
