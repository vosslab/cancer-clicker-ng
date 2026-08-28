/**
 * Scene-local SVG definitions for the M18 colony illustration.
 *
 * The renderer projects these immutable data models once per named inline SVG.
 * Cell nodes consume their paint and mask references but never create definitions.
 */
import {
  createColonySceneRequest,
  sceneSvgId,
  type ColonySceneRequest,
  type SceneSvgId,
} from "./render_types.js";

export type SvgDefinitionAttributeValue = number | string;

export type SvgDefinitionNode = Readonly<{
  element: "circle" | "path" | "rect" | "stop";
  attributes: Readonly<Record<string, SvgDefinitionAttributeValue>>;
}>;

export type SvgDefinition = Readonly<{
  element: "linearGradient" | "mask" | "pattern";
  id: SceneSvgId;
  attributes: Readonly<Record<string, SvgDefinitionAttributeValue>>;
  children: readonly SvgDefinitionNode[];
}>;

export type ColonySvgDefinitionIds = Readonly<{
  cytoplasmGradient: SceneSvgId;
  nucleusGradient: SceneSvgId;
  membranePattern: SceneSvgId;
  plateMask: SceneSvgId;
}>;

export type ColonySvgDefinitions = Readonly<{
  ids: ColonySvgDefinitionIds;
  definitions: readonly SvgDefinition[];
}>;

const MAX_SHARED_DEFINITIONS = 4;
const MAX_SHARED_DEFINITION_NODES = 14;

function frozenAttributes(
  attributes: Record<string, SvgDefinitionAttributeValue>,
): Readonly<Record<string, SvgDefinitionAttributeValue>> {
  return Object.freeze(attributes);
}

function definitionNode(
  element: SvgDefinitionNode["element"],
  attributes: Record<string, SvgDefinitionAttributeValue>,
): SvgDefinitionNode {
  return Object.freeze({ element, attributes: frozenAttributes(attributes) });
}

function definition(
  element: SvgDefinition["element"],
  id: SceneSvgId,
  attributes: Record<string, SvgDefinitionAttributeValue>,
  children: readonly SvgDefinitionNode[],
): SvgDefinition {
  return Object.freeze({
    element,
    id,
    attributes: frozenAttributes(attributes),
    children: Object.freeze([...children]),
  });
}

/** Formats a trusted scene-local SVG paint, mask, or pattern reference. */
export function localSvgReference(id: SceneSvgId): string {
  const reference = `url(#${id})`;
  return reference;
}

/** Counts definition elements and their direct child nodes for the M18 DOM budget. */
export function sharedDefinitionNodeCount(definitions: ColonySvgDefinitions): number {
  const childCount = definitions.definitions.reduce(
    (count, item) => count + item.children.length,
    0,
  );
  const total = definitions.definitions.length + childCount;
  return total;
}

/**
 * Creates the small, scene-local definition inventory for one colony SVG.
 * There is intentionally no SVG filter: depth and volume are conveyed by paths,
 * shared gradients, and CSS rather than an unreviewed raster-like treatment.
 */
export function createColonySvgDefinitions(scene: ColonySceneRequest): ColonySvgDefinitions {
  const trustedScene = createColonySceneRequest(scene);
  const ids = Object.freeze({
    cytoplasmGradient: sceneSvgId(trustedScene, "cytoplasm-gradient"),
    nucleusGradient: sceneSvgId(trustedScene, "nucleus-gradient"),
    membranePattern: sceneSvgId(trustedScene, "membrane-pattern"),
    plateMask: sceneSvgId(trustedScene, "plate-mask"),
  });
  const definitions = Object.freeze([
    definition(
      "linearGradient",
      ids.cytoplasmGradient,
      { x1: "16%", y1: "8%", x2: "84%", y2: "92%" },
      [
        definitionNode("stop", { offset: "0%", stopColor: "#9abec0", stopOpacity: 0.96 }),
        definitionNode("stop", { offset: "56%", stopColor: "#527d83", stopOpacity: 0.94 }),
        definitionNode("stop", { offset: "100%", stopColor: "#284b56", stopOpacity: 0.98 }),
      ],
    ),
    definition(
      "linearGradient",
      ids.nucleusGradient,
      { x1: "20%", y1: "12%", x2: "80%", y2: "88%" },
      [
        definitionNode("stop", { offset: "0%", stopColor: "#5d5276", stopOpacity: 0.98 }),
        definitionNode("stop", { offset: "100%", stopColor: "#211e3c", stopOpacity: 1 }),
      ],
    ),
    definition(
      "pattern",
      ids.membranePattern,
      { width: 8, height: 8, patternUnits: "userSpaceOnUse" },
      [definitionNode("circle", { cx: 2, cy: 2, r: 0.7, fill: "#d7e7df", opacity: 0.18 })],
    ),
    definition(
      "mask",
      ids.plateMask,
      { x: 0, y: 0, width: 1000, height: 700, maskUnits: "userSpaceOnUse" },
      [definitionNode("rect", { x: 0, y: 0, width: 1000, height: 700, fill: "#ffffff" })],
    ),
  ]);
  const result = Object.freeze({ ids, definitions });
  if (
    result.definitions.length > MAX_SHARED_DEFINITIONS ||
    sharedDefinitionNodeCount(result) > MAX_SHARED_DEFINITION_NODES
  ) {
    throw new Error("Shared SVG definitions exceed the M18 performance budget.");
  }
  return result;
}
