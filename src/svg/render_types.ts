/**
 * Data-only boundary between accepted morphology and colony-layout data and the renderer SVG
 * components. Rendering may project this immutable description, but never
 * changes the accepted colony layout or resolves another morphology.
 */
import { isStageId } from "../state/catalog.js";
import type { StageId } from "../types/ids.js";
import { assertColonyVisualState } from "./colony_visual_state.js";
import type { ColonyVisualState } from "./colony_visual_state.js";
import type { CellSlot, ColonyBurdenTier, ColonyLayout, DepthStratum } from "./colony_layout.js";
import type { MitosisMotif, MitosisPlacement, MorphologyResolution } from "./morphology.js";

export type ColonySceneDetail = "representative" | "inspection";

export type ColonySceneRequest = Readonly<{
  layout: ColonyLayout;
  morphology: MorphologyResolution;
  /** Frozen semantic data projected by SVG layers without rereading GameState. */
  visual: ColonyVisualState;
  stageId: StageId;
  sceneSeed: number;
  detail: ColonySceneDetail;
}>;

export type ColonySceneDescription = Readonly<{
  title: string;
  description: string;
  caption: string;
}>;

export type MitosisRenderModel = Readonly<{
  motif: Exclude<MitosisMotif, "none">;
  placement: Exclude<MitosisPlacement, "none">;
}>;

export type CellRenderModel = Readonly<{
  key: string;
  membranePath: string;
  nucleusPath: string;
  mitosis: MitosisRenderModel | undefined;
  transform: string;
  depth: DepthStratum;
  regionKey: string;
}>;

declare const sceneIdBrand: unique symbol;
export type SceneSvgId = string & Readonly<{ readonly [sceneIdBrand]: true }>;

export type CellRenderPathInput = Readonly<{
  slotKey: string;
  membranePath: string;
  nucleusPath: string;
  mitosis: MitosisRenderModel | undefined;
}>;

const UINT32_MAX = 0xffffffff;
const LAYOUT_KEYS = [
  "stageId",
  "burdenTier",
  "sceneKey",
  "silhouette",
  "regions",
  "voids",
  "clusters",
  "slots",
  "metrics",
] as const;
const MORPHOLOGY_KEYS = ["params", "provenance", "traits", "seed"] as const;
const REQUEST_KEYS = ["layout", "morphology", "visual", "stageId", "sceneSeed", "detail"] as const;
const CELL_PATH_KEYS = ["slotKey", "membranePath", "nucleusPath", "mitosis"] as const;
const MITOSIS_KEYS = ["motif", "placement"] as const;
const SLOT_KEYS = [
  "key",
  "seed",
  "centre",
  "orientation",
  "scale",
  "rx",
  "ry",
  "depth",
  "clusterId",
  "regionKey",
  "morphologySeed",
  "layoutOrigin",
  "occludes",
] as const;

function isUint32(value: unknown): value is number {
  return (
    typeof value === "number" && Number.isSafeInteger(value) && value >= 0 && value <= UINT32_MAX
  );
}

function hasExactDataKeys(
  value: unknown,
  keys: readonly string[],
): value is Record<string, unknown> {
  if (
    typeof value !== "object" ||
    value === null ||
    Object.getPrototypeOf(value) !== Object.prototype ||
    !Object.isFrozen(value)
  ) {
    return false;
  }
  const actualKeys = Object.keys(value).sort();
  const expectedKeys = [...keys].sort();
  if (
    actualKeys.length !== expectedKeys.length ||
    actualKeys.some((key, index) => key !== expectedKeys[index])
  ) {
    return false;
  }
  return keys.every((key) => {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    return descriptor !== undefined && "value" in descriptor;
  });
}

function requireUint32(value: unknown, label: string): number {
  if (!isUint32(value)) throw new Error(`${label} must be an unsigned 32-bit integer.`);
  return value;
}

function requireDetail(value: unknown): ColonySceneDetail {
  if (value !== "representative" && value !== "inspection") {
    throw new Error("Scene detail must be representative or inspection.");
  }
  return value;
}

function requireStage(value: unknown): StageId {
  if (typeof value !== "string" || !isStageId(value))
    throw new Error("Scene stage must be canonical.");
  return value as StageId;
}

function requireLayout(value: unknown): ColonyLayout {
  if (!hasExactDataKeys(value, LAYOUT_KEYS))
    throw new Error("Scene layout must be a frozen accepted colony layout.");
  if (
    typeof value.stageId !== "string" ||
    (value.burdenTier !== "sparse" &&
      value.burdenTier !== "established" &&
      value.burdenTier !== "dense" &&
      value.burdenTier !== "overgrown") ||
    typeof value.sceneKey !== "string" ||
    !Array.isArray(value.slots) ||
    !Object.isFrozen(value.slots)
  ) {
    throw new Error("Scene layout fields are invalid.");
  }
  return value as ColonyLayout;
}

function requireMorphology(value: unknown): MorphologyResolution {
  if (!hasExactDataKeys(value, MORPHOLOGY_KEYS)) {
    throw new Error("Scene morphology must be a frozen morphology-grammar resolution.");
  }
  if (!isUint32(value.seed) || !Object.isFrozen(value.params) || !Object.isFrozen(value.traits)) {
    throw new Error("Scene morphology fields are invalid.");
  }
  return value as MorphologyResolution;
}

function validFiniteSlot(value: unknown, sceneSeed: number): value is CellSlot {
  if (!hasExactDataKeys(value, SLOT_KEYS)) return false;
  const centre = value.centre;
  if (!hasExactDataKeys(centre, ["x", "y"])) return false;
  const x = centre.x;
  const y = centre.y;
  const orientation = value.orientation;
  const scale = value.scale;
  const rx = value.rx;
  const ry = value.ry;
  if (
    !isUint32(value.seed) ||
    !isUint32(value.morphologySeed) ||
    typeof x !== "number" ||
    !Number.isFinite(x) ||
    typeof y !== "number" ||
    !Number.isFinite(y) ||
    typeof orientation !== "number" ||
    !Number.isFinite(orientation) ||
    typeof scale !== "number" ||
    !Number.isFinite(scale) ||
    typeof rx !== "number" ||
    !Number.isFinite(rx) ||
    typeof ry !== "number" ||
    !Number.isFinite(ry)
  )
    return false;
  return (
    x > 0 &&
    x < 1000 &&
    y > 0 &&
    y < 700 &&
    scale > 0 &&
    rx > 0 &&
    ry > 0 &&
    value.morphologySeed === sceneSeed &&
    (value.depth === "surface" || value.depth === "middle" || value.depth === "deep")
  );
}

function expectedSceneKey(
  stageId: StageId,
  sceneSeed: number,
  detail: ColonySceneDetail,
  burdenTier: ColonyBurdenTier,
): string {
  return `layout-v2:${stageId}:${sceneSeed}:${detail}:${burdenTier}`;
}

/** Validates and reconstructs the narrow immutable colony renderer scene boundary. */
export function createColonySceneRequest(value: unknown): ColonySceneRequest {
  if (!hasExactDataKeys(value, REQUEST_KEYS))
    throw new Error("Scene request must be a frozen plain record.");
  const stageId = requireStage(value.stageId);
  const sceneSeed = requireUint32(value.sceneSeed, "Scene seed");
  const detail = requireDetail(value.detail);
  const layout = requireLayout(value.layout);
  const morphology = requireMorphology(value.morphology);
  assertColonyVisualState(value.visual, layout);
  if (
    layout.stageId !== stageId ||
    morphology.seed !== sceneSeed ||
    layout.sceneKey !== expectedSceneKey(stageId, sceneSeed, detail, layout.burdenTier)
  ) {
    throw new Error("Scene stage, seed, detail, layout, and morphology must share one identity.");
  }
  for (const slot of layout.slots) {
    if (!validFiniteSlot(slot, sceneSeed)) {
      throw new Error(
        "Scene slots must retain finite accepted colony geometry and morphology identity.",
      );
    }
  }
  return Object.freeze({ layout, morphology, visual: value.visual, stageId, sceneSeed, detail });
}

function requireMitosis(value: unknown): MitosisRenderModel | undefined {
  if (value === undefined) return undefined;
  if (!hasExactDataKeys(value, MITOSIS_KEYS))
    throw new Error("Mitosis model must be frozen and exact.");
  if (
    (value.motif !== "paired_nuclei" &&
      value.motif !== "bipolar_spindle" &&
      value.motif !== "multipolar_spindle") ||
    (value.placement !== "central" &&
      value.placement !== "offset" &&
      value.placement !== "peripheral")
  ) {
    throw new Error("Mitosis model is outside the morphology grammar vocabulary.");
  }
  return Object.freeze({ motif: value.motif, placement: value.placement });
}

function requireCellPathInput(value: unknown): CellRenderPathInput {
  if (!hasExactDataKeys(value, CELL_PATH_KEYS))
    throw new Error("Cell path input must be frozen and exact.");
  if (
    typeof value.slotKey !== "string" ||
    value.slotKey.length === 0 ||
    typeof value.membranePath !== "string" ||
    value.membranePath.length === 0 ||
    typeof value.nucleusPath !== "string" ||
    value.nucleusPath.length === 0
  ) {
    throw new Error("Cell paths require non-empty strings and a canonical slot key.");
  }
  const mitosis = requireMitosis(value.mitosis);
  return Object.freeze({
    slotKey: value.slotKey,
    membranePath: value.membranePath,
    nucleusPath: value.nucleusPath,
    mitosis,
  });
}

function slotTransform(slot: CellSlot): string {
  const angleDegrees = (slot.orientation * 180) / Math.PI;
  return `translate(${slot.centre.x} ${slot.centre.y}) rotate(${angleDegrees}) scale(${slot.scale})`;
}

/** Rebuilds a cell model from one existing accepted slot without coordinate controls. */
export function createCellRenderModel(
  scene: ColonySceneRequest,
  value: CellRenderPathInput,
): CellRenderModel {
  const paths = requireCellPathInput(value);
  const slot = scene.layout.slots.find((candidate) => candidate.key === paths.slotKey);
  if (slot === undefined) throw new Error("Cell render input must name an accepted scene slot.");
  const transform = slotTransform(slot);
  return Object.freeze({
    key: slot.key,
    membranePath: paths.membranePath,
    nucleusPath: paths.nucleusPath,
    mitosis: paths.mitosis,
    transform,
    depth: slot.depth,
    regionKey: slot.regionKey,
  });
}

function hashSceneKey(sceneKey: string): string {
  let hash = 2166136261;
  for (let index = 0; index < sceneKey.length; index += 1) {
    hash ^= sceneKey.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

/** Produces one opaque, document-local SVG identifier with the required ccng prefix. */
export function sceneSvgId(scene: ColonySceneRequest, suffix: string): SceneSvgId {
  if (!/^[a-z][a-z0-9-]{0,31}$/.test(suffix)) throw new Error("SVG identifier suffix is invalid.");
  const token = hashSceneKey(scene.layout.sceneKey);
  const identifier = `ccng-${token}-${suffix}`;
  return identifier as SceneSvgId;
}
