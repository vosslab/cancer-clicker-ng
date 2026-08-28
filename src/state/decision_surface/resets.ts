import { LINEAGE_BOON_CATALOG } from "../../prestige/hosts.js";
import { COLONIZATION_PROGRAM_CATALOG, ORGAN_SITE_CATALOG } from "../../prestige/seeding.js";
import { eligibleNextStage } from "../../stages/gates.js";
import type { GameState } from "../../types/state.js";
import type { VisibleAction } from "./contracts.js";
import { envelope, visibleAction } from "./builders.js";

/** The adjacent stage transition retains its fixed slot before hallmark allocations. */
export function buildStageCandidates(state: GameState): readonly VisibleAction[] {
  const env = envelope(state);
  const next = eligibleNextStage(state);
  return [
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
  ];
}

/** L1/L2 reset and saved transit actions retain their later canonical surface slot. */
export function buildResetCandidates(state: GameState): readonly VisibleAction[] {
  const env = envelope(state);
  const draft = state.hostTransfer.pendingDraft;
  return [
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
      if (boon.id === "extra_card_reveal") {
        return [
          visibleAction(
            "prestige",
            { type: "purchase-lineage-boon", boonId: "extra_card_reveal", ...env },
            "Purchase a lineage boon.",
            ["boon", boon.id],
          ),
        ];
      }
      if (boon.id === "protected_route_affinity") {
        return [
          visibleAction(
            "prestige",
            { type: "purchase-lineage-boon", boonId: "protected_route_affinity", ...env },
            "Purchase a lineage boon.",
            ["boon", boon.id],
          ),
        ];
      }
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
  ];
}
