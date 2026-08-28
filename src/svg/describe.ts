/**
 * Accessible, non-diagnostic language for the immutable colony renderer colony scene.
 * Copy describes the already accepted macro geometry; it never changes it.
 */
import { stageId } from "../brands.js";
import { stageDefinition } from "../stages/catalog.js";
import { measureColonyLayout } from "./colony_metrics.js";
import { suppressedDetailGeometry } from "./colony_layout.js";
import { createColonySceneRequest } from "./render_types.js";
import type { ColonySceneDescription, ColonySceneRequest } from "./render_types.js";
import type { StageId } from "../types/ids.js";

type StageCopy = Readonly<{
  id: StageId;
  label: string;
  focus: string;
  caption: string;
}>;

const STAGE_COPY: readonly StageCopy[] = [
  {
    id: stageId("transformed_cell"),
    label: "Transformed-cell field",
    focus: "one centered cell volume with generous surrounding space",
    caption: "One centered cell with open surrounding space.",
  },
  {
    id: stageId("microcolony"),
    label: "Microcolony field",
    focus: "a compact local cluster with repeated gaps between cell volumes",
    caption: "A compact cluster with readable cell-to-cell gaps.",
  },
  {
    id: stageId("avascular_lesion"),
    label: "Avascular field",
    focus: "a dense outer field around a constrained central interval",
    caption: "A dense outer field around a constrained center.",
  },
  {
    id: stageId("hypoxic_lesion"),
    label: "Hypoxic field",
    focus: "an uneven rim organized around a quiet central void",
    caption: "An uneven rim surrounding a quiet central void.",
  },
  {
    id: stageId("angiogenic_primary"),
    label: "Perfused primary field",
    focus: "an expanded body with a regional margin corridor",
    caption: "An expanded body with a regional margin corridor.",
  },
  {
    id: stageId("invasive_carcinoma"),
    label: "Invasive frontier",
    focus: "an asymmetric body that extends toward one broken front",
    caption: "An asymmetric body extending toward one broken front.",
  },
  {
    id: stageId("intravasation"),
    label: "Departure corridor",
    focus: "separated bodies arranged around a sparse departure corridor",
    caption: "Separated bodies arranged around a departure corridor.",
  },
  {
    id: stageId("micrometastatic_seeding"),
    label: "Disseminated micro-sites",
    focus: "small related islands with deliberately separated spacing",
    caption: "Small related islands with deliberate spacing.",
  },
  {
    id: stageId("metastatic_burden"),
    label: "Multi-site burden field",
    focus: "unequal island groups with varied local density",
    caption: "Unequal island groups with varied local density.",
  },
  {
    id: stageId("host_collapse"),
    label: "Fragmented field",
    focus: "a broken multi-part field with depleted internal spaces",
    caption: "A broken field with depleted internal spaces.",
  },
  {
    id: stageId("immortalized_culture"),
    label: "Culture well",
    focus: "an organized dish-like field with a broad surrounding moat",
    caption: "An organized dish-like field with a broad moat.",
  },
  {
    id: stageId("global_lab_contamination"),
    label: "Laboratory network",
    focus: "a constellation of separated node-like clusters and connecting intervals",
    caption: "A constellation of separated node-like clusters.",
  },
];

function equalNumbers(left: readonly number[], right: readonly number[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function sameMetrics(scene: ColonySceneRequest): boolean {
  const actual = scene.layout.metrics;
  const measured = measureColonyLayout(scene.layout);
  const expectedUnderfilled = scene.layout.clusters.some(
    (cluster) => cluster.accepted < cluster.target,
  );
  return (
    Object.isFrozen(actual) &&
    actual.occupiedFraction === measured.occupiedFraction &&
    actual.componentCount === measured.componentCount &&
    actual.largestComponentFraction === measured.largestComponentFraction &&
    actual.voidCount === measured.voidCount &&
    actual.voidAreaFraction === measured.voidAreaFraction &&
    actual.medianNearestNeighbourGap === measured.medianNearestNeighbourGap &&
    actual.gapCoefficientOfVariation === measured.gapCoefficientOfVariation &&
    actual.radialAsymmetry === measured.radialAsymmetry &&
    actual.principalAxisRatio === measured.principalAxisRatio &&
    actual.depthCounts.deep === measured.depthCounts.deep &&
    actual.depthCounts.middle === measured.depthCounts.middle &&
    actual.depthCounts.surface === measured.depthCounts.surface &&
    actual.sameDepthOverlapCount === measured.sameDepthOverlapCount &&
    actual.crossDepthPermittedOverlapCount === measured.crossDepthPermittedOverlapCount &&
    actual.outOfBoundsCount === measured.outOfBoundsCount &&
    actual.clearanceFailures === measured.clearanceFailures &&
    actual.underfilled === expectedUnderfilled &&
    equalNumbers(actual.macroFingerprint, measured.macroFingerprint)
  );
}

function assertAcceptedGeometry(scene: ColonySceneRequest): void {
  if (!sameMetrics(scene))
    throw new Error("Scene layout metrics must match accepted M17 geometry.");
  const geometry = suppressedDetailGeometry(scene.layout);
  if (!Object.isFrozen(geometry) || geometry.length === 0 || !geometry.every(Number.isFinite)) {
    throw new Error("Scene suppressed-detail geometry must be finite.");
  }
}

function copyForStage(id: StageId): StageCopy {
  const copy = STAGE_COPY.find((candidate) => candidate.id === id);
  if (!copy) throw new Error("Scene stage has no accessible description copy.");
  return copy;
}

function depthSummary(scene: ColonySceneRequest): string {
  const counts = scene.layout.metrics.depthCounts;
  const activeStrata = [
    counts.deep > 0 ? "deep" : undefined,
    counts.middle > 0 ? "middle" : undefined,
    counts.surface > 0 ? "surface" : undefined,
  ].filter((value): value is string => value !== undefined);
  const summary = activeStrata.join(", ");
  return `${summary} depth layers`;
}

/** Returns concise stable text for one validated, immutable colony illustration. */
export function describeColonyScene(value: ColonySceneRequest): ColonySceneDescription {
  const scene = createColonySceneRequest(value);
  stageDefinition(scene.stageId);
  assertAcceptedGeometry(scene);
  const copy = copyForStage(scene.stageId);
  const metrics = scene.layout.metrics;
  const title = `${copy.label}: stylized colony composition`;
  const description =
    `${copy.label} is a fictional game illustration showing ${copy.focus}. ` +
    `Its accepted layout has ${metrics.componentCount} connected groups, ${metrics.voidCount} ` +
    `structured voids, and ${depthSummary(scene)}. This is a stylized visual abstraction.`;
  return Object.freeze({ title, description, caption: copy.caption });
}
