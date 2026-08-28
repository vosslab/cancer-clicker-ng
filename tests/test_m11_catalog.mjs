import assert from "node:assert/strict";
import test from "node:test";
import { hallmarkId, mutationId, offerId, stageId } from "../src/brands.ts";
import {
  assertAtpSinkCatalog,
  assertM11Catalog,
  assertM11MutationCatalog,
  assertM11MutationOffer,
  ATP_SINK_CATALOG,
  findM11Hallmark,
  hasReachedM11Unlock,
  M11_HALLMARK_CATALOG,
  M11_HALLMARK_KEYS,
  M11_MUTATION_CARD_CATALOG,
  M11_MUTATION_POOL_ID,
  M11_MUTATION_OFFER_THRESHOLDS,
} from "../src/hallmarks/m11_catalog.ts";
import {
  M11_OPERATIONS_MATCH_BRANCH_CONTRACTS,
  parsePositiveCanonicalBigNumDto,
} from "../src/hallmarks/m11_types.ts";
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

test("M11 catalog exactly covers four distinct 2011 mechanics, handlers, and operations", () => {
  assert.deepEqual(
    M11_HALLMARK_KEYS,
    EXPECTED.map(([key]) => key),
  );
  assert.deepEqual(
    M11_HALLMARK_CATALOG.map((definition) => [
      definition.key,
      definition.mechanicClass,
      definition.handlerId,
      definition.operationType,
    ]),
    EXPECTED,
  );
  assert.equal(new Set(M11_HALLMARK_CATALOG.map((definition) => definition.id)).size, 4);
  assert.equal(new Set(M11_HALLMARK_CATALOG.map((definition) => definition.mechanicClass)).size, 4);
  assert.equal(new Set(M11_HALLMARK_CATALOG.map((definition) => definition.handlerId)).size, 4);
  assert.equal(new Set(M11_HALLMARK_CATALOG.map((definition) => definition.operationType)).size, 4);
  assert.equal(M11_OPERATIONS_MATCH_BRANCH_CONTRACTS, true);
  assertM11Catalog();
});

test("M11 unlocks use declared stage capabilities and no local stage literals", () => {
  for (const definition of M11_HALLMARK_CATALOG) {
    assert.equal(
      stageDefinition(definition.unlock.stageId).operationalChange.actionId,
      definition.unlock.capability,
    );
    assert.equal(hasReachedM11Unlock(definition.unlock.stageId, definition.key), true);
    const index = STAGE_IDS.indexOf(definition.unlock.stageId);
    assert.ok(index >= 0);
    if (index > 0)
      assert.equal(hasReachedM11Unlock(stageId(STAGE_IDS[index - 1]), definition.key), false);
  }
  assert.equal(
    findM11Hallmark(hallmarkId("metabolic_deregulation"))?.key,
    "metabolic_deregulation",
  );
  assert.equal(findM11Hallmark(hallmarkId("angiogenesis")), undefined);
});

test("M11 catalog rejects missing, duplicate, unknown, and mismatched rows", () => {
  const definitions = structuredClone(M11_HALLMARK_CATALOG);
  assert.throws(() => assertM11Catalog(definitions.slice(1)), /exactly four/);
  const duplicate = structuredClone(definitions);
  duplicate[1].key = duplicate[0].key;
  assert.throws(() => assertM11Catalog(duplicate), /unique identities/);
  const unknown = structuredClone(definitions);
  unknown[1].key = "unknown";
  assert.throws(() => assertM11Catalog(unknown), /canonical branch/);
  const mismatch = structuredClone(definitions);
  mismatch[0].unlock.capability = "route-commitment";
  assert.throws(() => assertM11Catalog(mismatch), /capability/);
});

test("M11 ATP sink catalog closes names and finite bounded budgets", () => {
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

test("M11 mutation catalog and saved three-card snapshot reject invalid composition", () => {
  assertM11MutationCatalog();
  const duplicate = structuredClone(M11_MUTATION_CARD_CATALOG);
  duplicate[1].id = duplicate[0].id;
  assert.throws(() => assertM11MutationCatalog(duplicate), /unique/);
  assert.throws(
    () => assertM11MutationCatalog(M11_MUTATION_CARD_CATALOG.slice(0, 2)),
    /three-card/,
  );
  const offer = {
    id: offerId("m11-offer-1"),
    poolId: M11_MUTATION_POOL_ID,
    cards: [
      M11_MUTATION_CARD_CATALOG[0],
      M11_MUTATION_CARD_CATALOG[1],
      M11_MUTATION_CARD_CATALOG[2],
    ],
    sourceSeed: 17,
    sourceSequence: 3,
    sourceStage: stageId("avascular_lesion"),
    threshold: M11_MUTATION_OFFER_THRESHOLDS[0].burden,
  };
  assertM11MutationOffer(offer);
  assert.throws(
    () =>
      assertM11MutationOffer({ ...offer, cards: [offer.cards[0], offer.cards[0], offer.cards[2]] }),
    /unique/,
  );
  assert.throws(() => assertM11MutationOffer({ ...offer, poolId: "unknown" }), /pool/);
  assert.throws(
    () =>
      assertM11MutationOffer({
        ...offer,
        cards: [{ ...offer.cards[0], id: mutationId("unknown") }, offer.cards[1], offer.cards[2]],
      }),
    /unknown/,
  );
  assert.throws(
    () => assertM11MutationOffer({ ...offer, sourceStage: stageId("unknown_stage") }),
    /provenance/,
  );
});

test("M11 conversion amount accepts only a positive canonical BigNum DTO", () => {
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

test("M11 conversion DTO rejects every own-property and prototype boundary bypass", () => {
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
