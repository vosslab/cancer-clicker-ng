import assert from "node:assert/strict";
import test from "node:test";
import { hallmarkId, mutationId, offerId, stageId } from "../src/brands.ts";
import {
  assertAtpSinkCatalog,
  assertExtendedHallmarkCatalog,
  assertMutationDraftCatalog,
  assertMutationDraftOffer,
  ATP_SINK_CATALOG,
  findExtendedHallmark,
  hasReachedExtendedHallmarkUnlock,
  EXTENDED_HALLMARK_CATALOG,
  EXTENDED_HALLMARK_KEYS,
  MUTATION_DRAFT_CARD_CATALOG,
  MUTATION_DRAFT_POOL_ID,
  MUTATION_DRAFT_OFFER_THRESHOLDS,
} from "../src/hallmarks/extended_hallmark_catalog.ts";
import {
  EXTENDED_HALLMARK_OPERATIONS_MATCH_BRANCH_CONTRACTS,
  parsePositiveCanonicalBigNumDto,
} from "../src/hallmarks/extended_hallmark_types.ts";
import { STAGE_IDS } from "../src/state/catalog.ts";
import { stageDefinition } from "../src/stages/catalog.ts";

const EXPECTED = [
  ["metabolic_deregulation", "energy-budgeting", "apply-metabolic-conversion", "convert-substrate"],
  [
    "immune_destruction_avoidance",
    "visibility-management",
    "apply-immune-visibility",
    "set-region-mask",
  ],
  [
    "tumor_promoting_inflammation",
    "event-cultivation",
    "apply-inflammation-episode",
    "activate-inflammation",
  ],
  [
    "genome_instability_mutation",
    "mutation-drafting",
    "apply-mutation-selection",
    "select-mutation",
  ],
];

test("extended-hallmark catalog exactly covers four distinct 2011 mechanics, handlers, and operations", () => {
  assert.deepEqual(
    EXTENDED_HALLMARK_KEYS,
    EXPECTED.map(([key]) => key),
  );
  assert.deepEqual(
    EXTENDED_HALLMARK_CATALOG.map((definition) => [
      definition.key,
      definition.mechanicClass,
      definition.handlerId,
      definition.operationType,
    ]),
    EXPECTED,
  );
  assert.equal(new Set(EXTENDED_HALLMARK_CATALOG.map((definition) => definition.id)).size, 4);
  assert.equal(
    new Set(EXTENDED_HALLMARK_CATALOG.map((definition) => definition.mechanicClass)).size,
    4,
  );
  assert.equal(
    new Set(EXTENDED_HALLMARK_CATALOG.map((definition) => definition.handlerId)).size,
    4,
  );
  assert.equal(
    new Set(EXTENDED_HALLMARK_CATALOG.map((definition) => definition.operationType)).size,
    4,
  );
  assert.equal(EXTENDED_HALLMARK_OPERATIONS_MATCH_BRANCH_CONTRACTS, true);
  assertExtendedHallmarkCatalog();
});

test("extended-hallmark unlocks use declared stage capabilities and no local stage literals", () => {
  for (const definition of EXTENDED_HALLMARK_CATALOG) {
    assert.equal(
      stageDefinition(definition.unlock.stageId).operationalChange.actionId,
      definition.unlock.capability,
    );
    assert.equal(hasReachedExtendedHallmarkUnlock(definition.unlock.stageId, definition.key), true);
    const index = STAGE_IDS.indexOf(definition.unlock.stageId);
    assert.ok(index >= 0);
    if (index > 0)
      assert.equal(
        hasReachedExtendedHallmarkUnlock(stageId(STAGE_IDS[index - 1]), definition.key),
        false,
      );
  }
  assert.equal(
    findExtendedHallmark(hallmarkId("metabolic_deregulation"))?.key,
    "metabolic_deregulation",
  );
  assert.equal(findExtendedHallmark(hallmarkId("angiogenesis")), undefined);
});

test("extended-hallmark catalog rejects missing, duplicate, unknown, and mismatched rows", () => {
  const definitions = structuredClone(EXTENDED_HALLMARK_CATALOG);
  assert.throws(() => assertExtendedHallmarkCatalog(definitions.slice(1)), /exactly four/);
  const duplicate = structuredClone(definitions);
  duplicate[1].key = duplicate[0].key;
  assert.throws(() => assertExtendedHallmarkCatalog(duplicate), /unique identities/);
  const unknown = structuredClone(definitions);
  unknown[1].key = "unknown";
  assert.throws(() => assertExtendedHallmarkCatalog(unknown), /canonical branch/);
  const mismatch = structuredClone(definitions);
  mismatch[0].unlock.capability = "route-commitment";
  assert.throws(() => assertExtendedHallmarkCatalog(mismatch), /capability/);
});

test("extended-hallmark ATP sink catalog closes names and finite bounded budgets", () => {
  assert.deepEqual(
    ATP_SINK_CATALOG.map((sink) => sink.id),
    ["acceleration", "vessel-maintenance", "mutation-drafting"],
  );
  assertAtpSinkCatalog();
  const duplicate = structuredClone(ATP_SINK_CATALOG);
  duplicate[1].id = duplicate[0].id;
  assert.throws(() => assertAtpSinkCatalog(duplicate), /unique/);
  const unbounded = structuredClone(ATP_SINK_CATALOG);
  unbounded[0].maximumBudget = Infinity;
  assert.throws(() => assertAtpSinkCatalog(unbounded), /finite and bounded/);
});

test("extended-hallmark mutation catalog and saved three-card snapshot reject invalid composition", () => {
  assertMutationDraftCatalog();
  const duplicate = structuredClone(MUTATION_DRAFT_CARD_CATALOG);
  duplicate[1].id = duplicate[0].id;
  assert.throws(() => assertMutationDraftCatalog(duplicate), /unique/);
  assert.throws(
    () => assertMutationDraftCatalog(MUTATION_DRAFT_CARD_CATALOG.slice(0, 2)),
    /three-card/,
  );
  const offer = {
    id: offerId("extended-hallmark-offer-1"),
    poolId: MUTATION_DRAFT_POOL_ID,
    cards: [
      MUTATION_DRAFT_CARD_CATALOG[0],
      MUTATION_DRAFT_CARD_CATALOG[1],
      MUTATION_DRAFT_CARD_CATALOG[2],
    ],
    sourceSeed: 17,
    sourceSequence: 3,
    sourceStage: stageId("avascular_lesion"),
    threshold: MUTATION_DRAFT_OFFER_THRESHOLDS[0].burden,
  };
  assertMutationDraftOffer(offer);
  assert.throws(
    () =>
      assertMutationDraftOffer({
        ...offer,
        cards: [offer.cards[0], offer.cards[0], offer.cards[2]],
      }),
    /unique/,
  );
  assert.throws(() => assertMutationDraftOffer({ ...offer, poolId: "unknown" }), /pool/);
  assert.throws(
    () =>
      assertMutationDraftOffer({
        ...offer,
        cards: [{ ...offer.cards[0], id: mutationId("unknown") }, offer.cards[1], offer.cards[2]],
      }),
    /unknown/,
  );
  assert.throws(
    () => assertMutationDraftOffer({ ...offer, sourceStage: stageId("unknown_stage") }),
    /provenance/,
  );
});

test("extended-hallmark conversion amount accepts only a positive canonical BigNum DTO", () => {
  assert.deepEqual(parsePositiveCanonicalBigNumDto({ mantissa: 2, exponent: 3 }), {
    mantissa: 2,
    exponent: 3,
  });
  for (const invalid of [
    { mantissa: 20, exponent: 2 },
    { mantissa: 0, exponent: 0 },
    { mantissa: -2, exponent: 3 },
    { mantissa: 2, exponent: 3.5 },
    { mantissa: 2, exponent: 3, extra: true },
    "2e3",
  ])
    assert.throws(
      () => parsePositiveCanonicalBigNumDto(invalid),
      /Conversion amount|positive and canonical/,
    );
});

test("extended-hallmark conversion DTO rejects every own-property and prototype boundary bypass", () => {
  const nonEnumerableExtra = { mantissa: 2, exponent: 3 };
  Object.defineProperty(nonEnumerableExtra, "hidden", { value: true });
  const symbolExtra = { mantissa: 2, exponent: 3, [Symbol("hidden")]: true };
  const accessor = { exponent: 3 };
  Object.defineProperty(accessor, "mantissa", { enumerable: true, get: () => 2 });
  const nonEnumerableField = { exponent: 3 };
  Object.defineProperty(nonEnumerableField, "mantissa", { enumerable: false, value: 2 });
  const nullPrototype = Object.assign(Object.create(null), { mantissa: 2, exponent: 3 });
  const customPrototype = Object.assign(Object.create({}), { mantissa: 2, exponent: 3 });
  for (const invalid of [
    nonEnumerableExtra,
    symbolExtra,
    accessor,
    nonEnumerableField,
    nullPrototype,
    customPrototype,
    { mantissa: Number.NaN, exponent: 0 },
    { mantissa: 2, exponent: Number.POSITIVE_INFINITY },
    { mantissa: 2, exponent: Number.MAX_SAFE_INTEGER + 1 },
  ])
    assert.throws(() => parsePositiveCanonicalBigNumDto(invalid), /Conversion amount/);
});
