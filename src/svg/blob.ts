/** Pure, local SVG contours for one accepted M17 cell slot. */
import type { CellSlot } from "./colony_layout.js";
import type { MorphologyResolution } from "./morphology.js";
import { fbm_2d, hash_seed } from "./noise.js";
import type { CellRenderPathInput } from "./render_types.js";

export const MIN_CONTOUR_SAMPLES = 18;
export const MAX_CONTOUR_SAMPLES = 32;

/** The upper-left key light gives every local volume a consistent illustration intent. */
export const CELL_LIGHT_DIRECTION = Object.freeze({ x: -0.68, y: -0.73 });

type ContourPoint = Readonly<{ x: number; y: number }>;

function requireFinitePositive(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    throw new Error(`${label} must be finite and positive.`);
  }
  return value;
}

function requireUint32(value: unknown, label: string): number {
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value < 0 ||
    value > 0xffffffff
  ) {
    throw new Error(`${label} must be an unsigned 32-bit integer.`);
  }
  return value;
}

function requireUnit(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 1) {
    throw new Error(`${label} must be within 0..1.`);
  }
  return value;
}

function requireFrozenSlot(value: unknown): CellSlot {
  if (typeof value !== "object" || value === null || !Object.isFrozen(value)) {
    throw new Error("Cell contour requires a frozen M17 slot.");
  }
  const slot = value as CellSlot;
  if (
    typeof slot.key !== "string" ||
    slot.key.length === 0 ||
    !Object.isFrozen(slot.centre) ||
    !Object.isFrozen(slot.layoutOrigin) ||
    !Object.isFrozen(slot.layoutOrigin.sources)
  ) {
    throw new Error("Cell contour slot is incomplete.");
  }
  requireUint32(slot.seed, "Slot seed");
  requireUint32(slot.morphologySeed, "Slot morphology seed");
  requireFinitePositive(slot.rx, "Slot rx");
  requireFinitePositive(slot.ry, "Slot ry");
  requireFinitePositive(slot.scale, "Slot scale");
  if (!Number.isFinite(slot.orientation)) throw new Error("Slot orientation must be finite.");
  return slot;
}

function requireFrozenMorphology(value: unknown): MorphologyResolution {
  if (typeof value !== "object" || value === null || !Object.isFrozen(value)) {
    throw new Error("Cell contour requires a frozen M16 morphology resolution.");
  }
  const morphology = value as MorphologyResolution;
  if (
    !Object.isFrozen(morphology.params) ||
    !Object.isFrozen(morphology.provenance) ||
    !Object.isFrozen(morphology.traits) ||
    !Object.isFrozen(morphology.traits.polarityOrientation)
  ) {
    throw new Error("Cell contour morphology is incomplete.");
  }
  requireUint32(morphology.seed, "Morphology seed");
  requireUnit(morphology.params.elongation, "Morphology elongation");
  requireUnit(morphology.params.asymmetry, "Morphology asymmetry");
  requireUnit(morphology.params.nuclearToCytoplasmicRatio, "Morphology nuclear ratio");
  requireUnit(morphology.params.nuclearEccentricity, "Morphology nuclear eccentricity");
  requireUnit(morphology.params.membraneWaviness, "Morphology membrane waviness");
  requireUnit(morphology.params.polarity, "Morphology polarity");
  requireUnit(morphology.params.heterogeneity, "Morphology heterogeneity");
  if (
    !["round", "ovoid", "lobed", "spindle"].includes(morphology.traits.familyVariant) ||
    !["none", "paired_nuclei", "bipolar_spindle", "multipolar_spindle"].includes(
      morphology.traits.mitosis.motif,
    ) ||
    !["none", "central", "offset", "peripheral"].includes(morphology.traits.mitosis.placement)
  ) {
    throw new Error("Morphology discrete traits are outside the M16 vocabulary.");
  }
  if (
    (morphology.traits.mitosis.motif === "none") !==
    (morphology.traits.mitosis.placement === "none")
  ) {
    throw new Error("Morphology mitosis motif and placement must agree.");
  }
  for (const sources of Object.values(morphology.provenance)) {
    if (!Array.isArray(sources) || !Object.isFrozen(sources)) {
      throw new Error("Morphology provenance must retain frozen source records.");
    }
  }
  if (!Number.isFinite(morphology.traits.polarityOrientation.angleDegrees)) {
    throw new Error("Morphology polarity orientation must be finite.");
  }
  return morphology;
}

function contourSamples(seed: number): number {
  return MIN_CONTOUR_SAMPLES + (hash_seed([seed, "colony:contour-count-v1"]) % 15);
}

function formatCoordinate(value: number): string {
  if (!Number.isFinite(value) || Math.abs(value) > 10000) {
    throw new Error("Cell contour coordinates must be finite and bounded.");
  }
  return (Math.round(value * 1000) / 1000).toString();
}

function closedPath(points: readonly ContourPoint[]): string {
  const first = points[0];
  if (first === undefined) throw new Error("Cell contour requires points.");
  const commands = [`M ${formatCoordinate(first.x)} ${formatCoordinate(first.y)}`];
  for (let index = 1; index < points.length; index += 1) {
    const point = points[index];
    if (point === undefined) throw new Error("Cell contour point is missing.");
    commands.push(`L ${formatCoordinate(point.x)} ${formatCoordinate(point.y)}`);
  }
  commands.push("Z");
  return commands.join(" ");
}

function radialContour(
  seed: number,
  samples: number,
  radiusX: number,
  radiusY: number,
  waviness: number,
  asymmetry: number,
  phase: number,
  offsetX = 0,
  offsetY = 0,
): readonly ContourPoint[] {
  const points: ContourPoint[] = [];
  for (let index = 0; index < samples; index += 1) {
    const angle = (Math.PI * 2 * index) / samples;
    const noise = fbm_2d(seed, Math.cos(angle) * 1.75 + 2, Math.sin(angle) * 1.75 + 2, 3) * 2 - 1;
    const polarityWave = Math.cos(angle - phase);
    const lightWave = Math.cos(angle - Math.atan2(CELL_LIGHT_DIRECTION.y, CELL_LIGHT_DIRECTION.x));
    const radius = 1 + noise * waviness + polarityWave * asymmetry * 0.09 + lightWave * 0.025;
    points.push(
      Object.freeze({
        x: offsetX + Math.cos(angle) * radiusX * radius,
        y: offsetY + Math.sin(angle) * radiusY * radius,
      }),
    );
  }
  return Object.freeze(points);
}

/**
 * Builds local membrane and nucleus paths from immutable M16/M17 inputs.
 * Position, transform, depth, IDs, and scene ownership remain render_types.ts responsibilities.
 */
export function createCellBlobPaths(
  slotInput: unknown,
  morphologyInput: unknown,
): CellRenderPathInput {
  const slot = requireFrozenSlot(slotInput);
  const morphology = requireFrozenMorphology(morphologyInput);
  if (slot.morphologySeed !== morphology.seed) {
    throw new Error("Cell slot and morphology must share one accepted seed.");
  }
  const samples = contourSamples(slot.seed);
  const params = morphology.params;
  const localRx = slot.rx / slot.scale;
  const localRy = slot.ry / slot.scale;
  const family = morphology.traits.familyVariant;
  const familyElongation = family === "spindle" ? 0.28 : family === "ovoid" ? 0.14 : 0;
  const familyLobing = family === "lobed" ? 0.12 : 0;
  const membraneX = localRx * (1 + params.elongation * 0.38 + familyElongation);
  const membraneY = localRy * (1 - params.elongation * 0.16);
  const phase = (morphology.traits.polarityOrientation.angleDegrees * Math.PI) / 180;
  const membrane = radialContour(
    hash_seed([slot.seed, morphology.seed, "colony:membrane-v1"]),
    samples,
    membraneX,
    membraneY,
    0.018 + params.membraneWaviness * 0.09 + familyLobing,
    params.asymmetry,
    phase,
  );
  const nucleusScale = 0.32 + params.nuclearToCytoplasmicRatio * 0.32;
  const nucleusX = membraneX * nucleusScale * (1 + params.nuclearEccentricity * 0.12);
  const nucleusY = membraneY * nucleusScale * (1 - params.nuclearEccentricity * 0.08);
  const eccentricity = params.nuclearEccentricity * Math.min(membraneX, membraneY) * 0.22;
  const nucleus = radialContour(
    hash_seed([slot.seed, morphology.seed, "colony:nucleus-v1"]),
    samples,
    nucleusX,
    nucleusY,
    0.014 + params.membraneWaviness * 0.055,
    params.nuclearEccentricity,
    phase + Math.PI / 5,
    Math.cos(phase) * eccentricity,
    Math.sin(phase) * eccentricity,
  );
  return Object.freeze({
    slotKey: slot.key,
    membranePath: closedPath(membrane),
    nucleusPath: closedPath(nucleus),
    mitosis:
      morphology.traits.mitosis.motif === "none"
        ? undefined
        : Object.freeze({
            motif: morphology.traits.mitosis.motif,
            placement: morphology.traits.mitosis.placement as "central" | "offset" | "peripheral",
          }),
  });
}
