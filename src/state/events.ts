import { bigNum, hallmarkId, hostRunId, passageUpgradeId, producerId } from "../brands.js";
import { add, compare, subtract } from "../bignum/bignum.js";
import { applyProducerPurchase, quoteProducerPurchase } from "../economy/costs.js";
import type { GameEvent } from "../types/events.js";
import type { GameState } from "../types/state.js";
import { MAX_PENDING_PROGRESSION } from "../types/state.js";
import { parseRuntimeEvent } from "./event_parse.js";
import { assertStageTransition } from "../stages/transitions.js";
import { findAtpSink, MAX_TOTAL_ATP_BUDGET } from "../hallmarks/extended_hallmark_catalog.js";
import {
  projectElapsedHallmarkDurableEffects,
  projectManualDivisionHallmarkEffects,
} from "../hallmarks/elapsed_effects.js";
import { projectSenescenceDecisions } from "../hallmarks/handlers/senescence_factory.js";
import { projectLateHallmarkDurableTickEffects } from "../hallmarks/late_hallmark_tick.js";
import { projectExtendedHallmarkDurableTickEffects } from "../hallmarks/extended_hallmark_tick.js";
import {
  findColonizationProgram,
  findOrganSite,
  isRouteCompatibleWithSite,
  seededRegionIdForTransit,
} from "../prestige/seeding.js";
import { LINEAGE_BOON_CATALOG } from "../prestige/hosts.js";
import {
  projectL1Reset,
  projectL2Reset,
  projectL3Reset,
  projectL4CampaignReset,
} from "../prestige/reset.js";
import {
  cryobankProgramQuote,
  findPassageUpgrade,
  hasPassageUpgrade,
  passageUpgradeQuote,
} from "../prestige/culture.js";
import {
  AUTHORED_NETWORK_EDGE_CATALOG,
  AUTHORED_NETWORK_NODE_CATALOG,
  generateNetworkFrontierV1,
  hasValidNetworkFrontier,
  isReachableAuthoredTopologyComplete,
  networkFrontierSource,
  type NetworkNodeState,
} from "../prestige/network.js";
import { deriveSeedV1 } from "./deterministic_random.js";
import { hallmarkPurchaseEligibility } from "../hallmarks/purchase_eligibility.js";
import { networkNodeCreditQuote } from "../prestige/network_effects.js";
import { softEndingEligibility } from "../ending/trigger.js";

import {
  applyCoreSixEvent,
  applyExtendedHallmarkEvent,
  applyLateHallmarkEvent,
  boonCatalogOrder,
  canonicalSiteRecords,
  canonicalSnapshot,
  natural,
  networkActionAvailable,
  next,
  progressionIdentity,
  renewCompletedCampaign,
  updateLedger,
  validProgression,
} from "./events/domain_handlers.js";
export function reduceGameEvent(state: GameState, event: GameEvent): GameState {
  const coreSixProjection = applyCoreSixEvent(state, event);
  if (coreSixProjection !== undefined) return next(state, coreSixProjection);
  const extendedHallmarkProjection = applyExtendedHallmarkEvent(state, event);
  if (extendedHallmarkProjection !== undefined) return next(state, extendedHallmarkProjection);
  const lateHallmarkProjection = applyLateHallmarkEvent(state, event);
  if (lateHallmarkProjection !== undefined) return next(state, lateHallmarkProjection);
  switch (event.type) {
    case "click-divide": {
      const reserveProjection = projectManualDivisionHallmarkEffects(state);
      const projection = projectSenescenceDecisions(state, reserveProjection, {
        atMs: event.atMs,
        originSequence: state.eventSequence,
      });
      if (
        !natural(projection.manualDivisionCharge) ||
        projection.manualDivisionCharge === Number.MAX_SAFE_INTEGER
      )
        throw new Error("Manual division charge cannot advance safely.");
      return next(state, {
        ...projection,
        cells: add(projection.cells, bigNum(1, 0)),
        manualDivisionCharge: projection.manualDivisionCharge + 1,
      });
    }
    case "purchase-producer": {
      const id = producerId(event.producerId);
      if (event.execution === "assay") {
        const queued = state.culture.queuedProducerAction;
        if (
          event.atMs !== state.activeTimeMs ||
          !queued ||
          queued.producerId !== id ||
          queued.queuedAtEventSequence !== event.queuedAtEventSequence ||
          !hasPassageUpgrade(state.culture, passageUpgradeId("assay_discipline")) ||
          !quoteProducerPurchase(state, id, 1).affordable
        )
          throw new Error("Assay producer action is unavailable.");
        const purchased = applyProducerPurchase(state, id, 1);
        return next(state, {
          ...purchased,
          culture: { ...state.culture, queuedProducerAction: null },
        });
      }
      const purchased = applyProducerPurchase(state, id, event.quantity);
      return next(state, purchased);
    }
    case "purchase-hallmark": {
      const id = hallmarkId(event.hallmarkId);
      const hallmark = state.hallmarkLevels.find((level) => level.id === id);
      const eligibility = hallmarkPurchaseEligibility(state, id);
      if (!eligibility.available) {
        switch (eligibility.reason) {
          case "unknown":
            throw new Error("Hallmark purchase is unknown.");
          case "invalid-level":
            throw new Error("Hallmark purchase has an invalid level.");
          case "stage":
            throw new Error("Hallmark purchase is locked.");
          case "culture-interface":
            throw new Error("Late hallmark requires the high-throughput culture interface.");
          case "already-owned":
            throw new Error("Hallmark is already owned.");
        }
      }
      return next(state, {
        hallmarkLevels:
          hallmark === undefined
            ? [...state.hallmarkLevels, { id, level: eligibility.definition.purchase.initialLevel }]
            : state.hallmarkLevels.map((level) =>
                level.id === id ? { ...level, level: level.level + 1 } : level,
              ),
        lineageLedger: updateLedger(state.lineageLedger, { chosenHallmarkId: id }),
      });
    }
    case "advance-stage": {
      const fromStageId = event.fromStageId;
      const toStageId = event.toStageId;
      const projection = assertStageTransition(state, fromStageId, toStageId, event.atMs);
      const pendingProgression = state.pendingProgression.filter((item) => item.kind !== "stage");
      const currentHostRunId = state.lineageLedger.currentHostRunId;
      const enteredHostCollapse = toStageId === "host_collapse" && currentHostRunId !== null;
      const ledger = enteredHostCollapse
        ? updateLedger(state.lineageLedger, {
            hostCollapseAfterTransfer: true,
            terminalPreparation: {
              hostRunId: currentHostRunId,
              eligible:
                state.seededSites.some((id) =>
                  state.regions.some((region) => region.id === id && region.viability > 0),
                ) &&
                state.pendingDamageEvents.length === 0 &&
                state.pendingTransitEvents.length === 0,
              assessedAtActiveMs: event.atMs,
            },
          })
        : state.lineageLedger;
      return next(state, {
        ...projection,
        bypassedCheckpoints: [],
        pendingProgression,
        lineageLedger: ledger,
      });
    }
    case "resolve-transit": {
      if (!natural(state.activeTimeMs) || event.atMs !== state.activeTimeMs)
        throw new Error("Transit resolution is stale.");
      const pending = state.pendingTransitEvents.find(
        (candidate) => candidate.id === event.transitEventId,
      );
      const site = findOrganSite(event.destinationSiteId);
      if (!pending || !site || !isRouteCompatibleWithSite(pending.routeId, site.id))
        throw new Error("Transit resolution is unavailable.");
      const pendingTransitEvents = state.pendingTransitEvents.filter(
        (candidate) => candidate.id !== pending.id,
      );
      if (pending.outcome === "lost") return next(state, { pendingTransitEvents });
      const seededId = seededRegionIdForTransit(pending.id);
      if (
        state.regions.some((region) => region.id === seededId) ||
        state.seededSites.includes(seededId)
      )
        throw new Error("Transit region already exists.");
      return next(state, {
        pendingTransitEvents,
        regions: [
          ...state.regions,
          {
            id: seededId,
            capacity: site.initialCapacity,
            viability: 1,
            phenotype: "proliferative",
            vesselLinkIds: [],
            routeIds: [],
          },
        ],
        seededSites: [...state.seededSites, seededId],
        lineageLedger: updateLedger(state.lineageLedger, {
          successfulTransit: true,
          organTags: site.tags,
        }),
      });
    }
    case "perform-metastasis-reset": {
      const projection = projectL1Reset(state, event);
      if (projection === undefined) throw new Error("Metastasis reset is unavailable.");
      return next(state, {
        ...projection,
        lineageLedger: updateLedger(projection.lineageLedger, { completedL1: true }),
      });
    }
    case "allocate-organ-site": {
      if (
        !natural(state.activeTimeMs) ||
        event.atMs !== state.activeTimeMs ||
        event.sourceEventSequence !== state.eventSequence
      )
        throw new Error("Organ allocation is stale.");
      const site = findOrganSite(event.siteId);
      if (!site) throw new Error("Organ allocation site is unavailable.");
      const current = state.metastasis.allocations.find(
        (allocation) => allocation.siteId === site.id,
      );
      const nextRank = current ? current.rank + 1 : 1;
      const cost = site.allocationCosts[nextRank - 1];
      if (
        !cost ||
        nextRank > site.allocationCosts.length ||
        compare(state.metastasis.metastaticPotential, bigNum(cost, 0)) < 0
      )
        throw new Error("Organ allocation is unaffordable.");
      const allocations = canonicalSiteRecords([
        ...state.metastasis.allocations.filter((allocation) => allocation.siteId !== site.id),
        { siteId: site.id, rank: nextRank },
      ]);
      return next(state, {
        metastasis: {
          ...state.metastasis,
          metastaticPotential: subtract(state.metastasis.metastaticPotential, bigNum(cost, 0)),
          allocations,
        },
      });
    }
    case "select-colonization-program": {
      if (
        !natural(state.activeTimeMs) ||
        event.atMs !== state.activeTimeMs ||
        event.sourceEventSequence !== state.eventSequence
      )
        throw new Error("Colonization program is stale.");
      if (
        !findColonizationProgram(event.programId) ||
        !state.metastasis.allocations.some(
          (entry) => entry.siteId === event.siteId && entry.rank > 0,
        )
      )
        throw new Error("Colonization program is unavailable.");
      const programs = canonicalSiteRecords([
        ...state.metastasis.programs.filter((entry) => entry.siteId !== event.siteId),
        { siteId: event.siteId, programId: event.programId },
      ]);
      return next(state, { metastasis: { ...state.metastasis, programs } });
    }
    case "purchase-lineage-boon": {
      if (
        !natural(state.activeTimeMs) ||
        event.atMs !== state.activeTimeMs ||
        event.sourceEventSequence !== state.eventSequence
      )
        throw new Error("Lineage boon is stale.");
      const boon = LINEAGE_BOON_CATALOG.find((candidate) => candidate.id === event.boonId);
      if (
        !boon ||
        state.lineageLedger.usedLineageBoonIds.includes(boon.id) ||
        state.hostTransfer.hostImprints < boon.cost
      )
        throw new Error("Lineage boon is unavailable.");
      if (event.boonId === "reduced_trait_liability") {
        const activeHost = state.hostTransfer.activeHost;
        const draft = state.hostTransfer.pendingDraft;
        if (
          !activeHost ||
          !draft ||
          draft.consumedCardId !== activeHost.card.id ||
          state.lineageLedger.currentHostRunId !== activeHost.hostRunId ||
          ![
            activeHost.card.immuneRegime,
            activeHost.card.tissueEcology,
            activeHost.card.hostHorizon,
          ].includes(event.targetTraitId)
        )
          throw new Error("Targeted lineage boon is unavailable.");
        return next(state, {
          hostTransfer: {
            ...state.hostTransfer,
            hostImprints: state.hostTransfer.hostImprints - boon.cost,
          },
          lineageLedger: updateLedger(state.lineageLedger, {
            usedBoonId: boon.id,
            lineageBoonApplications: [
              {
                boonId: boon.id,
                kind: "targeted-active-host",
                draftId: draft.id,
                hostRunId: activeHost.hostRunId,
                cardId: activeHost.card.id,
                targetTraitId: event.targetTraitId,
              },
            ],
          }),
        });
      }
      if (state.hostTransfer.purchasedBoons.some((purchased) => purchased.boonId === boon.id))
        throw new Error("Lineage boon is unavailable.");
      const purchasedBoons = [
        ...state.hostTransfer.purchasedBoons,
        { boonId: boon.id, kind: "pre-draft" as const },
      ].sort((left, right) => boonCatalogOrder(left.boonId) - boonCatalogOrder(right.boonId));
      return next(state, {
        hostTransfer: {
          ...state.hostTransfer,
          hostImprints: state.hostTransfer.hostImprints - boon.cost,
          purchasedBoons,
        },
        lineageLedger: updateLedger(state.lineageLedger, { usedBoonId: boon.id }),
      });
    }
    case "perform-host-transfer": {
      const projection = projectL2Reset(state, event);
      if (projection === undefined) throw new Error("Host transfer is unavailable.");
      const nextDraftSequence = state.lineageLedger.hostDraftSequence + 1;
      return next(state, {
        ...projection,
        lineageLedger: updateLedger(projection.lineageLedger, {
          completedHostTransfer: true,
          hostDraftSequence: nextDraftSequence,
          currentHostRunId: null,
          terminalPreparation: null,
          lineageBoonApplications: state.hostTransfer.purchasedBoons.map((boon) => ({
            boonId: boon.boonId,
            kind: "pre-draft",
            draftId: projection.hostTransfer.pendingDraft!.id,
          })),
        }),
      });
    }
    case "select-host-card": {
      if (!natural(state.activeTimeMs) || event.atMs !== state.activeTimeMs)
        throw new Error("Host-card selection is stale.");
      const draft = state.hostTransfer.pendingDraft;
      if (
        !draft ||
        draft.id !== event.draftId ||
        !draft.available ||
        draft.consumedCardId !== null ||
        draft.sourceEventSequence !== event.sourceEventSequence
      )
        throw new Error("Host draft is unavailable.");
      const card = draft.cards.find((candidate) => candidate.id === event.cardId);
      if (
        !card ||
        !draft.revealedCardIds.includes(card.id) ||
        state.lineageLedger.hostRunSequence === Number.MAX_SAFE_INTEGER
      )
        throw new Error("Host card is unavailable.");
      const hostRunSequence = state.lineageLedger.hostRunSequence + 1;
      const id = hostRunId(`host-run-v1:${state.lineageLedger.lineageSeed}:${hostRunSequence}`);
      return next(state, {
        hostTransfer: {
          ...state.hostTransfer,
          activeHost: { hostRunId: id, card },
          pendingDraft: { ...draft, available: false, consumedCardId: card.id },
        },
        lineageLedger: updateLedger(state.lineageLedger, { currentHostRunId: id, hostRunSequence }),
      });
    }
    case "perform-immortalization": {
      const projection = projectL3Reset(state, event);
      if (projection === undefined) throw new Error("Immortalization is unavailable.");
      if (state.lineageLedger.networkSeed !== null)
        throw new Error("Immortalization is unavailable.");
      const networkSeed = deriveSeedV1(
        "network-seed-v1",
        state.lineageLedger.lineageSeed,
        state.eventSequence,
      );
      return next(state, {
        ...projection,
        lineageLedger: updateLedger(projection.lineageLedger, {
          currentHostRunId: null,
          terminalPreparation: null,
          networkSeed,
        }),
      });
    }
    case "purchase-passage-upgrade": {
      if (event.atMs !== state.activeTimeMs || event.sourceEventSequence !== state.eventSequence)
        throw new Error("Passage upgrade is stale.");
      const quote = passageUpgradeQuote(state.lineageLedger, state.culture, event.upgradeId);
      const definition = findPassageUpgrade(event.upgradeId);
      if (!definition || !quote.available || quote.cost === null)
        throw new Error("Passage upgrade is unavailable.");
      const current = state.culture.purchasedPassageUpgrades.find(
        (purchase) => purchase.upgradeId === definition.id,
      );
      const rank = (current?.rank ?? 0) + 1;
      const purchasedPassageUpgrades = [
        ...state.culture.purchasedPassageUpgrades.filter(
          (purchase) => purchase.upgradeId !== definition.id,
        ),
        { upgradeId: definition.id, rank },
      ].sort((left, right) => left.upgradeId.localeCompare(right.upgradeId));
      return next(state, {
        culture: {
          ...state.culture,
          passages: state.culture.passages - quote.cost,
          purchasedPassageUpgrades,
        },
      });
    }
    case "queue-assay-producer-action": {
      if (event.atMs !== state.activeTimeMs || event.sourceEventSequence !== state.eventSequence)
        throw new Error("Assay queue is stale.");
      if (
        !hasPassageUpgrade(state.culture, passageUpgradeId("assay_discipline")) ||
        !quoteProducerPurchase(state, event.producerId, 1).affordable
      )
        throw new Error("Assay queue is unavailable.");
      return next(state, {
        culture: {
          ...state.culture,
          queuedProducerAction: {
            producerId: event.producerId,
            queuedAtEventSequence: state.eventSequence + 1,
            queuedAtActiveMs: event.atMs,
          },
        },
      });
    }
    case "select-cryobank-program": {
      if (event.atMs !== state.activeTimeMs || event.sourceEventSequence !== state.eventSequence)
        throw new Error("Cryobank selection is stale.");
      if (!cryobankProgramQuote(state.culture, event.cryobankProgramId).available)
        throw new Error("Cryobank program is unavailable.");
      return next(state, {
        culture: { ...state.culture, cryobankProgram: event.cryobankProgramId },
      });
    }
    case "establish-dissemination-node": {
      if (event.atMs !== state.activeTimeMs || event.sourceEventSequence !== state.eventSequence)
        throw new Error("Network node is stale.");
      if (!networkActionAvailable(state)) throw new Error("Network node is unavailable.");
      const definition = AUTHORED_NETWORK_NODE_CATALOG.find((node) => node.id === event.nodeId);
      if (!definition || state.network.nodes.some((node) => node.id === definition.id))
        throw new Error("Network node is unavailable.");
      const hasNodes = state.network.nodes.length > 0;
      const adjacentEstablished = AUTHORED_NETWORK_EDGE_CATALOG.some(
        (edge) =>
          edge.toNodeId === definition.id &&
          state.network.nodes.some((node) => node.id === edge.fromNodeId),
      );
      if (hasNodes && !adjacentEstablished) throw new Error("Network node is disconnected.");
      const node: NetworkNodeState = {
        id: definition.id,
        sourceKind: "authored",
        campaignId: null,
        status: "established",
        establishedAtActiveMs: event.atMs,
        stabilizedAtActiveMs: null,
      };
      return next(state, { network: { ...state.network, nodes: [...state.network.nodes, node] } });
    }
    case "commit-dissemination-edge": {
      if (event.atMs !== state.activeTimeMs || event.sourceEventSequence !== state.eventSequence)
        throw new Error("Network edge is stale.");
      if (!networkActionAvailable(state)) throw new Error("Network edge is unavailable.");
      const authored = AUTHORED_NETWORK_EDGE_CATALOG.find((edge) => edge.id === event.edgeId);
      const plannedGeneratedEdge = state.network.activeCampaign?.mandate.plannedEdges.find(
        (edge) => edge.id === event.edgeId,
      );
      const generated = state.network.edges.find(
        (edge) =>
          edge.id === event.edgeId &&
          edge.campaignId === state.network.activeCampaign?.mandate.campaignId &&
          edge.status === "retired" &&
          edge.fromNodeId === plannedGeneratedEdge?.fromNodeId &&
          edge.toNodeId === plannedGeneratedEdge?.toNodeId,
      );
      const definition = authored ?? generated;
      if (!definition || (authored && state.network.edges.some((edge) => edge.id === authored.id)))
        throw new Error("Network edge is unavailable.");
      if (
        !state.network.nodes.some((node) => node.id === definition.fromNodeId) ||
        !state.network.nodes.some((node) => node.id === definition.toNodeId)
      )
        throw new Error("Network edge endpoints are unavailable.");
      const committedEdge = {
        ...definition,
        status: "committed" as const,
        campaignId: generated?.campaignId ?? null,
      };
      const network = {
        ...state.network,
        edges: generated
          ? state.network.edges.map((edge) => (edge.id === generated.id ? committedEdge : edge))
          : [...state.network.edges, committedEdge],
      };
      return next(state, { network: renewCompletedCampaign(state, network) });
    }
    case "choose-dissemination-mandate": {
      if (event.atMs !== state.activeTimeMs || event.sourceEventSequence !== state.eventSequence)
        throw new Error("Dissemination mandate is stale.");
      if (!networkActionAvailable(state)) throw new Error("Dissemination mandate is unavailable.");
      const frontier = state.network.pendingFrontier;
      const mandate = frontier?.mandates.find((candidate) => candidate.id === event.mandateId);
      if (
        !frontier ||
        !hasValidNetworkFrontier(frontier) ||
        frontier.id !== event.frontierId ||
        !mandate ||
        mandate.status !== "pending" ||
        state.network.activeCampaign !== null
      )
        throw new Error("Dissemination mandate is unavailable.");
      const projection = projectL4CampaignReset(state, mandate, event);
      if (projection === undefined) throw new Error("Dissemination mandate is unavailable.");
      const selected = { ...mandate, status: "selected" as const };
      return next(state, {
        ...projection,
        network: {
          ...projection.network,
          pendingFrontier: null,
          activeCampaign: {
            sourceFrontier: networkFrontierSource(frontier),
            mandate: selected,
            selectedAtActiveMs: event.atMs,
          },
          nodes: [
            ...state.network.nodes,
            ...selected.generatedNodeIds.map((id) => ({
              id,
              sourceKind: "generated" as const,
              campaignId: selected.campaignId,
              status: "established" as const,
              establishedAtActiveMs: event.atMs,
              stabilizedAtActiveMs: null,
            })),
          ],
          edges: [
            ...state.network.edges,
            ...selected.plannedEdges.map((edge) => ({
              id: edge.id,
              fromNodeId: edge.fromNodeId,
              toNodeId: edge.toNodeId,
              status: "retired" as const,
              campaignId: selected.campaignId,
            })),
          ],
        },
        lineageLedger: updateLedger(projection.lineageLedger, {
          frontierSequence: state.lineageLedger.frontierSequence + 1,
        }),
      });
    }
    case "stabilize-network-node": {
      if (event.atMs !== state.activeTimeMs || event.sourceEventSequence !== state.eventSequence)
        throw new Error("Network stabilization is stale.");
      if (!networkActionAvailable(state)) throw new Error("Network stabilization is unavailable.");
      const node = state.network.nodes.find((candidate) => candidate.id === event.nodeId);
      if (!node || node.status !== "established") throw new Error("Network node is unavailable.");
      const stabilized = { ...node, status: "stable" as const, stabilizedAtActiveMs: event.atMs };
      const network = {
        ...state.network,
        nodes: state.network.nodes.map((candidate) =>
          candidate.id === node.id ? stabilized : candidate,
        ),
      };
      const readyForFrontier =
        network.pendingFrontier === null &&
        network.activeCampaign === null &&
        state.lineageLedger.networkSeed !== null &&
        isReachableAuthoredTopologyComplete(network);
      const frontier = readyForFrontier
        ? generateNetworkFrontierV1({
            networkSeed: state.lineageLedger.networkSeed,
            globalTier: network.globalTier,
            frontierSequence: state.lineageLedger.frontierSequence,
            sourceEventSequence: state.eventSequence + 1,
          })
        : null;
      return next(state, {
        network: renewCompletedCampaign(state, {
          ...network,
          pendingFrontier: frontier ?? network.pendingFrontier,
        }),
      });
    }
    case "collect-transmission-pressure": {
      if (event.atMs !== state.activeTimeMs || event.sourceEventSequence !== state.eventSequence)
        throw new Error("Transmission Pressure collection is stale.");
      if (!networkActionAvailable(state)) throw new Error("Transmission Pressure is unavailable.");
      const quote = networkNodeCreditQuote(state, event.nodeId);
      if (!quote.available) throw new Error("Transmission Pressure is unavailable.");
      return next(state, {
        network: {
          ...state.network,
          transmissionPressure: add(state.network.transmissionPressure, bigNum(quote.credit, 0)),
        },
        lineageLedger: updateLedger(state.lineageLedger, {
          stabilizedRewardedNodeId: quote.nodeId,
        }),
      });
    }
    case "select-containment-node": {
      if (event.atMs !== state.activeTimeMs || event.sourceEventSequence !== state.eventSequence)
        throw new Error("Containment selection is stale.");
      if (!networkActionAvailable(state)) throw new Error("Containment selection is unavailable.");
      if (
        state.lineageLedger.networkSeed === null ||
        !hasPassageUpgrade(state.culture, passageUpgradeId("containment")) ||
        !state.network.nodes.some(
          (node) =>
            node.id === event.nodeId && (node.status === "established" || node.status === "stable"),
        )
      )
        throw new Error("Containment selection is unavailable.");
      return next(state, { network: { ...state.network, containedNodeId: event.nodeId } });
    }
    case "set-signaling-allocation":
    case "select-checkpoint":
    case "resolve-triage":
    case "spend-telomerase":
    case "set-vessel-link":
    case "commit-route":
      throw new Error("Core-six event dispatch failed.");
    case "apply-offline-accrual": {
      if (
        event.atMs !== state.activeTimeMs ||
        !natural(state.activeTimeMs) ||
        !natural(state.totalOfflineMs) ||
        !natural(event.elapsedMs) ||
        state.totalOfflineMs > Number.MAX_SAFE_INTEGER - event.elapsedMs
      )
        throw new Error("Offline elapsed time is invalid.");
      const resourceSnapshot = canonicalSnapshot(event.resourceSnapshot);
      const existing = new Set(state.pendingProgression.map(progressionIdentity));
      const additions = event.newlyObservedProgression;
      if (
        additions.length > MAX_PENDING_PROGRESSION ||
        state.pendingProgression.length > MAX_PENDING_PROGRESSION - additions.length ||
        additions.some((value) => !validProgression(value, state.activeTimeMs)) ||
        additions.some((value) => existing.has(progressionIdentity(value))) ||
        new Set(additions.map(progressionIdentity)).size !== additions.length
      )
        throw new Error("Offline progression is invalid.");
      // The economy adapter already debits tracked ATP at each boundary. Replay only structural
      // reserve/link outcomes from the original balance, then retain the authoritative snapshot.
      const elapsedDurable = projectElapsedHallmarkDurableEffects(state, event.elapsedMs);
      // ASVS 2.3.3: reconstruct extended-hallmark from the original state, never from an adapter snapshot.
      const extendedHallmarkDurable = projectExtendedHallmarkDurableTickEffects(
        state,
        event.elapsedMs,
      );
      const lateHallmarkDurable = projectLateHallmarkDurableTickEffects(state, event.elapsedMs);
      const accrued = {
        ...state,
        ...elapsedDurable,
        ...extendedHallmarkDurable,
        lateHallmarks: {
          ...elapsedDurable.lateHallmarks,
          microbiome: lateHallmarkDurable.microbiome,
        },
        ...resourceSnapshot,
      };
      return next(state, {
        ...accrued,
        pendingProgression: [...state.pendingProgression, ...additions],
        totalOfflineMs: state.totalOfflineMs + event.elapsedMs,
      });
    }
    case "set-number-format":
      return next(state, { numberFormat: event.numberFormat });
    case "reach-soft-ending": {
      if (event.atMs !== state.activeTimeMs || event.sourceEventSequence !== state.eventSequence)
        throw new Error("Soft-ending report is stale.");
      if (!softEndingEligibility(state).available)
        throw new Error("Soft-ending report is unavailable.");
      const ending = Object.freeze({
        phase: "reached" as const,
        reachedAtActiveMs: state.activeTimeMs,
        sourceEventSequence: state.eventSequence,
        reachedCells: state.cells,
        reachedNetworkTier: state.network.globalTier,
      });
      return next(state, { ending });
    }
    case "set-atp-budget": {
      if (!natural(state.activeTimeMs) || event.atMs !== state.activeTimeMs) {
        throw new Error("ATP budget operation is stale.");
      }
      const sink = findAtpSink(event.sink);
      if (event.amount < sink.minimumBudget || event.amount > sink.maximumBudget) {
        throw new Error("ATP budget is outside its declared bounds.");
      }
      const atpBudget = { ...state.atpBudget, [sink.id]: event.amount };
      const totalBudget = Object.values(atpBudget).reduce((total, amount) => total + amount, 0);
      if (!Number.isSafeInteger(totalBudget) || totalBudget > MAX_TOTAL_ATP_BUDGET) {
        throw new Error("ATP budget exceeds the declared total.");
      }
      return next(state, {
        atpBudget,
        atpSinks: Object.keys(atpBudget),
      });
    }
    case "convert-substrate":
    case "set-region-mask":
    case "activate-inflammation":
    case "select-mutation":
      throw new Error("extended-hallmark event dispatch failed.");
    case "assign-region-phenotype":
    case "reconfigure-hallmark-program":
    case "install-microbiome-composition":
    case "resolve-senescence-decision":
      throw new Error("Late-hallmark event dispatch failed.");
  }
  const unreachable: never = event;
  return unreachable;
}

/** Parses untrusted runtime input before applying the canonical event reducer. */
export function recordEvent(state: GameState, raw: unknown): GameState {
  return reduceGameEvent(state, parseRuntimeEvent(raw));
}

/** ASVS 2.3.1-2.3.3 and 15.3.5: parse untrusted input before the typed reducer. */
