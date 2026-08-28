import assert from "node:assert/strict";
import test from "node:test";

import { multiplyByNumber } from "../src/bignum/bignum.ts";
import { bigNum, hallmarkId, regionId, stageId } from "../src/brands.ts";
import { quoteProducerPurchase } from "../src/economy/costs.ts";
import { economyTick } from "../src/economy/tick.ts";
import {
  effectiveM11Pressures,
  m11ConversionYieldMultiplier,
  m11MaskTokenCost,
  m11MutationProducerModifier,
  m11RegionalProducerModifier,
  m11RouteDiscoveryGainPerSecond,
} from "../src/hallmarks/m11_authoritative_effects.ts";
import { createInitialGameState } from "../src/state/game_state.ts";
import { recordEvent } from "../src/state/events.ts";

function region(name, linked = true) {
  return {
    id: regionId(name),
    capacity: 5,
    viability: 1,
    phenotype: "proliferative",
    vesselLinkIds: linked ? ["vessel:all-four"] : [],
    routeIds: [],
  };
}

function baseline(seed = 1) {
  return {
    ...createInitialGameState(),
    currentStage: stageId("angiogenic_primary"),
    cells: bigNum(1, 9),
    substrate: bigNum(8, 0),
    atp: bigNum(5, 0),
    deterministicSeed: seed,
    concealmentTokens: 1,
    atpSinks: ["mutation-drafting"],
    atpBudget: { "mutation-drafting": 25 },
    hallmarkLevels: [
      { id: hallmarkId("metabolic_deregulation"), level: 1 },
      { id: hallmarkId("immune_destruction_avoidance"), level: 1 },
      { id: hallmarkId("tumor_promoting_inflammation"), level: 1 },
      { id: hallmarkId("genome_instability_mutation"), level: 1 },
    ],
    regions: [region("affected"), region("control", false)],
  };
}

function drafted(seed) {
  const state = baseline(seed);
  const result = economyTick(state, 1_000, "live");
  assert.ok(result.m11Projection, "real tick must create the deterministic offer");
  const projected = {
    ...state,
    ...result.resourceSnapshot,
    ...result.m11Projection,
    activeTimeMs: 1_000,
  };
  const offer = projected.mutationOffers[0];
  assert.ok(offer);
  return { projected, offer };
}

const ORDER_CANDIDATES = ["producer", "cdk4", "myc", "ras", "egfr", "pi3k"];

/** The sole order oracle consumes real quote/debit candidates, not catalog metadata. */
function candidateOrder(candidates) {
  return candidates
    .sort((left, right) => {
      const leftExponent = left.debit.exponent;
      const rightExponent = right.debit.exponent;
      if (leftExponent !== rightExponent) return leftExponent - rightExponent;
      return left.debit.mantissa - right.debit.mantissa;
    })
    .map((candidate) => candidate.id);
}

function changedDecision(before, after) {
  return before.some((id, index) => after[index] !== id);
}

function quoteCandidates(state) {
  return ORDER_CANDIDATES.map((id) => ({ id, debit: quoteProducerPurchase(state, id, 1).debit }));
}

function uniformlyScaledOrder(state, scalar) {
  return ORDER_CANDIDATES.map((id) => ({
    id,
    debit: multiplyByNumber(quoteProducerPurchase(state, id, 1).debit, scalar),
  }))
    .sort((left, right) => {
      if (left.debit.exponent !== right.debit.exponent)
        return left.debit.exponent - right.debit.exponent;
      return left.debit.mantissa - right.debit.mantissa;
    })
    .map((candidate) => candidate.id);
}

test("M11 all four branches alter authoritative event-funnel decisions, not catalog labels", () => {
  const before = baseline();
  const beforeQuotes = quoteCandidates(before);
  const beforeOrder = candidateOrder(beforeQuotes);
  assert.equal(changedDecision(beforeOrder, candidateOrder(beforeQuotes)), false);
  assert.equal(changedDecision(beforeOrder, uniformlyScaledOrder(before, 1.1)), false);
  const converted = recordEvent(before, {
    type: "convert-substrate",
    amount: { mantissa: 4, exponent: 0 },
    atMs: 0,
  });
  assert.equal(
    changedDecision(
      candidateOrder([
        { id: "atp", debit: before.atp },
        { id: "substrate", debit: before.substrate },
      ]),
      candidateOrder([
        { id: "atp", debit: converted.atp },
        { id: "substrate", debit: converted.substrate },
      ]),
    ),
    true,
  );
  assert.equal(converted.atp.mantissa, 9, "metabolism changes real ATP debit availability");

  const masked = recordEvent(before, {
    type: "set-region-mask",
    regionId: regionId("affected"),
    masked: true,
    atMs: 0,
  });
  assert.equal(
    changedDecision(
      candidateOrder([
        { id: "myc", debit: { mantissa: m11RegionalProducerModifier(before, "myc"), exponent: 0 } },
        {
          id: "egfr",
          debit: { mantissa: m11RegionalProducerModifier(before, "egfr"), exponent: 0 },
        },
      ]),
      candidateOrder([
        { id: "myc", debit: { mantissa: m11RegionalProducerModifier(masked, "myc"), exponent: 0 } },
        {
          id: "egfr",
          debit: { mantissa: m11RegionalProducerModifier(masked, "egfr"), exponent: 0 },
        },
      ]),
    ),
    true,
  );
  assert.notDeepEqual(
    quoteProducerPurchase(before, "egfr", 1).debit,
    quoteProducerPurchase(masked, "egfr", 1).debit,
  );

  const inflamed = recordEvent(before, {
    type: "activate-inflammation",
    regionId: regionId("affected"),
    atMs: 0,
  });
  assert.equal(
    changedDecision(
      candidateOrder([
        {
          id: "egfr",
          debit: { mantissa: m11RegionalProducerModifier(before, "egfr"), exponent: 0 },
        },
        { id: "myc", debit: { mantissa: m11RegionalProducerModifier(before, "myc"), exponent: 0 } },
      ]),
      candidateOrder([
        {
          id: "egfr",
          debit: { mantissa: m11RegionalProducerModifier(inflamed, "egfr"), exponent: 0 },
        },
        {
          id: "myc",
          debit: { mantissa: m11RegionalProducerModifier(inflamed, "myc"), exponent: 0 },
        },
      ]),
    ),
    true,
  );
  assert.notDeepEqual(
    quoteProducerPurchase(before, "myc", 1).debit,
    quoteProducerPurchase(inflamed, "myc", 1).debit,
  );
  const expired = { ...inflamed, activeTimeMs: inflamed.inflammationEpisodes[0].deadlineMs };
  assert.deepEqual(
    quoteProducerPurchase(before, "myc", 1).debit,
    quoteProducerPurchase(expired, "myc", 1).debit,
  );

  const selectedIds = new Set();
  for (let seed = 0; seed < 32 && selectedIds.size < 4; seed += 1) {
    const { projected, offer } = drafted(seed);
    for (const card of offer.cards) {
      if (selectedIds.has(card.id)) continue;
      const selected = recordEvent(projected, {
        type: "select-mutation",
        offerId: offer.id,
        mutationId: card.id,
        atMs: 1_000,
      });
      selectedIds.add(card.id);
      if (card.id === "repair_bypass") {
        assert.equal(
          changedDecision(
            candidateOrder([
              {
                id: "myc",
                debit: {
                  mantissa: m11MutationProducerModifier(projected, "myc").rate,
                  exponent: 0,
                },
              },
              {
                id: "egfr",
                debit: {
                  mantissa: m11MutationProducerModifier(projected, "egfr").rate,
                  exponent: 0,
                },
              },
            ]),
            candidateOrder([
              {
                id: "myc",
                debit: { mantissa: m11MutationProducerModifier(selected, "myc").rate, exponent: 0 },
              },
              {
                id: "egfr",
                debit: {
                  mantissa: m11MutationProducerModifier(selected, "egfr").rate,
                  exponent: 0,
                },
              },
            ]),
          ),
          true,
        );
        assert.equal(
          changedDecision(
            candidateOrder(quoteCandidates(projected)),
            uniformlyScaledOrder(projected, 0.9),
          ),
          false,
        );
      }
      if (card.id === "glycolytic_shift") {
        assert.equal(
          changedDecision(
            candidateOrder([
              {
                id: "yield",
                debit: { mantissa: m11ConversionYieldMultiplier(projected), exponent: 0 },
              },
              {
                id: "damage",
                debit: { mantissa: effectiveM11Pressures(projected).damage, exponent: 0 },
              },
              {
                id: "immune",
                debit: { mantissa: effectiveM11Pressures(projected).immune, exponent: 0 },
              },
            ]),
            candidateOrder([
              {
                id: "yield",
                debit: { mantissa: m11ConversionYieldMultiplier(selected), exponent: 0 },
              },
              {
                id: "damage",
                debit: { mantissa: effectiveM11Pressures(selected).damage, exponent: 0 },
              },
              {
                id: "immune",
                debit: { mantissa: effectiveM11Pressures(selected).immune, exponent: 0 },
              },
            ]),
          ),
          true,
        );
        assert.equal(
          recordEvent(selected, {
            type: "convert-substrate",
            amount: { mantissa: 4, exponent: 0 },
            atMs: 1_000,
          }).atp.mantissa,
          9,
        );
      }
      if (card.id === "antigen_loss") {
        assert.equal(
          changedDecision(
            candidateOrder([
              { id: "mask", debit: { mantissa: m11MaskTokenCost(projected), exponent: 0 } },
              {
                id: "immune",
                debit: { mantissa: effectiveM11Pressures(projected).immune, exponent: 0 },
              },
            ]),
            candidateOrder([
              { id: "mask", debit: { mantissa: m11MaskTokenCost(selected), exponent: 0 } },
              {
                id: "immune",
                debit: { mantissa: effectiveM11Pressures(selected).immune, exponent: 0 },
              },
            ]),
          ),
          true,
        );
        assert.equal(
          recordEvent(
            { ...selected, concealmentTokens: 0 },
            {
              type: "set-region-mask",
              regionId: regionId("affected"),
              masked: true,
              atMs: 1_000,
            },
          ).concealmentTokens,
          0,
        );
      }
      if (card.id === "invasive_clone") {
        assert.equal(
          changedDecision(
            candidateOrder([
              {
                id: "route",
                debit: { mantissa: m11RouteDiscoveryGainPerSecond(projected), exponent: 0 },
              },
              {
                id: "damage",
                debit: { mantissa: effectiveM11Pressures(projected).damage, exponent: 0 },
              },
              {
                id: "immune",
                debit: { mantissa: effectiveM11Pressures(projected).immune, exponent: 0 },
              },
            ]),
            candidateOrder([
              {
                id: "route",
                debit: { mantissa: m11RouteDiscoveryGainPerSecond(selected), exponent: 0 },
              },
              {
                id: "damage",
                debit: { mantissa: effectiveM11Pressures(selected).damage, exponent: 0 },
              },
              {
                id: "immune",
                debit: { mantissa: effectiveM11Pressures(selected).immune, exponent: 0 },
              },
            ]),
          ),
          true,
        );
        assert.equal(economyTick(selected, 1_000, "live").m11Projection?.routeDiscoveryProgress, 1);
      }
    }
  }
  assert.equal(selectedIds.size, 4, "seeded real offers must exercise every closed mutation card");
});
