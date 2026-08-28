import { LINEAGE_BOON_CATALOG } from "../../prestige/hosts.js";
import {
  COLONIZATION_PROGRAM_CATALOG,
  isRouteCompatibleWithSite,
  ORGAN_SITE_CATALOG,
} from "../../prestige/seeding.js";
import { projectL1Reset, projectL2Reset } from "../../prestige/reset.js";
import { bigNum } from "../../brands.js";
import { compare } from "../../bignum/bignum.js";
import { eligibleNextStage } from "../../stages/gates.js";
import type { GameState } from "../../types/state.js";
import type { VisibleAction } from "./contracts.js";
import { envelope, visibleAction } from "./builders.js";

function canAllocateOrganSite(
  state: GameState,
  site: (typeof ORGAN_SITE_CATALOG)[number],
): boolean {
  const current = state.metastasis.allocations.find((allocation) => allocation.siteId === site.id);
  const nextRank = (current?.rank ?? 0) + 1;
  const cost = site.allocationCosts[nextRank - 1];
  return cost !== undefined && compare(state.metastasis.metastaticPotential, bigNum(cost, 0)) >= 0;
}

function canPurchaseLineageBoon(
  state: GameState,
  boon: (typeof LINEAGE_BOON_CATALOG)[number],
): boolean {
  return (
    !state.lineageLedger.usedLineageBoonIds.includes(boon.id) &&
    state.hostTransfer.hostImprints >= boon.cost
  );
}

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
      ORGAN_SITE_CATALOG.filter((site) => isRouteCompatibleWithSite(transit.routeId, site.id)).map(
        (site) =>
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
    ...(state.currentStage === "host_collapse" ? ORGAN_SITE_CATALOG : []).flatMap((site) => {
      const l1Event = { type: "perform-metastasis-reset" as const, siteId: site.id, ...env };
      const allocated = state.metastasis.allocations.some(
        (allocation) => allocation.siteId === site.id && allocation.rank > 0,
      );
      return [
        ...(canAllocateOrganSite(state, site)
          ? [
              visibleAction(
                "prestige",
                { type: "allocate-organ-site", siteId: site.id, ...env },
                "Allocate a seeded organ site.",
                ["organ", site.id],
              ),
            ]
          : []),
        ...(projectL1Reset(state, l1Event) === undefined
          ? []
          : [visibleAction("prestige", l1Event, "Perform the metastasis reset.", ["reset", "L1"])]),
        ...(allocated
          ? COLONIZATION_PROGRAM_CATALOG.map((program) =>
              visibleAction(
                "prestige",
                {
                  type: "select-colonization-program",
                  siteId: site.id,
                  programId: program.id,
                  ...env,
                },
                "Choose a colonization program.",
                ["colonization", program.id],
              ),
            )
          : []),
      ];
    }),
    ...(state.currentStage === "host_collapse" ? LINEAGE_BOON_CATALOG : []).flatMap((boon) => {
      if (!canPurchaseLineageBoon(state, boon)) return [];
      if (boon.id === "extra_card_reveal") {
        if (state.hostTransfer.purchasedBoons.some((purchase) => purchase.boonId === boon.id))
          return [];
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
        if (state.hostTransfer.purchasedBoons.some((purchase) => purchase.boonId === boon.id))
          return [];
        return [
          visibleAction(
            "prestige",
            { type: "purchase-lineage-boon", boonId: "protected_route_affinity", ...env },
            "Purchase a lineage boon.",
            ["boon", boon.id],
          ),
        ];
      }
      const activeHost = state.hostTransfer.activeHost;
      const draft = state.hostTransfer.pendingDraft;
      return activeHost === null ||
        draft === null ||
        draft.consumedCardId !== activeHost.card.id ||
        state.lineageLedger.currentHostRunId !== activeHost.hostRunId
        ? []
        : [
            activeHost.card.immuneRegime,
            activeHost.card.tissueEcology,
            activeHost.card.hostHorizon,
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
    ...(state.currentStage === "host_collapse" && projectL2Reset(state, env) !== undefined
      ? [
          visibleAction(
            "prestige",
            { type: "perform-host-transfer", ...env },
            "Perform host transfer.",
            ["reset", "L2"],
          ),
        ]
      : []),
    ...(draft === null || !draft.available || draft.consumedCardId !== null
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
