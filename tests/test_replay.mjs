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
import { AUTHORED_NETWORK_NODE_CATALOG } from "../src/prestige/network.ts";
import { generateHostDraftV1 } from "../src/prestige/hosts.ts";
import { createInitialGameState } from "../src/state/game_state.ts";
import { CURRENT_STATE_SCHEMA_VERSION } from "../src/state/save_load.ts";
import {
  createReplayRecorder,
  MAX_REPLAY_ENTRIES,
  parseReplayLog,
  replayLog,
} from "../src/state/replay.ts";
import { recordEvent } from "../src/state/events.ts";

const RUNTIME = Object.freeze({
  stateSchemaVersion: CURRENT_STATE_SCHEMA_VERSION,
  semanticRevision: "replay-semantic-v1",
  sourceRevision: "replay-test-build-v1",
});

function recordedDivisionLog() {
  const initial = createInitialGameState();
  const recorder = createReplayRecorder(initial, 1_000, RUNTIME);
  const first = recordEvent(initial, { type: "click-divide", atMs: 0 });
  const second = recordEvent(first, { type: "click-divide", atMs: 0 });
  recorder.recordAccepted({ type: "click-divide", atMs: 0 }, first, 1_005);
  recorder.recordAccepted({ type: "click-divide", atMs: 0 }, second, 1_005);
  return recorder.snapshot();
}

function recordedMixedProgressionLog() {
  const initialState = createInitialGameState();
  let state = {
    ...initialState,
    cells: bigNum(1, 8),
    activeTimeMs: 6,
    currentStage: "global_lab_contamination",
    hallmarkLevels: [{ id: hallmarkId("proliferative_signaling"), level: 1 }],
    prestigeAvailability: [
      { id: "L3", status: "earned" },
      { id: "L4", status: "earned" },
    ],
    culture: {
      ...initialState.culture,
      purchasedPassageUpgrades: [{ upgradeId: passageUpgradeId("containment"), rank: 1 }],
    },
    lineageLedger: {
      ...initialState.lineageLedger,
      completedHostTransferCount: 1,
      networkSeed: 41,
    },
  };
  const recorder = createReplayRecorder(state, 1_000, RUNTIME);
  let recordedAtMs = 1_001;
  function accept(event) {
    state = recordEvent(state, event);
    recorder.recordAccepted(event, state, recordedAtMs);
    recordedAtMs += 1;
  }
  accept({
    type: "purchase-producer",
    producerId: "producer",
    quantity: 1,
    execution: "manual",
    atMs: 6,
  });
  accept({ type: "set-signaling-allocation", allocation: "cycle", atMs: 6 });
  accept({
    type: "apply-offline-accrual",
    elapsedMs: 0,
    atMs: 6,
    resourceSnapshot: { cells: state.cells, substrate: state.substrate, atp: state.atp },
    newlyObservedProgression: [],
  });
  for (const node of AUTHORED_NETWORK_NODE_CATALOG) {
    accept({
      type: "establish-dissemination-node",
      nodeId: node.id,
      sourceEventSequence: state.eventSequence,
      atMs: 6,
    });
  }
  for (const node of AUTHORED_NETWORK_NODE_CATALOG) {
    accept({
      type: "stabilize-network-node",
      nodeId: node.id,
      sourceEventSequence: state.eventSequence,
      atMs: 6,
    });
  }
  const frontier = state.network.pendingFrontier;
  assert.ok(frontier);
  accept({
    type: "choose-dissemination-mandate",
    frontierId: frontier.id,
    mandateId: frontier.mandates[1].id,
    sourceEventSequence: state.eventSequence,
    atMs: 6,
  });
  const stableNode = AUTHORED_NETWORK_NODE_CATALOG[0];
  assert.ok(stableNode);
  accept({
    type: "collect-transmission-pressure",
    nodeId: stableNode.id,
    sourceEventSequence: state.eventSequence,
    atMs: 6,
  });
  accept({
    type: "select-containment-node",
    nodeId: stableNode.id,
    sourceEventSequence: state.eventSequence,
    atMs: 6,
  });
  const plannedEdge = frontier.mandates[1].plannedEdges[0];
  assert.ok(plannedEdge);
  accept({
    type: "commit-dissemination-edge",
    edgeId: plannedEdge.id,
    sourceEventSequence: state.eventSequence,
    atMs: 6,
  });
  return recorder.snapshot();
}

function recordedCultureProgressionLog() {
  const initialState = createInitialGameState();
  const lineageSeed = initialState.lineageLedger.lineageSeed;
  const runId = hostRunId(`host-run-v1:${lineageSeed}:1`);
  const generatedDraft = generateHostDraftV1({
    lineageSeed,
    hostDraftSequence: 1,
    sourceEventSequence: 0,
    purchasedBoons: [],
  });
  const selectedCard = generatedDraft.cards[0];
  const selectedDraft = {
    ...generatedDraft,
    revealPolicy: "extra-card-reveal",
    revealedCardIds: generatedDraft.cards.map((card) => card.id),
    available: false,
    consumedCardId: selectedCard.id,
  };
  let state = {
    ...initialState,
    cells: bigNum(9, 3),
    atp: bigNum(7, 0),
    activeTimeMs: 80,
    totalOfflineMs: 12,
    eventSequence: 1,
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
      ...initialState.metastasis,
      metastaticPotential: bigNum(9, 0),
      allocations: [{ siteId: "liver", rank: 1 }],
      programs: [{ siteId: "liver", programId: "exploit_niche" }],
      activeNicheContext: { siteId: "liver", allocationRank: 1, programId: "exploit_niche" },
    },
    hostTransfer: {
      hostImprints: 5,
      purchasedBoons: [],
      activeHost: {
        hostRunId: runId,
        card: selectedCard,
      },
      pendingDraft: selectedDraft,
    },
    lineageLedger: {
      ...initialState.lineageLedger,
      hostRunSequence: 1,
      hostDraftSequence: 1,
      currentHostRunId: runId,
      completedHostTransferCount: 1,
      usedLineageBoonIds: ["extra_card_reveal"],
      lineageBoonApplications: [
        { boonId: "extra_card_reveal", kind: "pre-draft", draftId: generatedDraft.id },
      ],
      chosenHallmarksAcrossLineage: [
        "proliferative_signaling",
        "cell_death_resistance",
        "replicative_immortality",
        "angiogenesis",
      ],
      terminalPreparation: { hostRunId: runId, eligible: true, assessedAtActiveMs: 80 },
    },
  };
  const recorder = createReplayRecorder(state, 2_000, RUNTIME);
  let recordedAtMs = 2_001;
  function accept(event) {
    state = recordEvent(state, event);
    recorder.recordAccepted(event, state, recordedAtMs);
    recordedAtMs += 1;
  }
  accept({
    type: "perform-immortalization",
    cryobankProgramId: "cryobank_exploit",
    sourceEventSequence: state.eventSequence,
    atMs: 80,
  });
  accept({
    type: "select-cryobank-program",
    cryobankProgramId: "cryobank_occult",
    sourceEventSequence: state.eventSequence,
    atMs: 80,
  });
  return recorder.snapshot();
}

function recordedAssayQueueLog() {
  const initialState = createInitialGameState();
  let state = {
    ...initialState,
    cells: bigNum(1, 8),
    activeTimeMs: 6,
    culture: {
      ...initialState.culture,
      purchasedPassageUpgrades: [{ upgradeId: passageUpgradeId("assay_discipline"), rank: 1 }],
    },
  };
  const recorder = createReplayRecorder(state, 3_000, RUNTIME);
  const event = {
    type: "queue-assay-producer-action",
    producerId: producerId("producer"),
    sourceEventSequence: state.eventSequence,
    atMs: state.activeTimeMs,
  };
  state = recordEvent(state, event);
  recorder.recordAccepted(event, state, 3_001);
  return recorder.snapshot();
}

test("semantic replay records same-time accepted events and reaches their normalized outcome", () => {
  const log = recordedDivisionLog();
  const replayed = replayLog(log, RUNTIME);
  assert.equal(replayed.kind, "replayed");
  assert.equal(replayed.finalState.eventSequence, 2);
  assert.equal(replayed.finalVisibleProgression.currentStageId, "transformed_cell");
});

test("replay parser accepts data reordered independently from semantic object order", () => {
  const log = recordedDivisionLog();
  const reordered = {
    entries: log.entries.map((entry) => ({
      outcome: entry.outcome,
      event: entry.event,
      recordedOffsetMs: entry.recordedOffsetMs,
    })),
    initialDurableState: log.initialDurableState,
    seed: log.seed,
    startedAtMs: log.startedAtMs,
    source: {
      sourceRevision: log.source.sourceRevision,
      semanticRevision: log.source.semanticRevision,
      stateSchemaVersion: log.source.stateSchemaVersion,
      formatVersion: log.source.formatVersion,
    },
  };
  const parsed = parseReplayLog(reordered, RUNTIME);
  assert.equal(parsed.kind, "accepted");
  if (parsed.kind === "accepted") assert.equal(replayLog(parsed.log, RUNTIME).kind, "replayed");
});

test("semantic replay transports the accepted culture and network event inventory", () => {
  const networkReplay = replayLog(recordedMixedProgressionLog(), RUNTIME);
  assert.equal(networkReplay.kind, "replayed");
  const durableNetwork = networkReplay.finalState.network;
  assert.equal(typeof durableNetwork, "object");
  assert.notEqual(durableNetwork, null);
  assert.equal(durableNetwork.containedNodeId !== null, true);
  assert.equal(networkReplay.finalVisibleProgression.network.activeMandateId, null);
  assert.equal(networkReplay.finalVisibleProgression.network.pendingFrontierId !== null, true);
  assert.equal(
    networkReplay.finalVisibleProgression.network.transmissionPressure.mantissa > 0,
    true,
  );

  const cultureReplay = replayLog(recordedCultureProgressionLog(), RUNTIME);
  assert.equal(cultureReplay.kind, "replayed");
  assert.equal(cultureReplay.finalVisibleProgression.currentStageId, "immortalized_culture");
  assert.equal(cultureReplay.finalVisibleProgression.culture.cryobankProgramId, "cryobank_occult");

  const assayReplay = replayLog(recordedAssayQueueLog(), RUNTIME);
  assert.equal(assayReplay.kind, "replayed");
  assert.equal(assayReplay.finalVisibleProgression.culture.queuedProducerId, "producer");
});

test("replay rejects hostile records, oversized arrays, and nonmonotonic offsets before reduction", () => {
  const log = recordedDivisionLog();
  const accessor = { ...log };
  Object.defineProperty(accessor, "seed", { enumerable: true, get: () => log.seed });
  assert.equal(parseReplayLog(accessor, RUNTIME).kind, "rejected");
  assert.equal(
    parseReplayLog({ ...log, entries: Array(MAX_REPLAY_ENTRIES + 1) }, RUNTIME).code,
    "oversized-log",
  );
  const backwards = {
    ...log,
    entries: [log.entries[0], { ...log.entries[1], recordedOffsetMs: 0 }],
  };
  assert.equal(parseReplayLog(backwards, RUNTIME).code, "invalid-event");
  assert.equal(parseReplayLog({ ...log, unknown: "forged" }, RUNTIME).code, "invalid-log");
  assert.equal(parseReplayLog(Object.create(log), RUNTIME).code, "invalid-log");
  const malformedProjection = {
    ...log,
    entries: [
      {
        ...log.entries[0],
        outcome: {
          ...log.entries[0].outcome,
          visibleProgression: { ...log.entries[0].outcome.visibleProgression, unexpected: true },
        },
      },
    ],
  };
  assert.equal(parseReplayLog(malformedProjection, RUNTIME).code, "invalid-event");
});

test("replay reports stale behavior, build source, seed, and semantic outcome mismatches", () => {
  const log = recordedDivisionLog();
  assert.equal(
    replayLog(log, { ...RUNTIME, semanticRevision: "replay-semantic-v2" }).code,
    "stale-trace",
  );
  assert.equal(
    replayLog(log, { ...RUNTIME, sourceRevision: "other-build" }).code,
    "source-mismatch",
  );
  assert.equal(replayLog({ ...log, seed: 7 }, RUNTIME).code, "seed-mismatch");
  const forged = {
    ...log,
    entries: [
      {
        ...log.entries[0],
        outcome: { ...log.entries[0].outcome, eventSequence: 99 },
      },
      log.entries[1],
    ],
  };
  assert.equal(replayLog(forged, RUNTIME).code, "outcome-mismatch");

  const forgedDurableState = structuredClone(log);
  const firstOutcome = forgedDurableState.entries[0].outcome;
  firstOutcome.normalizedDurableState.cells = {
    ...firstOutcome.normalizedDurableState.cells,
    mantissa: firstOutcome.normalizedDurableState.cells.mantissa + 1,
  };
  assert.equal(replayLog(forgedDurableState, RUNTIME).code, "outcome-mismatch");
});
