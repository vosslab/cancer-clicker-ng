import assert from "node:assert/strict";
import test from "node:test";

import {
  bigNum,
  colonizationProgramId,
  lineageBoonId,
  organSiteId,
  regionId,
  routeId,
  stageId,
} from "../src/brands.ts";
import {
  captureTerminalSnapshotV1,
  createEmptyLineageLedger,
  createEmptyMetastasisState,
  hostTransferQuoteV1,
  metastasisQuoteV1,
} from "../src/prestige/layers.ts";
import { generateHostDraftV1 } from "../src/prestige/hosts.ts";
import {
  canonicalOrganTags,
  findColonizationProgram,
  findOrganSite,
  isRouteCompatibleWithSite,
  ROUTE_COMPATIBILITY_CATALOG,
  seededRegionIdForTransit,
} from "../src/prestige/seeding.ts";
import { HOST_TRAIT_CATALOG } from "../src/prestige/hosts.ts";
import { deriveSeedV1, mulberry32V1 } from "../src/state/deterministic_random.ts";

test("versioned seed derivation has a stable ordered source vector", () => {
  assert.equal(deriveSeedV1("host-draft-v1", 17, 2, 9), 1876754542);
  assert.notEqual(deriveSeedV1("host-draft-v1", 17, 2, 9), deriveSeedV1("host-draft-v1", 17, 9, 2));

  const stream = mulberry32V1(1876754542);
  assert.deepEqual([stream(), stream(), stream()], [3018262844, 3314673839, 3035475276]);
});

test("terminal quotes use local viability and durable lineage history", () => {
  const ledger = {
    ...createEmptyLineageLedger(17),
    organTagsSeen: canonicalOrganTags(["pulmonary", "hepatic"]),
    successfulTransitCount: 5,
    completedL1ResetCount: 3,
  };
  const snapshot = captureTerminalSnapshotV1({
    currentStage: stageId("host_collapse"),
    activeTimeMs: 90,
    eventSequence: 11,
    cells: bigNum(4, 6),
    seededSites: [regionId("seeded-region-v1:arrived"), regionId("seeded-region-v1:cleared")],
    regions: [
      { id: regionId("seeded-region-v1:arrived"), viability: 1 },
      { id: regionId("seeded-region-v1:cleared"), viability: 0 },
    ],
    lineageLedger: ledger,
  });

  assert.deepEqual(metastasisQuoteV1(snapshot), {
    sourceEventSequence: 11,
    gainedPotential: 12,
    survivingSeededSiteCount: 1,
    distinctOrganTagCount: 2,
  });
  assert.deepEqual(hostTransferQuoteV1(snapshot), {
    sourceEventSequence: 11,
    gainedImprints: 3,
    available: true,
    reason: "available",
  });
});

test("empty lineage history freezes its per-draft boon provenance", () => {
  const ledger = createEmptyLineageLedger(17);
  assert.deepEqual(ledger.lineageBoonApplications, []);
  assert.equal(Object.isFrozen(ledger.lineageBoonApplications), true);
});

test("empty metastasis state has no inferred active niche context", () => {
  assert.equal(createEmptyMetastasisState().activeNicheContext, null);
});

test("terminal potential uses the inclusive 1 plus cells logarithm boundary", () => {
  function terminalSnapshot(cells) {
    return {
      stageId: stageId("host_collapse"),
      activeTimeMs: 0,
      eventSequence: 0,
      cells: bigNum(cells, 0),
      viableSeededSiteIds: [regionId("seeded-region-v1:boundary")],
      organTagsSeen: [],
      successfulTransitCount: 0,
      completedL1ResetCount: 0,
    };
  }

  assert.equal(metastasisQuoteV1(terminalSnapshot(9)).gainedPotential, 3);
  assert.equal(metastasisQuoteV1(terminalSnapshot(8)).gainedPotential, 2);
});

test("host drafts preserve their saved source and reveal decision", () => {
  const baseline = generateHostDraftV1({
    lineageSeed: 17,
    hostDraftSequence: 2,
    sourceEventSequence: 9,
    purchasedBoons: [],
  });
  const expanded = generateHostDraftV1({
    lineageSeed: 17,
    hostDraftSequence: 2,
    sourceEventSequence: 9,
    purchasedBoons: [{ boonId: lineageBoonId("extra_card_reveal"), kind: "pre-draft" }],
  });

  assert.deepEqual(expanded.cards, baseline.cards);
  assert.equal(baseline.revealPolicy, "standard");
  assert.equal(expanded.revealPolicy, "extra-card-reveal");
  assert.deepEqual(
    baseline.revealedCardIds,
    baseline.cards.slice(0, 3).map((card) => card.id),
  );
  assert.deepEqual(
    expanded.revealedCardIds,
    expanded.cards.map((card) => card.id),
  );
  assert.equal(
    new Set(
      baseline.cards.map(
        (card) => `${card.immuneRegime}|${card.tissueEcology}|${card.hostHorizon}`,
      ),
    ).size,
    baseline.cards.length,
  );
});

test("organ compatibility preserves historical site identity outside the local region", () => {
  assert.equal(Object.isFrozen(ROUTE_COMPATIBILITY_CATALOG), true);
  assert.equal(Object.isFrozen(ROUTE_COMPATIBILITY_CATALOG[0]?.destinationSiteIds), true);
  assert.equal(isRouteCompatibleWithSite(routeId("venous-exit"), organSiteId("lung")), true);
  assert.equal(isRouteCompatibleWithSite(routeId("venous-exit"), organSiteId("brain")), false);
  assert.equal(seededRegionIdForTransit("transit-1"), regionId("seeded-region-v1:transit-1"));
  assert.equal(
    findColonizationProgram(colonizationProgramId("occult_niche"))?.detectionDirection,
    "lower",
  );
  assert.equal(
    findColonizationProgram(colonizationProgramId("occult_niche"))?.effects.routeRiskDelta,
    -0.1,
  );
  assert.equal(
    Object.isFrozen(findColonizationProgram(colonizationProgramId("remodel_niche"))?.effects),
    true,
  );
  assert.equal(findOrganSite(organSiteId("lung"))?.effects.substrateConversionMultiplier, 1.1);
  assert.equal(
    HOST_TRAIT_CATALOG.find((trait) => trait.id === "horizon-durable")?.effects
      .hostRunwayReserveFloor,
    2,
  );
  assert.equal(
    Object.isFrozen(HOST_TRAIT_CATALOG.find((trait) => trait.id === "ecology-fibrotic")?.effects),
    true,
  );
});
