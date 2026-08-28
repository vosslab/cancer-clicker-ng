import assert from "node:assert/strict";
import test from "node:test";
import {
  bigNum,
  hallmarkId,
  hostRunId,
  passageUpgradeId,
  producerId,
  regionId,
  stageId,
} from "../src/brands.ts";
import { createInitialGameState } from "../src/state/game_state.ts";
import { recordEvent } from "../src/state/events.ts";
import { parseSave, serializeGameState } from "../src/state/save_load.ts";

function eligibleHostCollapse() {
  const initial = createInitialGameState();
  const runId = hostRunId("host-run-v1:17:1");
  return {
    ...initial,
    cells: bigNum(9, 3),
    atp: bigNum(7, 0),
    activeTimeMs: 80,
    totalOfflineMs: 12,
    currentStage: stageId("host_collapse"),
    regions: [
      {
        id: regionId("seed"),
        capacity: 4,
        viability: 1,
        phenotype: "proliferative",
        vesselLinkIds: [],
        routeIds: [],
      },
    ],
    seededSites: [regionId("seed")],
    hallmarkLevels: [
      { id: hallmarkId("proliferative_signaling"), level: 2 },
      { id: hallmarkId("cell_death_resistance"), level: 1 },
    ],
    prestigeAvailability: [{ id: "L3", status: "earned" }],
    metastasis: {
      ...initial.metastasis,
      metastaticPotential: bigNum(9, 0),
      allocations: [{ siteId: "liver", rank: 1 }],
      programs: [{ siteId: "liver", programId: "exploit_niche" }],
      activeNicheContext: {
        siteId: "liver",
        allocationRank: 1,
        programId: "exploit_niche",
      },
    },
    hostTransfer: {
      hostImprints: 5,
      purchasedBoons: [{ boonId: "extra_card_reveal", kind: "pre-draft" }],
      activeHost: {
        hostRunId: runId,
        card: {
          id: "host-card-v1",
          immuneRegime: "vigilant",
          tissueEcology: "fibrotic",
          hostHorizon: "brief",
        },
      },
      pendingDraft: null,
    },
    lineageLedger: {
      ...initial.lineageLedger,
      lineageSeed: 17,
      currentHostRunId: runId,
      completedHostTransferCount: 1,
      usedLineageBoonIds: ["extra_card_reveal"],
      chosenHallmarksAcrossLineage: [
        "proliferative_signaling",
        "cell_death_resistance",
        "replicative_immortality",
        "angiogenesis",
      ],
      terminalPreparation: { hostRunId: runId, eligible: true, assessedAtActiveMs: 80 },
    },
  };
}

test("immortalization atomically buys the matching cryobank translation and clears host-local state", () => {
  const before = eligibleHostCollapse();
  const after = recordEvent(before, {
    type: "perform-immortalization",
    cryobankProgramId: "cryobank_exploit",
    sourceEventSequence: 0,
    atMs: 80,
  });
  assert.equal(after.eventSequence, 1);
  assert.equal(after.currentStage, "immortalized_culture");
  assert.equal(after.stageStartedAtMs, 80);
  assert.deepEqual(after.lastStageTransition, {
    from: "host_collapse",
    to: "immortalized_culture",
    atMs: 80,
  });
  assert.deepEqual(after.metastasis, createInitialGameState().metastasis);
  assert.deepEqual(after.hostTransfer, createInitialGameState().hostTransfer);
  assert.equal(after.culture.cryobankProgram, "cryobank_exploit");
  assert.deepEqual(after.culture.purchasedPassageUpgrades, [{ upgradeId: "cryobank", rank: 1 }]);
  assert.equal(after.culture.passages, 2);
  assert.equal(after.lineageLedger.currentHostRunId, null);
  assert.equal(after.lineageLedger.networkSeed !== null, true);
  assert.equal(after.totalOfflineMs, before.totalOfflineMs);
  const loaded = parseSave(serializeGameState(after, 80));
  assert.equal(loaded.status, "loaded");
  if (loaded.status === "loaded") assert.deepEqual(loaded.state, after);
});

test("immortalization rejects stale or foreign cryobank selection without touching state", () => {
  const before = eligibleHostCollapse();
  const snapshot = structuredClone(before);
  assert.throws(
    () =>
      recordEvent(before, {
        type: "perform-immortalization",
        cryobankProgramId: "cryobank_occult",
        sourceEventSequence: 0,
        atMs: 80,
      }),
    /unavailable/,
  );
  assert.deepEqual(before, snapshot);
  assert.throws(
    () =>
      recordEvent(before, {
        type: "perform-immortalization",
        cryobankProgramId: "cryobank_exploit",
        sourceEventSequence: 1,
        atMs: 80,
      }),
    /unavailable/,
  );
  assert.deepEqual(before, snapshot);
});

test("passage upgrades and later cryobank choices require their durable catalog gate", () => {
  const base = {
    ...createInitialGameState(),
    activeTimeMs: 4,
    culture: { ...createInitialGameState().culture, passages: 3 },
  };
  assert.throws(
    () =>
      recordEvent(base, {
        type: "select-cryobank-program",
        cryobankProgramId: "cryobank_exploit",
        sourceEventSequence: 0,
        atMs: 4,
      }),
    /unavailable/,
  );
  const withTransfer = {
    ...base,
    lineageLedger: { ...base.lineageLedger, completedHostTransferCount: 1 },
  };
  const purchased = recordEvent(withTransfer, {
    type: "purchase-passage-upgrade",
    upgradeId: "cryobank",
    sourceEventSequence: 0,
    atMs: 4,
  });
  const selected = recordEvent(purchased, {
    type: "select-cryobank-program",
    cryobankProgramId: "cryobank_occult",
    sourceEventSequence: 1,
    atMs: 4,
  });
  assert.equal(selected.culture.cryobankProgram, "cryobank_occult");
});

test("assay queues one exact producer action while manual purchases retain the queue", () => {
  const initial = createInitialGameState();
  const state = {
    ...initial,
    cells: bigNum(100, 0),
    activeTimeMs: 4,
    culture: {
      ...initial.culture,
      purchasedPassageUpgrades: [{ upgradeId: passageUpgradeId("assay_discipline"), rank: 1 }],
    },
  };
  const queued = recordEvent(state, {
    type: "queue-assay-producer-action",
    producerId: producerId("producer"),
    sourceEventSequence: 0,
    atMs: 4,
  });
  const manual = recordEvent(queued, {
    type: "purchase-producer",
    producerId: producerId("producer"),
    quantity: 1,
    execution: "manual",
    atMs: 4,
  });
  assert.ok(manual.culture.queuedProducerAction);
  const assay = recordEvent(manual, {
    type: "purchase-producer",
    producerId: producerId("producer"),
    quantity: 1,
    execution: "assay",
    queuedAtEventSequence: queued.eventSequence,
    atMs: 4,
  });
  assert.equal(assay.culture.queuedProducerAction, null);
});

test("assay replacement retains one durable target with the replacement provenance", () => {
  const initial = createInitialGameState();
  const state = {
    ...initial,
    cells: bigNum(100, 0),
    activeTimeMs: 4,
    culture: {
      ...initial.culture,
      purchasedPassageUpgrades: [{ upgradeId: passageUpgradeId("assay_discipline"), rank: 1 }],
    },
  };
  const first = recordEvent(state, {
    type: "queue-assay-producer-action",
    producerId: producerId("producer"),
    sourceEventSequence: 0,
    atMs: 4,
  });
  const replaced = recordEvent(first, {
    type: "queue-assay-producer-action",
    producerId: producerId("cdk4"),
    sourceEventSequence: first.eventSequence,
    atMs: 4,
  });
  assert.deepEqual(replaced.culture.queuedProducerAction, {
    producerId: producerId("cdk4"),
    queuedAtEventSequence: 2,
    queuedAtActiveMs: 4,
  });
});

test("a stale assay execution preserves its durable queue and purchase state", () => {
  const initial = createInitialGameState();
  const state = {
    ...initial,
    cells: bigNum(100, 0),
    activeTimeMs: 7,
    culture: {
      ...initial.culture,
      purchasedPassageUpgrades: [{ upgradeId: passageUpgradeId("assay_discipline"), rank: 1 }],
      queuedProducerAction: {
        producerId: producerId("producer"),
        queuedAtEventSequence: 0,
        queuedAtActiveMs: 7,
      },
    },
  };
  const snapshot = structuredClone(state);
  assert.throws(
    () =>
      recordEvent(state, {
        type: "purchase-producer",
        producerId: producerId("producer"),
        quantity: 1,
        execution: "assay",
        queuedAtEventSequence: 0,
        atMs: 6,
      }),
    /unavailable/,
  );
  assert.deepEqual(state, snapshot);
});
