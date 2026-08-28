import { formatBigNum } from "../bignum/format.js";
import { quoteProducerPurchase } from "../economy/costs.js";
import { STAGE_ONE_PRODUCERS } from "../economy/producers.js";
import type { GameState } from "../types/state.js";
import {
  CRYOBANK_PROGRAM_CATALOG,
  PASSAGE_UPGRADE_CATALOG,
  immortalizationCryobankSelectionQuote,
  immortalizationQuoteV1,
  cryobankProgramQuote,
  passageUpgradeQuote,
} from "./culture.js";
import {
  AUTHORED_NETWORK_NODE_CATALOG,
  AUTHORED_NETWORK_EDGE_CATALOG,
  containmentNodeEffect,
  regenerateNetworkFrontierV1,
} from "./network.js";
import { networkNodeCreditQuote } from "./network_effects.js";
import type { DisseminationMandateId } from "../types/ids.js";

function display(value: string): string {
  return value
    .replace(/^(?:authored-node-v1:|generated-node-v1:|cryobank_)/, "")
    .split(/[-_:]/g)
    .filter(Boolean)
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
    .join(" ");
}

function earned(state: GameState, id: "L3" | "L4"): boolean {
  return state.prestigeAvailability.some((entry) => entry.id === id && entry.status === "earned");
}

export type CulturePresentation = Readonly<{
  l3Ready: boolean;
  passagesAwarded: number;
  activeProgramLabel: string | null;
  programs: readonly Readonly<{
    id: (typeof CRYOBANK_PROGRAM_CATALOG)[number]["id"];
    label: string;
    available: boolean;
    selectionAvailable: boolean;
    selected: boolean;
    detail: string;
  }>[];
  passages: number;
  upgrades: readonly Readonly<{
    id: (typeof PASSAGE_UPGRADE_CATALOG)[number]["id"];
    label: string;
    rank: number;
    maximumRank: number;
    cost: number | null;
    available: boolean;
    detail: string;
  }>[];
  queuedAction: Readonly<{ producerLabel: string; cost: string; affordable: boolean }> | null;
}>;

/** A pure culture-choice read model; the reducer remains the only ledger writer. */
export function culturePresentation(state: GameState): CulturePresentation {
  const activeProgramId = state.metastasis.activeNicheContext?.programId ?? null;
  const immortalization = immortalizationQuoteV1(state.lineageLedger, state.eventSequence);
  const l3Ready =
    state.currentStage === "host_collapse" &&
    earned(state, "L3") &&
    immortalization.available &&
    activeProgramId !== null;
  const programs = CRYOBANK_PROGRAM_CATALOG.map((program) => {
    const quote = immortalizationCryobankSelectionQuote(
      state.lineageLedger,
      state.eventSequence,
      activeProgramId,
      program.id,
    );
    const selection = cryobankProgramQuote(state.culture, program.id);
    return Object.freeze({
      id: program.id,
      label: display(program.id),
      available: l3Ready && quote.available,
      selectionAvailable: selection.available,
      selected: state.culture.cryobankProgram === program.id,
      detail: `Award ${quote.passagesAwarded} Passages; cryobank debit ${quote.cryobankCost ?? "unavailable"}; retain ${quote.remainingAwardedPassages ?? "unavailable"}.`,
    });
  });
  const upgrades = PASSAGE_UPGRADE_CATALOG.map((upgrade) => {
    const purchase = state.culture.purchasedPassageUpgrades.find(
      (entry) => entry.upgradeId === upgrade.id,
    );
    const quote = passageUpgradeQuote(state.lineageLedger, state.culture, upgrade.id);
    return Object.freeze({
      id: upgrade.id,
      label: display(upgrade.id),
      rank: purchase?.rank ?? 0,
      maximumRank: upgrade.maximumRank,
      cost: quote.cost,
      available: quote.available,
      detail: display(upgrade.behaviorTarget),
    });
  });
  const queued = state.culture.queuedProducerAction;
  const definition = queued
    ? STAGE_ONE_PRODUCERS.find((producer) => producer.id === queued.producerId)
    : undefined;
  const quote = queued ? quoteProducerPurchase(state, queued.producerId, 1) : undefined;
  return Object.freeze({
    l3Ready,
    passagesAwarded: immortalization.passagesAwarded,
    activeProgramLabel: activeProgramId ? display(activeProgramId) : null,
    programs: Object.freeze(programs),
    passages: state.culture.passages,
    upgrades: Object.freeze(upgrades),
    queuedAction:
      queued && definition && quote
        ? Object.freeze({
            producerLabel: definition.displayName,
            cost: formatBigNum(quote.debit, state.numberFormat, 2),
            affordable: quote.affordable,
          })
        : null,
  });
}

export type NetworkPresentation = Readonly<{
  available: boolean;
  globalTier: number;
  pressure: string;
  nodes: readonly Readonly<{
    id: (typeof AUTHORED_NETWORK_NODE_CATALOG)[number]["id"];
    label: string;
    established: boolean;
    stable: boolean;
    actionAvailable: boolean;
    credit: number | null;
    creditDetail: string | null;
    throughput: number;
    detection: number;
  }>[];
  activeCampaign: Readonly<{
    category: string;
    progress: string;
    effects: string;
    retiredAlternatives: string;
  }> | null;
  frontier:
    | readonly Readonly<{
        id: DisseminationMandateId;
        category: string;
        effects: string;
      }>[]
    | null;
  containment: Readonly<{ selected: string | null; effect: string }>;
}>;

/** Projects topology status into compact, comparable strings for the progression rail. */
export function networkPresentation(state: GameState): NetworkPresentation {
  const available =
    state.currentStage === "global_lab_contamination" &&
    earned(state, "L3") &&
    earned(state, "L4") &&
    state.lineageLedger.networkSeed !== null;
  const nodes = AUTHORED_NETWORK_NODE_CATALOG.map((definition, index) => {
    const stateNode = state.network.nodes.find((node) => node.id === definition.id);
    const established = stateNode !== undefined;
    const stable = stateNode?.status === "stable";
    const incomingEstablished = AUTHORED_NETWORK_EDGE_CATALOG.some(
      (edge) =>
        edge.toNodeId === definition.id &&
        state.network.nodes.some((node) => node.id === edge.fromNodeId),
    );
    const creditQuote = networkNodeCreditQuote(state, definition.id);
    const actionAvailable = stable
      ? creditQuote.available
      : established
        ? true
        : (state.network.nodes.length === 0 && index === 0) || incomingEstablished;
    return Object.freeze({
      id: definition.id,
      label: display(definition.id),
      established,
      stable,
      actionAvailable,
      credit: creditQuote.available ? creditQuote.credit : null,
      creditDetail: creditQuote.available
        ? `Output ${formatBigNum(creditQuote.effectiveOutput, state.numberFormat, 2)} at effective throughput ×${creditQuote.throughputMultiplier.toFixed(2)} and effective detection ${creditQuote.detectionDelta >= 0 ? "+" : ""}${creditQuote.detectionDelta.toFixed(2)} (detection multiplier ×${creditQuote.detectionMultiplier.toFixed(2)}); production ${creditQuote.productionCredit}, depth ${creditQuote.directedDepthCredit}, adjacency ${creditQuote.adjacencyCredit} from ${creditQuote.committedIncidentEdges} raw committed + ${creditQuote.mandateAdjacencyBonus} mandate, diversity ${creditQuote.diversityCredit} from ${creditQuote.uniqueTagCount} pre-cap tags.`
        : null,
      throughput: definition.throughputMultiplier,
      detection: definition.detectionDelta,
    });
  });
  const active = state.network.activeCampaign?.mandate;
  const sourceFrontier = state.network.activeCampaign?.sourceFrontier;
  const retiredAlternatives =
    active && sourceFrontier
      ? regenerateNetworkFrontierV1(sourceFrontier)
          .mandates.filter((mandate) => mandate.id !== active.id)
          .map((mandate) => display(mandate.category))
          .join(", ")
      : "";
  const activeCampaign = active
    ? Object.freeze({
        category: display(active.category),
        progress: `${state.network.nodes.filter((node) => node.campaignId === active.campaignId && node.status === "stable").length}/${active.generatedNodeIds.length} campaign nodes stable`,
        effects: `Throughput ×${active.effects.throughputMultiplier.toFixed(2)}; detection ${active.effects.detectionDelta >= 0 ? "+" : ""}${active.effects.detectionDelta.toFixed(2)}; adjacency +${active.effects.adjacencyBonus}.`,
        retiredAlternatives,
      })
    : null;
  const frontier = state.network.pendingFrontier
    ? Object.freeze(
        state.network.pendingFrontier.mandates.map((mandate) =>
          Object.freeze({
            id: mandate.id,
            category: display(mandate.category),
            effects: `Throughput ×${mandate.effects.throughputMultiplier.toFixed(2)}; detection ${mandate.effects.detectionDelta >= 0 ? "+" : ""}${mandate.effects.detectionDelta.toFixed(2)}; adjacency +${mandate.effects.adjacencyBonus}.`,
          }),
        ),
      )
    : null;
  const contained = state.network.containedNodeId;
  const containmentEffect = contained
    ? containmentNodeEffect(state.network, contained)
    : { throughputMultiplier: 1, detectionDelta: 0 };
  return Object.freeze({
    available,
    globalTier: state.network.globalTier,
    pressure: formatBigNum(state.network.transmissionPressure, state.numberFormat, 2),
    nodes: Object.freeze(nodes),
    activeCampaign,
    frontier,
    containment: Object.freeze({
      selected: contained ? display(contained) : null,
      effect: `Throughput ×${containmentEffect.throughputMultiplier.toFixed(2)}; detection ${containmentEffect.detectionDelta.toFixed(2)}.`,
    }),
  });
}
