import {
  CORE_SIX_HALLMARK_CATALOG,
  hasReachedCoreSixUnlock,
} from "../hallmarks/core_six_catalog.js";
import {
  ATP_SINK_CATALOG,
  EXTENDED_HALLMARK_CATALOG,
} from "../hallmarks/extended_hallmark_catalog.js";
import { LATE_HALLMARK_CATALOG } from "../hallmarks/late_hallmark_catalog.js";
import { hasReachedLateHallmarkActivation } from "../hallmarks/late_hallmark_catalog.js";
import { MICROBIOME_COMPOSITION_CATALOG } from "../hallmarks/microbiome_catalog.js";
import { quoteProducerPurchase, type PurchaseQuantity } from "../economy/costs.js";
import { STAGE_ONE_PRODUCERS } from "../economy/producers.js";
import { LINEAGE_BOON_CATALOG } from "../prestige/hosts.js";
import { COLONIZATION_PROGRAM_CATALOG, ORGAN_SITE_CATALOG } from "../prestige/seeding.js";
import {
  CRYOBANK_PROGRAM_CATALOG,
  hasPassageUpgrade,
  PASSAGE_UPGRADE_CATALOG,
  passageUpgradeQuote,
} from "../prestige/culture.js";
import { passageUpgradeId } from "../brands.js";
import { networkNodeCreditQuote } from "../prestige/network_effects.js";
import { cultureLateProgramInterfacesAvailable } from "../prestige/culture_effects.js";
import {
  phenotypeEligibilityQuote,
  programEligibilityQuote,
} from "../hallmarks/late_hallmark_effects.js";
import { checkpointRoutingDecisionOrder } from "../hallmarks/handlers/checkpoint_routing.js";
import {
  AUTHORED_NETWORK_EDGE_CATALOG,
  AUTHORED_NETWORK_NODE_CATALOG,
} from "../prestige/network.js";
import { softEndingEligibility } from "../ending/trigger.js";
import { eligibleNextStage } from "../stages/gates.js";
import { hasReachedExtendedHallmarkUnlock } from "../hallmarks/extended_hallmark_catalog.js";
import { parseRuntimeEvent } from "./event_parse.js";
import { recordEvent } from "./events.js";
import type { CanonicalBigNumDto } from "../hallmarks/extended_hallmark_types.js";
import type { GameEvent } from "../types/events.js";
import type { ReplayVisibleProgression } from "../types/replay.js";
import type { GameState } from "../types/state.js";

/**
 * Projects durable game state into the compact, presentation-independent
 * progression surface used by semantic replay and future headless consumers.
 */
export function projectVisibleProgression(state: GameState): ReplayVisibleProgression {
  return Object.freeze({
    currentStageId: state.currentStage,
    endingPhase: state.ending.phase,
    pendingProgression: Object.freeze(
      state.pendingProgression.map((item) => Object.freeze({ kind: item.kind, id: item.id })),
    ),
    earnedPrestigeIds: Object.freeze(
      state.prestigeAvailability
        .filter((availability) => availability.status === "earned")
        .map((availability) => availability.id),
    ),
    activeHost:
      state.hostTransfer.activeHost === null
        ? null
        : Object.freeze({
            hostRunId: state.hostTransfer.activeHost.hostRunId,
            cardId: state.hostTransfer.activeHost.card.id,
          }),
    pendingHostDraft:
      state.hostTransfer.pendingDraft === null
        ? null
        : Object.freeze({
            draftId: state.hostTransfer.pendingDraft.id,
            revealedCardIds: Object.freeze(state.hostTransfer.pendingDraft.revealedCardIds),
            consumedCardIds:
              state.hostTransfer.pendingDraft.consumedCardId === null
                ? Object.freeze([])
                : Object.freeze([state.hostTransfer.pendingDraft.consumedCardId]),
          }),
    culture: Object.freeze({
      passages: state.culture.passages,
      purchasedUpgrades: Object.freeze(
        state.culture.purchasedPassageUpgrades.map((upgrade) =>
          Object.freeze({ upgradeId: upgrade.upgradeId, rank: upgrade.rank }),
        ),
      ),
      cryobankProgramId: state.culture.cryobankProgram,
      queuedProducerId: state.culture.queuedProducerAction?.producerId ?? null,
    }),
    network: Object.freeze({
      globalTier: state.network.globalTier,
      transmissionPressure: Object.freeze({
        mantissa: state.network.transmissionPressure.mantissa,
        exponent: state.network.transmissionPressure.exponent,
      }),
      pendingFrontierId: state.network.pendingFrontier?.id ?? null,
      activeMandateId: state.network.activeCampaign?.mandate.id ?? null,
      activeCampaignId: state.network.activeCampaign?.mandate.campaignId ?? null,
      nodeStatuses: Object.freeze(
        state.network.nodes.map((node) => Object.freeze({ nodeId: node.id, status: node.status })),
      ),
      edgeStatuses: Object.freeze(
        state.network.edges.map((edge) => Object.freeze({ edgeId: edge.id, status: edge.status })),
      ),
    }),
  });
}

export type VisibleResource = "cells" | "substrate" | "atp" | "passages" | "pressure";
export type VisibleActionKind =
  "divide" | "producer" | "hallmark" | "stage" | "prestige" | "network" | "allocation";
export type VisibleAction = Readonly<{
  id: string;
  kind: VisibleActionKind;
  event: GameEvent;
  displayedCost:
    Readonly<{ resource: VisibleResource; value: CanonicalBigNumDto | number }> | undefined;
  summary: string;
  effectTags: readonly string[];
}>;
export type VisibleDecisionSurface = Readonly<{
  progression: ReplayVisibleProgression;
  displayedBalances: Readonly<Partial<Record<VisibleResource, CanonicalBigNumDto | number>>>;
  actions: readonly VisibleAction[];
}>;

function dto(value: { mantissa: number; exponent: number }): CanonicalBigNumDto {
  return Object.freeze({ mantissa: value.mantissa, exponent: value.exponent });
}
function envelope(state: GameState): Readonly<{ atMs: number; sourceEventSequence: number }> {
  return Object.freeze({ atMs: state.activeTimeMs, sourceEventSequence: state.eventSequence });
}
function visibleAction(
  kind: VisibleActionKind,
  event: GameEvent,
  summary: string,
  tags: readonly string[] = [],
  displayedCost: VisibleAction["displayedCost"] = undefined,
): VisibleAction {
  const id = `${event.type}:${Object.entries(event)
    .filter(([key]) => key !== "atMs" && key !== "sourceEventSequence")
    .map(([key, value]) => `${key}=${String(value)}`)
    .join(":")}`;
  return Object.freeze({
    id,
    kind,
    event: Object.freeze(event),
    displayedCost: displayedCost === undefined ? undefined : Object.freeze(displayedCost),
    summary,
    effectTags: Object.freeze([...tags]),
  });
}
/** Candidate ordering is catalog then saved choice order. The reducer remains the legality authority. */
/**
 * Candidate builders express normal visibility from their owning catalog/quote/gate.
 * A parser or reducer failure here is a construction defect, so it remains observable.
 */
function assertAcceptedCandidate(state: GameState, candidate: VisibleAction): void {
  recordEvent(state, parseRuntimeEvent(candidate.event));
}

function validateCandidateInventory(
  state: GameState,
  actions: readonly VisibleAction[],
): readonly VisibleAction[] {
  const identities = new Set<string>();
  for (const action of actions) {
    if (identities.has(action.id)) {
      throw new Error(`Visible decision surface contains duplicate action ${action.id}.`);
    }
    identities.add(action.id);
    assertAcceptedCandidate(state, action);
  }
  return actions;
}

function ownsHallmark(state: GameState, id: string): boolean {
  return state.hallmarkLevels.some((level) => level.id === id && level.level > 0);
}

function networkActionsAvailable(state: GameState): boolean {
  return (
    state.currentStage === "global_lab_contamination" &&
    state.lineageLedger.networkSeed !== null &&
    state.prestigeAvailability.some((entry) => entry.id === "L3" && entry.status === "earned") &&
    state.prestigeAvailability.some((entry) => entry.id === "L4" && entry.status === "earned")
  );
}
function candidates(state: GameState): readonly VisibleAction[] {
  const env = envelope(state);
  const quantities: readonly PurchaseQuantity[] = [1, 10, 100, "max"];
  const next = eligibleNextStage(state);
  const draft = state.hostTransfer.pendingDraft;
  const frontier = state.network.pendingFrontier;
  const microbiomeOffer = state.lateHallmarks.microbiome.pendingOffer;
  return [
    visibleAction("divide", { type: "click-divide", atMs: env.atMs }, "Divide one visible cell."),
    ...STAGE_ONE_PRODUCERS.flatMap((producer) =>
      quantities.flatMap((quantity) => {
        const quote = quoteProducerPurchase(state, producer.id, quantity);
        if (!quote.affordable) return [];
        const action = visibleAction(
          "producer",
          {
            type: "purchase-producer",
            producerId: producer.id,
            quantity,
            execution: "manual",
            atMs: env.atMs,
          },
          `Purchase ${producer.displayName}.`,
          ["producer", producer.id],
          { resource: "cells", value: dto(quote.debit) },
        );
        return [action];
      }),
    ),
    ...[
      ...CORE_SIX_HALLMARK_CATALOG,
      ...EXTENDED_HALLMARK_CATALOG,
      ...LATE_HALLMARK_CATALOG,
    ].flatMap((hallmark) => {
      const level = state.hallmarkLevels.find((candidate) => candidate.id === hallmark.id);
      const core = CORE_SIX_HALLMARK_CATALOG.find((candidate) => candidate.id === hallmark.id);
      const extended = EXTENDED_HALLMARK_CATALOG.find((candidate) => candidate.id === hallmark.id);
      const late = LATE_HALLMARK_CATALOG.find((candidate) => candidate.id === hallmark.id);
      const unlocked =
        (core !== undefined && hasReachedCoreSixUnlock(state.currentStage, core.key)) ||
        (extended !== undefined &&
          hasReachedExtendedHallmarkUnlock(state.currentStage, extended.key)) ||
        (late !== undefined &&
          hasReachedLateHallmarkActivation(state.currentStage, late.key) &&
          cultureLateProgramInterfacesAvailable(state));
      const maximum = hallmark.purchase.maximumLevel;
      if (!unlocked || level === undefined || level.level >= maximum) return [];
      return [
        visibleAction(
          "hallmark",
          { type: "purchase-hallmark", hallmarkId: hallmark.id, atMs: env.atMs },
          "Acquire a hallmark branch.",
          ["hallmark", hallmark.id],
        ),
      ];
    }),
    ...(next === undefined
      ? []
      : [
          visibleAction(
            "stage",
            {
              type: "advance-stage",
              fromStageId: state.currentStage,
              toStageId: next,
              atMs: env.atMs,
            },
            "Advance the stage.",
            ["stage", next],
          ),
        ]),
    ...(ownsHallmark(state, "proliferative_signaling")
      ? (["burst", "cycle"] as const).filter(
          (allocation) => allocation !== state.signalingAllocation,
        )
      : []
    ).map((allocation) =>
      visibleAction(
        "allocation",
        { type: "set-signaling-allocation", allocation, atMs: env.atMs },
        "Set signaling allocation.",
        ["signaling", allocation],
      ),
    ),
    ...(ownsHallmark(state, "growth_suppressor_evasion") && state.bypassedCheckpoints.length === 0
      ? checkpointRoutingDecisionOrder(state)
      : []
    ).map((checkpoint) =>
      visibleAction(
        "allocation",
        { type: "select-checkpoint", checkpoint, atMs: env.atMs },
        "Select checkpoint routing.",
        ["checkpoint", checkpoint],
      ),
    ),
    ...(ownsHallmark(state, "cell_death_resistance") ? state.pendingDamageEvents : []).flatMap(
      (damage) =>
        (["absorb", "repair", "lose-region"] as const).map((action) =>
          visibleAction(
            "allocation",
            { type: "resolve-triage", eventId: damage.id, action, atMs: env.atMs },
            "Resolve a saved damage decision.",
            ["triage", damage.id],
          ),
        ),
    ),
    ...state.regions.flatMap((region) => [
      ...phenotypeEligibilityQuote(state, region.id, env.atMs)
        .eligibleChoices.filter((phenotype) => phenotype !== region.phenotype)
        .map((phenotype) =>
          visibleAction(
            "allocation",
            { type: "assign-region-phenotype", regionId: region.id, phenotype, atMs: env.atMs },
            "Assign a regional phenotype.",
            ["phenotype", phenotype],
          ),
        ),
      ...(ownsHallmark(state, "angiogenesis")
        ? region.vesselLinkIds.length === 0
          ? [true]
          : [false]
        : []
      ).flatMap((linked) => [
        visibleAction(
          "allocation",
          { type: "set-vessel-link", regionId: region.id, linked, atMs: env.atMs },
          "Set regional vessel linkage.",
          ["vessel", region.id],
        ),
        ...(state.maskedRegions.includes(region.id) === linked
          ? []
          : ownsHallmark(state, "immune_destruction_avoidance")
            ? [
                visibleAction(
                  "allocation",
                  { type: "set-region-mask", regionId: region.id, masked: linked, atMs: env.atMs },
                  "Set regional immune masking.",
                  ["mask", region.id],
                ),
              ]
            : []),
      ]),
      ...(ownsHallmark(state, "tumor_promoting_inflammation") &&
      !state.inflammationEpisodes.some((episode) => episode.regionId === region.id)
        ? [
            visibleAction(
              "allocation",
              { type: "activate-inflammation", regionId: region.id, atMs: env.atMs },
              "Activate an inflammatory episode.",
              ["inflammation", region.id],
            ),
          ]
        : []),
      ...(ownsHallmark(state, "invasion_metastasis") && state.cells.mantissa > 0
        ? region.routeIds.filter((routeId) => state.committedCellCommitments[routeId] === undefined)
        : []
      ).map((routeId) =>
        visibleAction(
          "allocation",
          { type: "commit-route", routeId, cells: 1, atMs: env.atMs },
          "Commit cells to a revealed route.",
          ["route", routeId],
          { resource: "cells", value: 1 },
        ),
      ),
      ...(ownsHallmark(state, "replicative_immortality")
        ? ([1, 2, 3] as const).filter((charges) => charges <= state.telomeraseCharges)
        : []
      ).flatMap((charges) => [
        visibleAction(
          "allocation",
          {
            type: "spend-telomerase",
            target: "refill-region",
            regionId: region.id,
            charges,
            atMs: env.atMs,
          },
          "Refill regional telomere reserve.",
          ["telomerase", region.id],
        ),
        visibleAction(
          "allocation",
          { type: "spend-telomerase", target: "bank-reserve-floor", charges, atMs: env.atMs },
          "Bank a telomere reserve floor.",
          ["telomerase", "bank"],
        ),
      ]),
    ]),
    ...ATP_SINK_CATALOG.flatMap((sink) =>
      [sink.minimumBudget, sink.maximumBudget]
        .filter((amount) => amount !== (state.atpBudget[sink.id] ?? 0))
        .filter((amount) => {
          const replacement = { ...state.atpBudget, [sink.id]: amount };
          const total = Object.values(replacement).reduce((sum, value) => sum + value, 0);
          return total <= 200;
        })
        .map((amount) =>
          visibleAction(
            "allocation",
            { type: "set-atp-budget", sink: sink.id, amount, atMs: env.atMs },
            "Set an ATP sink allocation.",
            ["atp", sink.id],
          ),
        ),
    ),
    ...(ownsHallmark(state, "metabolic_deregulation") && state.substrate.mantissa > 0
      ? [
          visibleAction(
            "allocation",
            { type: "convert-substrate", amount: dto(state.substrate), atMs: env.atMs },
            "Convert the visible substrate amount to ATP.",
            ["metabolism"],
            { resource: "substrate", value: dto(state.substrate) },
          ),
        ]
      : []),
    ...(ownsHallmark(state, "genome_instability_mutation") ? state.mutationOffers : []).flatMap(
      (offer) =>
        offer.cards.map((card) =>
          visibleAction(
            "allocation",
            { type: "select-mutation", offerId: offer.id, mutationId: card.id, atMs: env.atMs },
            "Select a saved mutation card.",
            ["mutation", card.id],
          ),
        ),
    ),
    ...state.lateHallmarks.epigenetic.assignments.flatMap((assignment) =>
      programEligibilityQuote(state, assignment.hallmarkId, env.atMs)
        .options.filter((quote) => quote.eligible && quote.option.id !== assignment.optionId)
        .map((quote) => {
          const option = quote.option;
          return visibleAction(
            "allocation",
            {
              type: "reconfigure-hallmark-program",
              hallmarkId: assignment.hallmarkId,
              optionId: option.id,
              atMs: env.atMs,
            },
            "Reconfigure a late hallmark program.",
            ["late-program", option.id],
          );
        }),
    ),
    ...(microbiomeOffer === null
      ? []
      : MICROBIOME_COMPOSITION_CATALOG.map((composition) =>
          visibleAction(
            "allocation",
            {
              type: "install-microbiome-composition",
              offerId: microbiomeOffer.id,
              compositionId: composition.id,
              atMs: env.atMs,
            },
            "Install a saved microbiome composition.",
            ["microbiome", composition.id],
          ),
        )),
    ...state.lateHallmarks.senescence.pendingDecisions.flatMap((decision) =>
      (["keep", "clear"] as const).map((action) =>
        visibleAction(
          "allocation",
          { type: "resolve-senescence-decision", decisionId: decision.id, action, atMs: env.atMs },
          "Resolve a saved senescence decision.",
          ["senescence", decision.id],
        ),
      ),
    ),
    ...state.pendingTransitEvents.flatMap((transit) =>
      ORGAN_SITE_CATALOG.map((site) =>
        visibleAction(
          "prestige",
          {
            type: "resolve-transit",
            transitEventId: transit.id,
            destinationSiteId: site.id,
            atMs: env.atMs,
          },
          "Resolve a saved transit event.",
          ["transit", site.id],
        ),
      ),
    ),
    ...(state.currentStage === "host_collapse" ? ORGAN_SITE_CATALOG : []).flatMap((site) => [
      visibleAction(
        "prestige",
        { type: "allocate-organ-site", siteId: site.id, ...env },
        "Allocate a seeded organ site.",
        ["organ", site.id],
      ),
      visibleAction(
        "prestige",
        { type: "perform-metastasis-reset", siteId: site.id, ...env },
        "Perform the metastasis reset.",
        ["reset", "L1"],
      ),
      ...COLONIZATION_PROGRAM_CATALOG.map((program) =>
        visibleAction(
          "prestige",
          { type: "select-colonization-program", siteId: site.id, programId: program.id, ...env },
          "Choose a colonization program.",
          ["colonization", program.id],
        ),
      ),
    ]),
    ...(state.currentStage === "host_collapse" ? LINEAGE_BOON_CATALOG : []).flatMap((boon) => {
      if (boon.id === "extra_card_reveal")
        return [
          visibleAction(
            "prestige",
            { type: "purchase-lineage-boon", boonId: "extra_card_reveal", ...env },
            "Purchase a lineage boon.",
            ["boon", boon.id],
          ),
        ];
      if (boon.id === "protected_route_affinity")
        return [
          visibleAction(
            "prestige",
            { type: "purchase-lineage-boon", boonId: "protected_route_affinity", ...env },
            "Purchase a lineage boon.",
            ["boon", boon.id],
          ),
        ];
      return state.hostTransfer.activeHost === null
        ? []
        : [
            state.hostTransfer.activeHost.card.immuneRegime,
            state.hostTransfer.activeHost.card.tissueEcology,
            state.hostTransfer.activeHost.card.hostHorizon,
          ].map((targetTraitId) =>
            visibleAction(
              "prestige",
              {
                type: "purchase-lineage-boon",
                boonId: "reduced_trait_liability",
                targetTraitId,
                ...env,
              },
              "Reduce an active host-trait liability.",
              ["boon", targetTraitId],
            ),
          );
    }),
    ...(state.currentStage === "host_collapse"
      ? [
          visibleAction(
            "prestige",
            { type: "perform-host-transfer", ...env },
            "Perform host transfer.",
            ["reset", "L2"],
          ),
        ]
      : []),
    ...(draft === null
      ? []
      : draft.revealedCardIds.map((cardId) =>
          visibleAction(
            "prestige",
            {
              type: "select-host-card",
              draftId: draft.id,
              cardId,
              sourceEventSequence: draft.sourceEventSequence,
              atMs: env.atMs,
            },
            "Select a saved host-draft card.",
            ["host", cardId],
          ),
        )),
    ...PASSAGE_UPGRADE_CATALOG.flatMap((upgrade) => {
      const quote = passageUpgradeQuote(state.lineageLedger, state.culture, upgrade.id);
      if (!quote.available || quote.cost === null) return [];
      return [
        visibleAction(
          "prestige",
          { type: "purchase-passage-upgrade", upgradeId: upgrade.id, ...env },
          "Purchase a culture passage upgrade.",
          ["culture", upgrade.id],
          quote.cost === null ? undefined : { resource: "passages", value: quote.cost },
        ),
      ];
    }),
    ...CRYOBANK_PROGRAM_CATALOG.flatMap((program) => [
      ...(state.currentStage === "host_collapse"
        ? [
            visibleAction(
              "prestige",
              { type: "perform-immortalization", cryobankProgramId: program.id, ...env },
              "Perform immortalization.",
              ["culture", program.id],
            ),
          ]
        : []),
      ...(state.culture.cryobankProgram !== program.id &&
      state.culture.purchasedPassageUpgrades.some(
        (purchase) => purchase.upgradeId === "cryobank" && purchase.rank > 0,
      )
        ? [
            visibleAction(
              "prestige",
              { type: "select-cryobank-program", cryobankProgramId: program.id, ...env },
              "Select a cryobank program.",
              ["culture", program.id],
            ),
          ]
        : []),
    ]),
    ...(state.culture.purchasedPassageUpgrades.some(
      (purchase) => purchase.upgradeId === "assay_discipline" && purchase.rank > 0,
    )
      ? STAGE_ONE_PRODUCERS.filter(
          (producer) => quoteProducerPurchase(state, producer.id, 1).affordable,
        )
      : []
    ).map((producer) =>
      visibleAction(
        "prestige",
        { type: "queue-assay-producer-action", producerId: producer.id, ...env },
        "Queue a producer assay action.",
        ["culture", producer.id],
      ),
    ),
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
    ...(softEndingEligibility(state).available
      ? [
          visibleAction(
            "stage",
            { type: "reach-soft-ending", ...env },
            "Reach the soft ending and continue play.",
            ["ending"],
          ),
        ]
      : []),
  ];
}
/** Projects canonical balances and only parser-valid, reducer-accepted visible actions. */
export function projectVisibleDecisionSurface(state: GameState): VisibleDecisionSurface {
  const actions = validateCandidateInventory(state, candidates(state));
  return Object.freeze({
    progression: projectVisibleProgression(state),
    displayedBalances: Object.freeze({
      cells: dto(state.cells),
      substrate: dto(state.substrate),
      atp: dto(state.atp),
      passages: state.culture.passages,
      ...(state.network.globalTier > 0
        ? { pressure: dto(state.network.transmissionPressure) }
        : {}),
    }),
    actions: Object.freeze(actions),
  });
}
