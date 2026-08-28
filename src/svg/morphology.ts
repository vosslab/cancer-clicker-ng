import { STAGE_IDS } from "../state/catalog.js";
import type { MorphologyParams } from "../types/morphology.js";

import { fbm_2d, hash_seed, mulberry32 } from "./noise.js";

export const MORPHOLOGY_AXES = [
  "elongation",
  "asymmetry",
  "nuclearToCytoplasmicRatio",
  "nuclearEccentricity",
  "membraneWaviness",
  "polarity",
  "heterogeneity",
  "tissueDisorganization",
  "invasion",
  "necrosis",
  "dissemination",
] as const;

export const MORPHOLOGY_REFERENCE_ROW_IDS = [
  "morphology:polarity_loss",
  "morphology:pleomorphism",
  "morphology:nuclear_irregularity",
  "morphology:elevated_nc_ratio",
  "morphology:abnormal_mitosis",
  "morphology:tissue_disorganization",
  "morphology:invasion_front",
  "morphology:necrotic_region",
  "morphology:metastatic_dissemination",
  "morphology:vascular_margin",
  "morphology:phenotype_variance",
  "morphology:chromatin_texture",
  "morphology:surface_motif",
  "morphology:senescent_shape",
  "morphology:baseline",
  "morphology:individual_variation",
  "morphology:resolver_clamp",
] as const;

export type MorphologyAxis = (typeof MORPHOLOGY_AXES)[number];
export type MorphologyReferenceRowId = (typeof MORPHOLOGY_REFERENCE_ROW_IDS)[number];
export type StageVisualId = (typeof STAGE_IDS)[number];
export type MorphologyLayer =
  "baseline" | "stage" | "hallmark" | "prestige" | "regional" | "individual";
export type ContributionMode = "add" | "multiply";
export type MitoticState = MorphologyParams["mitoticState"];
export type DepthStratum = MorphologyParams["depthStratum"];
export type CategoricalField = "mitoticState" | "depthStratum";

export type MorphologySource = Readonly<{
  layer: MorphologyLayer;
  contributorId: string;
  label: string;
  referenceRowId: MorphologyReferenceRowId;
}>;

export type AxisContribution = Readonly<{
  axis: MorphologyAxis;
  mode: ContributionMode;
  value: number;
  source: MorphologySource;
}>;

export type MitoticContribution = Readonly<{
  field: "mitoticState";
  value: MitoticState;
  priority: number;
  source: MorphologySource;
}>;

export type DepthContribution = Readonly<{
  field: "depthStratum";
  value: DepthStratum;
  priority: number;
  source: MorphologySource;
}>;

export type CategoricalContribution = MitoticContribution | DepthContribution;
export type MorphologyContribution = AxisContribution | CategoricalContribution;
export type MorphologyProvenance = Readonly<{
  [Field in keyof MorphologyParams]: readonly MorphologySource[];
}>;
export type MorphologyResolution = Readonly<{
  params: MorphologyParams;
  provenance: MorphologyProvenance;
  traits: DiscreteMorphologyTraits;
  seed: number;
}>;

export const FAMILY_VARIANTS = ["round", "ovoid", "lobed", "spindle"] as const;
export const POLARITY_ORIENTATION_BUCKETS = 8;
export const MITOSIS_MOTIFS = [
  "none",
  "paired_nuclei",
  "bipolar_spindle",
  "multipolar_spindle",
] as const;
export const MITOSIS_PLACEMENTS = ["none", "central", "offset", "peripheral"] as const;

export type FamilyVariant = (typeof FAMILY_VARIANTS)[number];
export type MitosisMotif = (typeof MITOSIS_MOTIFS)[number];
export type MitosisPlacement = (typeof MITOSIS_PLACEMENTS)[number];
export type PolarityOrientation = Readonly<{ bucket: number; angleDegrees: number }>;
export type MitosisTrait = Readonly<{ motif: MitosisMotif; placement: MitosisPlacement }>;
export type DiscreteMorphologyTraits = Readonly<{
  familyVariant: FamilyVariant;
  polarityOrientation: PolarityOrientation;
  mitosis: MitosisTrait;
}>;

export type RegionalMorphologyContributions = Readonly<{
  siteProgram?: readonly MorphologyContribution[];
  host?: readonly MorphologyContribution[];
  node?: readonly MorphologyContribution[];
}>;

export type MorphologyDeclarations = Readonly<{
  stage?: readonly MorphologyContribution[];
  hallmark?: readonly MorphologyContribution[];
  prestige?: readonly MorphologyContribution[];
  regional?: RegionalMorphologyContributions;
}>;

type NumericRule = Readonly<{
  baseline: number;
  mode: ContributionMode;
  minimum: number;
  maximum: number;
}>;

type MutableMorphologyParams = {
  -readonly [Field in keyof MorphologyParams]: MorphologyParams[Field];
};

type MutableMorphologyProvenance = {
  -readonly [Field in keyof MorphologyParams]: MorphologySource[];
};

type CategorySelections = {
  mitoticState: MitoticContribution;
  depthStratum: DepthContribution;
};

type CategoricalRule<Value extends string> = Readonly<{
  baseline: Value;
}>;

export const MORPHOLOGY_RULES: Readonly<{
  [Axis in MorphologyAxis]: NumericRule;
}> &
  Readonly<{
    mitoticState: CategoricalRule<MitoticState>;
    depthStratum: CategoricalRule<DepthStratum>;
  }> = Object.freeze({
  elongation: { baseline: 0, mode: "add", minimum: 0, maximum: 1 },
  asymmetry: { baseline: 0, mode: "add", minimum: 0, maximum: 1 },
  nuclearToCytoplasmicRatio: { baseline: 0.35, mode: "add", minimum: 0.2, maximum: 0.85 },
  nuclearEccentricity: { baseline: 0, mode: "add", minimum: 0, maximum: 1 },
  membraneWaviness: { baseline: 0.1, mode: "add", minimum: 0, maximum: 1 },
  polarity: { baseline: 1, mode: "multiply", minimum: 0, maximum: 1 },
  heterogeneity: { baseline: 0.1, mode: "add", minimum: 0, maximum: 1 },
  tissueDisorganization: { baseline: 0, mode: "add", minimum: 0, maximum: 1 },
  invasion: { baseline: 0, mode: "add", minimum: 0, maximum: 1 },
  necrosis: { baseline: 0, mode: "add", minimum: 0, maximum: 1 },
  dissemination: { baseline: 0, mode: "add", minimum: 0, maximum: 1 },
  mitoticState: { baseline: "quiescent" },
  depthStratum: { baseline: "surface" },
});

const BASELINE_SOURCE: MorphologySource = Object.freeze({
  layer: "baseline",
  contributorId: "baseline:morphology-v1",
  label: "Morphology grammar baseline",
  referenceRowId: "morphology:baseline",
});

export const MORPHOLOGY_VARIATION_BUDGETS: Readonly<Partial<Record<MorphologyAxis, number>>> =
  Object.freeze({
    elongation: 0.18,
    asymmetry: 0.16,
    nuclearToCytoplasmicRatio: 0.08,
    nuclearEccentricity: 0.16,
    membraneWaviness: 0.16,
    polarity: 0.14,
  });

const LAYER_RANK: Readonly<Record<MorphologyLayer, number>> = Object.freeze({
  baseline: 0,
  stage: 1,
  hallmark: 2,
  prestige: 3,
  regional: 4,
  individual: 5,
});

type StageMorphologyFixture = Readonly<{
  stageId: StageVisualId;
  referenceRowIds: readonly string[];
  contributions: readonly MorphologyContribution[];
}>;

function source(
  layer: MorphologyLayer,
  contributorId: string,
  label: string,
  referenceRowId: MorphologyReferenceRowId,
): MorphologySource {
  return { layer, contributorId, label, referenceRowId };
}

function add(
  axis: MorphologyAxis,
  value: number,
  contributorId: string,
  label: string,
  referenceRowId: MorphologyReferenceRowId,
): AxisContribution {
  return {
    axis,
    mode: "add",
    value,
    source: source("stage", contributorId, label, referenceRowId),
  };
}

function multiply(
  axis: MorphologyAxis,
  value: number,
  contributorId: string,
  label: string,
  referenceRowId: MorphologyReferenceRowId,
): AxisContribution {
  return {
    axis,
    mode: "multiply",
    value,
    source: source("stage", contributorId, label, referenceRowId),
  };
}

function depth(
  value: DepthStratum,
  priority: number,
  contributorId: string,
  label: string,
  referenceRowId: MorphologyReferenceRowId,
): DepthContribution {
  return {
    field: "depthStratum",
    value,
    priority,
    source: source("stage", contributorId, label, referenceRowId),
  };
}

/** Executable stage visual catalog; docs mirror these stable stage and row identifiers. */
export const STAGE_MORPHOLOGY_FIXTURES = {
  transformed_cell: {
    stageId: "transformed_cell",
    referenceRowIds: ["stage:transformed_cell", "morphology:nuclear_irregularity"],
    contributions: [
      add(
        "nuclearEccentricity",
        0.04,
        "stage:transformed_cell",
        "slightly eccentric nucleus",
        "morphology:nuclear_irregularity",
      ),
    ],
  },
  microcolony: {
    stageId: "microcolony",
    referenceRowIds: ["stage:microcolony", "morphology:pleomorphism", "morphology:polarity_loss"],
    contributions: [
      add(
        "heterogeneity",
        0.08,
        "stage:microcolony",
        "modest family variance",
        "morphology:pleomorphism",
      ),
      multiply(
        "polarity",
        0.94,
        "stage:microcolony",
        "coherent cluster rhythm",
        "morphology:polarity_loss",
      ),
    ],
  },
  avascular_lesion: {
    stageId: "avascular_lesion",
    referenceRowIds: [
      "stage:avascular_lesion",
      "morphology:tissue_disorganization",
      "morphology:necrotic_region",
    ],
    contributions: [
      add(
        "tissueDisorganization",
        0.18,
        "stage:avascular_lesion",
        "diffusion-limited packing",
        "morphology:tissue_disorganization",
      ),
      add(
        "necrosis",
        0.06,
        "stage:avascular_lesion",
        "low necrosis request",
        "morphology:necrotic_region",
      ),
      depth("deep", 10, "stage:avascular_lesion", "avascular core", "morphology:necrotic_region"),
    ],
  },
  hypoxic_lesion: {
    stageId: "hypoxic_lesion",
    referenceRowIds: [
      "stage:hypoxic_lesion",
      "morphology:necrotic_region",
      "morphology:polarity_loss",
    ],
    contributions: [
      add(
        "necrosis",
        0.32,
        "stage:hypoxic_lesion",
        "hypoxic interior",
        "morphology:necrotic_region",
      ),
      multiply(
        "polarity",
        0.76,
        "stage:hypoxic_lesion",
        "reduced cohesion",
        "morphology:polarity_loss",
      ),
      depth("deep", 10, "stage:hypoxic_lesion", "hypoxic core", "morphology:necrotic_region"),
    ],
  },
  angiogenic_primary: {
    stageId: "angiogenic_primary",
    referenceRowIds: ["stage:angiogenic_primary", "morphology:vascular_margin"],
    contributions: [],
  },
  invasive_carcinoma: {
    stageId: "invasive_carcinoma",
    referenceRowIds: [
      "stage:invasive_carcinoma",
      "morphology:invasion_front",
      "morphology:pleomorphism",
      "morphology:polarity_loss",
    ],
    contributions: [
      add(
        "invasion",
        0.48,
        "stage:invasive_carcinoma",
        "asymmetric invasive front",
        "morphology:invasion_front",
      ),
      add(
        "asymmetry",
        0.14,
        "stage:invasive_carcinoma",
        "uneven cell mass",
        "morphology:pleomorphism",
      ),
      add(
        "elongation",
        0.12,
        "stage:invasive_carcinoma",
        "elongated cell family",
        "morphology:pleomorphism",
      ),
      multiply(
        "polarity",
        0.7,
        "stage:invasive_carcinoma",
        "broken boundary alignment",
        "morphology:polarity_loss",
      ),
    ],
  },
  intravasation: {
    stageId: "intravasation",
    referenceRowIds: [
      "stage:intravasation",
      "morphology:invasion_front",
      "morphology:abnormal_mitosis",
    ],
    contributions: [],
  },
  micrometastatic_seeding: {
    stageId: "micrometastatic_seeding",
    referenceRowIds: [
      "stage:micrometastatic_seeding",
      "morphology:metastatic_dissemination",
      "morphology:phenotype_variance",
    ],
    contributions: [
      add(
        "dissemination",
        0.52,
        "stage:micrometastatic_seeding",
        "separate seeded islands",
        "morphology:metastatic_dissemination",
      ),
      add(
        "heterogeneity",
        0.16,
        "stage:micrometastatic_seeding",
        "site-specific families",
        "morphology:phenotype_variance",
      ),
    ],
  },
  metastatic_burden: {
    stageId: "metastatic_burden",
    referenceRowIds: [
      "stage:metastatic_burden",
      "morphology:metastatic_dissemination",
      "morphology:pleomorphism",
      "morphology:tissue_disorganization",
    ],
    contributions: [
      add(
        "dissemination",
        0.74,
        "stage:metastatic_burden",
        "multi-site burden",
        "morphology:metastatic_dissemination",
      ),
      add(
        "heterogeneity",
        0.3,
        "stage:metastatic_burden",
        "heterogeneous burden",
        "morphology:pleomorphism",
      ),
      add(
        "tissueDisorganization",
        0.22,
        "stage:metastatic_burden",
        "unequal site roles",
        "morphology:tissue_disorganization",
      ),
    ],
  },
  host_collapse: {
    stageId: "host_collapse",
    referenceRowIds: [
      "stage:host_collapse",
      "morphology:necrotic_region",
      "morphology:tissue_disorganization",
    ],
    contributions: [
      add(
        "necrosis",
        0.72,
        "stage:host_collapse",
        "fictional collapse transition",
        "morphology:necrotic_region",
      ),
      add(
        "tissueDisorganization",
        0.5,
        "stage:host_collapse",
        "collapse fragmentation",
        "morphology:tissue_disorganization",
      ),
    ],
  },
  immortalized_culture: {
    stageId: "immortalized_culture",
    referenceRowIds: [
      "stage:immortalized_culture",
      "morphology:senescent_shape",
      "morphology:chromatin_texture",
    ],
    contributions: [],
  },
  global_lab_contamination: {
    stageId: "global_lab_contamination",
    referenceRowIds: [
      "stage:global_lab_contamination",
      "morphology:metastatic_dissemination",
      "morphology:surface_motif",
      "morphology:phenotype_variance",
    ],
    contributions: [
      add(
        "dissemination",
        0.92,
        "stage:global_lab_contamination",
        "fictional network constellation",
        "morphology:metastatic_dissemination",
      ),
    ],
  },
} as const satisfies Record<StageVisualId, StageMorphologyFixture>;

function isMorphologyAxis(value: string): value is MorphologyAxis {
  return (MORPHOLOGY_AXES as readonly string[]).includes(value);
}

function isMorphologyReferenceRowId(value: string): value is MorphologyReferenceRowId {
  return (MORPHOLOGY_REFERENCE_ROW_IDS as readonly string[]).includes(value);
}

function requireSource(value: MorphologySource, expectedLayer: MorphologyLayer): MorphologySource {
  if (value.layer !== expectedLayer) {
    throw new Error(`Expected ${expectedLayer} contribution source layer.`);
  }
  if (value.contributorId.trim().length === 0) {
    throw new Error("Morphology contributorId must not be empty.");
  }
  if (value.label.trim().length === 0) {
    throw new Error("Morphology source label must not be empty.");
  }
  if (!isMorphologyReferenceRowId(value.referenceRowId)) {
    throw new Error("Unknown morphology reference row ID.");
  }
  return Object.freeze({ ...value });
}

function requireFinite(value: number, label: string): void {
  if (!Number.isFinite(value)) {
    throw new Error(`${label} must be finite.`);
  }
}

function requirePriority(value: number): void {
  if (!Number.isSafeInteger(value)) {
    throw new Error("Categorical priority must be a safe integer.");
  }
}

function isAxisContribution(value: MorphologyContribution): value is AxisContribution {
  return "axis" in value;
}

function validateContribution(
  contribution: MorphologyContribution,
  expectedLayer: MorphologyLayer,
): MorphologyContribution {
  const validatedSource = requireSource(contribution.source, expectedLayer);
  if (isAxisContribution(contribution)) {
    if (!isMorphologyAxis(contribution.axis)) {
      throw new Error("Unknown morphology axis.");
    }
    const rule = MORPHOLOGY_RULES[contribution.axis];
    if (contribution.mode !== rule.mode) {
      throw new Error(`Morphology axis ${contribution.axis} requires ${rule.mode} contributions.`);
    }
    requireFinite(contribution.value, `Morphology contribution ${contribution.axis}`);
    return Object.freeze({ ...contribution, source: validatedSource });
  }
  if (contribution.field !== "mitoticState" && contribution.field !== "depthStratum") {
    throw new Error("Unknown morphology categorical field.");
  }
  requirePriority(contribution.priority);
  if (
    contribution.field === "mitoticState" &&
    contribution.value !== "quiescent" &&
    contribution.value !== "dividing" &&
    contribution.value !== "abnormal"
  ) {
    throw new Error("Unknown mitotic state.");
  }
  if (
    contribution.field === "depthStratum" &&
    contribution.value !== "surface" &&
    contribution.value !== "middle" &&
    contribution.value !== "deep"
  ) {
    throw new Error("Unknown depth stratum.");
  }
  return Object.freeze({ ...contribution, source: validatedSource });
}

function baselineProvenance(): MutableMorphologyProvenance {
  return {
    elongation: [BASELINE_SOURCE],
    asymmetry: [BASELINE_SOURCE],
    nuclearToCytoplasmicRatio: [BASELINE_SOURCE],
    nuclearEccentricity: [BASELINE_SOURCE],
    membraneWaviness: [BASELINE_SOURCE],
    polarity: [BASELINE_SOURCE],
    mitoticState: [BASELINE_SOURCE],
    heterogeneity: [BASELINE_SOURCE],
    depthStratum: [BASELINE_SOURCE],
    tissueDisorganization: [BASELINE_SOURCE],
    invasion: [BASELINE_SOURCE],
    necrosis: [BASELINE_SOURCE],
    dissemination: [BASELINE_SOURCE],
  };
}

function baselineValues(): MutableMorphologyParams {
  return {
    elongation: MORPHOLOGY_RULES.elongation.baseline,
    asymmetry: MORPHOLOGY_RULES.asymmetry.baseline,
    nuclearToCytoplasmicRatio: MORPHOLOGY_RULES.nuclearToCytoplasmicRatio.baseline,
    nuclearEccentricity: MORPHOLOGY_RULES.nuclearEccentricity.baseline,
    membraneWaviness: MORPHOLOGY_RULES.membraneWaviness.baseline,
    polarity: MORPHOLOGY_RULES.polarity.baseline,
    mitoticState: MORPHOLOGY_RULES.mitoticState.baseline,
    heterogeneity: MORPHOLOGY_RULES.heterogeneity.baseline,
    depthStratum: MORPHOLOGY_RULES.depthStratum.baseline,
    tissueDisorganization: MORPHOLOGY_RULES.tissueDisorganization.baseline,
    invasion: MORPHOLOGY_RULES.invasion.baseline,
    necrosis: MORPHOLOGY_RULES.necrosis.baseline,
    dissemination: MORPHOLOGY_RULES.dissemination.baseline,
  };
}

function categoryWins(
  candidate: CategoricalContribution,
  current: CategoricalContribution,
): boolean {
  if (candidate.priority !== current.priority) {
    return candidate.priority > current.priority;
  }
  const candidateLayer = LAYER_RANK[candidate.source.layer];
  const currentLayer = LAYER_RANK[current.source.layer];
  if (candidateLayer !== currentLayer) {
    return candidateLayer > currentLayer;
  }
  return candidate.source.contributorId < current.source.contributorId;
}

function appendSource(
  provenance: MutableMorphologyProvenance,
  field: keyof MorphologyParams,
  contributionSource: MorphologySource,
): void {
  const sources = provenance[field];
  sources.push(contributionSource);
}

function applyLayer(
  values: MutableMorphologyParams,
  provenance: MutableMorphologyProvenance,
  categories: CategorySelections,
  contributions: readonly MorphologyContribution[],
  layer: MorphologyLayer,
): void {
  for (const rawContribution of contributions) {
    const contribution = validateContribution(rawContribution, layer);
    if (isAxisContribution(contribution)) {
      const axis = contribution.axis;
      const current = values[axis];
      values[axis] =
        contribution.mode === "add" ? current + contribution.value : current * contribution.value;
      appendSource(provenance, axis, contribution.source);
      continue;
    }
    appendSource(provenance, contribution.field, contribution.source);
    if (contribution.field === "mitoticState") {
      const current = categories.mitoticState;
      if (categoryWins(contribution, current)) {
        categories.mitoticState = contribution;
      }
      continue;
    }
    const current = categories.depthStratum;
    if (categoryWins(contribution, current)) {
      categories.depthStratum = contribution;
    }
  }
}

function variationSource(seed: number, axis: MorphologyAxis): MorphologySource {
  return Object.freeze({
    layer: "individual",
    contributorId: `individual:${seed}`,
    label: `bounded individual variation for ${axis}`,
    referenceRowId: "morphology:individual_variation",
  });
}

function clamp(value: number, minimum: number, maximum: number): number {
  const clamped = Math.max(minimum, Math.min(maximum, value));
  return clamped;
}

function clampSource(axis: MorphologyAxis, value: number, clampedValue: number): MorphologySource {
  return Object.freeze({
    layer: "individual",
    contributorId: `resolver:clamp:${axis}`,
    label: `resolver clamp ${axis}: ${value} -> ${clampedValue}`,
    referenceRowId: "morphology:resolver_clamp",
  });
}

function selectSeeded<const Value extends string>(
  values: readonly Value[],
  seed: number,
  streamName: string,
): Value {
  const stream = mulberry32(hash_seed([seed, streamName]));
  const index = Math.floor(stream() * values.length);
  const value = values[index];
  if (value === undefined) {
    throw new Error("Seeded morphology selection exceeded its declared values.");
  }
  return value;
}

function resolveDiscreteTraits(seed: number, mitoticState: MitoticState): DiscreteMorphologyTraits {
  const familyVariant = selectSeeded(FAMILY_VARIANTS, seed, "m16:family-variant-v1");
  const orientationStream = mulberry32(hash_seed([seed, "m16:polarity-orientation-v1"]));
  const bucket = Math.floor(orientationStream() * POLARITY_ORIENTATION_BUCKETS);
  const angleDegrees = bucket * (360 / POLARITY_ORIENTATION_BUCKETS);
  const polarityOrientation = Object.freeze({ bucket, angleDegrees });

  if (mitoticState === "quiescent") {
    const mitosis = Object.freeze({ motif: "none", placement: "none" });
    return Object.freeze({ familyVariant, polarityOrientation, mitosis });
  }
  const motifs =
    mitoticState === "dividing"
      ? (["paired_nuclei", "bipolar_spindle"] as const)
      : (["multipolar_spindle"] as const);
  const motif = selectSeeded(motifs, seed, "m16:mitosis-motif-v1");
  const placement = selectSeeded(
    ["central", "offset", "peripheral"] as const,
    seed,
    "m16:mitosis-placement-v1",
  );
  const mitosis = Object.freeze({ motif, placement });
  return Object.freeze({ familyVariant, polarityOrientation, mitosis });
}

function freezeResolution(
  values: MutableMorphologyParams,
  provenance: MutableMorphologyProvenance,
  traits: DiscreteMorphologyTraits,
  seed: number,
): MorphologyResolution {
  const frozenProvenance = Object.freeze({
    elongation: Object.freeze([...provenance.elongation]),
    asymmetry: Object.freeze([...provenance.asymmetry]),
    nuclearToCytoplasmicRatio: Object.freeze([...provenance.nuclearToCytoplasmicRatio]),
    nuclearEccentricity: Object.freeze([...provenance.nuclearEccentricity]),
    membraneWaviness: Object.freeze([...provenance.membraneWaviness]),
    polarity: Object.freeze([...provenance.polarity]),
    mitoticState: Object.freeze([...provenance.mitoticState]),
    heterogeneity: Object.freeze([...provenance.heterogeneity]),
    depthStratum: Object.freeze([...provenance.depthStratum]),
    tissueDisorganization: Object.freeze([...provenance.tissueDisorganization]),
    invasion: Object.freeze([...provenance.invasion]),
    necrosis: Object.freeze([...provenance.necrosis]),
    dissemination: Object.freeze([...provenance.dissemination]),
  });
  const resolution = {
    params: Object.freeze({ ...values }),
    provenance: frozenProvenance,
    traits,
    seed,
  };
  return Object.freeze(resolution);
}

/** Resolves ordered declarations into immutable renderer traits without reading game state. */
export function resolve_morphology(
  seed: number,
  declarations: MorphologyDeclarations = {},
): MorphologyResolution {
  if (!Number.isSafeInteger(seed) || seed < 0 || seed > 0xffffffff) {
    throw new Error("Morphology seed must be an unsigned 32-bit integer.");
  }
  const values = baselineValues();
  const provenance = baselineProvenance();
  const categories: CategorySelections = {
    mitoticState: {
      field: "mitoticState",
      value: MORPHOLOGY_RULES.mitoticState.baseline,
      priority: 0,
      source: BASELINE_SOURCE,
    },
    depthStratum: {
      field: "depthStratum",
      value: MORPHOLOGY_RULES.depthStratum.baseline,
      priority: 0,
      source: BASELINE_SOURCE,
    },
  };
  applyLayer(values, provenance, categories, declarations.stage ?? [], "stage");
  applyLayer(values, provenance, categories, declarations.hallmark ?? [], "hallmark");
  applyLayer(values, provenance, categories, declarations.prestige ?? [], "prestige");
  const regional = declarations.regional;
  applyLayer(values, provenance, categories, regional?.siteProgram ?? [], "regional");
  applyLayer(values, provenance, categories, regional?.host ?? [], "regional");
  applyLayer(values, provenance, categories, regional?.node ?? [], "regional");

  const boundedHeterogeneity = clamp(values.heterogeneity, 0, 1);
  for (const axis of MORPHOLOGY_AXES) {
    const budget = MORPHOLOGY_VARIATION_BUDGETS[axis];
    if (budget === undefined || boundedHeterogeneity === 0) {
      continue;
    }
    const noiseSeed = hash_seed([seed, axis]);
    const variation = (fbm_2d(noiseSeed, 0.375, 0.625, 3) * 2 - 1) * boundedHeterogeneity * budget;
    values[axis] += variation;
    appendSource(provenance, axis, variationSource(seed, axis));
  }

  for (const axis of MORPHOLOGY_AXES) {
    const rule = MORPHOLOGY_RULES[axis];
    const value = values[axis];
    const clampedValue = clamp(value, rule.minimum, rule.maximum);
    values[axis] = clampedValue;
    if (clampedValue !== value) {
      appendSource(provenance, axis, clampSource(axis, value, clampedValue));
    }
  }
  values.mitoticState = categories.mitoticState.value;
  values.depthStratum = categories.depthStratum.value;
  const traits = resolveDiscreteTraits(seed, values.mitoticState);
  return freezeResolution(values, provenance, traits, seed);
}

/** Resolves one canonical stage fixture with no UI, layout, or state dependency. */
export function resolve_stage_morphology(
  seed: number,
  stageId: StageVisualId,
): MorphologyResolution {
  const fixture = STAGE_MORPHOLOGY_FIXTURES[stageId];
  const declarations = { stage: fixture.contributions };
  return resolve_morphology(seed, declarations);
}
