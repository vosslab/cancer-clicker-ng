import assert from "node:assert/strict";
import test from "node:test";

import { organTagId } from "../src/brands.ts";
import { createInitialGameState } from "../src/state/game_state.ts";
import { recordEvent } from "../src/state/events.ts";
import { deriveSeedV1 } from "../src/state/deterministic_random.ts";
import { generateHostDraftV1 } from "../src/prestige/hosts.ts";
import {
  AUTHORED_NETWORK_NODE_CATALOG,
  generateNetworkFrontierV1,
} from "../src/prestige/network.ts";
import { parsePrestige } from "../src/state/save_parse/prestige.ts";
import { parseSave, serializeGameState } from "../src/state/save_load.ts";

function currentEnvelope(state = createInitialGameState()) {
  return JSON.parse(serializeGameState(state, 19));
}

function rejectsCurrent(mutator) {
  const envelope = currentEnvelope();
  mutator(envelope.state);
  assert.equal(parseSave(JSON.stringify(envelope)).status, "rejected");
}

test("current saves round-trip without notices and keep empty prestige, culture, and network state", () => {
  const state = createInitialGameState();
  const raw = serializeGameState(state, 19);
  const loaded = parseSave(raw);
  assert.equal(loaded.status, "loaded");
  if (loaded.status !== "loaded") throw new Error("Expected current save to load.");
  assert.equal(loaded.progressionVersion, 8);
  assert.deepEqual(loaded.notices, []);
  assert.deepEqual(loaded.state.lineageLedger, state.lineageLedger);
  assert.deepEqual(loaded.state.metastasis, state.metastasis);
  assert.deepEqual(loaded.state.hostTransfer, state.hostTransfer);
  assert.deepEqual(loaded.state.culture, state.culture);
  assert.deepEqual(loaded.state.network, state.network);
});

test("p6 permits a null active niche only for the canonical empty pre-L1 aggregate", () => {
  const empty = createInitialGameState();
  assert.equal(empty.metastasis.activeNicheContext, null);
  assert.equal(parseSave(serializeGameState(empty, 19)).status, "loaded");

  const populated = createInitialGameState();
  populated.metastasis = {
    ...populated.metastasis,
    allocations: [{ siteId: "bone_marrow", rank: 1 }],
    programs: [{ siteId: "bone_marrow", programId: "exploit_niche" }],
  };
  assert.throws(() => serializeGameState(populated, 19));

  const raw = currentEnvelope();
  raw.state.metastasis.allocations = [{ siteId: "bone_marrow", rank: 1 }];
  raw.state.metastasis.programs = [{ siteId: "bone_marrow", programId: "exploit_niche" }];
  assert.equal(parseSave(JSON.stringify(raw)).status, "rejected");
});

test("accepted historical saves receive empty prestige, culture, network, and ending defaults", () => {
  const envelope = currentEnvelope();
  envelope.progressionVersion = 5;
  delete envelope.state.lineageLedger;
  delete envelope.state.metastasis;
  delete envelope.state.hostTransfer;
  delete envelope.state.culture;
  delete envelope.state.network;
  delete envelope.state.ending;
  envelope.state.endingReached = false;
  envelope.state.deterministicSeed = 41;
  envelope.state.eventSequence = 9;
  const loaded = parseSave(JSON.stringify(envelope));
  assert.equal(loaded.status, "loaded");
  if (loaded.status !== "loaded") throw new Error("Expected accepted p5 to migrate.");
  assert.equal(loaded.progressionVersion, 8);
  assert.deepEqual(
    loaded.notices.map((notice) => notice.field),
    ["lineageLedger", "metastasis", "hostTransfer", "culture", "network", "ending"],
  );
  assert.equal(loaded.state.lineageLedger.lineageSeed, deriveSeedV1("lineage-v1", 41, 9));
  assert.deepEqual(loaded.state.metastasis, createInitialGameState().metastasis);
  assert.deepEqual(loaded.state.hostTransfer, createInitialGameState().hostTransfer);
  assert.deepEqual(loaded.state.culture, createInitialGameState().culture);
  assert.deepEqual(loaded.state.network, createInitialGameState().network);
  assert.deepEqual(loaded.state.ending, createInitialGameState().ending);
});

test("accepted legacy prestige saves retain provenance and receive ending defaults", () => {
  const state = createInitialGameState();
  state.lineageLedger = { ...state.lineageLedger, completedL1ResetCount: 2 };
  const envelope = currentEnvelope(state);
  envelope.progressionVersion = 6;
  delete envelope.state.culture;
  delete envelope.state.network;
  delete envelope.state.ending;
  envelope.state.endingReached = false;
  const loaded = parseSave(JSON.stringify(envelope));
  assert.equal(loaded.status, "loaded");
  if (loaded.status !== "loaded") throw new Error("Expected accepted p6 to migrate.");
  assert.equal(loaded.progressionVersion, 8);
  assert.deepEqual(
    loaded.notices.map((notice) => notice.field),
    ["culture", "network", "ending"],
  );
  assert.deepEqual(loaded.state.lineageLedger, state.lineageLedger);
  assert.deepEqual(loaded.state.metastasis, state.metastasis);
  assert.deepEqual(loaded.state.hostTransfer, state.hostTransfer);
  assert.deepEqual(loaded.state.culture, createInitialGameState().culture);
  assert.deepEqual(loaded.state.network, createInitialGameState().network);
  assert.deepEqual(loaded.state.ending, createInitialGameState().ending);
});

test("p7 culture accepts catalog-ranked cryobank ownership and rejects an ungated program", () => {
  const state = createInitialGameState();
  state.culture = {
    passages: 1,
    purchasedPassageUpgrades: [{ upgradeId: "cryobank", rank: 1 }],
    cryobankProgram: "cryobank_occult",
    queuedProducerAction: null,
  };
  assert.equal(parseSave(serializeGameState(state, 19)).status, "loaded");

  rejectsCurrent((rawState) => {
    rawState.culture = {
      passages: 1,
      purchasedPassageUpgrades: [],
      cryobankProgram: "cryobank_occult",
      queuedProducerAction: null,
    };
  });
  rejectsCurrent((rawState) => {
    rawState.culture.purchasedPassageUpgrades = [
      { upgradeId: "assay_discipline", rank: 1 },
      { upgradeId: "cryobank", rank: 1 },
    ];
  });
});

test("p7 assay queue carries one catalog producer with saved event and simulation provenance", () => {
  const state = createInitialGameState();
  state.culture = {
    passages: 0,
    purchasedPassageUpgrades: [{ upgradeId: "assay_discipline", rank: 1 }],
    cryobankProgram: null,
    queuedProducerAction: {
      producerId: "myc",
      queuedAtEventSequence: 0,
      queuedAtActiveMs: 0,
    },
  };
  state.eventSequence = 1;
  assert.equal(parseSave(serializeGameState(state, 19)).status, "loaded");
  rejectsCurrent((rawState) => {
    rawState.culture = structuredClone(state.culture);
    rawState.eventSequence = 1;
    rawState.culture.queuedProducerAction.producerId = "forged-producer";
  });
  rejectsCurrent((rawState) => {
    rawState.network.activeMandateId = "legacy-active-mandate";
  });
});

test("p7 preserves an exact saved frontier and rejects forged plan endpoints or dangling graph records", () => {
  const state = createInitialGameState();
  const networkSeed = 47;
  const frontier = generateNetworkFrontierV1({
    networkSeed,
    globalTier: 0,
    frontierSequence: 0,
    sourceEventSequence: 3,
  });
  state.lineageLedger = { ...state.lineageLedger, networkSeed, frontierSequence: 0 };
  state.network = { ...state.network, pendingFrontier: frontier };
  state.eventSequence = 4;
  const loaded = parseSave(serializeGameState(state, 19));
  assert.equal(loaded.status, "loaded");
  if (loaded.status !== "loaded") throw new Error("Expected saved frontier to load.");
  assert.deepEqual(loaded.state.network.pendingFrontier, frontier);

  const boundary = createInitialGameState();
  boundary.lineageLedger = { ...boundary.lineageLedger, networkSeed, frontierSequence: 0 };
  boundary.eventSequence = 4;
  boundary.network = {
    ...boundary.network,
    pendingFrontier: generateNetworkFrontierV1({
      networkSeed,
      globalTier: 0,
      frontierSequence: 0,
      sourceEventSequence: boundary.eventSequence,
    }),
  };
  assert.equal(parseSave(serializeGameState(boundary, 19)).status, "loaded");
  const futureSource = currentEnvelope(boundary);
  futureSource.state.network.pendingFrontier.sourceEventSequence += 1;
  assert.equal(parseSave(JSON.stringify(futureSource)).status, "rejected");

  const forgedPlan = currentEnvelope(state);
  forgedPlan.state.network.pendingFrontier.mandates[0].plannedEdges[0].fromNodeId = "forged-node";
  assert.equal(parseSave(JSON.stringify(forgedPlan)).status, "rejected");

  const dangling = currentEnvelope(state);
  dangling.state.network.pendingFrontier = null;
  dangling.state.network.nodes = [
    {
      id: "authored-node-v1:primary-lab",
      sourceKind: "authored",
      campaignId: null,
      status: "established",
      establishedAtActiveMs: 0,
      stabilizedAtActiveMs: null,
    },
  ];
  dangling.state.network.edges = [
    {
      id: "authored-edge-v1:primary-to-relay",
      fromNodeId: "authored-node-v1:primary-lab",
      toNodeId: "forged-node",
      status: "committed",
      campaignId: null,
    },
  ];
  assert.equal(parseSave(JSON.stringify(dangling)).status, "rejected");
});

test("p7 reloads a retained selected campaign with its saved plan", () => {
  const initial = createInitialGameState();
  let state = {
    ...initial,
    activeTimeMs: 6,
    currentStage: "global_lab_contamination",
    prestigeAvailability: [
      { id: "L3", status: "earned" },
      { id: "L4", status: "earned" },
    ],
    lineageLedger: { ...initial.lineageLedger, networkSeed: 61 },
  };
  for (const node of AUTHORED_NETWORK_NODE_CATALOG) {
    state = recordEvent(state, {
      type: "establish-dissemination-node",
      nodeId: node.id,
      sourceEventSequence: state.eventSequence,
      atMs: state.activeTimeMs,
    });
    state = recordEvent(state, {
      type: "stabilize-network-node",
      nodeId: node.id,
      sourceEventSequence: state.eventSequence,
      atMs: state.activeTimeMs,
    });
  }
  const frontier = state.network.pendingFrontier;
  assert.ok(frontier);
  const selected = recordEvent(state, {
    type: "choose-dissemination-mandate",
    frontierId: frontier.id,
    mandateId: frontier.mandates[1].id,
    sourceEventSequence: state.eventSequence,
    atMs: state.activeTimeMs,
  });
  const loaded = parseSave(serializeGameState(selected, 19));
  assert.equal(loaded.status, "loaded");
  if (loaded.status !== "loaded") throw new Error("Expected selected campaign to reload.");
  assert.deepEqual(loaded.state.network.activeCampaign, selected.network.activeCampaign);

  const shortened = currentEnvelope(selected);
  shortened.state.network.activeCampaign.mandate.generatedNodeIds.pop();
  assert.equal(parseSave(JSON.stringify(shortened)).status, "rejected");
  const extraNode = currentEnvelope(selected);
  extraNode.state.network.nodes.push({
    ...extraNode.state.network.nodes.find((node) => node.sourceKind === "generated"),
    id: "generated-node-v1:61:0:0:1:99",
  });
  assert.equal(parseSave(JSON.stringify(extraNode)).status, "rejected");
  const mismatchedCampaign = currentEnvelope(selected);
  mismatchedCampaign.state.network.nodes.find(
    (node) => node.sourceKind === "generated",
  ).campaignId = "network-campaign-v1:61:0:0:2";
  assert.equal(parseSave(JSON.stringify(mismatchedCampaign)).status, "rejected");
  const forgedArchive = currentEnvelope(selected);
  forgedArchive.state.network.completedCampaigns = [
    {
      ...forgedArchive.state.network.activeCampaign,
      completedAtActiveMs: selected.activeTimeMs,
    },
  ];
  assert.equal(parseSave(JSON.stringify(forgedArchive)).status, "rejected");
});

test("p6 prestige records reject hostile keys, unsafe identity, and noncanonical balances", () => {
  rejectsCurrent((state) => {
    state.lineageLedger.extra = true;
  });
  rejectsCurrent((state) => {
    delete state.hostTransfer.pendingDraft;
  });
  rejectsCurrent((state) => {
    state.lineageLedger.lineageSeed = 0;
  });
  rejectsCurrent((state) => {
    state.lineageLedger.hostRunSequence = Number.MAX_SAFE_INTEGER + 1;
  });
  rejectsCurrent((state) => {
    state.metastasis.allocations = [{ siteId: "bone_marrow", rank: 0 }];
  });
  rejectsCurrent((state) => {
    state.metastasis.metastaticPotential = { mantissa: 10, exponent: 0 };
  });
});

test("p6 accepts canonical multi-site ranks and a saved four-reveal draft after its boon clears", () => {
  const state = createInitialGameState();
  state.metastasis = {
    ...state.metastasis,
    allocations: [
      { siteId: "bone_marrow", rank: 1 },
      { siteId: "liver", rank: 3 },
    ],
    programs: [{ siteId: "bone_marrow", programId: "exploit_niche" }],
    activeNicheContext: {
      siteId: "bone_marrow",
      allocationRank: 1,
      programId: "exploit_niche",
    },
  };
  state.lineageLedger = {
    ...state.lineageLedger,
    hostDraftSequence: 1,
    usedLineageBoonIds: ["extra_card_reveal"],
  };
  const draft = generateHostDraftV1({
    lineageSeed: state.lineageLedger.lineageSeed,
    hostDraftSequence: 1,
    sourceEventSequence: 3,
    purchasedBoons: [{ boonId: "extra_card_reveal", kind: "pre-draft" }],
  });
  state.lineageLedger = {
    ...state.lineageLedger,
    lineageBoonApplications: [
      { boonId: "extra_card_reveal", kind: "pre-draft", draftId: draft.id },
    ],
  };
  state.hostTransfer = { ...state.hostTransfer, pendingDraft: draft };
  state.eventSequence = 4;
  assert.equal(parseSave(serializeGameState(state, 19)).status, "loaded");

  rejectsCurrent((rawState) => {
    rawState.lineageLedger = { ...rawState.lineageLedger, hostDraftSequence: 1 };
    const noBoonDraft = generateHostDraftV1({
      lineageSeed: rawState.lineageLedger.lineageSeed,
      hostDraftSequence: 1,
      sourceEventSequence: 3,
      purchasedBoons: [],
    });
    rawState.hostTransfer = {
      ...rawState.hostTransfer,
      pendingDraft: {
        ...noBoonDraft,
        revealPolicy: "extra-card-reveal",
        revealedCardIds: noBoonDraft.cards.map((card) => card.id),
      },
    };
    rawState.eventSequence = 4;
  });

  rejectsCurrent((rawState) => {
    rawState.lineageLedger = {
      ...rawState.lineageLedger,
      hostDraftSequence: 1,
      usedLineageBoonIds: ["extra_card_reveal"],
      lineageBoonApplications: [
        {
          boonId: "extra_card_reveal",
          draftId: `host-draft-v1:${rawState.lineageLedger.lineageSeed}:1`,
        },
      ],
    };
    const extraDraft = generateHostDraftV1({
      lineageSeed: rawState.lineageLedger.lineageSeed,
      hostDraftSequence: 1,
      sourceEventSequence: 3,
      purchasedBoons: [{ boonId: "extra_card_reveal", kind: "pre-draft" }],
    });
    rawState.hostTransfer = {
      ...rawState.hostTransfer,
      pendingDraft: {
        ...extraDraft,
        revealPolicy: "standard",
        revealedCardIds: extraDraft.cards.slice(0, 3).map((card) => card.id),
      },
    };
    rawState.eventSequence = 4;
  });
});

test("p6 rejects a no-boon draft whose saved three-card reveal is escalated to four", () => {
  const state = createInitialGameState();
  state.lineageLedger = { ...state.lineageLedger, hostDraftSequence: 1 };
  state.eventSequence = 4;
  state.hostTransfer = {
    ...state.hostTransfer,
    pendingDraft: generateHostDraftV1({
      lineageSeed: state.lineageLedger.lineageSeed,
      hostDraftSequence: 1,
      sourceEventSequence: 3,
      purchasedBoons: [],
    }),
  };
  const envelope = currentEnvelope(state);
  envelope.state.hostTransfer.pendingDraft.revealedCardIds.push(
    envelope.state.hostTransfer.pendingDraft.cards[3].id,
  );
  assert.equal(parseSave(JSON.stringify(envelope)).status, "rejected");
});

test("p6 active hosts require their retained consumed draft and identical selected card", () => {
  const state = createInitialGameState();
  state.lineageLedger = {
    ...state.lineageLedger,
    hostRunSequence: 1,
    currentHostRunId: `host-run-v1:${state.lineageLedger.lineageSeed}:1`,
    hostDraftSequence: 1,
  };
  const generated = generateHostDraftV1({
    lineageSeed: state.lineageLedger.lineageSeed,
    hostDraftSequence: 1,
    sourceEventSequence: 3,
    purchasedBoons: [],
  });
  const selected = generated.cards[0];
  state.hostTransfer = {
    ...state.hostTransfer,
    activeHost: { hostRunId: state.lineageLedger.currentHostRunId, card: selected },
    pendingDraft: { ...generated, available: false, consumedCardId: selected.id },
  };
  state.eventSequence = 4;
  assert.equal(parseSave(serializeGameState(state, 19)).status, "loaded");

  rejectsCurrent((rawState) => {
    rawState.lineageLedger = state.lineageLedger;
    rawState.hostTransfer = {
      ...state.hostTransfer,
      activeHost: { ...state.hostTransfer.activeHost, card: { ...selected, id: "forged-card" } },
    };
    rawState.eventSequence = 4;
  });
});

test("p6 effects records require a matching active niche context and typed targeted provenance", () => {
  const state = createInitialGameState();
  state.metastasis = {
    ...state.metastasis,
    allocations: [{ siteId: "bone_marrow", rank: 1 }],
    programs: [{ siteId: "bone_marrow", programId: "exploit_niche" }],
    activeNicheContext: {
      siteId: "bone_marrow",
      allocationRank: 1,
      programId: "exploit_niche",
    },
  };
  assert.equal(parseSave(serializeGameState(state, 19)).status, "loaded");
  rejectsCurrent((rawState) => {
    rawState.metastasis.activeNicheContext = {
      siteId: "bone_marrow",
      allocationRank: 2,
      programId: "exploit_niche",
    };
  });

  state.lineageLedger = {
    ...state.lineageLedger,
    hostRunSequence: 1,
    currentHostRunId: `host-run-v1:${state.lineageLedger.lineageSeed}:1`,
    hostDraftSequence: 1,
    usedLineageBoonIds: ["reduced_trait_liability"],
  };
  const draft = generateHostDraftV1({
    lineageSeed: state.lineageLedger.lineageSeed,
    hostDraftSequence: 1,
    sourceEventSequence: 3,
    purchasedBoons: [],
  });
  const selected = draft.cards[0];
  state.lineageLedger = {
    ...state.lineageLedger,
    lineageBoonApplications: [
      {
        boonId: "reduced_trait_liability",
        kind: "targeted-active-host",
        draftId: draft.id,
        hostRunId: state.lineageLedger.currentHostRunId,
        cardId: selected.id,
        targetTraitId: selected.immuneRegime,
      },
    ],
  };
  state.hostTransfer = {
    ...state.hostTransfer,
    activeHost: { hostRunId: state.lineageLedger.currentHostRunId, card: selected },
    pendingDraft: { ...draft, available: false, consumedCardId: selected.id },
  };
  state.eventSequence = 4;
  assert.equal(parseSave(serializeGameState(state, 19)).status, "loaded");
  rejectsCurrent((rawState) => {
    rawState.lineageLedger = structuredClone(state.lineageLedger);
    rawState.hostTransfer = structuredClone(state.hostTransfer);
    rawState.eventSequence = 4;
    rawState.lineageLedger.lineageBoonApplications[0].targetTraitId = "foreign-trait";
  });
  const wrongHost = currentEnvelope(state);
  wrongHost.state.lineageLedger.lineageBoonApplications[0].hostRunId = "host-run-v1:1:99";
  assert.equal(parseSave(JSON.stringify(wrongHost)).status, "rejected");
  const wrongDraft = currentEnvelope(state);
  wrongDraft.state.lineageLedger.lineageBoonApplications[0].draftId = "host-draft-v1:1:99";
  assert.equal(parseSave(JSON.stringify(wrongDraft)).status, "rejected");
});

test("p6 retains a valid targeted application from a prior host run without rewriting its provenance", () => {
  const state = createInitialGameState();
  const seed = state.lineageLedger.lineageSeed;
  const priorDraftId = `host-draft-v1:${seed}:1`;
  state.lineageLedger = {
    ...state.lineageLedger,
    hostRunSequence: 2,
    currentHostRunId: `host-run-v1:${seed}:2`,
    hostDraftSequence: 2,
    usedLineageBoonIds: ["reduced_trait_liability"],
    lineageBoonApplications: [
      {
        boonId: "reduced_trait_liability",
        kind: "targeted-active-host",
        draftId: priorDraftId,
        hostRunId: `host-run-v1:${seed}:1`,
        cardId: `${priorDraftId}:0`,
        targetTraitId: "immune-ordinary",
      },
    ],
  };
  const currentDraft = generateHostDraftV1({
    lineageSeed: seed,
    hostDraftSequence: 2,
    sourceEventSequence: 5,
    purchasedBoons: [],
  });
  const selected = currentDraft.cards[1];
  state.hostTransfer = {
    ...state.hostTransfer,
    activeHost: { hostRunId: state.lineageLedger.currentHostRunId, card: selected },
    pendingDraft: { ...currentDraft, available: false, consumedCardId: selected.id },
  };
  state.eventSequence = 6;
  assert.equal(parseSave(serializeGameState(state, 19)).status, "loaded");

  const forgedCard = currentEnvelope(state);
  forgedCard.state.lineageLedger.lineageBoonApplications[0].cardId = `${priorDraftId}:4`;
  assert.equal(parseSave(JSON.stringify(forgedCard)).status, "rejected");
  const forgedHost = currentEnvelope(state);
  forgedHost.state.lineageLedger.lineageBoonApplications[0].hostRunId = `host-run-v1:${seed}:3`;
  assert.equal(parseSave(JSON.stringify(forgedHost)).status, "rejected");
});

test("prestige parsing and writer validation reject accessors without invoking their getters", () => {
  const state = createInitialGameState();
  let reads = 0;
  const hostileLedger = { ...state.lineageLedger };
  Object.defineProperty(hostileLedger, "lineageSeed", {
    enumerable: true,
    get: () => {
      reads += 1;
      return state.lineageLedger.lineageSeed;
    },
  });
  assert.equal(
    parsePrestige(
      {
        lineageLedger: hostileLedger,
        metastasis: state.metastasis,
        hostTransfer: state.hostTransfer,
      },
      state,
    ),
    undefined,
  );
  assert.equal(reads, 0);
  assert.throws(
    () => serializeGameState({ ...state, lineageLedger: hostileLedger }, 19),
    /State must contain own data properties/,
  );
  assert.equal(reads, 0);

  const hostileState = { ...state };
  Object.defineProperty(hostileState, "cells", {
    enumerable: true,
    get: () => {
      reads += 1;
      return state.cells;
    },
  });
  assert.throws(
    () => serializeGameState(hostileState, 19),
    /State must contain own data properties/,
  );
  assert.equal(reads, 0);
});

test("p6 prestige catalog lists and host graph reject noncanonical or incoherent relations", () => {
  rejectsCurrent((state) => {
    state.lineageLedger.organTagsSeen = [organTagId("pulmonary"), organTagId("hepatic")];
  });
  rejectsCurrent((state) => {
    state.hostTransfer.activeHost = {
      hostRunId: "host-run-v1:1:1",
      card: {
        id: "foreign-card",
        immuneRegime: "immune-ordinary",
        tissueEcology: "ecology-vascular",
        hostHorizon: "horizon-ordinary",
      },
    };
  });
  rejectsCurrent((state) => {
    state.hostTransfer.pendingDraft = {
      id: "host-draft-v1:1:1",
      sourceSeed: 1,
      sourceEventSequence: 0,
      cards: [],
      revealedCardIds: [],
      available: true,
      consumedCardId: null,
    };
  });
});
