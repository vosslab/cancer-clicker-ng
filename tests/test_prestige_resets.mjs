import assert from "node:assert/strict";
import test from "node:test";
import { bigNum, hallmarkId, regionId, stageId } from "../src/brands.ts";
import { createInitialGameState } from "../src/state/game_state.ts";
import { recordEvent } from "../src/state/events.ts";
import { parseSave, serializeGameState } from "../src/state/save_load.ts";

function collapseState(overrides = {}) {
  const initial = createInitialGameState();
  return {
    ...initial,
    cells: bigNum(1, 4),
    substrate: bigNum(4, 1),
    atp: bigNum(9, 0),
    activeTimeMs: 100,
    totalOfflineMs: 12,
    currentStage: stageId("host_collapse"),
    stageStartedAtMs: 10,
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
    hallmarkLevels: [{ id: hallmarkId("proliferative_signaling"), level: 3 }],
    prestigeAvailability: [
      { id: "L1", status: "earned" },
      { id: "L2", status: "earned" },
    ],
    metastasis: {
      ...initial.metastasis,
      allocations: [{ siteId: "liver", rank: 1 }],
      programs: [{ siteId: "liver", programId: "exploit_niche" }],
    },
    ...overrides,
  };
}

test("L1 performs a complete local reset, preserves clocks, and floor-halves hallmarks", () => {
  const before = collapseState();
  const after = recordEvent(before, {
    type: "perform-metastasis-reset",
    siteId: "liver",
    sourceEventSequence: 0,
    atMs: 100,
  });
  assert.equal(after.eventSequence, 1);
  assert.deepEqual(after.cells, bigNum(0, 0));
  assert.deepEqual(after.substrate, bigNum(0, 0));
  assert.deepEqual(after.atp, bigNum(0, 0));
  assert.equal(after.currentStage, "transformed_cell");
  assert.equal(after.stageStartedAtMs, 100);
  assert.equal(after.activeTimeMs, 100);
  assert.equal(after.totalOfflineMs, 12);
  assert.deepEqual(after.regions, []);
  assert.deepEqual(after.pendingTransitEvents, []);
  assert.equal(
    after.hallmarkLevels.find((level) => level.id === "proliferative_signaling")?.level,
    1,
  );
  assert.equal(after.lineageLedger.completedL1ResetCount, 1);
  assert.equal(after.metastasis.metastaticPotential.mantissa > 0, true);
  assert.deepEqual(after.metastasis.activeNicheContext, {
    siteId: "liver",
    allocationRank: 1,
    programId: "exploit_niche",
  });
  const loaded = parseSave(serializeGameState(after, 100));
  assert.equal(loaded.status, "loaded");
  if (loaded.status === "loaded") assert.deepEqual(loaded.state, after);
});

test("stale L1 intent preserves original reference", () => {
  const before = collapseState();
  assert.throws(
    () =>
      recordEvent(before, {
        type: "perform-metastasis-reset",
        siteId: "liver",
        sourceEventSequence: 1,
        atMs: 100,
      }),
    /unavailable/,
  );
  assert.equal(before.eventSequence, 0);
  assert.throws(
    () =>
      recordEvent(before, {
        type: "perform-metastasis-reset",
        sourceEventSequence: 0,
        atMs: 100,
      }),
    /shape/,
  );
});

test("L1 reset requires the selected allocated site to carry exactly one program", () => {
  const before = collapseState({
    metastasis: {
      ...createInitialGameState().metastasis,
      allocations: [{ siteId: "liver", rank: 1 }],
      programs: [],
    },
  });
  const snapshot = structuredClone(before);
  assert.throws(
    () =>
      recordEvent(before, {
        type: "perform-metastasis-reset",
        siteId: "liver",
        sourceEventSequence: 0,
        atMs: 100,
      }),
    /unavailable/,
  );
  assert.deepEqual(before, snapshot);
  const zeroRank = collapseState({
    metastasis: {
      ...createInitialGameState().metastasis,
      allocations: [{ siteId: "liver", rank: 0 }],
      programs: [{ siteId: "liver", programId: "exploit_niche" }],
    },
  });
  assert.throws(
    () =>
      recordEvent(zeroRank, {
        type: "perform-metastasis-reset",
        siteId: "liver",
        sourceEventSequence: 0,
        atMs: 100,
      }),
    /unavailable/,
  );
  const duplicateProgram = collapseState({
    metastasis: {
      ...createInitialGameState().metastasis,
      allocations: [{ siteId: "liver", rank: 1 }],
      programs: [
        { siteId: "liver", programId: "exploit_niche" },
        { siteId: "liver", programId: "occult_niche" },
      ],
    },
  });
  assert.throws(
    () =>
      recordEvent(duplicateProgram, {
        type: "perform-metastasis-reset",
        siteId: "liver",
        sourceEventSequence: 0,
        atMs: 100,
      }),
    /unavailable/,
  );
});

test("L2 clears old host state and saves exactly one deterministic draft", () => {
  const before = collapseState({
    metastasis: {
      ...collapseState().metastasis,
      activeNicheContext: { siteId: "liver", allocationRank: 1, programId: "exploit_niche" },
    },
    lineageLedger: {
      ...createInitialGameState().lineageLedger,
      completedL1ResetCount: 3,
      organTagsSeen: ["hepatic", "pulmonary"],
      usedLineageBoonIds: ["extra_card_reveal"],
    },
    hostTransfer: {
      hostImprints: 2,
      purchasedBoons: [{ boonId: "extra_card_reveal", kind: "pre-draft" }],
      activeHost: null,
      pendingDraft: null,
    },
  });
  const rejectedL2Snapshot = structuredClone(before);
  assert.throws(
    () =>
      recordEvent(before, {
        type: "perform-host-transfer",
        sourceEventSequence: 1,
        atMs: 100,
      }),
    /unavailable/,
  );
  assert.deepEqual(before, rejectedL2Snapshot);
  const after = recordEvent(before, {
    type: "perform-host-transfer",
    sourceEventSequence: 0,
    atMs: 100,
  });
  assert.equal(after.eventSequence, 1);
  assert.deepEqual(after.metastasis.activeNicheContext, {
    siteId: "liver",
    allocationRank: 1,
    programId: "exploit_niche",
  });
  assert.equal(after.hostTransfer.activeHost, null);
  assert.deepEqual(after.hostTransfer.purchasedBoons, []);
  assert.equal(after.hostTransfer.pendingDraft?.cards.length, 4);
  assert.equal(after.hostTransfer.pendingDraft?.revealedCardIds.length, 4);
  assert.equal(after.lineageLedger.completedHostTransferCount, 1);
  assert.equal(after.lineageLedger.hostDraftSequence, 1);
  const draft = after.hostTransfer.pendingDraft;
  assert.deepEqual(after.lineageLedger.lineageBoonApplications, [
    { boonId: "extra_card_reveal", kind: "pre-draft", draftId: draft.id },
  ]);
  const availableDraftState = {
    ...after,
    hostTransfer: {
      ...after.hostTransfer,
      pendingDraft: { ...draft, revealedCardIds: draft.revealedCardIds.slice(0, 3) },
    },
  };
  const availableSnapshot = structuredClone(availableDraftState);
  for (const [draftId, cardId] of [
    ["foreign-draft", draft.cards[0].id],
    [draft.id, "foreign-card"],
    [draft.id, draft.cards[3].id],
  ]) {
    assert.throws(
      () =>
        recordEvent(availableDraftState, {
          type: "select-host-card",
          draftId,
          cardId,
          sourceEventSequence: 0,
          atMs: 100,
        }),
      /unavailable/,
    );
    assert.deepEqual(availableDraftState, availableSnapshot);
  }
  const selected = recordEvent(after, {
    type: "select-host-card",
    draftId: draft.id,
    cardId: draft.cards[0].id,
    sourceEventSequence: 0,
    atMs: 100,
  });
  assert.equal(selected.eventSequence, 2);
  assert.equal(selected.hostTransfer.pendingDraft?.available, false);
  assert.equal(selected.hostTransfer.pendingDraft?.consumedCardId, draft.cards[0].id);
  assert.equal(
    selected.hostTransfer.activeHost?.hostRunId,
    selected.lineageLedger.currentHostRunId,
  );
  const loaded = parseSave(serializeGameState(selected, 100));
  assert.equal(loaded.status, "loaded");
  if (loaded.status === "loaded") assert.deepEqual(loaded.state, selected);
  const snapshot = structuredClone(selected);
  assert.throws(
    () =>
      recordEvent(selected, {
        type: "select-host-card",
        draftId: draft.id,
        cardId: draft.cards[0].id,
        sourceEventSequence: 0,
        atMs: 100,
      }),
    /unavailable/,
  );
  assert.deepEqual(selected, snapshot);
  const activeCard = selected.hostTransfer.activeHost.card;
  const alternativeTrait = ["immune-vigilant", "immune-ordinary", "immune-tolerant"].find(
    (trait) => trait !== activeCard.immuneRegime,
  );
  const beforeTargeted = {
    ...selected,
    hostTransfer: { ...selected.hostTransfer, hostImprints: 3 },
  };
  const targetedSnapshot = structuredClone(beforeTargeted);
  assert.throws(
    () =>
      recordEvent(beforeTargeted, {
        type: "purchase-lineage-boon",
        boonId: "reduced_trait_liability",
        sourceEventSequence: 2,
        atMs: 100,
      }),
    /shape/,
  );
  assert.throws(
    () =>
      recordEvent(beforeTargeted, {
        type: "purchase-lineage-boon",
        boonId: "extra_card_reveal",
        targetTraitId: activeCard.immuneRegime,
        sourceEventSequence: 2,
        atMs: 100,
      }),
    /shape/,
  );
  assert.throws(
    () =>
      recordEvent(beforeTargeted, {
        type: "purchase-lineage-boon",
        boonId: "reduced_trait_liability",
        targetTraitId: alternativeTrait,
        sourceEventSequence: 2,
        atMs: 100,
      }),
    /unavailable/,
  );
  assert.deepEqual(beforeTargeted, targetedSnapshot);
  const targeted = recordEvent(beforeTargeted, {
    type: "purchase-lineage-boon",
    boonId: "reduced_trait_liability",
    targetTraitId: activeCard.immuneRegime,
    sourceEventSequence: 2,
    atMs: 100,
  });
  assert.equal(targeted.eventSequence, 3);
  assert.equal(targeted.hostTransfer.hostImprints, 0);
  assert.deepEqual(targeted.lineageLedger.lineageBoonApplications.at(-1), {
    boonId: "reduced_trait_liability",
    kind: "targeted-active-host",
    draftId: draft.id,
    hostRunId: selected.hostTransfer.activeHost.hostRunId,
    cardId: activeCard.id,
    targetTraitId: activeCard.immuneRegime,
  });
});

test("pre-draft boon purchases and their host-transfer applications use catalog order", () => {
  const before = collapseState({
    lineageLedger: {
      ...createInitialGameState().lineageLedger,
      completedL1ResetCount: 3,
      organTagsSeen: ["hepatic", "pulmonary"],
    },
    hostTransfer: {
      ...createInitialGameState().hostTransfer,
      hostImprints: 5,
    },
  });
  const protectedRoute = recordEvent(before, {
    type: "purchase-lineage-boon",
    boonId: "protected_route_affinity",
    sourceEventSequence: 0,
    atMs: 100,
  });
  const extraReveal = recordEvent(protectedRoute, {
    type: "purchase-lineage-boon",
    boonId: "extra_card_reveal",
    sourceEventSequence: 1,
    atMs: 100,
  });
  assert.deepEqual(
    extraReveal.hostTransfer.purchasedBoons.map((boon) => boon.boonId),
    ["extra_card_reveal", "protected_route_affinity"],
  );
  const after = recordEvent(extraReveal, {
    type: "perform-host-transfer",
    sourceEventSequence: 2,
    atMs: 100,
  });
  assert.deepEqual(
    after.lineageLedger.lineageBoonApplications.map((application) => application.boonId),
    ["extra_card_reveal", "protected_route_affinity"],
  );
});

test("organ portfolios remain catalog ordered across multi-site commands and p6 save load", () => {
  const initial = createInitialGameState();
  const before = {
    ...initial,
    activeTimeMs: 30,
    metastasis: {
      ...initial.metastasis,
      metastaticPotential: bigNum(30, 0),
      allocations: [{ siteId: "liver", rank: 1 }],
      programs: [{ siteId: "liver", programId: "exploit_niche" }],
      activeNicheContext: {
        siteId: "liver",
        allocationRank: 1,
        programId: "exploit_niche",
      },
    },
  };
  const brain = recordEvent(before, {
    type: "allocate-organ-site",
    siteId: "brain",
    sourceEventSequence: 0,
    atMs: 30,
  });
  const programs = recordEvent(brain, {
    type: "select-colonization-program",
    siteId: "brain",
    programId: "occult_niche",
    sourceEventSequence: 1,
    atMs: 30,
  });
  assert.deepEqual(
    programs.metastasis.allocations.map((entry) => entry.siteId),
    ["liver", "brain"],
  );
  assert.deepEqual(
    programs.metastasis.programs.map((entry) => entry.siteId),
    ["liver", "brain"],
  );
  const loaded = parseSave(serializeGameState(programs, 30));
  assert.equal(loaded.status, "loaded");
  if (loaded.status === "loaded") assert.deepEqual(loaded.state.metastasis, programs.metastasis);
});
