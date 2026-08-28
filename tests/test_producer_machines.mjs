import assert from "node:assert/strict";
import test from "node:test";

import { STAGE_ONE_PRODUCERS } from "../src/economy/producers.ts";
import { PRODUCER_MACHINE_IDS, describeProducerMachine } from "../src/svg/producer_machines.tsx";

test("every canonical producer has one illustrated molecular-machine identity", () => {
  const catalogIds = STAGE_ONE_PRODUCERS.map((producer) => producer.id).sort();
  const illustratedIds = [...PRODUCER_MACHINE_IDS].sort();

  assert.deepEqual(illustratedIds, catalogIds);
  assert.equal(new Set(illustratedIds).size, STAGE_ONE_PRODUCERS.length);
});

test("machine accumulation is monotonic and saturates at its highest semantic band", () => {
  const producer = STAGE_ONE_PRODUCERS[0];
  assert.ok(producer);

  const models = [0, 1, 10, 50, 500].map((level) => describeProducerMachine(producer.id, level));
  for (let index = 1; index < models.length; index += 1) {
    assert.ok(models[index].moduleCount >= models[index - 1].moduleCount);
    assert.ok(models[index].outputCueCount >= models[index - 1].outputCueCount);
  }
  assert.equal(models.at(-1).moduleCount, models.at(-2).moduleCount);
  assert.equal(models.at(-1).outputCueCount, models.at(-2).outputCueCount);
});
