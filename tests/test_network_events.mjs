import assert from "node:assert/strict";
import test from "node:test";
import { createInitialGameState } from "../src/state/game_state.ts";
import { recordEvent } from "../src/state/events.ts";
import { AUTHORED_NETWORK_NODE_CATALOG } from "../src/prestige/network.ts";
import { networkNodeCreditQuote } from "../src/prestige/network_effects.ts";
import { passageUpgradeId } from "../src/brands.ts";

function event(state, type, fields) {
  return recordEvent(state, {
    type,
    ...fields,
    sourceEventSequence: state.eventSequence,
    atMs: state.activeTimeMs,
  });
}

test("authored topology creates one saved frontier and rejects duplicate node credit atomically", () => {
  const initial = createInitialGameState();
  let state = {
    ...initial,
    activeTimeMs: 6,
    currentStage: "global_lab_contamination",
    prestigeAvailability: [
      { id: "L3", status: "earned" },
      { id: "L4", status: "earned" },
    ],
    lineageLedger: { ...initial.lineageLedger, networkSeed: 41 },
  };
  for (const node of AUTHORED_NETWORK_NODE_CATALOG)
    state = event(state, "establish-dissemination-node", { nodeId: node.id });
  for (const node of AUTHORED_NETWORK_NODE_CATALOG)
    state = event(state, "stabilize-network-node", { nodeId: node.id });
  assert.equal(state.network.pendingFrontier?.mandates.length, 3);
  const stableNode = AUTHORED_NETWORK_NODE_CATALOG[0];
  const quote = networkNodeCreditQuote(state, stableNode.id);
  assert.equal(quote.available, true);
  const credited = event(state, "collect-transmission-pressure", { nodeId: stableNode.id });
  assert.equal(credited.network.transmissionPressure.mantissa, quote.credit);
  assert.equal(credited.lineageLedger.stabilizedRewardedNodeIds.includes(stableNode.id), true);
  const snapshot = structuredClone(credited);
  assert.throws(
    () => event(credited, "collect-transmission-pressure", { nodeId: stableNode.id }),
    /unavailable/,
  );
  assert.deepEqual(credited, snapshot);
});

test("a selected saved mandate retires alternatives and begins exactly one campaign", () => {
  const initial = createInitialGameState();
  let state = {
    ...initial,
    activeTimeMs: 9,
    currentStage: "global_lab_contamination",
    prestigeAvailability: [
      { id: "L3", status: "earned" },
      { id: "L4", status: "earned" },
    ],
    lineageLedger: { ...initial.lineageLedger, networkSeed: 51 },
  };
  for (const node of AUTHORED_NETWORK_NODE_CATALOG)
    state = event(state, "establish-dissemination-node", { nodeId: node.id });
  for (const node of AUTHORED_NETWORK_NODE_CATALOG)
    state = event(state, "stabilize-network-node", { nodeId: node.id });
  const frontier = state.network.pendingFrontier;
  assert.ok(frontier);
  const afterPressure = event(state, "collect-transmission-pressure", {
    nodeId: AUTHORED_NETWORK_NODE_CATALOG[0].id,
  });
  const staleSnapshot = structuredClone(afterPressure);
  assert.throws(
    () =>
      recordEvent(afterPressure, {
        type: "choose-dissemination-mandate",
        frontierId: frontier.id,
        mandateId: frontier.mandates[1].id,
        sourceEventSequence: state.eventSequence,
        atMs: afterPressure.activeTimeMs,
      }),
    /stale/,
  );
  assert.deepEqual(afterPressure, staleSnapshot);
  const after = event(afterPressure, "choose-dissemination-mandate", {
    frontierId: frontier.id,
    mandateId: frontier.mandates[1].id,
  });
  assert.equal(after.network.pendingFrontier, null);
  assert.equal(after.network.activeCampaign?.mandate.id, frontier.mandates[1].id);
  assert.equal(
    after.network.nodes.some((node) => node.campaignId === frontier.mandates[1].campaignId),
    true,
  );
  const plannedEdge = frontier.mandates[1].plannedEdges[0];
  assert.ok(plannedEdge);
  const forged = {
    ...after,
    network: {
      ...after.network,
      edges: after.network.edges.map((edge) =>
        edge.id === plannedEdge.id
          ? { ...edge, toNodeId: AUTHORED_NETWORK_NODE_CATALOG[0].id }
          : edge,
      ),
    },
  };
  const forgedSnapshot = structuredClone(forged);
  assert.throws(
    () => event(forged, "commit-dissemination-edge", { edgeId: plannedEdge.id }),
    /unavailable/,
  );
  assert.deepEqual(forged, forgedSnapshot);
  const committed = event(after, "commit-dissemination-edge", { edgeId: plannedEdge.id });
  assert.equal(
    committed.network.edges.find((edge) => edge.id === plannedEdge.id)?.status,
    "committed",
  );
});

test("a completed selected plan retires itself once, advances tier, and saves the next frontier", () => {
  const initial = createInitialGameState();
  let state = {
    ...initial,
    activeTimeMs: 12,
    currentStage: "global_lab_contamination",
    prestigeAvailability: [
      { id: "L3", status: "earned" },
      { id: "L4", status: "earned" },
    ],
    lineageLedger: { ...initial.lineageLedger, networkSeed: 71 },
  };
  for (const node of AUTHORED_NETWORK_NODE_CATALOG)
    state = event(state, "establish-dissemination-node", { nodeId: node.id });
  for (const node of AUTHORED_NETWORK_NODE_CATALOG)
    state = event(state, "stabilize-network-node", { nodeId: node.id });
  const frontier = state.network.pendingFrontier;
  assert.ok(frontier);
  const selected = event(state, "choose-dissemination-mandate", {
    frontierId: frontier.id,
    mandateId: frontier.mandates[0].id,
  });
  const generatedNodeId = frontier.mandates[0].generatedNodeIds[0];
  assert.ok(generatedNodeId);
  const completed = event(selected, "stabilize-network-node", { nodeId: generatedNodeId });
  assert.equal(completed.network.globalTier, 1);
  assert.equal(completed.network.activeCampaign, null);
  assert.equal(completed.network.completedCampaigns[0]?.mandate.id, frontier.mandates[0].id);
  assert.equal(completed.network.pendingFrontier?.globalTier, 1);
});

test("containment selects one real saved node and replaces only that local target", () => {
  const initial = createInitialGameState();
  const node = AUTHORED_NETWORK_NODE_CATALOG[0];
  assert.ok(node);
  const state = {
    ...initial,
    activeTimeMs: 2,
    currentStage: "global_lab_contamination",
    prestigeAvailability: [
      { id: "L3", status: "earned" },
      { id: "L4", status: "earned" },
    ],
    culture: {
      ...initial.culture,
      purchasedPassageUpgrades: [{ upgradeId: passageUpgradeId("containment"), rank: 1 }],
    },
    lineageLedger: { ...initial.lineageLedger, networkSeed: 3 },
    network: {
      ...initial.network,
      nodes: [
        {
          id: node.id,
          sourceKind: "authored",
          campaignId: null,
          status: "established",
          establishedAtActiveMs: 2,
          stabilizedAtActiveMs: null,
        },
      ],
    },
  };
  const selected = event(state, "select-containment-node", { nodeId: node.id });
  assert.equal(selected.network.containedNodeId, node.id);
});

test("network actions reject missing L4 authority atomically", () => {
  const initial = createInitialGameState();
  const state = {
    ...initial,
    activeTimeMs: 3,
    currentStage: "global_lab_contamination",
    prestigeAvailability: [{ id: "L3", status: "earned" }],
    lineageLedger: { ...initial.lineageLedger, networkSeed: 9 },
  };
  const snapshot = structuredClone(state);
  assert.throws(
    () =>
      event(state, "establish-dissemination-node", { nodeId: AUTHORED_NETWORK_NODE_CATALOG[0].id }),
    /unavailable/,
  );
  assert.deepEqual(state, snapshot);
});
