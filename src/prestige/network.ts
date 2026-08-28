import {
  disseminationMandateId,
  networkCampaignId,
  networkEdgeId,
  networkFrontierId,
  networkNodeId,
} from "../brands.js";
import { bigNum } from "../brands.js";
import { deriveSeedV1, mulberry32V1 } from "../state/deterministic_random.js";
import type { BigNum } from "../types/bignum.js";
import type {
  DisseminationMandateId,
  NetworkCampaignId,
  NetworkEdgeId,
  NetworkFrontierId,
  NetworkNodeId,
} from "../types/ids.js";

export type NetworkTopologyCategory = "deepen" | "widen" | "reroute";
export type NetworkNodeStatus = "established" | "stable";
export type NetworkEdgeStatus = "committed" | "retired";
export type NetworkMandateStatus = "pending" | "selected" | "retired";
export type NetworkNodeSourceKind = "authored" | "generated";
export type NetworkCompletionPredicate =
  "stabilize-generated-node" | "commit-generated-edge" | "stabilize-enclave-node";

export type NetworkNodeState = Readonly<{
  id: NetworkNodeId;
  sourceKind: NetworkNodeSourceKind;
  campaignId: NetworkCampaignId | null;
  status: NetworkNodeStatus;
  establishedAtActiveMs: number;
  stabilizedAtActiveMs: number | null;
}>;
export type NetworkEdgeState = Readonly<{
  id: NetworkEdgeId;
  fromNodeId: NetworkNodeId;
  toNodeId: NetworkNodeId;
  status: NetworkEdgeStatus;
  campaignId: NetworkCampaignId | null;
}>;
export type PlannedNetworkEdge = Readonly<{
  id: NetworkEdgeId;
  fromNodeId: NetworkNodeId;
  toNodeId: NetworkNodeId;
}>;
export type DisseminationMandate = Readonly<{
  id: DisseminationMandateId;
  category: NetworkTopologyCategory;
  status: NetworkMandateStatus;
  campaignId: NetworkCampaignId;
  generatedNodeIds: readonly NetworkNodeId[];
  plannedEdges: readonly PlannedNetworkEdge[];
  completionPredicate: NetworkCompletionPredicate;
  effects: Readonly<{
    throughputMultiplier: number;
    detectionDelta: number;
    adjacencyBonus: number;
  }>;
}>;
export type NetworkFrontier = Readonly<{
  id: NetworkFrontierId;
  networkSeed: number;
  sourceSeed: number;
  globalTier: number;
  frontierSequence: number;
  sourceEventSequence: number;
  mandates: readonly [DisseminationMandate, DisseminationMandate, DisseminationMandate];
}>;
export type NetworkFrontierSource = Readonly<{
  networkSeed: number;
  id: NetworkFrontierId;
  sourceSeed: number;
  globalTier: number;
  frontierSequence: number;
  sourceEventSequence: number;
}>;
export type ActiveNetworkCampaign = Readonly<{
  sourceFrontier: NetworkFrontierSource;
  mandate: DisseminationMandate;
  selectedAtActiveMs: number;
}>;
export type CompletedNetworkCampaign = Readonly<{
  sourceFrontier: NetworkFrontierSource;
  mandate: DisseminationMandate;
  selectedAtActiveMs: number;
  completedAtActiveMs: number;
}>;
export type NetworkState = Readonly<{
  globalTier: number;
  transmissionPressure: BigNum;
  nodes: readonly NetworkNodeState[];
  edges: readonly NetworkEdgeState[];
  pendingFrontier: NetworkFrontier | null;
  activeCampaign: ActiveNetworkCampaign | null;
  completedCampaigns: readonly CompletedNetworkCampaign[];
  containedNodeId: NetworkNodeId | null;
}>;
export type NetworkNodeDefinition = Readonly<{
  id: NetworkNodeId;
  throughputMultiplier: number;
  detectionDelta: number;
  adjacencyTags: readonly string[];
}>;
export type NetworkEdgeDefinition = Readonly<{
  id: NetworkEdgeId;
  fromNodeId: NetworkNodeId;
  toNodeId: NetworkNodeId;
}>;

export const AUTHORED_NETWORK_NODE_CATALOG: readonly NetworkNodeDefinition[] = Object.freeze([
  Object.freeze({
    id: networkNodeId("authored-node-v1:primary-lab"),
    throughputMultiplier: 1,
    detectionDelta: 0,
    adjacencyTags: Object.freeze(["urban", "relay"]),
  }),
  Object.freeze({
    id: networkNodeId("authored-node-v1:vascular-relay"),
    throughputMultiplier: 1.08,
    detectionDelta: 0.04,
    adjacencyTags: Object.freeze(["vascular", "relay"]),
  }),
  Object.freeze({
    id: networkNodeId("authored-node-v1:protected-enclave"),
    throughputMultiplier: 0.9,
    detectionDelta: -0.08,
    adjacencyTags: Object.freeze(["enclave", "containment"]),
  }),
  Object.freeze({
    id: networkNodeId("authored-node-v1:frontier-branch"),
    throughputMultiplier: 1.04,
    detectionDelta: 0.03,
    adjacencyTags: Object.freeze(["branch", "ecology"]),
  }),
]);
export const AUTHORED_NETWORK_EDGE_CATALOG: readonly NetworkEdgeDefinition[] = Object.freeze([
  Object.freeze({
    id: networkEdgeId("authored-edge-v1:primary-to-relay"),
    fromNodeId: networkNodeId("authored-node-v1:primary-lab"),
    toNodeId: networkNodeId("authored-node-v1:vascular-relay"),
  }),
  Object.freeze({
    id: networkEdgeId("authored-edge-v1:relay-to-enclave"),
    fromNodeId: networkNodeId("authored-node-v1:vascular-relay"),
    toNodeId: networkNodeId("authored-node-v1:protected-enclave"),
  }),
  Object.freeze({
    id: networkEdgeId("authored-edge-v1:relay-to-branch"),
    fromNodeId: networkNodeId("authored-node-v1:vascular-relay"),
    toNodeId: networkNodeId("authored-node-v1:frontier-branch"),
  }),
]);

const MANDATE_ANCHOR_BY_CATEGORY: Readonly<Record<NetworkTopologyCategory, NetworkNodeId>> =
  Object.freeze({
    deepen: networkNodeId("authored-node-v1:vascular-relay"),
    widen: networkNodeId("authored-node-v1:frontier-branch"),
    reroute: networkNodeId("authored-node-v1:protected-enclave"),
  });

export type ContainmentNodeEffect = Readonly<{
  throughputMultiplier: number;
  detectionDelta: number;
}>;
export const CONTAINMENT_NODE_EFFECT: ContainmentNodeEffect = Object.freeze({
  throughputMultiplier: 0.85,
  detectionDelta: -0.12,
});
const NEUTRAL_NODE_EFFECT: ContainmentNodeEffect = Object.freeze({
  throughputMultiplier: 1,
  detectionDelta: 0,
});

function requireUint32(value: number, label: string): void {
  if (!Number.isSafeInteger(value) || value < 0 || value > 0xffff_ffff)
    throw new Error(`${label} must be uint32.`);
}

function categoryEffects(category: NetworkTopologyCategory): DisseminationMandate["effects"] {
  if (category === "deepen")
    return Object.freeze({ throughputMultiplier: 1.16, detectionDelta: 0.08, adjacencyBonus: 0 });
  if (category === "widen")
    return Object.freeze({ throughputMultiplier: 1.04, detectionDelta: 0.03, adjacencyBonus: 2 });
  return Object.freeze({ throughputMultiplier: 0.92, detectionDelta: -0.1, adjacencyBonus: 1 });
}

function categoryPredicate(category: NetworkTopologyCategory): NetworkCompletionPredicate {
  if (category === "deepen") return "stabilize-generated-node";
  if (category === "widen") return "commit-generated-edge";
  return "stabilize-enclave-node";
}

function generatedNodeCount(category: NetworkTopologyCategory, stream: () => number): number {
  const variation = stream() % 2;
  return category === "widen" ? 2 + variation : 1 + variation;
}

function plannedEdgesForMandate(
  input: Readonly<{ networkSeed: number; globalTier: number; frontierSequence: number }>,
  mandateOrdinal: number,
  category: NetworkTopologyCategory,
  generatedNodeIds: readonly NetworkNodeId[],
): readonly PlannedNetworkEdge[] {
  const anchor = MANDATE_ANCHOR_BY_CATEGORY[category];
  const plannedEdges = generatedNodeIds.map((toNodeId, localOrdinal) => {
    const fromNodeId = localOrdinal === 0 ? anchor : generatedNodeIds[localOrdinal - 1];
    if (!fromNodeId) throw new Error("Planned network edge requires its preceding node.");
    return Object.freeze({
      id: networkEdgeId(
        `generated-edge-v1:${input.networkSeed}:${input.globalTier}:${input.frontierSequence}:${mandateOrdinal}:${localOrdinal}`,
      ),
      fromNodeId,
      toNodeId,
    });
  });
  return Object.freeze(plannedEdges);
}

export function createEmptyNetworkState(): NetworkState {
  return Object.freeze({
    globalTier: 0,
    transmissionPressure: bigNum(0, 0),
    nodes: Object.freeze([]),
    edges: Object.freeze([]),
    pendingFrontier: null,
    activeCampaign: null,
    completedCampaigns: Object.freeze([]),
    containedNodeId: null,
  });
}

/** Deterministically creates the saved three-choice renewable frontier. */
export function generateNetworkFrontierV1(
  input: Readonly<{
    networkSeed: number;
    globalTier: number;
    frontierSequence: number;
    sourceEventSequence: number;
  }>,
): NetworkFrontier {
  requireUint32(input.networkSeed, "Network seed");
  requireUint32(input.globalTier, "Global tier");
  requireUint32(input.frontierSequence, "Frontier sequence");
  requireUint32(input.sourceEventSequence, "Source event sequence");
  const sourceSeed = deriveSeedV1(
    "network-frontier-v1",
    input.networkSeed,
    input.globalTier,
    input.frontierSequence,
    input.sourceEventSequence,
  );
  const stream = mulberry32V1(sourceSeed);
  const frontierId = networkFrontierId(
    `network-frontier-v1:${input.networkSeed}:${input.globalTier}:${input.frontierSequence}`,
  );
  const categories: readonly NetworkTopologyCategory[] = ["deepen", "widen", "reroute"];
  function generateMandate(
    category: NetworkTopologyCategory,
    mandateOrdinal: number,
  ): DisseminationMandate {
    const campaignId = networkCampaignId(
      `network-campaign-v1:${input.networkSeed}:${input.globalTier}:${input.frontierSequence}:${mandateOrdinal}`,
    );
    const mandateId = disseminationMandateId(`${frontierId}:${mandateOrdinal}`);
    const nodeCount = generatedNodeCount(category, stream);
    const generatedNodeIds = Array.from({ length: nodeCount }, (_, localOrdinal) =>
      networkNodeId(
        `generated-node-v1:${input.networkSeed}:${input.globalTier}:${input.frontierSequence}:${mandateOrdinal}:${localOrdinal}`,
      ),
    );
    const plannedEdges = plannedEdgesForMandate(input, mandateOrdinal, category, generatedNodeIds);
    const mandate: DisseminationMandate = Object.freeze({
      id: mandateId,
      category,
      status: "pending" as const,
      campaignId,
      generatedNodeIds: Object.freeze(generatedNodeIds),
      plannedEdges,
      completionPredicate: categoryPredicate(category),
      effects: categoryEffects(category),
    });
    return mandate;
  }
  const [deepen, widen, reroute] = categories;
  if (!deepen || !widen || !reroute) throw new Error("Network frontier categories are incomplete.");
  const first = generateMandate(deepen, 0);
  const second = generateMandate(widen, 1);
  const third = generateMandate(reroute, 2);
  const mandates: NetworkFrontier["mandates"] = Object.freeze([first, second, third]);
  return Object.freeze({
    id: frontierId,
    networkSeed: input.networkSeed,
    sourceSeed,
    globalTier: input.globalTier,
    frontierSequence: input.frontierSequence,
    sourceEventSequence: input.sourceEventSequence,
    mandates,
  });
}

/** Extracts the reproducible tuple that an active/completed campaign must retain. */
export function networkFrontierSource(frontier: NetworkFrontier): NetworkFrontierSource {
  return Object.freeze({
    networkSeed: frontier.networkSeed,
    id: frontier.id,
    sourceSeed: frontier.sourceSeed,
    globalTier: frontier.globalTier,
    frontierSequence: frontier.frontierSequence,
    sourceEventSequence: frontier.sourceEventSequence,
  });
}

/** Rebuilds one immutable frontier only from its saved canonical source tuple. */
export function regenerateNetworkFrontierV1(source: NetworkFrontierSource): NetworkFrontier {
  return generateNetworkFrontierV1({
    networkSeed: source.networkSeed,
    globalTier: source.globalTier,
    frontierSequence: source.frontierSequence,
    sourceEventSequence: source.sourceEventSequence,
  });
}

export function hasValidNetworkFrontierSource(source: NetworkFrontierSource): boolean {
  const regenerated = regenerateNetworkFrontierV1(source);
  return (
    regenerated.id === source.id &&
    regenerated.sourceSeed === source.sourceSeed &&
    regenerated.networkSeed === source.networkSeed &&
    regenerated.globalTier === source.globalTier &&
    regenerated.frontierSequence === source.frontierSequence &&
    regenerated.sourceEventSequence === source.sourceEventSequence
  );
}

export function findAuthoredNetworkNode(id: NetworkNodeId): NetworkNodeDefinition | undefined {
  return AUTHORED_NETWORK_NODE_CATALOG.find((node) => node.id === id);
}

export function findAuthoredNetworkEdge(id: NetworkEdgeId): NetworkEdgeDefinition | undefined {
  return AUTHORED_NETWORK_EDGE_CATALOG.find((edge) => edge.id === id);
}

export function findFrontierMandate(
  frontier: NetworkFrontier,
  mandateId: DisseminationMandateId,
): DisseminationMandate | undefined {
  return frontier.mandates.find((mandate) => mandate.id === mandateId);
}

/** Validates the immutable edge plan against durable authored and generated identities. */
export function hasValidMandatePlan(mandate: DisseminationMandate): boolean {
  const allowedNodeIds = new Set<NetworkNodeId>([
    ...AUTHORED_NETWORK_NODE_CATALOG.map((node) => node.id),
    ...mandate.generatedNodeIds,
  ]);
  const edgeIds = new Set<NetworkEdgeId>();
  for (const edge of mandate.plannedEdges) {
    if (edgeIds.has(edge.id) || edge.fromNodeId === edge.toNodeId) return false;
    if (!allowedNodeIds.has(edge.fromNodeId) || !allowedNodeIds.has(edge.toNodeId)) return false;
    edgeIds.add(edge.id);
  }
  return mandate.plannedEdges.length === mandate.generatedNodeIds.length;
}

export function hasValidNetworkFrontier(frontier: NetworkFrontier): boolean {
  const mandateIds = new Set(frontier.mandates.map((mandate) => mandate.id));
  const categories = new Set(frontier.mandates.map((mandate) => mandate.category));
  return (
    mandateIds.size === 3 &&
    categories.size === 3 &&
    frontier.mandates.every(
      (mandate) => mandate.status === "pending" && hasValidMandatePlan(mandate),
    )
  );
}

function mandatesMatch(left: DisseminationMandate, right: DisseminationMandate): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

/** Validates that active state contains the exact selected mandate from its saved source frontier. */
export function hasValidActiveNetworkCampaign(campaign: ActiveNetworkCampaign): boolean {
  if (campaign.mandate.status !== "selected" || !hasValidMandatePlan(campaign.mandate))
    return false;
  if (!hasValidNetworkFrontierSource(campaign.sourceFrontier)) return false;
  const regenerated = regenerateNetworkFrontierV1(campaign.sourceFrontier);
  const sourceMandate = findFrontierMandate(regenerated, campaign.mandate.id);
  if (!sourceMandate) return false;
  const selectedSourceMandate: DisseminationMandate = Object.freeze({
    ...sourceMandate,
    status: "selected",
  });
  return mandatesMatch(selectedSourceMandate, campaign.mandate);
}

function nodeMatchesCampaign(node: NetworkNodeState, campaign: ActiveNetworkCampaign): boolean {
  return node.campaignId === campaign.mandate.campaignId;
}

/** Determines completion from durable records only, never from a presentation counter. */
export function activeCampaignCompletion(network: NetworkState): boolean {
  const campaign = network.activeCampaign;
  if (!campaign || !hasValidActiveNetworkCampaign(campaign)) {
    return false;
  }
  const mandate = campaign.mandate;
  if (mandate.category === "deepen") {
    return network.nodes.some(
      (node) =>
        mandate.generatedNodeIds.includes(node.id) &&
        node.status === "stable" &&
        nodeMatchesCampaign(node, campaign),
    );
  }
  if (mandate.category === "widen") {
    return network.edges.some(
      (edge) =>
        mandate.plannedEdges.some((planned) => planned.id === edge.id) &&
        edge.status === "committed" &&
        edge.campaignId === mandate.campaignId,
    );
  }
  const enclaveId = networkNodeId("authored-node-v1:protected-enclave");
  const enclaveSuccessors = new Set(
    mandate.plannedEdges
      .filter((edge) => edge.fromNodeId === enclaveId)
      .map((edge) => edge.toNodeId),
  );
  return network.nodes.some(
    (node) =>
      enclaveSuccessors.has(node.id) &&
      node.status === "stable" &&
      nodeMatchesCampaign(node, campaign),
  );
}

/** Completes the active selected plan without touching reducer-owned lineage fields. */
export function completeActiveCampaign(
  network: NetworkState,
  atMs: number,
): NetworkState | undefined {
  if (!Number.isSafeInteger(atMs) || atMs < 0)
    throw new Error("Campaign completion time must be a safe natural.");
  const campaign = network.activeCampaign;
  if (!campaign || !activeCampaignCompletion(network)) return undefined;
  if (!Number.isSafeInteger(network.globalTier) || network.globalTier >= Number.MAX_SAFE_INTEGER) {
    throw new Error("Network global tier cannot advance safely.");
  }
  const completedCampaign: CompletedNetworkCampaign = Object.freeze({
    sourceFrontier: campaign.sourceFrontier,
    mandate: campaign.mandate,
    selectedAtActiveMs: campaign.selectedAtActiveMs,
    completedAtActiveMs: atMs,
  });
  const completed: NetworkState = Object.freeze({
    ...network,
    globalTier: network.globalTier + 1,
    activeCampaign: null,
    completedCampaigns: Object.freeze([...network.completedCampaigns, completedCampaign]),
  });
  return completed;
}

/** Applies reducer-provided trusted lineage/event context to renew the completed campaign surface. */
export function completeActiveCampaignWithRenewal(
  network: NetworkState,
  input: Readonly<{
    atMs: number;
    networkSeed: number;
    frontierSequence: number;
    sourceEventSequence: number;
  }>,
): NetworkState | undefined {
  const completed = completeActiveCampaign(network, input.atMs);
  if (!completed) return undefined;
  const pendingFrontier = generateNetworkFrontierV1({
    networkSeed: input.networkSeed,
    globalTier: completed.globalTier,
    frontierSequence: input.frontierSequence,
    sourceEventSequence: input.sourceEventSequence,
  });
  return Object.freeze({ ...completed, pendingFrontier });
}

/** Returns the containment tradeoff only for the one saved selected node. */
export function containmentNodeEffect(
  network: NetworkState,
  nodeId: NetworkNodeId,
): ContainmentNodeEffect {
  return network.containedNodeId === nodeId ? CONTAINMENT_NODE_EFFECT : NEUTRAL_NODE_EFFECT;
}

export function isReachableAuthoredTopologyComplete(state: NetworkState): boolean {
  const authoredIds = new Set(AUTHORED_NETWORK_NODE_CATALOG.map((node) => node.id));
  const stableCount = state.nodes.filter(
    (node) =>
      node.sourceKind === "authored" && node.status === "stable" && authoredIds.has(node.id),
  ).length;
  return stableCount * 5 >= authoredIds.size * 4;
}
