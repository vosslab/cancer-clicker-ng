import { CORE_SIX_HALLMARK_CATALOG } from "../../hallmarks/core_six_catalog.js";
import {
  ATP_SINK_CATALOG,
  EXTENDED_HALLMARK_CATALOG,
} from "../../hallmarks/extended_hallmark_catalog.js";
import { checkpointRoutingDecisionOrder } from "../../hallmarks/handlers/checkpoint_routing.js";
import { LATE_HALLMARK_CATALOG } from "../../hallmarks/late_hallmark_catalog.js";
import { programEligibilityQuote } from "../../hallmarks/late_hallmark_effects.js";
import { MICROBIOME_COMPOSITION_CATALOG } from "../../hallmarks/microbiome_catalog.js";
import { hallmarkPurchaseEligibility } from "../../hallmarks/purchase_eligibility.js";
import type { GameState } from "../../types/state.js";
import type { VisibleAction } from "./contracts.js";
import { dto, envelope, ownsHallmark, visibleAction } from "./builders.js";

/** Catalog-ordered hallmark purchases. */
export function buildHallmarkPurchaseCandidates(state: GameState): readonly VisibleAction[] {
  const env = envelope(state);
  return [
    ...[
      ...CORE_SIX_HALLMARK_CATALOG,
      ...EXTENDED_HALLMARK_CATALOG,
      ...LATE_HALLMARK_CATALOG,
    ].flatMap((hallmark) => {
      if (!hallmarkPurchaseEligibility(state, hallmark.id).available) return [];
      return [
        visibleAction(
          "hallmark",
          { type: "purchase-hallmark", hallmarkId: hallmark.id, atMs: env.atMs },
          "Acquire a hallmark branch.",
          ["hallmark", hallmark.id],
        ),
      ];
    }),
  ];
}

/** Global hallmark allocations that follow the stage-transition candidate. */
export function buildHallmarkAllocationCandidates(state: GameState): readonly VisibleAction[] {
  const env = envelope(state);
  return [
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
  ];
}

/** Hallmark allocations that follow regional choices in canonical surface order. */
export function buildHallmarkFollowupCandidates(state: GameState): readonly VisibleAction[] {
  const env = envelope(state);
  const microbiomeOffer = state.lateHallmarks.microbiome.pendingOffer;
  return [
    ...ATP_SINK_CATALOG.flatMap((sink) =>
      [sink.minimumBudget, sink.maximumBudget]
        .filter((amount) => amount !== (state.atpBudget[sink.id] ?? 0))
        .filter((amount) => {
          const replacement = { ...state.atpBudget, [sink.id]: amount };
          return Object.values(replacement).reduce((sum, value) => sum + value, 0) <= 200;
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
        .map((quote) =>
          visibleAction(
            "allocation",
            {
              type: "reconfigure-hallmark-program",
              hallmarkId: assignment.hallmarkId,
              optionId: quote.option.id,
              atMs: env.atMs,
            },
            "Reconfigure a late hallmark program.",
            ["late-program", quote.option.id],
          ),
        ),
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
  ];
}
