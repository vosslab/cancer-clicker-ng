import { passageUpgradeId } from "../../brands.js";
import { hasPassageUpgrade } from "../../prestige/culture.js";
import { networkNodeCreditQuote } from "../../prestige/network_effects.js";
import {
  AUTHORED_NETWORK_EDGE_CATALOG,
  AUTHORED_NETWORK_NODE_CATALOG,
} from "../../prestige/network.js";
import type { GameState } from "../../types/state.js";
import type { VisibleAction } from "./contracts.js";
import { envelope, networkActionsAvailable, visibleAction } from "./builders.js";

/** Dissemination-node, edge, mandate, pressure, and containment candidates. */
export function buildNetworkCandidates(state: GameState): readonly VisibleAction[] {
  const env = envelope(state);
  const frontier = state.network.pendingFrontier;
  return [
    ...(networkActionsAvailable(state) ? AUTHORED_NETWORK_NODE_CATALOG : []).flatMap((node) => {
      const persisted = state.network.nodes.find((candidate) => candidate.id === node.id);
      const hasExistingNodes = state.network.nodes.length > 0;
      const adjacentEstablished = AUTHORED_NETWORK_EDGE_CATALOG.some(
        (edge) =>
          edge.toNodeId === node.id &&
          state.network.nodes.some((candidate) => candidate.id === edge.fromNodeId),
      );
      const actions: VisibleAction[] = [];
      if (persisted === undefined && (!hasExistingNodes || adjacentEstablished)) {
        actions.push(
          visibleAction(
            "network",
            { type: "establish-dissemination-node", nodeId: node.id, ...env },
            "Establish a dissemination node.",
            ["network", node.id],
          ),
        );
      }
      if (persisted?.status === "established") {
        actions.push(
          visibleAction(
            "network",
            { type: "stabilize-network-node", nodeId: node.id, ...env },
            "Stabilize a dissemination node.",
            ["network", node.id],
          ),
        );
      }
      if (networkNodeCreditQuote(state, node.id).available) {
        actions.push(
          visibleAction(
            "network",
            { type: "collect-transmission-pressure", nodeId: node.id, ...env },
            "Collect transmission pressure.",
            ["network", node.id],
          ),
        );
      }
      if (
        persisted !== undefined &&
        state.network.containedNodeId !== node.id &&
        hasPassageUpgrade(state.culture, passageUpgradeId("containment"))
      ) {
        actions.push(
          visibleAction(
            "network",
            { type: "select-containment-node", nodeId: node.id, ...env },
            "Select a containment node.",
            ["network", node.id],
          ),
        );
      }
      return actions;
    }),
    ...(networkActionsAvailable(state) ? AUTHORED_NETWORK_EDGE_CATALOG : [])
      .filter(
        (edge) =>
          !state.network.edges.some((candidate) => candidate.id === edge.id) &&
          state.network.nodes.some((node) => node.id === edge.fromNodeId) &&
          state.network.nodes.some((node) => node.id === edge.toNodeId),
      )
      .map((edge) =>
        visibleAction(
          "network",
          { type: "commit-dissemination-edge", edgeId: edge.id, ...env },
          "Commit a dissemination edge.",
          ["network", edge.id],
        ),
      ),
    ...(networkActionsAvailable(state)
      ? state.network.nodes.filter((node) => node.sourceKind === "generated")
      : []
    ).flatMap((node) => {
      const actions: VisibleAction[] = [];
      if (node.status === "established") {
        actions.push(
          visibleAction(
            "network",
            { type: "stabilize-network-node", nodeId: node.id, ...env },
            "Stabilize a saved campaign node.",
            ["network", node.id],
          ),
        );
      }
      if (networkNodeCreditQuote(state, node.id).available) {
        actions.push(
          visibleAction(
            "network",
            { type: "collect-transmission-pressure", nodeId: node.id, ...env },
            "Collect saved-node transmission pressure.",
            ["network", node.id],
          ),
        );
      }
      if (
        state.network.containedNodeId !== node.id &&
        hasPassageUpgrade(state.culture, passageUpgradeId("containment"))
      ) {
        actions.push(
          visibleAction(
            "network",
            { type: "select-containment-node", nodeId: node.id, ...env },
            "Select a saved containment node.",
            ["network", node.id],
          ),
        );
      }
      return actions;
    }),
    ...(networkActionsAvailable(state)
      ? state.network.edges.filter((edge) => edge.campaignId !== null)
      : []
    )
      .filter(
        (edge) =>
          state.network.activeCampaign !== null &&
          edge.campaignId === state.network.activeCampaign.mandate.campaignId &&
          edge.status === "retired" &&
          state.network.nodes.some((node) => node.id === edge.fromNodeId) &&
          state.network.nodes.some((node) => node.id === edge.toNodeId),
      )
      .map((edge) =>
        visibleAction(
          "network",
          { type: "commit-dissemination-edge", edgeId: edge.id, ...env },
          "Commit a saved campaign edge.",
          ["network", edge.id],
        ),
      ),
    ...(frontier === null || !networkActionsAvailable(state)
      ? []
      : frontier.mandates.map((mandate) =>
          visibleAction(
            "network",
            {
              type: "choose-dissemination-mandate",
              frontierId: frontier.id,
              mandateId: mandate.id,
              ...env,
            },
            "Choose a saved dissemination mandate.",
            ["network", mandate.category],
          ),
        )),
  ];
}
