import assert from "node:assert/strict";
import test from "node:test";

import {
  bigNum,
  colonizationProgramId,
  eventId,
  passageUpgradeId,
  organSiteId,
  regionId,
  routeId,
  stageId,
} from "../src/brands.ts";
import { createGameController, plainGameSnapshot } from "../src/render/game_controller.ts";
import { createInitialGameState } from "../src/state/game_state.ts";
import { hostDraftPresentation, metastasisPresentation } from "../src/prestige/presentation.ts";

function clock(value) {
  return { now: () => value };
}

function collapseState(overrides = {}) {
  const initial = createInitialGameState();
  return {
    ...initial,
    cells: bigNum(1, 4),
    activeTimeMs: 100,
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
    prestigeAvailability: [
      { id: "L1", status: "earned" },
      { id: "L2", status: "earned" },
    ],
    metastasis: {
      ...initial.metastasis,
      metastaticPotential: bigNum(10, 0),
      allocations: [{ siteId: organSiteId("liver"), rank: 1 }],
      programs: [
        { siteId: organSiteId("liver"), programId: colonizationProgramId("exploit_niche") },
      ],
    },
    ...overrides,
  };
}

function controller(state, persist = () => ({ ok: true })) {
  return createGameController(state, clock(100), clock(200), persist);
}

test("prestige controller wrappers use one current simulation revision for L1 portfolio commands", () => {
  const game = controller(collapseState());
  assert.deepEqual(game.performMetastasisReset(organSiteId("liver")), { ok: true });
  assert.equal(game.game.eventSequence, 1);
  assert.deepEqual(game.game.metastasis.activeNicheContext, {
    siteId: "liver",
    allocationRank: 1,
    programId: "exploit_niche",
  });
  assert.deepEqual(game.allocateOrganSite(organSiteId("lung")), { ok: true });
  assert.equal(game.game.metastasis.allocations[0]?.rank, 1);
  assert.deepEqual(game.selectColonizationProgram(organSiteId("lung"), "exploit_niche"), {
    ok: true,
  });
  assert.equal(game.game.metastasis.programs[0]?.programId, "exploit_niche");
});

test("prestige controller wraps transit, boon, transfer, and saved-draft card selection", () => {
  const transit = controller({
    ...createInitialGameState(),
    activeTimeMs: 100,
    pendingTransitEvents: [
      { id: eventId("transit"), routeId: routeId("venous-exit"), outcome: "arrived" },
    ],
  });
  assert.deepEqual(transit.resolveTransit(eventId("transit"), organSiteId("lung")), { ok: true });
  assert.equal(transit.game.seededSites.length, 1);

  const boon = controller({
    ...createInitialGameState(),
    activeTimeMs: 100,
    hostTransfer: { ...createInitialGameState().hostTransfer, hostImprints: 3 },
  });
  assert.deepEqual(boon.purchaseLineageBoon("protected_route_affinity"), { ok: true });
  assert.equal(boon.game.hostTransfer.hostImprints, 0);

  const transfer = controller(
    collapseState({
      lineageLedger: {
        ...createInitialGameState().lineageLedger,
        completedL1ResetCount: 3,
        organTagsSeen: ["hepatic", "pulmonary"],
      },
      metastasis: {
        ...collapseState().metastasis,
        activeNicheContext: {
          siteId: organSiteId("liver"),
          allocationRank: 1,
          programId: colonizationProgramId("exploit_niche"),
        },
      },
    }),
  );
  assert.deepEqual(transfer.performHostTransfer(), { ok: true });
  const draft = transfer.game.hostTransfer.pendingDraft;
  assert.ok(draft);
  assert.equal(draft.sourceEventSequence, 0);
  assert.equal(transfer.game.eventSequence, 1);
  const presentation = hostDraftPresentation(plainGameSnapshot(transfer.game));
  assert.deepEqual(
    presentation.cards.map((card) => card.cardId),
    draft.cards.map((card) => card.id),
  );
  assert.deepEqual(presentation.revealedCardIds, draft.revealedCardIds);
  assert.deepEqual(transfer.selectHostCard(draft.id, draft.cards[0].id), { ok: true });
  assert.equal(transfer.game.hostTransfer.activeHost?.card.id, draft.cards[0].id);
  const consumedDraft = hostDraftPresentation(plainGameSnapshot(transfer.game));
  assert.equal(consumedDraft.consumedCardId, draft.cards[0].id);
  assert.equal(consumedDraft.consumedCardTitle, "Host card 0");
  assert.deepEqual(metastasisPresentation(plainGameSnapshot(transfer.game)).activeNiche, {
    siteTitle: "Liver",
    rank: 1,
    programTitle: "Exploit Niche",
  });
  assert.deepEqual(
    transfer.purchaseLineageBoon("reduced_trait_liability", draft.cards[0].immuneRegime),
    { ok: true },
  );
  assert.equal(transfer.game.hostTransfer.hostImprints, 0);
});

test("prestige persistence failure and recovery protection keep visible durable state unchanged", () => {
  const before = collapseState();
  const failed = controller(before, () => ({ ok: false, notices: [] }));
  const snapshot = plainGameSnapshot(failed.game);
  assert.deepEqual(failed.performMetastasisReset(organSiteId("liver")), {
    ok: false,
    kind: "persistence",
    notices: [],
  });
  assert.deepEqual(plainGameSnapshot(failed.game), snapshot);
  assert.match(failed.saveError() ?? "", /Progress is not saved/);

  const protectedController = createGameController(
    before,
    clock(100),
    clock(200),
    () => ({ ok: true }),
    "retained-unreadable",
  );
  assert.deepEqual(protectedController.performMetastasisReset(organSiteId("liver")), {
    ok: false,
    kind: "recovery-blocked",
    notices: [],
  });
  assert.deepEqual(plainGameSnapshot(protectedController.game), plainGameSnapshot(before));
});

test("controller reconciles an affordable saved assay queue through its own persisted producer event", () => {
  const initial = createInitialGameState();
  const producerId = initial.producerLevels[0].id;
  const queuedState = {
    ...initial,
    cells: bigNum(1, 6),
    culture: {
      ...initial.culture,
      purchasedPassageUpgrades: [{ upgradeId: passageUpgradeId("assay_discipline"), rank: 1 }],
      queuedProducerAction: {
        producerId,
        queuedAtEventSequence: 0,
        queuedAtActiveMs: 0,
      },
    },
  };
  let writes = 0;
  const game = controller(queuedState, () => {
    writes += 1;
    return { ok: true };
  });
  assert.equal(game.game.culture.queuedProducerAction, null);
  assert.equal(game.game.producerLevels[0].level, 1);
  assert.equal(game.game.eventSequence, 1);
  assert.equal(writes, 1);
});

test("controller leaves an unaffordable saved assay queue available for a later accepted reconciliation", () => {
  const initial = createInitialGameState();
  const producerId = initial.producerLevels[0].id;
  const game = controller({
    ...initial,
    culture: {
      ...initial.culture,
      purchasedPassageUpgrades: [{ upgradeId: passageUpgradeId("assay_discipline"), rank: 1 }],
      queuedProducerAction: {
        producerId,
        queuedAtEventSequence: 0,
        queuedAtActiveMs: 0,
      },
    },
  });
  assert.equal(game.game.culture.queuedProducerAction?.producerId, producerId);
  assert.equal(game.game.producerLevels[0].level, 0);
  assert.equal(game.game.eventSequence, 0);
});
