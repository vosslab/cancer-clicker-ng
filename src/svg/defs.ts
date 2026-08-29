/**
 * Scene-local SVG definitions for the colony renderer colony illustration.
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
  element: "linearGradient" | "radialGradient" | "mask" | "pattern";
  id: SceneSvgId;
  attributes: Readonly<Record<string, SvgDefinitionAttributeValue>>;
  children: readonly SvgDefinitionNode[];
}>;

export type ColonySvgDefinitionIds = Readonly<{
  tissueGradient: SceneSvgId;
  cytoplasmGradient: SceneSvgId;
  nucleusGradient: SceneSvgId;
  hypoxiaGradient: SceneSvgId;
  vesselGradient: SceneSvgId;
  cytoplasmPattern: SceneSvgId;
  matrixPattern: SceneSvgId;
  plateMask: SceneSvgId;
}>;

export type ColonySvgDefinitions = Readonly<{
  ids: ColonySvgDefinitionIds;
  definitions: readonly SvgDefinition[];
}>;

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

/** Counts definition elements and their direct child nodes for descriptive diagnostics. */
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
    tissueGradient: sceneSvgId(trustedScene, "tissue-gradient"),
    cytoplasmGradient: sceneSvgId(trustedScene, "cytoplasm-gradient"),
    nucleusGradient: sceneSvgId(trustedScene, "nucleus-gradient"),
    hypoxiaGradient: sceneSvgId(trustedScene, "hypoxia-gradient"),
    vesselGradient: sceneSvgId(trustedScene, "vessel-gradient"),
    cytoplasmPattern: sceneSvgId(trustedScene, "cytoplasm-pattern"),
    matrixPattern: sceneSvgId(trustedScene, "matrix-pattern"),
    plateMask: sceneSvgId(trustedScene, "plate-mask"),
  });
  const definitions = Object.freeze([
    definition("radialGradient", ids.tissueGradient, { cx: "42%", cy: "35%", r: "76%" }, [
      definitionNode("stop", { offset: "0%", stopColor: "#d9868f", stopOpacity: 0.96 }),
      definitionNode("stop", { offset: "66%", stopColor: "#9f4e62", stopOpacity: 0.98 }),
      definitionNode("stop", { offset: "100%", stopColor: "#5d293b", stopOpacity: 1 }),
    ]),
    definition(
      "linearGradient",
      ids.cytoplasmGradient,
      { x1: "16%", y1: "8%", x2: "84%", y2: "92%" },
      [
        definitionNode("stop", { offset: "0%", stopColor: "#f3b7a9", stopOpacity: 0.98 }),
        definitionNode("stop", { offset: "56%", stopColor: "#cf7080", stopOpacity: 0.97 }),
        definitionNode("stop", { offset: "100%", stopColor: "#8e3d59", stopOpacity: 0.99 }),
      ],
    ),
    definition(
      "linearGradient",
      ids.nucleusGradient,
      { x1: "20%", y1: "12%", x2: "80%", y2: "88%" },
      [
        definitionNode("stop", { offset: "0%", stopColor: "#9e6a9f", stopOpacity: 0.98 }),
        definitionNode("stop", { offset: "58%", stopColor: "#674066", stopOpacity: 1 }),
        definitionNode("stop", { offset: "100%", stopColor: "#3a223e", stopOpacity: 1 }),
      ],
    ),
    definition("radialGradient", ids.hypoxiaGradient, { cx: "50%", cy: "50%", r: "60%" }, [
      definitionNode("stop", { offset: "0%", stopColor: "#210f1e", stopOpacity: 0.88 }),
      definitionNode("stop", { offset: "62%", stopColor: "#7c3450", stopOpacity: 0.54 }),
      definitionNode("stop", { offset: "100%", stopColor: "#bb7560", stopOpacity: 0.08 }),
    ]),
    definition(
      "linearGradient",
      ids.vesselGradient,
      { x1: "0%", y1: "0%", x2: "100%", y2: "100%" },
      [
        definitionNode("stop", { offset: "0%", stopColor: "#571e2b", stopOpacity: 0.58 }),
        definitionNode("stop", { offset: "50%", stopColor: "#d97364", stopOpacity: 0.96 }),
        definitionNode("stop", { offset: "100%", stopColor: "#5c2331", stopOpacity: 0.66 }),
      ],
    ),
    definition(
      "pattern",
      ids.cytoplasmPattern,
      { width: 28, height: 24, patternUnits: "userSpaceOnUse" },
      [
        definitionNode("rect", {
          x: 0,
          y: 0,
          width: 28,
          height: 24,
          fill: "#c96f7f",
        }),
        definitionNode("circle", { cx: 7, cy: 7, r: 1.8, fill: "#ffd7bd", opacity: 0.42 }),
        definitionNode("circle", { cx: 21, cy: 17, r: 1.4, fill: "#6c334f", opacity: 0.42 }),
        definitionNode("path", {
          d: "M 12 18 C 15 14 18 15 20 11",
          fill: "none",
          stroke: "#f0a277",
          strokeWidth: 1.4,
          opacity: 0.38,
        }),
      ],
    ),
    definition(
      "pattern",
      ids.matrixPattern,
      { width: 110, height: 82, patternUnits: "userSpaceOnUse" },
      [
        definitionNode("rect", { x: 0, y: 0, width: 110, height: 82, fill: "#28141c" }),
        definitionNode("path", {
          d: "M -12 56 C 18 19 54 77 122 28",
          fill: "none",
          stroke: "#70404d",
          strokeWidth: 9,
          opacity: 0.28,
        }),
        definitionNode("circle", { cx: 24, cy: 23, r: 4, fill: "#a55f70", opacity: 0.3 }),
        definitionNode("circle", { cx: 83, cy: 61, r: 3, fill: "#c07a78", opacity: 0.24 }),
      ],
    ),
    definition(
      "mask",
      ids.plateMask,
      { x: 0, y: 0, width: 1000, height: 700, maskUnits: "userSpaceOnUse" },
      [definitionNode("rect", { x: 0, y: 0, width: 1000, height: 700, fill: "#ffffff" })],
    ),
  ]);
  return Object.freeze({ ids, definitions });
}
