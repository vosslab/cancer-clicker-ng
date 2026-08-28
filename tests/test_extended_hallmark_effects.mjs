import assert from "node:assert/strict";
import test from "node:test";

import { bigNum, hallmarkId, mutationId, regionId, stageId } from "../src/brands.ts";
import { quoteProducerPurchase } from "../src/economy/costs.ts";
import { economyTick } from "../src/economy/tick.ts";
import {
  effectiveExtendedHallmarkPressures,
  extendedHallmarkRegionalProducerModifier,
} from "../src/hallmarks/extended_hallmark_effects.ts";
import { INFLAMMATION_DURATION_MS } from "../src/hallmarks/inflammation_timeline.ts";
import { createMutationOffer } from "../src/hallmarks/mutation_offer_generator.ts";
import { createInitialGameState } from "../src/state/game_state.ts";
import { recordEvent } from "../src/state/events.ts";

function region(name, linked = true) {
  return {
    id: regionId(name),
    capacity: 4,
    viability: 1,
    phenotype: "proliferative",
    vesselLinkIds: linked ? ["vessel:authoritative"] : [],
    routeIds: [],
  };
}

function state(overrides = {}) {
  return {
    ...createInitialGameState(),
    currentStage: stageId("angiogenic_primary"),
    cells: bigNum(1, 8),
    substrate: bigNum(8, 0),
    atp: bigNum(4, 0),
    deterministicSeed: 9,
    hallmarkLevels: [
      { id: hallmarkId("immune_destruction_avoidance"), level: 1 },
      { id: hallmarkId("tumor_promoting_inflammation"), level: 1 },
      { id: hallmarkId("genome_instability_mutation"), level: 1 },
      { id: hallmarkId("metabolic_deregulation"), level: 1 },
    ],
    regions: [region("affected"), region("unaffected", false)],
    concealmentTokens: 1,
    ...overrides,
  };
}

test("extended-hallmark region-local mask and inflammation produce weighted nonuniform quote/rate effects", () => {
  const before = state();
  const masked = recordEvent(before, {
    type: "set-region-mask",
    regionId: regionId("affected"),
    masked: true,
    atMs: 0,
  });
  const mycBefore = quoteProducerPurchase(before, "myc", 1).debit;
  const mycMasked = quoteProducerPurchase(masked, "myc", 1).debit;
  const egfrBefore = quoteProducerPurchase(before, "egfr", 1).debit;
  const egfrMasked = quoteProducerPurchase(masked, "egfr", 1).debit;
  assert.notDeepEqual(mycBefore, mycMasked);
  assert.notDeepEqual(egfrBefore, egfrMasked);
  assert.notEqual(
    extendedHallmarkRegionalProducerModifier(masked, "myc"),
    extendedHallmarkRegionalProducerModifier(masked, "egfr"),
  );
  const active = {
    ...before,
    inflammationEpisodes: [
      {
        id: "inflammation:active",
        regionId: regionId("affected"),
        deadlineMs: INFLAMMATION_DURATION_MS,
      },
    ],
    regionalInflammation: { affected: 1 },
  };
  assert.ok(
    extendedHallmarkRegionalProducerModifier(active, "egfr") >
      extendedHallmarkRegionalProducerModifier(before, "egfr"),
  );
  assert.equal(
    extendedHallmarkRegionalProducerModifier(
      { ...active, activeTimeMs: INFLAMMATION_DURATION_MS },
      "egfr",
    ),
    1,
  );
});

test("extended-hallmark selected card descriptors reach conversion, pressure, and route mechanics", () => {
  const glycolytic = { ...state(), chosenMutations: [mutationId("glycolytic_shift")] };
  const converted = recordEvent(glycolytic, {
    type: "convert-substrate",
    amount: { mantissa: 4, exponent: 0 },
    atMs: 0,
  });
  assert.equal(converted.atp.mantissa, 9);
  const invasive = { ...state(), chosenMutations: [mutationId("invasive_clone")] };
  assert.equal(effectiveExtendedHallmarkPressures(invasive).damage, 1);
  assert.equal(
    economyTick(invasive, 1_000, "live").extendedHallmarkProjection?.routeDiscoveryProgress,
    1,
  );
  const antigen = {
    ...state({ concealmentTokens: 0 }),
    chosenMutations: [mutationId("antigen_loss")],
  };
  const concealed = recordEvent(antigen, {
    type: "set-region-mask",
    regionId: regionId("affected"),
    masked: true,
    atMs: 0,
  });
  assert.equal(concealed.concealmentTokens, 0);
  assert.equal(effectiveExtendedHallmarkPressures(concealed).immune, 0);
});

test("a generated repair-bypass selection changes the real MYC purchase quote", () => {
  const before = state({
    deterministicSeed: 0,
    eventSequence: 0,
    atp: bigNum(2, 0),
    atpSinks: ["mutation-drafting"],
    atpBudget: { "mutation-drafting": 25 },
  });
  const offer = createMutationOffer({
    deterministicSeed: before.deterministicSeed,
    eventSequence: before.eventSequence,
    currentStage: before.currentStage,
    genomeBurden: before.genomeBurden,
  });
  const selected = recordEvent(
    { ...before, mutationOffers: [offer] },
    {
      type: "select-mutation",
      offerId: offer.id,
      mutationId: "repair_bypass",
      atMs: before.activeTimeMs,
    },
  );
  assert.deepEqual(selected.chosenMutations, ["repair_bypass"]);
  assert.notDeepEqual(
    quoteProducerPurchase(before, "myc", 1).debit,
    quoteProducerPurchase(selected, "myc", 1).debit,
  );
});
