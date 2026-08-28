import assert from "node:assert/strict";
import test from "node:test";

import { networkNodeId } from "../src/brands.ts";
import {
  AUTHORED_NETWORK_EDGE_CATALOG,
  AUTHORED_NETWORK_NODE_CATALOG,
  activeCampaignCompletion,
  completeActiveCampaignWithRenewal,
  containmentNodeEffect,
  createEmptyNetworkState,
  findAuthoredNetworkNode,
  findFrontierMandate,
  generateNetworkFrontierV1,
  hasValidActiveNetworkCampaign,
  hasValidMandatePlan,
  hasValidNetworkFrontier,
  isReachableAuthoredTopologyComplete,
  networkFrontierSource,
} from "../src/prestige/network.ts";

function frontierInput(tier) {
  return {
    networkSeed: 47,
    globalTier: tier,
    frontierSequence: tier,
    sourceEventSequence: 11 + tier,
  };
}

test("network catalogs are frozen, unique, and graph-valid", () => {
  assert.equal(Object.isFrozen(AUTHORED_NETWORK_NODE_CATALOG), true);
  assert.equal(Object.isFrozen(AUTHORED_NETWORK_NODE_CATALOG[0]?.adjacencyTags), true);
  assert.equal(Object.isFrozen(AUTHORED_NETWORK_EDGE_CATALOG), true);
  assert.equal(
    new Set(AUTHORED_NETWORK_NODE_CATALOG.map((node) => node.id)).size,
    AUTHORED_NETWORK_NODE_CATALOG.length,
  );
  const nodeIds = new Set(AUTHORED_NETWORK_NODE_CATALOG.map((node) => node.id));
  assert.equal(
    new Set(AUTHORED_NETWORK_EDGE_CATALOG.map((edge) => edge.id)).size,
    AUTHORED_NETWORK_EDGE_CATALOG.length,
  );
  for (const edge of AUTHORED_NETWORK_EDGE_CATALOG) {
    assert.equal(nodeIds.has(edge.fromNodeId), true);
    assert.equal(nodeIds.has(edge.toNodeId), true);
  }
});

test("frontier generation is deterministic, ordered, and seed-tier sensitive", () => {
  const input = Object.freeze(frontierInput(3));
  const first = generateNetworkFrontierV1(input);
  const repeat = generateNetworkFrontierV1({ ...input });
  const later = generateNetworkFrontierV1(frontierInput(4));
  const differentSeed = generateNetworkFrontierV1({ ...input, networkSeed: 48 });
  assert.deepEqual(first, repeat);
  assert.notEqual(first.id, later.id);
  assert.deepEqual(
    first.mandates.map((mandate) => mandate.category),
    ["deepen", "widen", "reroute"],
  );
  assert.equal(new Set(first.mandates.map((mandate) => mandate.id)).size, 3);
  assert.equal(Object.isFrozen(first), true);
  assert.equal(Object.isFrozen(first.mandates[0]?.generatedNodeIds), true);
  assert.equal(Object.isFrozen(first.mandates[0]?.plannedEdges), true);
  assert.equal(Object.isFrozen(first.mandates[0]?.plannedEdges[0]), true);
  assert.notDeepEqual(first.mandates[0]?.generatedNodeIds, later.mandates[0]?.generatedNodeIds);
  assert.notEqual(first.sourceSeed, differentSeed.sourceSeed);
  assert.deepEqual(input, {
    networkSeed: 47,
    globalTier: 3,
    frontierSequence: 3,
    sourceEventSequence: 14,
  });
});

test("each renewable tier has three structurally distinct topology choices", () => {
  for (let tier = 0; tier < 30; tier += 1) {
    const frontier = generateNetworkFrontierV1(frontierInput(tier));
    const categories = new Set(frontier.mandates.map((mandate) => mandate.category));
    const predicates = new Set(frontier.mandates.map((mandate) => mandate.completionPredicate));
    const anchors = new Set(
      frontier.mandates.map((mandate) => mandate.plannedEdges[0]?.fromNodeId),
    );
    const edgeIds = new Set();
    assert.equal(categories.size, 3);
    assert.equal(predicates.size, 3);
    assert.equal(anchors.size, 3);
    for (const mandate of frontier.mandates) {
      assert.ok(mandate.generatedNodeIds.length >= 1);
      assert.equal(mandate.generatedNodeIds.length, mandate.plannedEdges.length);
      assert.equal(new Set(mandate.generatedNodeIds).size, mandate.generatedNodeIds.length);
      assert.equal(hasValidMandatePlan(mandate), true);
      for (const edge of mandate.plannedEdges) {
        assert.equal(edge.fromNodeId === edge.toNodeId, false);
        assert.equal(edgeIds.has(edge.id), false);
        edgeIds.add(edge.id);
        const generatedIds = new Set(mandate.generatedNodeIds);
        assert.equal(
          generatedIds.has(edge.fromNodeId) ||
            findAuthoredNetworkNode(edge.fromNodeId) !== undefined,
          true,
        );
        assert.equal(generatedIds.has(edge.toNodeId), true);
      }
    }
    assert.equal(hasValidNetworkFrontier(frontier), true);
    assert.equal(findFrontierMandate(frontier, frontier.mandates[1].id)?.category, "widen");
  }
});

test("authored topology completion uses stable authored nodes rather than credits", () => {
  const empty = createEmptyNetworkState();
  assert.equal(isReachableAuthoredTopologyComplete(empty), false);
  const threeStable = AUTHORED_NETWORK_NODE_CATALOG.slice(0, 3).map((definition) => ({
    id: definition.id,
    sourceKind: "authored",
    campaignId: null,
    status: "stable",
    establishedAtActiveMs: 1,
    stabilizedAtActiveMs: 2,
  }));
  assert.equal(isReachableAuthoredTopologyComplete({ ...empty, nodes: threeStable }), false);
  const allStable = AUTHORED_NETWORK_NODE_CATALOG.map((definition) => ({
    id: definition.id,
    sourceKind: "authored",
    campaignId: null,
    status: "stable",
    establishedAtActiveMs: 1,
    stabilizedAtActiveMs: 2,
  }));
  assert.equal(isReachableAuthoredTopologyComplete({ ...empty, nodes: allStable }), true);
  assert.notEqual(networkNodeId("unrelated"), AUTHORED_NETWORK_NODE_CATALOG[0]?.id);
});

function selectedCampaign(frontier, ordinal) {
  const mandate = frontier.mandates[ordinal];
  if (!mandate) throw new Error("Expected generated mandate.");
  return Object.freeze({
    sourceFrontier: networkFrontierSource(frontier),
    mandate: Object.freeze({ ...mandate, status: "selected" }),
    selectedAtActiveMs: 8,
  });
}

test("each campaign predicate requires its stated durable node or edge action", () => {
  const frontier = generateNetworkFrontierV1(frontierInput(7));
  const categories = ["deepen", "widen", "reroute"];
  for (const [ordinal, category] of categories.entries()) {
    const campaign = selectedCampaign(frontier, ordinal);
    const mandate = campaign.mandate;
    const base = { ...createEmptyNetworkState(), activeCampaign: campaign };
    assert.equal(hasValidActiveNetworkCampaign(campaign), true);
    assert.equal(activeCampaignCompletion(base), false);
    assert.equal(
      activeCampaignCompletion({
        ...base,
        activeCampaign: { ...campaign, mandate: { ...mandate, status: "pending" } },
      }),
      false,
    );
    let proposed;
    if (category === "widen") {
      const edge = mandate.plannedEdges[0];
      if (!edge) throw new Error("Expected planned edge.");
      proposed = {
        ...base,
        edges: [
          {
            ...edge,
            status: "committed",
            campaignId: mandate.campaignId,
          },
        ],
      };
    } else {
      const nodeId =
        category === "reroute"
          ? mandate.plannedEdges.find(
              (edge) => edge.fromNodeId === "authored-node-v1:protected-enclave",
            )?.toNodeId
          : mandate.generatedNodeIds[0];
      if (!nodeId) throw new Error("Expected completion node.");
      proposed = {
        ...base,
        nodes: [
          {
            id: nodeId,
            sourceKind: "generated",
            campaignId: mandate.campaignId,
            status: "stable",
            establishedAtActiveMs: 7,
            stabilizedAtActiveMs: 8,
          },
        ],
      };
    }
    assert.equal(activeCampaignCompletion(proposed), true);
    const completed = completeActiveCampaignWithRenewal(proposed, {
      atMs: 8,
      networkSeed: 47,
      frontierSequence: 8,
      sourceEventSequence: 19,
    });
    assert.equal(completed?.globalTier, 1);
    assert.equal(completed?.activeCampaign, null);
    assert.equal(completed?.pendingFrontier?.globalTier, 1);
    assert.equal(completed?.completedCampaigns[0]?.mandate.id, mandate.id);
    assert.equal(completed?.completedCampaigns[0]?.completedAtActiveMs, 8);
  }
});

test("completed campaigns retain a canonical multi-tier source history", () => {
  let network = createEmptyNetworkState();
  let frontier = generateNetworkFrontierV1(frontierInput(0));
  for (let tier = 0; tier < 3; tier += 1) {
    const campaign = selectedCampaign(frontier, 0);
    const completionNodeId = campaign.mandate.generatedNodeIds[0];
    if (!completionNodeId) throw new Error("Expected deepen completion node.");
    network = {
      ...network,
      pendingFrontier: null,
      activeCampaign: campaign,
      nodes: [
        ...network.nodes,
        {
          id: completionNodeId,
          sourceKind: "generated",
          campaignId: campaign.mandate.campaignId,
          status: "stable",
          establishedAtActiveMs: tier * 10,
          stabilizedAtActiveMs: tier * 10 + 1,
        },
      ],
    };
    const renewed = completeActiveCampaignWithRenewal(network, {
      atMs: tier * 10 + 1,
      networkSeed: 47,
      frontierSequence: tier + 1,
      sourceEventSequence: tier + 20,
    });
    if (!renewed?.pendingFrontier) throw new Error("Expected next frontier.");
    network = renewed;
    frontier = renewed.pendingFrontier;
  }
  assert.equal(network.globalTier, 3);
  assert.equal(network.completedCampaigns.length, 3);
  assert.deepEqual(
    network.completedCampaigns.map((campaign) => campaign.sourceFrontier.globalTier),
    [0, 1, 2],
  );
  assert.equal(Object.isFrozen(network.completedCampaigns), true);
  assert.equal(Object.isFrozen(network.completedCampaigns[0]?.sourceFrontier), true);
});

test("containment selector changes only the saved selected node", () => {
  const empty = createEmptyNetworkState();
  const selected = AUTHORED_NETWORK_NODE_CATALOG[0]?.id;
  const other = AUTHORED_NETWORK_NODE_CATALOG[1]?.id;
  if (!selected || !other) throw new Error("Expected authored nodes.");
  const contained = { ...empty, containedNodeId: selected };
  assert.deepEqual(containmentNodeEffect(contained, selected), {
    throughputMultiplier: 0.85,
    detectionDelta: -0.12,
  });
  assert.deepEqual(containmentNodeEffect(contained, other), {
    throughputMultiplier: 1,
    detectionDelta: 0,
  });
  assert.equal(Object.isFrozen(containmentNodeEffect(contained, selected)), true);
});
