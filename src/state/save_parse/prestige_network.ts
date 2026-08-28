import {
  disseminationMandateId,
  networkCampaignId,
  networkEdgeId,
  networkFrontierId,
  networkNodeId,
} from "../../brands.js";
import {
  AUTHORED_NETWORK_EDGE_CATALOG,
  AUTHORED_NETWORK_NODE_CATALOG,
  generateNetworkFrontierV1,
  hasValidMandatePlan,
  hasValidActiveNetworkCampaign,
  hasValidNetworkFrontierSource,
  hasValidNetworkFrontier,
  type DisseminationMandate,
  type NetworkFrontierSource,
  type NetworkState,
} from "../../prestige/network.js";
import type { LineageLedger } from "../../prestige/layers.js";
import { identifier, natural, numberValue, serial, unique } from "./guards.js";
import { exactShape, safeArray, uint32 } from "./prestige_guards.js";

const NETWORK_KEYS = [
  "globalTier",
  "transmissionPressure",
  "nodes",
  "edges",
  "pendingFrontier",
  "activeCampaign",
  "completedCampaigns",
  "containedNodeId",
] as const;

function canonicalOrdered(values: readonly string[]): boolean {
  return values.every((value, index) => index === 0 || values[index - 1]! < value);
}

function parseGeneratedId(
  value: string,
  kind: "node" | "edge" | "frontier" | "mandate" | "campaign",
  networkSeed: number,
  globalTier: number,
  frontierSequence: number,
): readonly number[] | undefined {
  const patterns = {
    node: /^generated-node-v1:(\d+):(\d+):(\d+):(\d+):(\d+)$/,
    edge: /^generated-edge-v1:(\d+):(\d+):(\d+):(\d+):(\d+)$/,
    frontier: /^network-frontier-v1:(\d+):(\d+):(\d+)$/,
    mandate: /^network-frontier-v1:(\d+):(\d+):(\d+):(\d+)$/,
    campaign: /^network-campaign-v1:(\d+):(\d+):(\d+):(\d+)$/,
  } as const;
  const match = patterns[kind].exec(value);
  if (match === null) return undefined;
  const parts = match.slice(1).map(Number);
  if (!parts.every((part) => uint32(part))) return undefined;
  const [seed, tier, sequence] = parts;
  if (
    seed !== networkSeed ||
    tier === undefined ||
    sequence === undefined ||
    tier > globalTier ||
    sequence > frontierSequence
  )
    return undefined;
  if ((kind === "mandate" || kind === "campaign") && (parts[3] === undefined || parts[3] > 2))
    return undefined;
  return parts;
}

function parseSelectedMandate(
  value: unknown,
  networkSeed: number,
  globalTier: number,
  frontierSequence: number,
): DisseminationMandate | undefined {
  if (
    !exactShape(value, [
      "id",
      "category",
      "status",
      "campaignId",
      "generatedNodeIds",
      "plannedEdges",
      "completionPredicate",
      "effects",
    ]) ||
    !identifier(value.id) ||
    !(value.category === "deepen" || value.category === "widen" || value.category === "reroute") ||
    value.status !== "selected" ||
    !identifier(value.campaignId) ||
    !exactShape(value.effects, ["throughputMultiplier", "detectionDelta", "adjacencyBonus"]) ||
    typeof value.effects.throughputMultiplier !== "number" ||
    typeof value.effects.detectionDelta !== "number" ||
    typeof value.effects.adjacencyBonus !== "number" ||
    !Number.isFinite(value.effects.throughputMultiplier) ||
    !Number.isFinite(value.effects.detectionDelta) ||
    !Number.isFinite(value.effects.adjacencyBonus)
  )
    return undefined;
  const mandateParts = parseGeneratedId(
    value.id,
    "mandate",
    networkSeed,
    globalTier,
    frontierSequence,
  );
  const campaignParts = parseGeneratedId(
    value.campaignId,
    "campaign",
    networkSeed,
    globalTier,
    frontierSequence,
  );
  const categories = ["deepen", "widen", "reroute"] as const;
  const predicates = [
    "stabilize-generated-node",
    "commit-generated-edge",
    "stabilize-enclave-node",
  ] as const;
  const effects = [
    { throughputMultiplier: 1.16, detectionDelta: 0.08, adjacencyBonus: 0 },
    { throughputMultiplier: 1.04, detectionDelta: 0.03, adjacencyBonus: 2 },
    { throughputMultiplier: 0.92, detectionDelta: -0.1, adjacencyBonus: 1 },
  ] as const;
  const ordinal = mandateParts?.[3];
  const predicate = ordinal === undefined ? undefined : predicates[ordinal];
  const effect = ordinal === undefined ? undefined : effects[ordinal];
  if (
    mandateParts === undefined ||
    campaignParts === undefined ||
    ordinal === undefined ||
    !categories.includes(value.category) ||
    value.category !== categories[ordinal] ||
    predicate === undefined ||
    effect === undefined ||
    value.completionPredicate !== predicate ||
    campaignParts.some((part, index) => part !== mandateParts[index]) ||
    value.effects.throughputMultiplier !== effect.throughputMultiplier ||
    value.effects.detectionDelta !== effect.detectionDelta ||
    value.effects.adjacencyBonus !== effect.adjacencyBonus
  )
    return undefined;
  const rawNodes = safeArray(value.generatedNodeIds);
  const rawEdges = safeArray(value.plannedEdges);
  if (!rawNodes || rawNodes.length < 1 || !rawNodes.every(identifier) || !rawEdges)
    return undefined;
  const generatedNodeIds = rawNodes.map(networkNodeId);
  if (
    !unique(generatedNodeIds.map(String)) ||
    !generatedNodeIds.every((id, localOrdinal) => {
      const parts = parseGeneratedId(id, "node", networkSeed, globalTier, frontierSequence);
      return (
        parts !== undefined &&
        parts.slice(0, 4).every((part, index) => part === mandateParts[index]) &&
        parts[4] === localOrdinal
      );
    })
  )
    return undefined;
  const allowedNodeIds = new Set([
    ...AUTHORED_NETWORK_NODE_CATALOG.map((node) => String(node.id)),
    ...generatedNodeIds.map(String),
  ]);
  const plannedEdges: DisseminationMandate["plannedEdges"] extends readonly (infer T)[]
    ? T[]
    : never = [];
  for (const [localOrdinal, edge] of rawEdges.entries()) {
    if (
      !exactShape(edge, ["id", "fromNodeId", "toNodeId"]) ||
      !identifier(edge.id) ||
      !identifier(edge.fromNodeId) ||
      !identifier(edge.toNodeId) ||
      edge.fromNodeId === edge.toNodeId ||
      !allowedNodeIds.has(edge.fromNodeId) ||
      !allowedNodeIds.has(edge.toNodeId)
    )
      return undefined;
    const parts = parseGeneratedId(edge.id, "edge", networkSeed, globalTier, frontierSequence);
    if (
      parts === undefined ||
      !parts.slice(0, 4).every((part, index) => part === mandateParts[index]) ||
      parts[4] !== localOrdinal
    )
      return undefined;
    plannedEdges.push({
      id: networkEdgeId(edge.id),
      fromNodeId: networkNodeId(edge.fromNodeId),
      toNodeId: networkNodeId(edge.toNodeId),
    });
  }
  const mandate: DisseminationMandate = {
    id: disseminationMandateId(value.id),
    category: value.category,
    status: "selected",
    campaignId: networkCampaignId(value.campaignId),
    generatedNodeIds,
    plannedEdges,
    completionPredicate: predicate,
    effects: effect,
  };
  return hasValidMandatePlan(mandate) ? mandate : undefined;
}

function parseFrontierSource(
  value: unknown,
  networkSeed: number,
  globalTier: number,
  frontierSequence: number,
  eventSequence: number,
): NetworkFrontierSource | undefined {
  if (
    !exactShape(value, [
      "networkSeed",
      "id",
      "sourceSeed",
      "globalTier",
      "frontierSequence",
      "sourceEventSequence",
    ]) ||
    !uint32(value.networkSeed) ||
    value.networkSeed !== networkSeed ||
    !identifier(value.id) ||
    !uint32(value.sourceSeed) ||
    value.sourceSeed === 0 ||
    !uint32(value.globalTier) ||
    value.globalTier > globalTier ||
    !uint32(value.frontierSequence) ||
    value.frontierSequence > frontierSequence ||
    !natural(value.sourceEventSequence) ||
    value.sourceEventSequence >= eventSequence
  )
    return undefined;
  const source: NetworkFrontierSource = {
    networkSeed: value.networkSeed,
    id: networkFrontierId(value.id),
    sourceSeed: value.sourceSeed,
    globalTier: value.globalTier,
    frontierSequence: value.frontierSequence,
    sourceEventSequence: value.sourceEventSequence,
  };
  return hasValidNetworkFrontierSource(source) ? source : undefined;
}

export function parseNetwork(
  value: unknown,
  ledger: LineageLedger,
  activeTimeMs: number,
  eventSequence: number,
): NetworkState | undefined {
  if (!exactShape(value, NETWORK_KEYS)) return undefined;
  const globalTier = value.globalTier;
  if (!uint32(globalTier)) return undefined;
  const transmissionPressure = numberValue(value.transmissionPressure);
  const nodesRaw = safeArray(value.nodes);
  const edgesRaw = safeArray(value.edges);
  const completedRaw = safeArray(value.completedCampaigns);
  if (
    transmissionPressure === undefined ||
    transmissionPressure.mantissa < 0 ||
    nodesRaw === undefined ||
    edgesRaw === undefined ||
    completedRaw === undefined
  )
    return undefined;
  const isEmpty =
    globalTier === 0 &&
    transmissionPressure.mantissa === 0 &&
    transmissionPressure.exponent === 0 &&
    nodesRaw.length === 0 &&
    edgesRaw.length === 0 &&
    value.pendingFrontier === null &&
    value.activeCampaign === null &&
    completedRaw.length === 0 &&
    value.containedNodeId === null;
  if (ledger.networkSeed === null) {
    return isEmpty && ledger.frontierSequence === 0 && ledger.stabilizedRewardedNodeIds.length === 0
      ? {
          globalTier: 0,
          transmissionPressure,
          nodes: [],
          edges: [],
          pendingFrontier: null,
          activeCampaign: null,
          completedCampaigns: [],
          containedNodeId: null,
        }
      : undefined;
  }
  const networkSeed = ledger.networkSeed;
  const nodes: NetworkState["nodes"] extends readonly (infer T)[] ? T[] : never = [];
  for (const node of nodesRaw) {
    if (
      !exactShape(node, [
        "id",
        "sourceKind",
        "campaignId",
        "status",
        "establishedAtActiveMs",
        "stabilizedAtActiveMs",
      ]) ||
      !identifier(node.id) ||
      !(node.sourceKind === "authored" || node.sourceKind === "generated") ||
      !(node.campaignId === null || identifier(node.campaignId)) ||
      !(node.status === "established" || node.status === "stable") ||
      !natural(node.establishedAtActiveMs) ||
      node.establishedAtActiveMs > activeTimeMs ||
      !(node.stabilizedAtActiveMs === null || natural(node.stabilizedAtActiveMs)) ||
      (node.stabilizedAtActiveMs !== null &&
        (node.stabilizedAtActiveMs < node.establishedAtActiveMs ||
          node.stabilizedAtActiveMs > activeTimeMs)) ||
      (node.status === "stable") !== (node.stabilizedAtActiveMs !== null)
    )
      return undefined;
    if (node.sourceKind === "authored") {
      if (
        node.campaignId !== null ||
        !AUTHORED_NETWORK_NODE_CATALOG.some((definition) => definition.id === node.id)
      )
        return undefined;
    } else if (
      node.campaignId === null ||
      parseGeneratedId(node.id, "node", networkSeed, globalTier, ledger.frontierSequence) ===
        undefined ||
      parseGeneratedId(
        node.campaignId,
        "campaign",
        networkSeed,
        globalTier,
        ledger.frontierSequence,
      ) === undefined
    )
      return undefined;
    nodes.push({
      id: networkNodeId(node.id),
      sourceKind: node.sourceKind,
      campaignId: node.campaignId === null ? null : networkCampaignId(node.campaignId),
      status: node.status,
      establishedAtActiveMs: node.establishedAtActiveMs,
      stabilizedAtActiveMs: node.stabilizedAtActiveMs,
    });
  }
  const authoredNodeIds = AUTHORED_NETWORK_NODE_CATALOG.filter((definition) =>
    nodes.some((node) => node.id === definition.id),
  ).map((definition) => definition.id);
  const firstGeneratedNodeIndex = nodes.findIndex((node) => node.sourceKind === "generated");
  if (
    !unique(nodes.map((node) => String(node.id))) ||
    !authoredNodeIds.every((id, index) => nodes[index]?.id === id) ||
    (firstGeneratedNodeIndex >= 0 &&
      nodes.slice(firstGeneratedNodeIndex).some((node) => node.sourceKind !== "generated"))
  )
    return undefined;
  const nodeIds = new Set(nodes.map((node) => String(node.id)));
  const authoredNodeIdSet = new Set(AUTHORED_NETWORK_NODE_CATALOG.map((node) => String(node.id)));
  const edges: NetworkState["edges"] extends readonly (infer T)[] ? T[] : never = [];
  for (const edge of edgesRaw) {
    if (
      !exactShape(edge, ["id", "fromNodeId", "toNodeId", "status", "campaignId"]) ||
      !identifier(edge.id) ||
      !identifier(edge.fromNodeId) ||
      !identifier(edge.toNodeId) ||
      !(edge.status === "committed" || edge.status === "retired") ||
      !(edge.campaignId === null || identifier(edge.campaignId)) ||
      !(nodeIds.has(edge.fromNodeId) || authoredNodeIdSet.has(edge.fromNodeId)) ||
      !(nodeIds.has(edge.toNodeId) || authoredNodeIdSet.has(edge.toNodeId)) ||
      edge.fromNodeId === edge.toNodeId
    )
      return undefined;
    if (edge.campaignId === null) {
      const definition = AUTHORED_NETWORK_EDGE_CATALOG.find((entry) => entry.id === edge.id);
      if (
        definition === undefined ||
        definition.fromNodeId !== edge.fromNodeId ||
        definition.toNodeId !== edge.toNodeId
      )
        return undefined;
    } else if (
      parseGeneratedId(edge.id, "edge", networkSeed, globalTier, ledger.frontierSequence) ===
        undefined ||
      parseGeneratedId(
        edge.campaignId,
        "campaign",
        networkSeed,
        globalTier,
        ledger.frontierSequence,
      ) === undefined
    )
      return undefined;
    if (edge.campaignId !== null) {
      const edgeParts = parseGeneratedId(
        edge.id,
        "edge",
        networkSeed,
        globalTier,
        ledger.frontierSequence,
      );
      const campaignParts = parseGeneratedId(
        edge.campaignId,
        "campaign",
        networkSeed,
        globalTier,
        ledger.frontierSequence,
      );
      if (
        edgeParts === undefined ||
        campaignParts === undefined ||
        edgeParts.slice(0, 4).some((part, index) => part !== campaignParts[index])
      )
        return undefined;
    }
    edges.push({
      id: networkEdgeId(edge.id),
      fromNodeId: networkNodeId(edge.fromNodeId),
      toNodeId: networkNodeId(edge.toNodeId),
      status: edge.status,
      campaignId: edge.campaignId === null ? null : networkCampaignId(edge.campaignId),
    });
  }
  if (
    !unique(edges.map((edge) => String(edge.id))) ||
    !canonicalOrdered(edges.map((edge) => String(edge.id)))
  )
    return undefined;
  const parseFrontier = (): NetworkState["pendingFrontier"] | undefined => {
    const frontier = value.pendingFrontier;
    if (frontier === null) return null;
    if (
      !exactShape(frontier, [
        "id",
        "networkSeed",
        "sourceSeed",
        "globalTier",
        "frontierSequence",
        "sourceEventSequence",
        "mandates",
      ]) ||
      !identifier(frontier.id) ||
      frontier.networkSeed !== networkSeed ||
      !uint32(frontier.sourceSeed) ||
      frontier.sourceSeed === 0 ||
      !uint32(frontier.globalTier) ||
      !uint32(frontier.frontierSequence) ||
      !natural(frontier.sourceEventSequence) ||
      frontier.sourceEventSequence > eventSequence
    )
      return undefined;
    const rawMandates = safeArray(frontier.mandates);
    if (!rawMandates || rawMandates.length !== 3) return undefined;
    let canonicalMandates: string;
    try {
      canonicalMandates = JSON.stringify(serial(rawMandates));
    } catch {
      return undefined;
    }
    const generated = generateNetworkFrontierV1({
      networkSeed,
      globalTier: frontier.globalTier,
      frontierSequence: frontier.frontierSequence,
      sourceEventSequence: frontier.sourceEventSequence,
    });
    if (
      frontier.id !== generated.id ||
      frontier.networkSeed !== generated.networkSeed ||
      frontier.sourceSeed !== generated.sourceSeed ||
      frontier.globalTier !== globalTier ||
      frontier.frontierSequence !== ledger.frontierSequence ||
      canonicalMandates !== JSON.stringify(generated.mandates) ||
      !hasValidNetworkFrontier(generated)
    )
      return undefined;
    return generated;
  };
  const pendingFrontier = parseFrontier();
  if (pendingFrontier === undefined) return undefined;
  if (!(value.containedNodeId === null || identifier(value.containedNodeId))) return undefined;
  let activeCampaign: NetworkState["activeCampaign"];
  if (value.activeCampaign === null) activeCampaign = null;
  else {
    if (
      !exactShape(value.activeCampaign, ["sourceFrontier", "mandate", "selectedAtActiveMs"]) ||
      !natural(value.activeCampaign.selectedAtActiveMs) ||
      value.activeCampaign.selectedAtActiveMs > activeTimeMs ||
      pendingFrontier !== null
    )
      return undefined;
    const sourceFrontier = parseFrontierSource(
      value.activeCampaign.sourceFrontier,
      networkSeed,
      globalTier,
      ledger.frontierSequence,
      eventSequence,
    );
    const mandate = parseSelectedMandate(
      value.activeCampaign.mandate,
      networkSeed,
      sourceFrontier?.globalTier ?? globalTier,
      sourceFrontier?.frontierSequence ?? ledger.frontierSequence,
    );
    if (
      sourceFrontier === undefined ||
      mandate === undefined ||
      !mandate.generatedNodeIds.every((id) =>
        nodes.some((node) => node.id === id && node.campaignId === mandate.campaignId),
      ) ||
      !mandate.plannedEdges.every((planned) =>
        edges.some(
          (edge) =>
            edge.id === planned.id &&
            edge.fromNodeId === planned.fromNodeId &&
            edge.toNodeId === planned.toNodeId &&
            edge.campaignId === mandate.campaignId,
        ),
      )
    )
      return undefined;
    activeCampaign = {
      sourceFrontier,
      mandate,
      selectedAtActiveMs: value.activeCampaign.selectedAtActiveMs,
    };
    if (!hasValidActiveNetworkCampaign(activeCampaign)) return undefined;
  }
  const completedCampaigns: NetworkState["completedCampaigns"] extends readonly (infer T)[]
    ? T[]
    : never = [];
  for (const entry of completedRaw) {
    if (
      !exactShape(entry, [
        "sourceFrontier",
        "mandate",
        "selectedAtActiveMs",
        "completedAtActiveMs",
      ]) ||
      !natural(entry.selectedAtActiveMs) ||
      !natural(entry.completedAtActiveMs) ||
      entry.selectedAtActiveMs > entry.completedAtActiveMs ||
      entry.completedAtActiveMs > activeTimeMs
    )
      return undefined;
    const sourceFrontier = parseFrontierSource(
      entry.sourceFrontier,
      networkSeed,
      globalTier,
      ledger.frontierSequence,
      eventSequence,
    );
    const mandate = parseSelectedMandate(
      entry.mandate,
      networkSeed,
      sourceFrontier?.globalTier ?? globalTier,
      sourceFrontier?.frontierSequence ?? ledger.frontierSequence,
    );
    if (sourceFrontier === undefined || mandate === undefined) return undefined;
    const campaign = { sourceFrontier, mandate, selectedAtActiveMs: entry.selectedAtActiveMs };
    if (!hasValidActiveNetworkCampaign(campaign)) return undefined;
    completedCampaigns.push({ ...campaign, completedAtActiveMs: entry.completedAtActiveMs });
  }
  if (
    !unique(completedCampaigns.map((campaign) => String(campaign.mandate.id))) ||
    (activeCampaign !== null &&
      completedCampaigns.some((campaign) => campaign.mandate.id === activeCampaign.mandate.id))
  )
    return undefined;
  if (
    completedCampaigns.length !== globalTier ||
    !completedCampaigns.every(
      (campaign, index) =>
        campaign.sourceFrontier.globalTier === index &&
        campaign.sourceFrontier.frontierSequence === index &&
        (index === 0 ||
          (campaign.sourceFrontier.sourceEventSequence >
            completedCampaigns[index - 1]!.sourceFrontier.sourceEventSequence &&
            campaign.selectedAtActiveMs >= completedCampaigns[index - 1]!.completedAtActiveMs)),
    ) ||
    (activeCampaign !== null &&
      (activeCampaign.sourceFrontier.globalTier !== globalTier ||
        activeCampaign.sourceFrontier.frontierSequence !== globalTier ||
        ledger.frontierSequence !== globalTier + 1)) ||
    (pendingFrontier !== null &&
      (pendingFrontier.globalTier !== globalTier ||
        pendingFrontier.frontierSequence !== globalTier ||
        ledger.frontierSequence !== globalTier)) ||
    (globalTier > 0 && activeCampaign === null && pendingFrontier === null)
  )
    return undefined;
  const plans = [
    ...(activeCampaign === null ? [] : [activeCampaign.mandate]),
    ...completedCampaigns.map((campaign) => campaign.mandate),
  ];
  const expectedGeneratedNodeIds = new Set(plans.flatMap((mandate) => mandate.generatedNodeIds));
  const expectedGeneratedNodeCampaigns = new Map(
    plans.flatMap((mandate) =>
      mandate.generatedNodeIds.map((nodeId) => [nodeId, mandate.campaignId] as const),
    ),
  );
  const expectedGeneratedEdges = new Map(
    plans.flatMap((mandate) => mandate.plannedEdges.map((edge) => [edge.id, edge] as const)),
  );
  if (
    !nodes
      .filter((node) => node.sourceKind === "generated")
      .every(
        (node) =>
          expectedGeneratedNodeIds.has(node.id) &&
          node.campaignId === expectedGeneratedNodeCampaigns.get(node.id),
      ) ||
    expectedGeneratedNodeIds.size !==
      nodes.filter((node) => node.sourceKind === "generated").length ||
    !edges
      .filter((edge) => edge.campaignId !== null)
      .every((edge) => {
        const planned = expectedGeneratedEdges.get(edge.id);
        const campaign = plans.find((mandate) =>
          mandate.plannedEdges.some((item) => item.id === edge.id),
        )?.campaignId;
        return (
          planned !== undefined &&
          edge.campaignId === campaign &&
          planned.fromNodeId === edge.fromNodeId &&
          planned.toNodeId === edge.toNodeId
        );
      }) ||
    expectedGeneratedEdges.size !== edges.filter((edge) => edge.campaignId !== null).length
  )
    return undefined;
  const containedNodeId =
    value.containedNodeId === null ? null : networkNodeId(value.containedNodeId);
  if (
    containedNodeId !== null &&
    !nodes.some(
      (node) =>
        node.id === containedNodeId &&
        node.sourceKind === "authored" &&
        (node.status === "established" || node.status === "stable"),
    )
  )
    return undefined;
  if (
    !ledger.stabilizedRewardedNodeIds.every((id) =>
      nodes.some((node) => node.id === id && node.status === "stable"),
    ) ||
    !canonicalOrdered(ledger.stabilizedRewardedNodeIds)
  )
    return undefined;
  return {
    globalTier,
    transmissionPressure,
    nodes,
    edges,
    pendingFrontier,
    activeCampaign,
    completedCampaigns,
    containedNodeId,
  };
}
