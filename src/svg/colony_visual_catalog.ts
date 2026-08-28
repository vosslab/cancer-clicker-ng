/**
 * Catalog-owned biology-to-visual declarations for the living colony scene.
 * Each row starts from an authoritative game predicate; SVG consumers receive
 * the resolved effect ledger rather than branching on game mechanics.
 */
import { coreSixHallmarkDefinition } from "../hallmarks/core_six_catalog.js";
import type { CoreSixHallmarkKey } from "../hallmarks/core_six_types.js";
import { extendedHallmarkDefinition } from "../hallmarks/extended_hallmark_catalog.js";
import type { ExtendedHallmarkKey } from "../hallmarks/extended_hallmark_types.js";
import {
  isLateHallmarkOperational,
  isRetainedSenescentRegion,
} from "../hallmarks/late_hallmark_effects.js";
import type { LateHallmarkKey } from "../hallmarks/late_hallmark_types.js";
import { findLateProgramOption } from "../hallmarks/program_catalog.js";
import { networkMorphologyContributions } from "../prestige/network_effects.js";
import type { GameState } from "../types/state.js";
import type { MorphologyContribution, MorphologyReferenceRowId } from "./morphology.js";

export const COLONY_VISUAL_EFFECT_IDS = [
  "cycling-division",
  "checkpoint-disorganization",
  "viability-preservation",
  "replicative-reserve",
  "perfusion-supply",
  "invasive-route",
  "metabolic-state",
  "immune-mask",
  "inflammatory-region",
  "mutation-heterogeneity",
  "phenotype-variance",
  "chromatin-program",
  "microbiome-surface",
  "senescent-region",
] as const;

export type ColonyVisualEffectId = (typeof COLONY_VISUAL_EFFECT_IDS)[number];

export type ColonyVisualCatalogRow<Key extends string> = Readonly<{
  key: Key;
  effectId: ColonyVisualEffectId;
  sourceLabel: string;
  biology: string;
  referenceRowIds: readonly MorphologyReferenceRowId[];
  isActive: (game: GameState) => boolean;
  regionIds: (game: GameState) => readonly string[];
  morphology: (game: GameState) => readonly MorphologyContribution[];
}>;

function ownsCoreSix(game: GameState, key: CoreSixHallmarkKey): boolean {
  const definition = coreSixHallmarkDefinition(key);
  return game.hallmarkLevels.some(
    (level) => level.id === definition.id && level.level >= definition.ownership.requiredLevel,
  );
}

function ownsExtendedHallmark(game: GameState, key: ExtendedHallmarkKey): boolean {
  const definition = extendedHallmarkDefinition(key);
  return game.hallmarkLevels.some(
    (level) => level.id === definition.id && level.level >= definition.ownership.requiredLevel,
  );
}

function activeRegionIds(game: GameState): readonly string[] {
  return game.regions.map((region) => region.id);
}

function noRegions(_game: GameState): readonly string[] {
  return [];
}

function noMorphology(_game: GameState): readonly MorphologyContribution[] {
  return [];
}

/** L4 topology remains a regional-node declaration rather than a global hallmark visual effect. */
export function networkNodeMorphology(game: GameState): readonly MorphologyContribution[] {
  return networkMorphologyContributions(game);
}

function cyclingMorphology(_game: GameState): readonly MorphologyContribution[] {
  return [
    {
      field: "mitoticState",
      value: "dividing",
      priority: 20,
      source: {
        layer: "hallmark",
        contributorId: "hallmark:proliferative_signaling",
        label: "cycling division cue",
        referenceRowId: "morphology:abnormal_mitosis",
      },
    },
  ];
}

function mutationMorphology(_game: GameState): readonly MorphologyContribution[] {
  return [
    {
      axis: "nuclearEccentricity",
      mode: "add",
      value: 0.06,
      source: {
        layer: "hallmark",
        contributorId: "hallmark:genome_instability_mutation:nuclear",
        label: "mutation-associated nuclear irregularity",
        referenceRowId: "morphology:nuclear_irregularity",
      },
    },
    {
      axis: "heterogeneity",
      mode: "add",
      value: 0.08,
      source: {
        layer: "hallmark",
        contributorId: "hallmark:genome_instability_mutation:family",
        label: "mutation-associated family variance",
        referenceRowId: "morphology:pleomorphism",
      },
    },
  ];
}

function activeMappedRegions(game: GameState): readonly GameState["regions"][number][] {
  return game.regions.filter(
    (region) => region.viability > 0 && !isRetainedSenescentRegion(game, region.id),
  );
}

function activePhenotypesDiffer(game: GameState): boolean {
  const phenotypes = new Set(activeMappedRegions(game).map((region) => region.phenotype));
  return phenotypes.size >= 2;
}

function activeProgramAssignment(game: GameState): boolean {
  if (!isLateHallmarkOperational(game, "epigenetic_reprogramming")) return false;
  return game.lateHallmarks.epigenetic.assignments.some((assignment) => {
    const option = findLateProgramOption(assignment.optionId);
    return option !== undefined && option.target === assignment.hallmarkId;
  });
}

function retainedExtantRegionIds(game: GameState): readonly string[] {
  return game.regions
    .filter((region) => isRetainedSenescentRegion(game, region.id))
    .map((region) => region.id);
}

function phenotypeVarianceMorphology(_game: GameState): readonly MorphologyContribution[] {
  return [
    {
      axis: "heterogeneity",
      mode: "add",
      value: 0.1,
      source: {
        layer: "hallmark",
        contributorId: "hallmark:phenotypic_plasticity",
        label: "active regional phenotype variance",
        referenceRowId: "morphology:phenotype_variance",
      },
    },
  ];
}

function chromatinProgramMorphology(_game: GameState): readonly MorphologyContribution[] {
  return [
    {
      axis: "membraneWaviness",
      mode: "add",
      value: 0.06,
      source: {
        layer: "hallmark",
        contributorId: "hallmark:epigenetic_reprogramming",
        label: "active program chromatin cue",
        referenceRowId: "morphology:chromatin_texture",
      },
    },
  ];
}

function microbiomeSurfaceMorphology(_game: GameState): readonly MorphologyContribution[] {
  return [
    {
      axis: "membraneWaviness",
      mode: "add",
      value: 0.04,
      source: {
        layer: "hallmark",
        contributorId: "hallmark:polymorphic_microbiomes",
        label: "installed composition surface cue",
        referenceRowId: "morphology:surface_motif",
      },
    },
  ];
}

function senescentRegionMorphology(_game: GameState): readonly MorphologyContribution[] {
  return [
    {
      axis: "elongation",
      mode: "add",
      value: 0.08,
      source: {
        layer: "hallmark",
        contributorId: "hallmark:senescent_cells",
        label: "retained senescent region cue",
        referenceRowId: "morphology:senescent_shape",
      },
    },
  ];
}

/** Core mechanics contribute only when the authoritative state shows their named condition. */
export const CORE_SIX_COLONY_VISUAL_CATALOG = {
  proliferative_signaling: {
    key: "proliferative_signaling",
    effectId: "cycling-division",
    sourceLabel: "Sustaining proliferative signaling",
    biology: "A cycling allocation creates a categorical mitotic cue.",
    referenceRowIds: ["morphology:abnormal_mitosis"],
    isActive: (game) =>
      ownsCoreSix(game, "proliferative_signaling") &&
      (game.signalingAllocation === "cycle" ||
        game.manualDivisionCharge > 0 ||
        game.cycleFillRate > 0),
    regionIds: noRegions,
    morphology: cyclingMorphology,
  },
  growth_suppressor_evasion: {
    key: "growth_suppressor_evasion",
    effectId: "checkpoint-disorganization",
    sourceLabel: "Evading growth suppressors",
    biology: "Bypassed checkpoints are recorded as a tissue-level status cue.",
    referenceRowIds: ["morphology:tissue_disorganization"],
    isActive: (game) =>
      ownsCoreSix(game, "growth_suppressor_evasion") && game.bypassedCheckpoints.length > 0,
    regionIds: noRegions,
    morphology: noMorphology,
  },
  cell_death_resistance: {
    key: "cell_death_resistance",
    effectId: "viability-preservation",
    sourceLabel: "Resisting cell death",
    biology: "Survival capacity is shown as a condition status, not an invented tissue field.",
    referenceRowIds: ["morphology:necrotic_region"],
    isActive: (game) => ownsCoreSix(game, "cell_death_resistance") && game.survivalCapacity > 0,
    regionIds: activeRegionIds,
    morphology: noMorphology,
  },
  replicative_immortality: {
    key: "replicative_immortality",
    effectId: "replicative-reserve",
    sourceLabel: "Enabling replicative immortality",
    biology: "Recorded reserve or telomerase capacity is a progression status cue.",
    referenceRowIds: ["morphology:senescent_shape"],
    isActive: (game) =>
      ownsCoreSix(game, "replicative_immortality") &&
      (game.telomeraseCharges > 0 ||
        Object.values(game.telomereReserveByRegion).some((reserve) => reserve > game.reserveFloor)),
    regionIds: activeRegionIds,
    morphology: noMorphology,
  },
  angiogenesis: {
    key: "angiogenesis",
    effectId: "perfusion-supply",
    sourceLabel: "Inducing angiogenesis",
    biology: "Existing vessel links create restrained regional perfusion overlays.",
    referenceRowIds: ["morphology:vascular_margin"],
    isActive: (game) =>
      ownsCoreSix(game, "angiogenesis") &&
      game.regions.some((region) => region.vesselLinkIds.length > 0),
    regionIds: (game) =>
      game.regions.filter((region) => region.vesselLinkIds.length > 0).map((region) => region.id),
    morphology: noMorphology,
  },
  invasion_metastasis: {
    key: "invasion_metastasis",
    effectId: "invasive-route",
    sourceLabel: "Activating invasion and metastasis",
    biology: "Committed routes and seeded sites create route or site overlays.",
    referenceRowIds: ["morphology:invasion_front", "morphology:metastatic_dissemination"],
    isActive: (game) =>
      ownsCoreSix(game, "invasion_metastasis") &&
      (Object.values(game.committedCellCommitments).some((cells) => cells > 0) ||
        game.seededSites.length > 0),
    regionIds: (game) =>
      game.regions
        .filter(
          (region) =>
            region.routeIds.some((routeId) => (game.committedCellCommitments[routeId] ?? 0) > 0) ||
            game.seededSites.includes(region.id),
        )
        .map((region) => region.id),
    morphology: noMorphology,
  },
} as const satisfies Readonly<
  Record<CoreSixHallmarkKey, ColonyVisualCatalogRow<CoreSixHallmarkKey>>
>;

/** Extended mechanics keep their real energy, immune, inflammatory, and mutation evidence explicit. */
export const EXTENDED_HALLMARK_COLONY_VISUAL_CATALOG = {
  metabolic_deregulation: {
    key: "metabolic_deregulation",
    effectId: "metabolic-state",
    sourceLabel: "Deregulating cellular metabolism",
    biology: "A positive ATP pool is shown as an energy status cue.",
    referenceRowIds: ["morphology:baseline"],
    isActive: (game) =>
      ownsExtendedHallmark(game, "metabolic_deregulation") && game.atp.mantissa > 0,
    regionIds: noRegions,
    morphology: noMorphology,
  },
  immune_destruction_avoidance: {
    key: "immune_destruction_avoidance",
    effectId: "immune-mask",
    sourceLabel: "Avoiding immune destruction",
    biology: "Masked regions create a local visibility overlay.",
    referenceRowIds: ["morphology:surface_motif"],
    isActive: (game) =>
      ownsExtendedHallmark(game, "immune_destruction_avoidance") && game.maskedRegions.length > 0,
    regionIds: (game) => game.maskedRegions,
    morphology: noMorphology,
  },
  tumor_promoting_inflammation: {
    key: "tumor_promoting_inflammation",
    effectId: "inflammatory-region",
    sourceLabel: "Tumor-promoting inflammation",
    biology: "Active inflammatory episodes create local regional overlays.",
    referenceRowIds: ["morphology:surface_motif"],
    isActive: (game) =>
      ownsExtendedHallmark(game, "tumor_promoting_inflammation") &&
      (game.inflammationEpisodes.length > 0 ||
        Object.values(game.regionalInflammation).some((value) => value > 0)),
    regionIds: (game) => [
      ...game.inflammationEpisodes.map((episode) => episode.regionId),
      ...game.regions
        .filter((region) => (game.regionalInflammation[region.id] ?? 0) > 0)
        .map((region) => region.id),
    ],
    morphology: noMorphology,
  },
  genome_instability_mutation: {
    key: "genome_instability_mutation",
    effectId: "mutation-heterogeneity",
    sourceLabel: "Genome instability and mutation",
    biology: "Chosen mutation cards add bounded nuclear and family variation declarations.",
    referenceRowIds: ["morphology:nuclear_irregularity", "morphology:pleomorphism"],
    isActive: (game) =>
      ownsExtendedHallmark(game, "genome_instability_mutation") && game.chosenMutations.length > 0,
    regionIds: activeRegionIds,
    morphology: mutationMorphology,
  },
} as const satisfies Readonly<
  Record<ExtendedHallmarkKey, ColonyVisualCatalogRow<ExtendedHallmarkKey>>
>;

/** Late-hallmark rows project only published p5 aggregate evidence into M16 provenance. */
export const LATE_HALLMARK_COLONY_VISUAL_CATALOG = {
  phenotypic_plasticity: {
    key: "phenotypic_plasticity",
    effectId: "phenotype-variance",
    sourceLabel: "Unlocking phenotypic plasticity",
    biology: "Distinct active regional phenotypes create a bounded variance cue.",
    referenceRowIds: ["morphology:phenotype_variance"],
    isActive: (game) =>
      isLateHallmarkOperational(game, "phenotypic_plasticity") && activePhenotypesDiffer(game),
    regionIds: (game) => activeMappedRegions(game).map((region) => region.id),
    morphology: phenotypeVarianceMorphology,
  },
  epigenetic_reprogramming: {
    key: "epigenetic_reprogramming",
    effectId: "chromatin-program",
    sourceLabel: "Nonmutational epigenetic reprogramming",
    biology: "An active program creates a bounded chromatin texture cue.",
    referenceRowIds: ["morphology:chromatin_texture"],
    isActive: activeProgramAssignment,
    regionIds: noRegions,
    morphology: chromatinProgramMorphology,
  },
  polymorphic_microbiomes: {
    key: "polymorphic_microbiomes",
    effectId: "microbiome-surface",
    sourceLabel: "Polymorphic microbiomes",
    biology: "An installed composition creates a restrained contextual surface cue.",
    referenceRowIds: ["morphology:surface_motif"],
    isActive: (game) =>
      isLateHallmarkOperational(game, "polymorphic_microbiomes") &&
      game.lateHallmarks.microbiome.activeComposition !== null,
    regionIds: noRegions,
    morphology: microbiomeSurfaceMorphology,
  },
  senescent_cells: {
    key: "senescent_cells",
    effectId: "senescent-region",
    sourceLabel: "Senescent cells",
    biology: "A retained extant region creates a local nondivision cue.",
    referenceRowIds: ["morphology:senescent_shape"],
    isActive: (game) =>
      isLateHallmarkOperational(game, "senescent_cells") &&
      retainedExtantRegionIds(game).length > 0,
    regionIds: retainedExtantRegionIds,
    morphology: senescentRegionMorphology,
  },
} as const satisfies Readonly<Record<LateHallmarkKey, ColonyVisualCatalogRow<LateHallmarkKey>>>;

export const COLONY_VISUAL_CATALOG = [
  ...Object.values(CORE_SIX_COLONY_VISUAL_CATALOG),
  ...Object.values(EXTENDED_HALLMARK_COLONY_VISUAL_CATALOG),
  ...Object.values(LATE_HALLMARK_COLONY_VISUAL_CATALOG),
] as const;
