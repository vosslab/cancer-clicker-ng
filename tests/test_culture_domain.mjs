import assert from "node:assert/strict";
import test from "node:test";

import { cryobankProgramId, passageUpgradeId } from "../src/brands.ts";
import {
  CRYOBANK_PROGRAM_CATALOG,
  PASSAGE_UPGRADE_CATALOG,
  assertCryobankProgramCatalog,
  cryobankProgramQuote,
  createEmptyCultureState,
  findCryobankProgram,
  immortalizationQuoteV1,
  immortalizationCryobankSelectionQuote,
  passageUpgradeQuote,
} from "../src/prestige/culture.ts";
import { createEmptyLineageLedger } from "../src/prestige/layers.ts";

test("culture catalogs are unique, bounded, and frozen", () => {
  assert.equal(Object.isFrozen(PASSAGE_UPGRADE_CATALOG), true);
  assert.equal(Object.isFrozen(PASSAGE_UPGRADE_CATALOG[0]), true);
  assert.equal(Object.isFrozen(CRYOBANK_PROGRAM_CATALOG), true);
  assert.equal(Object.isFrozen(CRYOBANK_PROGRAM_CATALOG[0]?.effects), true);
  assert.equal(
    new Set(PASSAGE_UPGRADE_CATALOG.map((upgrade) => upgrade.id)).size,
    PASSAGE_UPGRADE_CATALOG.length,
  );
  assert.doesNotThrow(() => assertCryobankProgramCatalog());
  assert.equal(
    new Set(CRYOBANK_PROGRAM_CATALOG.map((program) => program.id)).size,
    CRYOBANK_PROGRAM_CATALOG.length,
  );
  for (const upgrade of PASSAGE_UPGRADE_CATALOG) {
    assert.equal(upgrade.maximumRank, upgrade.costByRank.length);
    assert.ok(upgrade.costByRank.every((cost) => Number.isSafeInteger(cost) && cost > 0));
  }
});

test("culture quote expresses eligibility, rank cap, and exact affordable cost", () => {
  const empty = createEmptyCultureState();
  const bareLedger = createEmptyLineageLedger(19);
  const highThroughput = passageUpgradeId("high_throughput");
  assert.deepEqual(passageUpgradeQuote(bareLedger, empty, highThroughput), {
    available: false,
    cost: null,
    reason: "ineligible",
  });

  const ledger = Object.freeze({ ...bareLedger, completedHostTransferCount: 1 });
  const affordable = Object.freeze({ ...empty, passages: 2 });
  assert.deepEqual(passageUpgradeQuote(ledger, affordable, highThroughput), {
    available: true,
    cost: 2,
    reason: "available",
  });
  const capped = {
    ...affordable,
    purchasedPassageUpgrades: [{ upgradeId: highThroughput, rank: 1 }],
  };
  assert.deepEqual(passageUpgradeQuote(ledger, capped, highThroughput), {
    available: false,
    cost: null,
    reason: "maximum-rank",
  });
  assert.deepEqual(ledger, { ...bareLedger, completedHostTransferCount: 1 });
  assert.deepEqual(affordable, { ...empty, passages: 2 });
});

test("immortalization quote derives only trusted lineage facts", () => {
  const base = createEmptyLineageLedger(31);
  const unavailable = immortalizationQuoteV1(base, 3);
  assert.equal(unavailable.available, false);
  assert.equal(unavailable.passagesAwarded, 1);
  const ready = immortalizationQuoteV1(
    {
      ...base,
      hostDraftSequence: 7,
      completedHostTransferCount: 2,
      usedLineageBoonIds: ["extra_card_reveal"],
      chosenHallmarksAcrossLineage: [
        "growth_suppressor_evasion",
        "cell_death_resistance",
        "replicative_immortality",
        "angiogenesis",
      ],
      terminalPreparation: { hostRunId: "host-run-v1:1", eligible: true, assessedAtActiveMs: 5 },
    },
    7,
  );
  assert.deepEqual(ready, {
    sourceEventSequence: 7,
    passagesAwarded: 5,
    available: true,
    reason: "available",
  });
});

test("cryobank translation is a stable culture mapping with no niche allocation", () => {
  const cryobank = findCryobankProgram(cryobankProgramId("cryobank_occult"));
  assert.equal(cryobank?.colonizationProgramId, "occult_niche");
  assert.equal(cryobank?.effects.phenotypePreference, "stress-tolerant");
  const empty = createEmptyCultureState();
  assert.deepEqual(empty, {
    passages: 0,
    purchasedPassageUpgrades: [],
    cryobankProgram: null,
    queuedProducerAction: null,
  });
  assert.equal(Object.isFrozen(empty.purchasedPassageUpgrades), true);
});

test("cryobank selection requires its acquired culture branch and keeps inputs immutable", () => {
  const empty = Object.freeze(createEmptyCultureState());
  const selectedId = cryobankProgramId("cryobank_occult");
  assert.deepEqual(cryobankProgramQuote(empty, selectedId), {
    available: false,
    reason: "cryobank-not-acquired",
    program: null,
  });
  const acquired = Object.freeze({
    ...empty,
    passages: 0,
    purchasedPassageUpgrades: Object.freeze([{ upgradeId: passageUpgradeId("cryobank"), rank: 1 }]),
  });
  const quote = cryobankProgramQuote(acquired, selectedId);
  assert.equal(quote.available, true);
  assert.equal(quote.program?.colonizationProgramId, "occult_niche");
  assert.equal(Object.isFrozen(quote), true);
  assert.deepEqual(empty, createEmptyCultureState());
});

test("assay discipline has one durable queue-capable rank and an empty queue default", () => {
  const assay = PASSAGE_UPGRADE_CATALOG.find((upgrade) => upgrade.id === "assay_discipline");
  assert.deepEqual(assay?.costByRank, [1]);
  assert.equal(assay?.maximumRank, 1);
  assert.equal(assay?.behaviorTarget, "producer-action-queue");
  assert.equal(createEmptyCultureState().queuedProducerAction, null);
});

test("immortalization can atomically buy cryobank from its new Passage award", () => {
  const ledger = Object.freeze({
    ...createEmptyLineageLedger(41),
    completedHostTransferCount: 1,
    usedLineageBoonIds: ["extra_card_reveal"],
    chosenHallmarksAcrossLineage: ["growth_suppressor_evasion"],
  });
  const selected = cryobankProgramId("cryobank_occult");
  const accepted = immortalizationCryobankSelectionQuote(ledger, 4, "occult_niche", selected);
  assert.deepEqual(accepted, {
    available: true,
    reason: "available",
    passagesAwarded: 2,
    cryobankCost: 2,
    remainingAwardedPassages: 0,
    program: findCryobankProgram(selected),
  });
  const rejected = immortalizationCryobankSelectionQuote(ledger, 4, "exploit_niche", selected);
  assert.equal(rejected.available, false);
  assert.equal(rejected.reason, "source-program-mismatch");
  assert.deepEqual(ledger, {
    ...createEmptyLineageLedger(41),
    completedHostTransferCount: 1,
    usedLineageBoonIds: ["extra_card_reveal"],
    chosenHallmarksAcrossLineage: ["growth_suppressor_evasion"],
  });
});
