import { phenotypeEligibilityQuote } from "../../hallmarks/late_hallmark_effects.js";
import type { GameState } from "../../types/state.js";
import type { VisibleAction } from "./contracts.js";
import { envelope, ownsHallmark, visibleAction } from "./builders.js";

/** Region-local phenotype, perfusion, immune, route, and telomere decisions. */
export function buildRegionalActionCandidates(state: GameState): readonly VisibleAction[] {
  const env = envelope(state);
  return state.regions.flatMap((region) => [
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
  ]);
}
