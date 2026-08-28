/** Pure L4 topology effects, scoped to an established node or active campaign. */
import { add, log10, multiplyByNumber, one, zero } from "../bignum/bignum.js";
import { cellProductionRate } from "../economy/production.js";
import { containmentNodeEffect, findAuthoredNetworkNode } from "./network.js";
import type { BigNum } from "../types/bignum.js";
import type { GameState } from "../types/state.js";
import type { NetworkNodeId } from "../types/ids.js";
import type { MorphologyContribution } from "../svg/morphology.js";

export type NetworkLocalEffects = Readonly<{
  throughputMultiplier: number;
  detectionDelta: number;
  adjacencyBonus: number;
  adjacencyTags: readonly string[];
}>;

const NEUTRAL_NETWORK_LOCAL_EFFECTS: NetworkLocalEffects = Object.freeze({
  throughputMultiplier: 1,
  detectionDelta: 0,
  adjacencyBonus: 0,
  adjacencyTags: Object.freeze([]),
});

/** M21 may tune bounded local credit weights without changing reducer ownership. */
export const NETWORK_CREDIT_TUNING = Object.freeze({
  detectionMultiplierMinimum: 0.5,
  detectionMultiplierMaximum: 1.5,
  productionCreditMaximum: 8,
  directedDepthMaximum: 3,
  adjacencyMaximum: 3,
  diversityMaximum: 2,
  creditMinimum: 1,
  creditMaximum: 12,
});

export type NetworkNodeCreditReason =
  "available" | "node-unavailable" | "node-unstable" | "already-collected";

export type NetworkNodeCreditQuote = Readonly<{
  nodeId: NetworkNodeId;
  available: boolean;
  reason: NetworkNodeCreditReason;
  cellProductionRate: BigNum;
  effectiveOutput: BigNum;
  throughputMultiplier: number;
  detectionDelta: number;
  detectionMultiplier: number;
  committedIncidentEdges: number;
  mandateAdjacencyBonus: number;
  uniqueTagCount: number;
  productionCredit: number;
  directedDepthCredit: number;
  adjacencyCredit: number;
  diversityCredit: number;
  credit: number;
}>;

function clamp(value: number, minimum: number, maximum: number, label: string): number {
  if (!Number.isFinite(value)) throw new Error(`${label} must be finite.`);
  return Math.min(maximum, Math.max(minimum, value));
}

function activeCampaignNode(state: GameState, nodeId: NetworkNodeId): boolean {
  const campaign = state.network.activeCampaign;
  return (
    campaign !== null &&
    campaign.mandate.campaignId ===
      state.network.nodes.find((node) => node.id === nodeId)?.campaignId
  );
}

function adjacentCommittedEdges(state: GameState, nodeId: NetworkNodeId): number {
  return state.network.edges.filter(
    (edge) =>
      edge.status === "committed" && (edge.fromNodeId === nodeId || edge.toNodeId === nodeId),
  ).length;
}

function committedDirectedDepth(state: GameState, nodeId: NetworkNodeId): number {
  function longestIncomingPath(
    currentNodeId: NetworkNodeId,
    visited: ReadonlySet<NetworkNodeId>,
  ): number {
    if (visited.has(currentNodeId)) return 0;
    if (visited.size >= NETWORK_CREDIT_TUNING.directedDepthMaximum) return 0;
    const nextVisited = new Set(visited);
    nextVisited.add(currentNodeId);
    let longest = 0;
    for (const edge of state.network.edges) {
      if (edge.status !== "committed" || edge.toNodeId !== currentNodeId) continue;
      const candidate = 1 + longestIncomingPath(edge.fromNodeId, nextVisited);
      longest = Math.max(longest, candidate);
    }
    return Math.min(longest, NETWORK_CREDIT_TUNING.directedDepthMaximum);
  }
  return longestIncomingPath(nodeId, new Set());
}

function committedNeighbourTags(state: GameState, nodeId: NetworkNodeId): readonly string[] {
  const tags = new Set<string>(findAuthoredNetworkNode(nodeId)?.adjacencyTags ?? []);
  for (const edge of state.network.edges) {
    if (edge.status !== "committed") continue;
    const neighbourId =
      edge.fromNodeId === nodeId
        ? edge.toNodeId
        : edge.toNodeId === nodeId
          ? edge.fromNodeId
          : null;
    if (neighbourId === null) continue;
    for (const tag of findAuthoredNetworkNode(neighbourId)?.adjacencyTags ?? []) tags.add(tag);
  }
  return Object.freeze([...tags].sort());
}

function productionCredit(effectiveOutput: BigNum): number {
  const logarithm = log10(add(one(), effectiveOutput));
  const rawCredit = Math.floor(logarithm);
  return clamp(
    rawCredit,
    0,
    NETWORK_CREDIT_TUNING.productionCreditMaximum,
    "Network production credit",
  );
}

function unavailableNodeCreditQuote(
  state: GameState,
  nodeId: NetworkNodeId,
  reason: Exclude<NetworkNodeCreditReason, "available">,
): NetworkNodeCreditQuote {
  const rate = cellProductionRate(state);
  const effectiveOutput = zero();
  return Object.freeze({
    nodeId,
    available: false,
    reason,
    cellProductionRate: rate,
    effectiveOutput,
    throughputMultiplier: 1,
    detectionDelta: 0,
    detectionMultiplier: 1,
    committedIncidentEdges: 0,
    mandateAdjacencyBonus: 0,
    uniqueTagCount: 0,
    productionCredit: 0,
    directedDepthCredit: 0,
    adjacencyCredit: 0,
    diversityCredit: 0,
    credit: 0,
  });
}

/**
 * Resolves one node only. This deliberately has no run-wide production output;
 * an eventual node simulation must name the node it is evaluating.
 */
export function networkLocalEffects(state: GameState, nodeId: NetworkNodeId): NetworkLocalEffects {
  const node = state.network.nodes.find((candidate) => candidate.id === nodeId);
  if (!node) return NEUTRAL_NETWORK_LOCAL_EFFECTS;
  const authored = findAuthoredNetworkNode(nodeId);
  const campaign = state.network.activeCampaign;
  const campaignEffects = activeCampaignNode(state, nodeId) ? campaign?.mandate.effects : undefined;
  const containment = containmentNodeEffect(state.network, nodeId);
  const adjacency = adjacentCommittedEdges(state, nodeId);
  const adjacencyBonus = (campaignEffects?.adjacencyBonus ?? 0) + adjacency;
  const effects: NetworkLocalEffects = {
    throughputMultiplier: clamp(
      (authored?.throughputMultiplier ?? 1) *
        (campaignEffects?.throughputMultiplier ?? 1) *
        containment.throughputMultiplier,
      0.5,
      2,
      "Network local throughput",
    ),
    detectionDelta: clamp(
      (authored?.detectionDelta ?? 0) +
        (campaignEffects?.detectionDelta ?? 0) +
        containment.detectionDelta,
      -1,
      1,
      "Network local detection",
    ),
    adjacencyBonus,
    adjacencyTags: Object.freeze(authored?.adjacencyTags ?? []),
  };
  return Object.freeze(effects);
}

function mandateAdjacencyBonus(state: GameState, nodeId: NetworkNodeId): number {
  const campaign = state.network.activeCampaign;
  if (!activeCampaignNode(state, nodeId) || campaign === null) return 0;
  return campaign.mandate.effects.adjacencyBonus;
}

/**
 * Quotes a one-time Pressure credit from a stable named node. It is the single
 * authority consumed by the reducer and presentation; it never changes the
 * run-wide production rate used by live or offline economy ticks.
 */
export function networkNodeCreditQuote(
  state: GameState,
  nodeId: NetworkNodeId,
): NetworkNodeCreditQuote {
  const node = state.network.nodes.find((candidate) => candidate.id === nodeId);
  if (!node) return unavailableNodeCreditQuote(state, nodeId, "node-unavailable");
  if (node.status !== "stable") return unavailableNodeCreditQuote(state, nodeId, "node-unstable");
  if (state.lineageLedger.stabilizedRewardedNodeIds.includes(nodeId)) {
    return unavailableNodeCreditQuote(state, nodeId, "already-collected");
  }
  const local = networkLocalEffects(state, nodeId);
  const detectionMultiplier = clamp(
    1 - local.detectionDelta,
    NETWORK_CREDIT_TUNING.detectionMultiplierMinimum,
    NETWORK_CREDIT_TUNING.detectionMultiplierMaximum,
    "Network detection multiplier",
  );
  const rate = cellProductionRate(state);
  const effectiveOutput = multiplyByNumber(rate, local.throughputMultiplier * detectionMultiplier);
  const production = productionCredit(effectiveOutput);
  const depth = committedDirectedDepth(state, nodeId);
  const committedIncidentEdges = adjacentCommittedEdges(state, nodeId);
  const mandateBonus = mandateAdjacencyBonus(state, nodeId);
  const adjacency = clamp(
    committedIncidentEdges + mandateBonus,
    0,
    NETWORK_CREDIT_TUNING.adjacencyMaximum,
    "Network adjacency credit",
  );
  const uniqueTagCount = committedNeighbourTags(state, nodeId).length;
  const diversity = clamp(
    uniqueTagCount - 1,
    0,
    NETWORK_CREDIT_TUNING.diversityMaximum,
    "Network diversity credit",
  );
  const credit = clamp(
    production + depth + adjacency + diversity,
    NETWORK_CREDIT_TUNING.creditMinimum,
    NETWORK_CREDIT_TUNING.creditMaximum,
    "Network node credit",
  );
  return Object.freeze({
    nodeId,
    available: true,
    reason: "available",
    cellProductionRate: rate,
    effectiveOutput,
    throughputMultiplier: local.throughputMultiplier,
    detectionDelta: local.detectionDelta,
    detectionMultiplier,
    committedIncidentEdges,
    mandateAdjacencyBonus: mandateBonus,
    uniqueTagCount,
    productionCredit: production,
    directedDepthCredit: depth,
    adjacencyCredit: adjacency,
    diversityCredit: diversity,
    credit,
  });
}

/**
 * Makes L4 provenance visible without converting topology into a global cell
 * multiplier. An active campaign and a selected containment node are separate
 * named sources in the existing regional-node morphology layer.
 */
export function networkMorphologyContributions(
  state: GameState,
): readonly MorphologyContribution[] {
  const contributions: MorphologyContribution[] = [];
  const campaign = state.network.activeCampaign;
  if (campaign !== null) {
    contributions.push({
      axis: "dissemination",
      mode: "add",
      value: campaign.mandate.category === "deepen" ? 0.08 : 0.05,
      source: {
        layer: "regional",
        contributorId: `network:campaign:${campaign.mandate.id}`,
        label: `${campaign.mandate.category} campaign topology`,
        referenceRowId: "morphology:metastatic_dissemination",
      },
    });
  }
  const containedNodeId = state.network.containedNodeId;
  if (containedNodeId !== null && state.network.nodes.some((node) => node.id === containedNodeId)) {
    contributions.push({
      axis: "invasion",
      mode: "add",
      value: -0.04,
      source: {
        layer: "regional",
        contributorId: `network:containment:${containedNodeId}`,
        label: "contained dissemination node",
        referenceRowId: "morphology:invasion_front",
      },
    });
  }
  return Object.freeze(contributions.map((contribution) => Object.freeze(contribution)));
}
